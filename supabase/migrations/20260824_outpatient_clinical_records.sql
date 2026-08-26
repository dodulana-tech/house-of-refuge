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
