-- ============================================================================
-- HOR — PENDING MIGRATION CATCH-UP  (generated 2026-08-24)
--
-- Run this WHOLE file in the Supabase dashboard -> SQL Editor.
-- Every statement is idempotent, so it is safe to re-run.
--
-- This SUPERSEDES supabase/RUN_PENDING_2026-08-11.sql. Run this one instead.
-- If you already ran the 08-11 file, run this one anyway: it is idempotent and
-- it repairs the duplicate-trigger problem described below.
--
-- WHAT IS STILL UNRUN
--   * applications.deposit_request_*      deposit-request tracking (COLUMNS, not
--       a table. The 08-11 file's header called this `deposit_requests` and told
--       you to verify with `select count(*) from deposit_requests`, which errors
--       even on a fully successful run. There is no such table.)
--   * outpatient_services / _practitioners / _bookings
--       Everything in src/utils/outpatient.js targets these. Without them public
--       outpatient bookings 404 on insert and are lost.
--   * applications.pastoral_interview_* and
--     financial_assistance_applications.pastoral_interview_*
--       The mandatory pastoral interview step. Also COLUMNS, not a
--       `pastoral_interviews` table; same error in the 08-11 header.
--   * admin_set_role / admin_update_profile / role_change_log
--       Without these a new staff account stays role='patient', is_staff() is
--       false, and they land on the resident dashboard unable to read anything.
--   * notification_log / private.notification_config + submission triggers
--   * outpatient_clients / outpatient_encounters   (NEW, 2026-08-24)
--       Outpatient consults had nowhere to be documented: a booking carried one
--       overwritable free-text notes column and there was no client entity, so a
--       repeat attender was N unrelated rows. Depends on outpatient_services
--       above, which is why the order in this file matters.
--
-- ONE DELIBERATE SUBSTITUTION
--   The 08-11 catch-up file embedded 20260808_email_notifications. That has
--   since been replaced by 20260810_email_notifications (the Zoho SMTP work),
--   which forwards a column whitelist instead of just the row id. This file
--   carries the 08-10 version ONLY.
--
--   The two are not safely stackable. 20260808 creates the financial-assistance
--   trigger as `notify_financial_assistance_submitted`; 20260810 creates it as
--   `notify_financial_assistance` and only drops its own name. Running 08-08 and
--   then 08-10 leaves BOTH on the table, so every financial assistance
--   submission dispatches two notifications and the applicant gets duplicate
--   mail. The explicit drop below removes the stale one if it is there.
--
-- AFTER RUNNING, VERIFY.
--
--   -- tables (each should return a count, not an error):
--   select count(*) from outpatient_bookings;
--   select count(*) from role_change_log;
--   select count(*) from notification_log;
--   select count(*) from outpatient_clients;
--   select count(*) from outpatient_encounters;
--
--   -- columns (expect 6 rows):
--   select table_name, column_name from information_schema.columns
--    where (table_name = 'applications' and column_name in
--             ('deposit_request_sent_at', 'deposit_request_count', 'pastoral_interview_status'))
--       or (table_name = 'financial_assistance_applications' and column_name in
--             ('pastoral_interview_status', 'pastoral_interview_scheduled_at',
--              'pastoral_interview_completed_at'))
--    order by 1, 2;
--
--   -- exactly one notification trigger per submission table (4 rows):
--   select c.relname, t.tgname from pg_trigger t
--     join pg_class c on c.oid = t.tgrelid
--    where not t.tgisinternal and t.tgname like 'notify%' order by 1,2;
--
-- AFTER THAT, point the notifier at the deployed Edge Function by running
-- supabase/setup-email.sh (it emits the UPDATE that fills in the URL and secret
-- and flips `enabled` to true). Until then `enabled` is false and no mail is
-- attempted.
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
-- REPAIR: de-duplicate the practitioner roster and retire Dr Alex Adenuga.
--
-- Must run BEFORE the outpatient_services section below, which ends by creating
-- a UNIQUE index on outpatient_practitioners(full_name). That index cannot be
-- built while duplicates exist and the whole file aborts with 23505.
--
-- The duplicates exist because the original seed used a bare `on conflict do
-- nothing` with no unique index to conflict against, so every run of that
-- migration inserted another copy of each doctor.
--
-- Dr Alex Adenuga left HOR on 2026-08-12. He is deleted only if no booking ever
-- referenced him; if any did, he is deactivated instead, because deleting a
-- clinician who actually saw patients would null out practitioner_id on those
-- bookings and lose the record of who provided the care. Either way he stops
-- appearing on the public site and in the booking picker.
-- ===========================================================================

