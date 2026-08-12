-- ============================================================================
-- HOR — PENDING MIGRATION CATCH-UP  (generated 2026-08-11)
--
-- Run this WHOLE file in the Supabase dashboard -> SQL Editor.
-- Every statement is idempotent, so it is safe to re-run.
--
-- WHY THIS EXISTS
--   Probing the live database showed five migrations were never applied. The
--   app calls the tables and functions they create, so those calls 404 and the
--   data is silently lost:
--
--   * outpatient_services / outpatient_practitioners / outpatient_bookings
--       Every function in src/utils/outpatient.js targets these. Public
--       outpatient bookings 404 on insert and are lost; the outpatient
--       dashboard pages are empty for the same reason.
--   * notification_log
--       The send-notification Edge Function writes here, so new-application
--       alert emails fail. This is why new applications arrive unannounced.
--   * admin_set_role / admin_update_profile / role_change_log
--       The User Accounts page calls these. Without them a new staff account
--       is created, handle_new_user() forces it to 'patient', the role change
--       then 404s, and the account can never read applications because
--       is_staff() is false. It lands on the resident dashboard instead.
--   * deposit_requests, pastoral_interviews
--       Deposit-request tracking and the mandatory pastoral interview step.
--
-- AFTER RUNNING, VERIFY (all five should return a row count, not an error):
--   select count(*) from outpatient_services;
--   select count(*) from outpatient_bookings;
--   select count(*) from notification_log;
--   select count(*) from role_change_log;
--   select count(*) from deposit_requests;
--   select count(*) from pastoral_interviews;
-- ============================================================================




-- ===========================================================================
-- SOURCE: supabase/migrations/20260430_deposit_request_tracking.sql
-- ===========================================================================

-- House of Refuge — track when admin sends the refundable-deposit request email.
-- Idempotent: safe to run multiple times.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS deposit_request_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deposit_request_sent_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS deposit_request_recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS deposit_request_count INT DEFAULT 0;

-- For the admissions list view: index by sent state for quick filtering.
CREATE INDEX IF NOT EXISTS applications_deposit_request_sent_at_idx
  ON applications (deposit_request_sent_at);


-- ===========================================================================
-- SOURCE: supabase/migrations/20260514_outpatient_services.sql
-- ===========================================================================

-- Outpatient Services product
-- Retail consultations + diagnostics + assessments delivered by in-house and visiting clinicians.
-- Public booking via /outpatient routes; admin via /dashboard/outpatient.

create extension if not exists "pgcrypto";

-- ── Practitioners ────────────────────────────────────────────
create table if not exists outpatient_practitioners (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  title text,                       -- "Specialist Psychiatrist", etc.
  role_type text not null default 'in_house'
    check (role_type in ('in_house', 'visiting')),
  specialties jsonb not null default '[]'::jsonb,
  short_bio text,
  photo_url text,
  registration_number text,         -- MDCN or relevant body
  email text,
  phone text,
  public boolean not null default true,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_practitioners_active_public
  on outpatient_practitioners(active, public) where active = true and public = true;

-- ── Services catalog ─────────────────────────────────────────
create table if not exists outpatient_services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null
    check (category in ('clinical', 'diagnostic', 'therapy', 'package', 'aftercare')),
  short_description text,
  long_description text,
  duration_minutes integer,
  price_ngn integer,                -- in whole Naira; NULL = TBD
  practitioner_role text,           -- 'psychiatrist', 'psychologist', 'counsellor', 'lab', 'group', 'mdt'
  requires_practitioner boolean not null default true,
  conversion_eligible boolean not null default false,
                                   -- true if fee can be credited to inpatient deposit within a window
  conversion_window_days integer,   -- e.g. 90 days for pre-admission assessment
  sop_url text,                     -- optional link to SOP doc
  active boolean not null default true,
  public boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_services_active_public
  on outpatient_services(active, public) where active = true and public = true;
create index if not exists idx_services_category on outpatient_services(category);

-- ── Bookings ─────────────────────────────────────────────────
create table if not exists outpatient_bookings (
  id uuid primary key default gen_random_uuid(),
  reference_code text unique not null,
  service_id uuid references outpatient_services(id) on delete restrict,
  practitioner_id uuid references outpatient_practitioners(id) on delete set null,

  -- Patient + booker (may be the same person)
  patient_name text not null,
  patient_age integer,
  patient_phone text,
  patient_email text,
  booker_name text,
  booker_phone text,
  booker_email text,
  booker_relationship text,
  notes_from_booker text,

  scheduled_at timestamptz not null,
  duration_minutes integer,

  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'confirmed', 'checked_in', 'completed', 'no_show', 'cancelled', 'rescheduled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid_online', 'paid_on_arrival', 'refunded', 'partially_refunded')),
  payment_reference text,
  amount_paid_ngn integer,

  clinical_notes text,              -- recorded after appointment
  outcome_summary text,             -- short outcome captured by admin
  converted_to_inpatient boolean default false,
  inpatient_deposit_credit_applied boolean default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function gen_outpatient_ref() returns trigger as $$
