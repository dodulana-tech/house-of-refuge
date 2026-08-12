-- House of Refuge — email notifications on public submissions
--
-- Adds an AFTER INSERT trigger to each of the four public submission tables.
-- The trigger asks pg_net to POST to the `send-notification` Edge Function,
-- which sends the staff alert (and, where enabled, the applicant confirmation)
-- over Zoho SMTP.
--
-- Two deliberate choices:
--
-- 1. The webhook body carries ONLY the row id, never the row. Applications and
--    financial assistance rows hold clinical and financial detail, and pg_net
--    persists request bodies in its queue and response bodies in
--    net._http_response for hours. The Edge Function re-reads the row with the
--    service role instead, so that PII never leaves the database.
--
-- 2. Notification failures never block a submission. The trigger returns NULL
--    on any error and pg_net dispatches asynchronously after commit, so a
--    down mailbox cannot stop a family from applying.
--
-- AFTER RUNNING THIS FILE you must point it at the deployed function:
--
--   update private.notification_config set
--     function_url   = 'https://<project-ref>.supabase.co/functions/v1/send-notification',
--     webhook_secret = '<same value as the NOTIFY_WEBHOOK_SECRET function secret>',
--     enabled        = true
--   where id = 1;
--
-- Until that update runs, `enabled` is false and no mail is attempted.

-- ── 1. Delivery log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event        TEXT NOT NULL,
  source_table TEXT,
  record_id    UUID,
  kind         TEXT NOT NULL CHECK (kind IN ('staff', 'applicant')),
  recipients   TEXT[] NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Staff-read only. Writes come exclusively from the Edge Function's service
-- role, which bypasses RLS, so no INSERT policy is granted to anyone.
DROP POLICY IF EXISTS "Staff can read notification log" ON notification_log;
CREATE POLICY "Staff can read notification log" ON notification_log
  FOR SELECT USING (public.is_staff());

CREATE INDEX IF NOT EXISTS notification_log_created_idx ON notification_log (created_at DESC);
CREATE INDEX IF NOT EXISTS notification_log_record_idx  ON notification_log (record_id);
CREATE INDEX IF NOT EXISTS notification_log_status_idx  ON notification_log (status) WHERE status = 'failed';

-- ── 2. Trigger configuration ──────────────────────────────
-- Lives in `private`, which is not exposed through PostgREST, so the webhook
-- secret is unreachable from the API even with a valid staff session.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS private.notification_config (
  id             INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  function_url   TEXT NOT NULL DEFAULT '',
  webhook_secret TEXT NOT NULL DEFAULT '',
  enabled        BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO private.notification_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE private.notification_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.notification_config FROM anon, authenticated;

-- ── 3. Dispatcher ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION private.notify_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, net, extensions
AS $$
DECLARE
  cfg private.notification_config%ROWTYPE;
BEGIN
  SELECT * INTO cfg FROM private.notification_config WHERE id = 1;

  IF NOT FOUND OR NOT cfg.enabled OR cfg.function_url = '' THEN
    RETURN NULL;
  END IF;

  PERFORM net.http_post(
    url     := cfg.function_url,
    headers := jsonb_build_object(
                 'Content-Type',    'application/json',
                 'x-notify-secret', cfg.webhook_secret
               ),
    body    := jsonb_build_object('event', TG_ARGV[0], 'record_id', NEW.id),
    timeout_milliseconds := 8000
  );

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Never let a notification problem roll back the submission itself.
  RAISE WARNING 'notify_submission(%) failed: %', TG_ARGV[0], SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.notify_submission() FROM PUBLIC, anon, authenticated;

-- ── 4. Triggers ───────────────────────────────────────────
DROP TRIGGER IF EXISTS notify_application_submitted ON applications;
CREATE TRIGGER notify_application_submitted
  AFTER INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION private.notify_submission('application_submitted');

DROP TRIGGER IF EXISTS notify_outpatient_booked ON outpatient_bookings;
CREATE TRIGGER notify_outpatient_booked
  AFTER INSERT ON outpatient_bookings
  FOR EACH ROW EXECUTE FUNCTION private.notify_submission('outpatient_booked');

DROP TRIGGER IF EXISTS notify_financial_assistance_submitted ON financial_assistance_applications;
CREATE TRIGGER notify_financial_assistance_submitted
  AFTER INSERT ON financial_assistance_applications
  FOR EACH ROW EXECUTE FUNCTION private.notify_submission('financial_assistance_submitted');

DROP TRIGGER IF EXISTS notify_donation_pledged ON donations;
CREATE TRIGGER notify_donation_pledged
  AFTER INSERT ON donations
  FOR EACH ROW EXECUTE FUNCTION private.notify_submission('donation_pledged');