do $$
declare
  n_dupes int;
  n_bookings int;
begin
  if to_regclass('public.outpatient_practitioners') is null then
    return;  -- fresh database; the seed below will create a clean roster
  end if;

  -- Repoint any bookings at the row being kept, so de-duplication cannot
  -- orphan them.
  if to_regclass('public.outpatient_bookings') is not null then
    with keep as (
      select distinct on (full_name) id, full_name
        from public.outpatient_practitioners
       order by full_name, created_at, id
    )
    update public.outpatient_bookings b
       set practitioner_id = k.id
      from public.outpatient_practitioners p
      join keep k on k.full_name = p.full_name
     where b.practitioner_id = p.id
       and b.practitioner_id is distinct from k.id;
  end if;

  -- Keep the earliest row per name, drop the rest.
  with keep as (
    select distinct on (full_name) id
      from public.outpatient_practitioners
     order by full_name, created_at, id
  )
  delete from public.outpatient_practitioners
   where id not in (select id from keep);
  get diagnostics n_dupes = row_count;
  raise notice 'removed % duplicate practitioner row(s)', n_dupes;

  -- Retire the departed clinician.
  select count(*) into n_bookings
    from public.outpatient_bookings b
    join public.outpatient_practitioners p on p.id = b.practitioner_id
   where p.full_name = 'Dr Alex Adenuga';

  if n_bookings > 0 then
    update public.outpatient_practitioners
       set active = false, public = false
     where full_name = 'Dr Alex Adenuga';
    raise notice 'Dr Alex Adenuga deactivated (% booking(s) reference him)', n_bookings;
  else
    delete from public.outpatient_practitioners where full_name = 'Dr Alex Adenuga';
    raise notice 'Dr Alex Adenuga removed (no bookings referenced him)';
  end if;
end $$;


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

-- Dr Alex Adenuga was on the launch roster but is no longer with HOR
-- (2026-08-12), so he is not seeded. See RUN_update_practitioner_roster.sql
-- for the statement that retires him from an already-seeded database.
insert into outpatient_practitioners (full_name, title, role_type, public, active, display_order)
values
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
-- REPAIR: remove the superseded 2026-08-08 financial-assistance trigger.
-- Only present if RUN_PENDING_2026-08-11.sql was already run. Left in place
-- it would double every financial assistance notification.
-- ===========================================================================

drop trigger if exists notify_financial_assistance_submitted on public.financial_assistance_applications;


-- ===========================================================================
-- SOURCE: supabase/migrations/20260810_email_notifications.sql
-- ===========================================================================

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


-- ===========================================================================
-- SOURCE: supabase/migrations/20260824_outpatient_clinical_records.sql
-- ===========================================================================

-- House of Refuge — Outpatient clinical records.
--
-- WHY THIS EXISTS
--   Outpatient consults had nowhere to be documented. `outpatient_bookings`
--   carried two free-text columns (clinical_notes, outcome_summary) with no
--   author, no session date, no sign-off, and one slot per booking, so a second
--   consult overwrote the first. There was also no client entity: a repeat
--   attender was N unrelated bookings keyed by a name typed into a public form.
--   Every real clinical module (clinical_notes, therapy_sessions, risk
--   assessments) keys off patients.id, which an outpatient never gets.
--
--   This adds the missing pair:
--     outpatient_clients     one record per person, deduped across bookings
--     outpatient_encounters  one authored, signed note per session
--
--   Run this WHOLE file in the Supabase dashboard -> SQL Editor.
--   Every statement is idempotent, so it is safe to re-run.
--
--   AFTER RUNNING, VERIFY:
--     select count(*) from outpatient_clients;
--     select count(*) from outpatient_encounters;
--     select count(*) from outpatient_bookings where client_id is not null;

create extension if not exists "pgcrypto";