begin
  if new.reference_code is null or new.reference_code = '' then
    loop
      new.reference_code := 'OP-' || lpad(floor(random() * 1000000)::text, 6, '0');
      exit when not exists (select 1 from outpatient_bookings where reference_code = new.reference_code);
    end loop;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_gen_outpatient_ref on outpatient_bookings;
create trigger trg_gen_outpatient_ref
  before insert on outpatient_bookings
  for each row execute function gen_outpatient_ref();

create or replace function touch_outpatient_updated_at() returns trigger as $$
begin new.updated_at := now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_touch_outpatient_bookings on outpatient_bookings;
create trigger trg_touch_outpatient_bookings
  before update on outpatient_bookings
  for each row execute function touch_outpatient_updated_at();

drop trigger if exists trg_touch_outpatient_services on outpatient_services;
create trigger trg_touch_outpatient_services
  before update on outpatient_services
  for each row execute function touch_outpatient_updated_at();

drop trigger if exists trg_touch_outpatient_practitioners on outpatient_practitioners;
create trigger trg_touch_outpatient_practitioners
  before update on outpatient_practitioners
  for each row execute function touch_outpatient_updated_at();

create index if not exists idx_bookings_scheduled_at on outpatient_bookings(scheduled_at desc);
create index if not exists idx_bookings_status on outpatient_bookings(status);
create index if not exists idx_bookings_practitioner on outpatient_bookings(practitioner_id);
create index if not exists idx_bookings_service on outpatient_bookings(service_id);

-- ── RLS ──────────────────────────────────────────────────────
alter table outpatient_practitioners enable row level security;
alter table outpatient_services enable row level security;
alter table outpatient_bookings enable row level security;

-- Public can read active+public practitioners and services (for /outpatient page)
drop policy if exists practitioners_public_select on outpatient_practitioners;
create policy practitioners_public_select on outpatient_practitioners
  for select to anon using (active = true and public = true);

drop policy if exists services_public_select on outpatient_services;
create policy services_public_select on outpatient_services
  for select to anon using (active = true and public = true);

-- Public can insert bookings (the booking form)
drop policy if exists bookings_public_insert on outpatient_bookings;
create policy bookings_public_insert on outpatient_bookings
  for insert to anon with check (true);

-- NOTE: No anon SELECT policy on outpatient_bookings. A `USING (true)` anon
-- policy would let anyone read every patient's booking + contact details. If a
-- public "check booking status" page is needed, add a SECURITY DEFINER function
-- returning only non-sensitive status columns for an exact reference (see the
-- fa_status_by_reference pattern in 20260514_financial_assistance.sql).
drop policy if exists bookings_public_select on outpatient_bookings;

-- Practitioner/service CATALOG is safe for staff to manage broadly.
drop policy if exists practitioners_authed on outpatient_practitioners;
create policy practitioners_authed on outpatient_practitioners
  for all to authenticated using (true) with check (true);

drop policy if exists services_authed on outpatient_services;
create policy services_authed on outpatient_services
  for all to authenticated using (true) with check (true);

-- Bookings contain patient PII: restrict to staff, not any authenticated user.
drop policy if exists bookings_authed on outpatient_bookings;
create policy bookings_authed on outpatient_bookings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ── Seed practitioners ───────────────────────────────────────
-- The unique index is what makes the `on conflict` below do anything. Without
-- it a bare `on conflict do nothing` has no index to conflict against, so every
-- run of this file inserted another copy of both doctors. See
-- RUN_fix_practitioner_duplicates.sql, which cleans up the rows that created.
create unique index if not exists outpatient_practitioners_full_name_key
  on outpatient_practitioners (full_name);

