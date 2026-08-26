-- House of Refuge — email notifications on public submissions
--
-- Adds an AFTER INSERT trigger to each public submission table. The trigger
-- calls the send-notification Edge Function through pg_net, which sends the
-- internal staff alert (and, where enabled, the applicant confirmation) over
-- Zoho SMTP.
--
-- Design notes:
--   * pg_net is asynchronous, so a slow or unreachable mail server can never
--     delay or fail a family's form submission.
--   * The trigger forwards a WHITELIST of columns, not the whole row. pg_net
--     persists request bodies in its own queue tables, and the applications
--     row carries clinical detail that has no business sitting there.
--   * Config lives in `private`, which is not exposed through PostgREST, so
--     the webhook secret is unreachable from the anon or authenticated key.
--
-- Setup order:
--   1. Run this migration.
--   2. Run supabase/setup-email.sh (sets secrets, deploys functions, and emits
--      the UPDATE that fills in the URL/secret and flips `enabled` to true).

-- ── Extension ─────────────────────────────────────────────
create extension if not exists pg_net;

-- ── Config (server-side only) ─────────────────────────────
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.notification_config (
  id             int primary key default 1 check (id = 1),
  function_url   text,
  webhook_secret text,
  enabled        boolean not null default false,
  updated_at     timestamptz not null default now()
);

insert into private.notification_config (id) values (1) on conflict (id) do nothing;

revoke all on private.notification_config from anon, authenticated;

-- ── Delivery log ──────────────────────────────────────────
create table if not exists public.notification_log (
  id              uuid primary key default gen_random_uuid(),
  event           text not null,
  source_table    text,
  record_id       uuid,
  recipient_kind  text,          -- 'staff' | 'applicant'
  recipient_email text,
  status          text not null, -- 'sent' | 'failed'
  error           text,
  created_at      timestamptz not null default now()
);

alter table public.notification_log enable row level security;

-- Written by the Edge Function using the service-role key, which bypasses RLS.
-- Staff may read it to confirm a family was actually emailed; nobody else.
drop policy if exists "Staff can read notification log" on public.notification_log;
create policy "Staff can read notification log" on public.notification_log
  for select using (public.is_staff());

create index if not exists notification_log_created_idx on public.notification_log (created_at desc);
create index if not exists notification_log_record_idx  on public.notification_log (record_id);
create index if not exists notification_log_status_idx  on public.notification_log (status) where status = 'failed';

-- ── Trigger function ──────────────────────────────────────
-- tg_argv[0] = event name (must match a key in _shared/templates.ts EVENTS)
-- tg_argv[1] = comma-separated whitelist of columns to forward
--
-- search_path includes both `net` and `extensions` because pg_net's home schema
-- differs between Supabase projects depending on when they were provisioned.
create or replace function private.notify_submission()
returns trigger
language plpgsql
security definer
set search_path = private, public, net, extensions, pg_temp
as $$
declare
  cfg     private.notification_config%rowtype;
  payload jsonb;
begin
  select * into cfg from private.notification_config where id = 1;

  if cfg.enabled is not true or coalesce(cfg.function_url, '') = '' then
    return null;
  end if;

  select jsonb_object_agg(key, value)
    into payload
    from jsonb_each(to_jsonb(new))
   where key = any (string_to_array(tg_argv[1], ','));

  perform http_post(
    url     := cfg.function_url,
    body    := jsonb_build_object('event', tg_argv[0], 'record', coalesce(payload, '{}'::jsonb)),
    headers := jsonb_build_object(
                 'Content-Type',    'application/json',
                 'x-notify-secret', cfg.webhook_secret
               ),
    timeout_milliseconds := 8000
  );

  return null;
exception
  when others then
    -- A notification must never cost us a submission. Swallow and carry on.
    raise warning 'notify_submission(%) failed: %', tg_argv[0], sqlerrm;
    return null;
end;
$$;

revoke all on function private.notify_submission() from anon, authenticated;

-- ── Triggers ──────────────────────────────────────────────
drop trigger if exists notify_application_submitted on public.applications;
create trigger notify_application_submitted
  after insert on public.applications
  for each row execute function private.notify_submission(
    'application_submitted',
    'id,first_name,last_name,email,phone,pathway,substance,substance_other,duration,seeking_voluntarily,prev_treatment,created_at'
  );

drop trigger if exists notify_outpatient_booked on public.outpatient_bookings;
create trigger notify_outpatient_booked
  after insert on public.outpatient_bookings
  for each row execute function private.notify_submission(
    'outpatient_booked',
    'id,reference_code,patient_name,patient_email,patient_phone,booker_name,booker_email,booker_phone,booker_relationship,notes_from_booker,scheduled_at,status,payment_status,amount_paid_ngn'
  );

drop trigger if exists notify_financial_assistance on public.financial_assistance_applications;
create trigger notify_financial_assistance
  after insert on public.financial_assistance_applications
  for each row execute function private.notify_submission(
    'financial_assistance_submitted',
    'id,reference_code,applicant_name,applicant_phone,applicant_email,applicant_relationship,patient_name,household_size,monthly_income_band,pastoral_referrer_name,pastoral_referrer_org,documents,status'
  );

drop trigger if exists notify_donation_pledged on public.donations;
create trigger notify_donation_pledged
  after insert on public.donations
  for each row execute function private.notify_submission(
    'donation_pledged',
    'id,first_name,last_name,email,phone,amount,message,status,created_at'
  );