-- Defined by 20260514_outpatient_services.sql, restated here so this file can
-- be run on its own without ordering assumptions.
create or replace function touch_outpatient_updated_at() returns trigger as $$
begin new.updated_at := now(); return new; end;
$$ language plpgsql;

-- ── Phone normalisation ──────────────────────────────────────
-- Nigerian numbers arrive as 0801..., +234801..., 234 801..., with spaces and
-- dashes. Dedup has to see those as one number. IMMUTABLE so it can back an
-- index.
create or replace function outpatient_normalize_phone(p text)
returns text as $$
declare d text;
begin
  if p is null then return null; end if;
  d := regexp_replace(p, '[^0-9]', '', 'g');
  if d = '' then return null; end if;
  if length(d) > 10 and left(d, 3) = '234' then d := substr(d, 4); end if;
  if length(d) > 10 and left(d, 1) = '0' then d := substr(d, 2); end if;
  return right(d, 10);
end;
$$ language plpgsql immutable;

-- ── Clients ──────────────────────────────────────────────────
create table if not exists outpatient_clients (
  id uuid primary key default gen_random_uuid(),
  client_code text unique not null,

  full_name text not null,
  date_of_birth date,
  age integer,                      -- the public booking form collects age, not DOB
  gender text,
  phone text,
  phone_normalized text generated always as (outpatient_normalize_phone(phone)) stored,
  email text,
  address text,

  next_of_kin_name text,
  next_of_kin_phone text,
  next_of_kin_relationship text,

  primary_concern text,
  primary_substance text,
  referral_source text,

  status text not null default 'active'
    check (status in ('active', 'inactive', 'discharged', 'converted_to_inpatient')),
  -- Set when an outpatient client is admitted; links the two records so the
  -- outpatient history survives the transition.
  patient_id uuid references patients(id) on delete set null,

  first_seen_at timestamptz,
  last_seen_at timestamptz,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dedup key is name + phone, not phone alone: a parent books for two children
-- on one number, and a bare phone constraint would silently merge them into one
-- clinical record.
create unique index if not exists outpatient_clients_name_phone_key
  on outpatient_clients (lower(full_name), phone_normalized)
  where phone_normalized is not null;

create index if not exists idx_outpatient_clients_phone on outpatient_clients (phone_normalized);
create index if not exists idx_outpatient_clients_email on outpatient_clients (lower(email));
create index if not exists idx_outpatient_clients_name on outpatient_clients (lower(full_name));
create index if not exists idx_outpatient_clients_status on outpatient_clients (status);
create index if not exists idx_outpatient_clients_last_seen on outpatient_clients (last_seen_at desc nulls last);

create or replace function gen_outpatient_client_code() returns trigger as $$
begin
  if new.client_code is null or new.client_code = '' then
    loop
      new.client_code := 'OPC-' || lpad(floor(random() * 1000000)::text, 6, '0');
      exit when not exists (select 1 from outpatient_clients where client_code = new.client_code);
    end loop;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_gen_outpatient_client_code on outpatient_clients;
create trigger trg_gen_outpatient_client_code
  before insert on outpatient_clients
  for each row execute function gen_outpatient_client_code();

drop trigger if exists trg_touch_outpatient_clients on outpatient_clients;
create trigger trg_touch_outpatient_clients
  before update on outpatient_clients
  for each row execute function touch_outpatient_updated_at();

-- ── Link bookings to clients ─────────────────────────────────
alter table outpatient_bookings
  add column if not exists client_id uuid references outpatient_clients(id) on delete set null;

create index if not exists idx_bookings_client on outpatient_bookings(client_id);

-- ── Encounters (one clinical note per session) ───────────────
create table if not exists outpatient_encounters (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references outpatient_clients(id) on delete cascade,
  booking_id uuid references outpatient_bookings(id) on delete set null,
  service_id uuid references outpatient_services(id) on delete set null,
  practitioner_id uuid references outpatient_practitioners(id) on delete set null,

  author_id uuid references profiles(id),
  author_code text,                 -- display name captured at write time

  encounter_date timestamptz not null default now(),
  duration_minutes integer,
  encounter_type text not null default 'consultation'
    check (encounter_type in ('consultation', 'therapy', 'counselling', 'family_therapy',
                              'assessment', 'diagnostic', 'detox_review', 'aftercare',
                              'phone_review', 'addendum')),
  attendance text not null default 'attended'
    check (attendance in ('attended', 'telehealth', 'did_not_attend', 'cancelled')),

  presenting_complaint text,
  subjective text,
  objective text,
  assessment text,
  plan text,
  diagnosis text,
  medications text,

  risk_flag text not null default 'none'
    check (risk_flag in ('none', 'low', 'moderate', 'high', 'immediate')),
  risk_notes text,
  -- Workflow state for the Safeguarding panel, separate from the clinical
  -- judgement in risk_flag so a signed note stays immutable while the concern
  -- is worked.
  risk_status text not null default 'none'
    check (risk_status in ('none', 'open', 'escalated', 'resolved')),
  risk_reviewed_by uuid references profiles(id),
  risk_reviewed_at timestamptz,
  risk_outcome text,

  follow_up_required boolean not null default false,
  follow_up_at date,
  follow_up_status text not null default 'none'
    check (follow_up_status in ('none', 'pending', 'booked', 'completed', 'declined', 'lost_to_follow_up')),
  follow_up_booking_id uuid references outpatient_bookings(id) on delete set null,
  follow_up_notes text,

  -- An addendum is its own row pointing at the note it amends; signed notes are
  -- never edited in place.
  amends_encounter_id uuid references outpatient_encounters(id) on delete set null,

  signed_by uuid references profiles(id),
  signed_by_name text,
  signed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_encounters_client on outpatient_encounters(client_id, encounter_date desc);
create index if not exists idx_encounters_booking on outpatient_encounters(booking_id);
create index if not exists idx_encounters_practitioner on outpatient_encounters(practitioner_id);
create index if not exists idx_encounters_signed on outpatient_encounters(signed_at);
create index if not exists idx_encounters_followup
  on outpatient_encounters(follow_up_at)
  where follow_up_required = true and follow_up_status in ('pending', 'booked');
create index if not exists idx_encounters_risk
  on outpatient_encounters(risk_flag)
  where risk_status in ('open', 'escalated');

drop trigger if exists trg_touch_outpatient_encounters on outpatient_encounters;
create trigger trg_touch_outpatient_encounters
  before update on outpatient_encounters
  for each row execute function touch_outpatient_updated_at();

-- ── Signed notes are immutable ───────────────────────────────
-- Once signed, the clinical content is a record of what the clinician attested
-- to. Corrections go in an addendum row (encounter_type = 'addendum',
-- amends_encounter_id = the original). Only the risk and follow-up WORKFLOW
-- columns stay writable, so safeguarding and recall can be worked afterwards.
create or replace function outpatient_lock_signed_encounter() returns trigger as $$
begin
  if old.signed_at is null then
    return new;
  end if;

  if new.signed_at is distinct from old.signed_at
     or new.signed_by is distinct from old.signed_by
     or new.client_id is distinct from old.client_id
     or new.booking_id is distinct from old.booking_id
     or new.encounter_date is distinct from old.encounter_date
     or new.encounter_type is distinct from old.encounter_type
     or new.attendance is distinct from old.attendance
     or new.presenting_complaint is distinct from old.presenting_complaint
     or new.subjective is distinct from old.subjective
     or new.objective is distinct from old.objective
     or new.assessment is distinct from old.assessment
     or new.plan is distinct from old.plan
     or new.diagnosis is distinct from old.diagnosis
     or new.medications is distinct from old.medications
     or new.risk_flag is distinct from old.risk_flag
     or new.risk_notes is distinct from old.risk_notes
  then
    raise exception
      'Encounter % is signed and cannot be edited. Record an addendum instead.', old.id
      using errcode = '42501';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_lock_signed_encounter on outpatient_encounters;
create trigger trg_lock_signed_encounter
  before update on outpatient_encounters
  for each row execute function outpatient_lock_signed_encounter();

-- ── Signing side effects ─────────────────────────────────────
-- On signature: complete the booking, open the safeguarding concern if the
-- clinician raised risk above 'low', arm the recall if they set a follow-up
-- date, and roll the client's last-seen forward.
create or replace function outpatient_on_encounter_signed() returns trigger as $$
begin
  if new.signed_at is null or (tg_op = 'UPDATE' and old.signed_at is not null) then
    return new;
  end if;

  if new.risk_flag in ('moderate', 'high', 'immediate') and new.risk_status = 'none' then
    update outpatient_encounters set risk_status = 'open' where id = new.id;
  end if;

  if new.follow_up_required and new.follow_up_status = 'none' then
    update outpatient_encounters set follow_up_status = 'pending' where id = new.id;
  end if;

  -- Don't resurrect a booking the front desk already closed off.
  if new.booking_id is not null then
    update outpatient_bookings
       set status = case
                      when new.attendance = 'did_not_attend' then 'no_show'
                      when new.attendance = 'cancelled' then 'cancelled'
                      else 'completed'
                    end
     where id = new.booking_id
       and status not in ('cancelled', 'no_show', 'rescheduled');
  end if;

  update outpatient_clients
     set last_seen_at  = greatest(coalesce(last_seen_at, new.encounter_date), new.encounter_date),
         first_seen_at = least(coalesce(first_seen_at, new.encounter_date), new.encounter_date)
   where id = new.client_id;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_encounter_signed on outpatient_encounters;
create trigger trg_encounter_signed
  after insert or update of signed_at on outpatient_encounters
  for each row execute function outpatient_on_encounter_signed();

-- ── Booking -> client linking ────────────────────────────────
-- Called when a booking is checked in or a note is started. Matches an existing
-- client on name+phone, then name+email, and only creates a new record if
-- neither hits. SECURITY DEFINER so it can read across clients while the caller
-- is still gated by is_staff() below.
create or replace function outpatient_link_booking_to_client(p_booking_id uuid)
returns uuid as $$
declare
  b record;
  v_client_id uuid;
  v_phone text;
begin
  if not public.is_staff() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  select * into b from outpatient_bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking % not found', p_booking_id;
  end if;
  if b.client_id is not null then
    return b.client_id;
  end if;

  v_phone := outpatient_normalize_phone(coalesce(b.patient_phone, b.booker_phone));

  if v_phone is not null then
    select id into v_client_id from outpatient_clients
     where phone_normalized = v_phone
       and lower(full_name) = lower(b.patient_name)
     limit 1;
  end if;

  if v_client_id is null and b.patient_email is not null and b.patient_email <> '' then
    select id into v_client_id from outpatient_clients
     where lower(email) = lower(b.patient_email)
       and lower(full_name) = lower(b.patient_name)
     limit 1;
  end if;

  if v_client_id is null then
    insert into outpatient_clients (full_name, age, phone, email, first_seen_at, last_seen_at)
    values (b.patient_name, b.patient_age, coalesce(b.patient_phone, b.booker_phone),
            nullif(b.patient_email, ''), b.scheduled_at, b.scheduled_at)
    on conflict (lower(full_name), phone_normalized) where phone_normalized is not null
      do update set updated_at = now()
    returning id into v_client_id;
  end if;

  update outpatient_bookings set client_id = v_client_id where id = p_booking_id;

  update outpatient_clients
     set first_seen_at = least(coalesce(first_seen_at, b.scheduled_at), b.scheduled_at),
         last_seen_at  = greatest(coalesce(last_seen_at, b.scheduled_at), b.scheduled_at)
   where id = v_client_id;

  return v_client_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function outpatient_link_booking_to_client(uuid) from public, anon;
grant execute on function outpatient_link_booking_to_client(uuid) to authenticated;

-- ── RLS ──────────────────────────────────────────────────────
-- Both tables are clinical PII. Staff only, never anon, and not merely
-- "authenticated" (a resident or family login is authenticated too).
alter table outpatient_clients enable row level security;
alter table outpatient_encounters enable row level security;

drop policy if exists outpatient_clients_staff on outpatient_clients;
create policy outpatient_clients_staff on outpatient_clients
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists outpatient_encounters_staff on outpatient_encounters;
create policy outpatient_encounters_staff on outpatient_encounters
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ── Backfill ─────────────────────────────────────────────────
-- Existing bookings become clients, and the legacy free-text clinical_notes /
-- outcome_summary become one signed-off historical encounter each so nothing
-- already written is stranded.
do $$
declare b record; v_client_id uuid; v_phone text;
begin
  for b in
    select * from outpatient_bookings where client_id is null order by scheduled_at asc
  loop
    v_phone := outpatient_normalize_phone(coalesce(b.patient_phone, b.booker_phone));
    v_client_id := null;

    if v_phone is not null then
      select id into v_client_id from outpatient_clients
       where phone_normalized = v_phone and lower(full_name) = lower(b.patient_name) limit 1;
    end if;

    if v_client_id is null and coalesce(b.patient_email, '') <> '' then
      select id into v_client_id from outpatient_clients
       where lower(email) = lower(b.patient_email) and lower(full_name) = lower(b.patient_name) limit 1;
    end if;

    if v_client_id is null then
      insert into outpatient_clients (full_name, age, phone, email, first_seen_at, last_seen_at)
      values (b.patient_name, b.patient_age, coalesce(b.patient_phone, b.booker_phone),
              nullif(b.patient_email, ''), b.scheduled_at, b.scheduled_at)
      on conflict (lower(full_name), phone_normalized) where phone_normalized is not null
        do update set updated_at = now()
      returning id into v_client_id;
    end if;

    update outpatient_bookings set client_id = v_client_id where id = b.id;

    update outpatient_clients
       set first_seen_at = least(coalesce(first_seen_at, b.scheduled_at), b.scheduled_at),
           last_seen_at  = greatest(coalesce(last_seen_at, b.scheduled_at), b.scheduled_at)
     where id = v_client_id;

    if coalesce(b.clinical_notes, '') <> '' or coalesce(b.outcome_summary, '') <> '' then
      insert into outpatient_encounters (
        client_id, booking_id, service_id, practitioner_id, author_code,
        encounter_date, encounter_type, attendance,
        subjective, assessment, plan,
        signed_by_name, signed_at
      )
      select v_client_id, b.id, b.service_id, b.practitioner_id, 'Migrated record',
             b.scheduled_at, 'consultation',
             case when b.status = 'no_show' then 'did_not_attend'
                  when b.status = 'cancelled' then 'cancelled'
                  else 'attended' end,
             b.clinical_notes, b.outcome_summary,
             'Migrated from the pre-2026-08-24 booking notes field. Not clinician-attested.',
             'Migrated record', b.updated_at
      where not exists (
        select 1 from outpatient_encounters e where e.booking_id = b.id
      );
    end if;
  end loop;
end $$;

comment on column outpatient_bookings.clinical_notes is
  'DEPRECATED 2026-08-24. Superseded by outpatient_encounters. Retained read-only so migrated rows keep their source.';
comment on column outpatient_bookings.outcome_summary is
  'DEPRECATED 2026-08-24. Superseded by outpatient_encounters.assessment.';

-- ── Signed notes cannot be deleted ───────────────────────────
-- The lock trigger above only covers UPDATE. Without this, an immutable record
-- is still one DELETE away from gone, which is not an immutable record.
create or replace function outpatient_block_signed_delete() returns trigger as $$
begin
  if old.signed_at is not null then
    raise exception
      'Encounter % is signed and cannot be deleted. Record an addendum instead.', old.id
      using errcode = '42501';
  end if;
  return old;
end;
$$ language plpgsql;

drop trigger if exists trg_block_signed_encounter_delete on outpatient_encounters;
create trigger trg_block_signed_encounter_delete
  before delete on outpatient_encounters
  for each row execute function outpatient_block_signed_delete();

-- Deleting a client would cascade its encounters and take signed notes with it,
-- routing around the guard above. Clients are retired via status instead.
create or replace function outpatient_block_client_delete() returns trigger as $$
begin
  if exists (select 1 from outpatient_encounters
              where client_id = old.id and signed_at is not null) then
    raise exception
      'Client % has signed clinical notes and cannot be deleted. Set status to inactive or discharged instead.', old.client_code
      using errcode = '42501';
  end if;
  return old;
end;
$$ language plpgsql;

drop trigger if exists trg_block_client_delete on outpatient_clients;
create trigger trg_block_client_delete
  before delete on outpatient_clients
  for each row execute function outpatient_block_client_delete();


-- Force PostgREST to pick up the new tables and functions.
notify pgrst, 'reload schema';