insert into outpatient_practitioners (full_name, title, role_type, public, active, display_order)
values
  ('Dr Alex Adenuga',   'Specialist Psychiatrist', 'visiting', true, true, 10),
  ('Dr Toba Babarinsa', 'Specialist Psychiatrist', 'visiting', true, true, 20)
on conflict (full_name) do nothing;

-- ── Seed services (prices NULL = TBD, set via admin) ─────────
insert into outpatient_services
  (slug, name, category, short_description, duration_minutes, price_ngn, practitioner_role, conversion_eligible, conversion_window_days, display_order)
values
  ('general-mental-health-consultation', 'General Mental Health Consultation',
    'clinical', 'A 60-minute psychiatric consultation for general mental health concerns — anxiety, depression, mood, sleep, stress, grief, life transitions. Not specific to substance use. Suitable for new presentations, second opinions, and ongoing care.',
    60, 100000, 'psychiatrist', false, NULL, 5),
  ('psychiatric-consultation', 'Psychiatric Consultation (Substance Use)',
    'clinical', 'A structured 90-minute clinical interview with a consultant psychiatrist focused on substance use. Includes medication review, comorbidity screening, and a written clinical summary.',
    90, 150000, 'psychiatrist', false, NULL, 10),
  ('clinical-psychology-session', 'Clinical Psychology Session',
    'therapy', 'One-to-one session with a clinical psychologist. CBT, motivational interviewing, and personalised therapeutic work.',
    50, 100000, 'psychologist', false, NULL, 20),
  ('individual-counselling', 'Individual Counselling',
    'therapy', 'Supportive counselling session for personal or substance-related concerns.',
    50, 60000, 'counsellor', false, NULL, 30),
  ('family-therapy', 'Family Therapy Session',
    'therapy', 'Structured family-systems session. Both the affected individual and family attend together.',
    90, 125000, 'psychologist', false, NULL, 40),
  ('diagnostic-battery', 'Diagnostic Battery — ASI + ASSIST + URICA',
    'diagnostic', 'Standardised substance-use screening battery: Addiction Severity Index, ASSIST, and URICA readiness for change.',
    90, 100000, 'psychologist', false, NULL, 50),
  ('pre-admission-lab-panel', 'Pre-admission Lab Panel (9 tests)',
    'diagnostic', 'HIV, Hepatitis A & B, Urine Drug Screen, Full Blood Count, Liver Function Tests, Malaria, Widal, Chest X-Ray, Blood Glucose.',
    240, 200000, 'lab', false, NULL, 60),
  ('pre-admission-assessment', 'Pre-admission Clinical Assessment',
    'package', 'The full clinical-decision assessment normally bundled into the NGN 1M inpatient deposit. Available as a stand-alone retail service for families not yet ready to commit. Fee is creditable to the inpatient deposit within 90 days.',
    480, 400000, 'mdt', true, 90, 70),
  ('outpatient-detox-monitoring', 'Outpatient Detox Monitoring Package',
    'package', 'Clinically supervised outpatient detox monitoring over two weeks. Daily check-ins, vitals, medication review, family contact.',
    NULL, 500000, 'mdt', false, NULL, 80),
  ('group-therapy-series', 'Group Therapy Series (Monthly)',
    'therapy', 'Four 90-minute group therapy sessions per month. CBT, 12-step principles, peer support.',
    90, 175000, 'group', false, NULL, 90),
  ('alumni-aftercare-session', 'Alumni / Aftercare Session',
    'aftercare', 'Continued support session for HOR alumni or outpatient clients in recovery maintenance.',
    50, 50000, 'counsellor', false, NULL, 100)
on conflict (slug) do nothing;


-- ===========================================================================
-- SOURCE: supabase/migrations/20260514_pastoral_interview_tracking.sql
-- ===========================================================================

-- Pastoral interview tracking
-- Pastor Tony Rapu (Freedom Foundation founder) meets with patient + family
-- after psychiatrist clearance, before bed allocation. Mandatory across all admission pathways.

-- Add to financial_assistance_applications
alter table financial_assistance_applications
  add column if not exists pastoral_interview_status text default 'pending'
    check (pastoral_interview_status in ('pending', 'scheduled', 'completed', 'declined', 'rescheduling', 'not_required')),
  add column if not exists pastoral_interview_scheduled_at timestamptz,
  add column if not exists pastoral_interview_completed_at timestamptz,
  add column if not exists pastoral_interview_notes text;

create index if not exists idx_fa_pastoral_status on financial_assistance_applications(pastoral_interview_status);

-- Add to applications (paying pathway) if the table exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'applications') then
    execute 'alter table applications
      add column if not exists pastoral_interview_status text default ''pending''
        check (pastoral_interview_status in (''pending'', ''scheduled'', ''completed'', ''declined'', ''rescheduling'', ''not_required'')),
      add column if not exists pastoral_interview_scheduled_at timestamptz,
      add column if not exists pastoral_interview_completed_at timestamptz,
      add column if not exists pastoral_interview_notes text';

    execute 'create index if not exists idx_applications_pastoral_status on applications(pastoral_interview_status)';
  end if;
end
$$;


-- ===========================================================================
-- SOURCE: supabase/migrations/20260808_admin_account_management.sql
-- ===========================================================================

-- House of Refuge — admin-managed account roles.
-- Run in the Supabase SQL Editor. Safe to run on a live database, idempotent.
--
-- Until now the only way to grant staff or admin access was to hand-edit
-- profiles.role in the SQL Editor, because prevent_role_self_escalation blocks
-- role changes from any end-user session that is not already an admin.
--
-- This adds a narrow, audited path so an existing admin can manage roles from
-- the dashboard, without ever exposing the service-role key to the browser.

-- ── Audit trail ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_change_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id   UUID NOT NULL,
  target_email TEXT,
  old_role    TEXT,
  new_role    TEXT NOT NULL,
  changed_by  UUID,
  changed_by_email TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.role_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read role log" ON public.role_change_log;
CREATE POLICY "Admins read role log" ON public.role_change_log
  FOR SELECT USING (public.current_user_role() = 'admin');

-- No INSERT/UPDATE/DELETE policy: only the SECURITY DEFINER function below
-- writes here, so the log cannot be forged or cleared from a browser session.

-- ── Role assignment ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_role(target_id UUID, new_role TEXT)
RETURNS TABLE (id UUID, email TEXT, full_name TEXT, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role  TEXT := public.current_user_role();
  caller_id    UUID := auth.uid();
  old_role     TEXT;
  target_email TEXT;
  admin_count  INT;
BEGIN
  IF caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only an administrator may change account roles';
  END IF;

  IF new_role NOT IN ('patient', 'family', 'staff', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  SELECT p.role, p.email INTO old_role, target_email
  FROM public.profiles p WHERE p.id = target_id;

  IF old_role IS NULL THEN
    RAISE EXCEPTION 'No such account';
  END IF;

  -- An admin demoting themselves could lock the facility out of its own system.
  IF target_id = caller_id AND new_role <> 'admin' THEN
    RAISE EXCEPTION 'You cannot remove your own administrator access';
  END IF;

  -- Never leave the platform with zero admins.
  IF old_role = 'admin' AND new_role <> 'admin' THEN
    SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'This is the last administrator account and cannot be demoted';
    END IF;
  END IF;

  UPDATE public.profiles p
  SET role = new_role, updated_at = NOW()
  WHERE p.id = target_id;

  INSERT INTO public.role_change_log (target_id, target_email, old_role, new_role, changed_by, changed_by_email)
  VALUES (
    target_id, target_email, old_role, new_role, caller_id,
    (SELECT p.email FROM public.profiles p WHERE p.id = caller_id)
  );

  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.role FROM public.profiles p WHERE p.id = target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_role(UUID, TEXT) TO authenticated;

-- ── Profile detail update (name / title / department / phone) ──
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  target_id UUID, new_name TEXT, new_phone TEXT, new_department TEXT, new_title TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only an administrator may edit staff profiles';
  END IF;

  UPDATE public.profiles
  SET full_name  = COALESCE(NULLIF(new_name, ''), full_name),
      phone      = COALESCE(new_phone, phone),
      department = COALESCE(new_department, department),
      title      = COALESCE(new_title, title),
      updated_at = NOW()
  WHERE id = target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_profile(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ── Verify ─────────────────────────────────────────────────
-- SELECT proname FROM pg_proc WHERE proname IN ('admin_set_role','admin_update_profile');
-- SELECT email, full_name, role FROM public.profiles WHERE role IN ('admin','staff') ORDER BY role;


-- ===========================================================================
-- SOURCE: supabase/migrations/20260808_email_notifications.sql
-- ===========================================================================

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


-- Force PostgREST to pick up the new tables and functions.
notify pgrst, 'reload schema';
