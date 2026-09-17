-- House of Refuge: MECE admissions pipeline.
--
-- PROBLEM THIS SOLVES
-- A single `status` column was carrying three independent questions at once:
-- how far the file has got, who owes the next action, and how it will be paid
-- for. An applicant who is willing, clinically suitable and cannot afford the
-- deposit had no legal value in that enum, so the file simply sat at whatever
-- stage it had reached. That is why 39 applications stalled with nothing
-- recorded against them.
--
-- THE MODEL
-- Four independent axes, each with a mutually exclusive, collectively
-- exhaustive domain:
--
--   1. stage           where the file is in the funnel (8 ordered values)
--   2. disposition     who owes the next action (4 values)
--   3. gates           the four review questions, one column each
--   4. closure_reason  how the file ended (10 values, set only when closed)
--
-- `status` is kept as a DERIVED mirror of the new fields so existing readers
-- (Overview, report_active_applications.sql, any saved query) keep working.
-- Never write `status` directly: a trigger recomputes it on every insert and
-- update. The four axes are the source of truth.
--
-- NOTE: run this in the Supabase SQL Editor. It is not applied automatically
-- by the app. Idempotent, safe to re-run.

-- ── 1. The four axes ───────────────────────────────────────
alter table applications
  -- Axis 1: how far the file has got.
  add column if not exists stage text not null default 'submitted',
  -- Axis 2: who owes the next action. 'parked' requires a review date so that
  -- nothing can be put on hold and then quietly forgotten.
  add column if not exists disposition text not null default 'active-us',
  -- Axis 3: the review gates. Null means the question has not been asked yet.
  add column if not exists gate_contact text,
  add column if not exists gate_willingness text,
  add column if not exists gate_clinical_fit text,
  -- Gate D is the funding route, which is also a standing property of the file.
  add column if not exists funding_route text not null default 'undetermined',
  -- Axis 4: how it ended.
  add column if not exists closure_reason text,
  add column if not exists closure_note text,
  -- Supporting state.
  add column if not exists parked_until date,
  add column if not exists stage_entered_at timestamptz default now(),
  add column if not exists contact_attempts int not null default 0,
  add column if not exists fa_application_id uuid;

-- Reverse link, so a Freedom Foundation case knows which admission it belongs to.
alter table financial_assistance_applications
  add column if not exists application_id uuid;

-- Foreign keys added separately so the column adds above stay idempotent.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'applications_fa_application_id_fkey') then
    alter table applications add constraint applications_fa_application_id_fkey
      foreign key (fa_application_id) references financial_assistance_applications(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fa_application_id_fkey') then
    alter table financial_assistance_applications add constraint fa_application_id_fkey
      foreign key (application_id) references applications(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_applications_fa_link on applications(fa_application_id)
  where fa_application_id is not null;
create index if not exists idx_fa_application_link on financial_assistance_applications(application_id)
  where application_id is not null;

-- ── 2. Backfill from the legacy status ─────────────────────
-- Runs before the CHECK constraints go on, so existing rows cannot violate them.
-- Stage for rows that are already closed is approximate: the legacy data does
-- not record how far a declined or withdrawn file had actually travelled.
update applications set
  stage = case status
    when 'submitted'            then 'submitted'
    when 'pre-screening'        then 'screening-call'
    when 'clinical-assessment'  then 'clinical-assessment'
    when 'admission-decision'   then 'admission-decision'
    when 'documentation'        then 'documentation'
    when 'intake'               then 'intake'
    when 'treatment-planning'   then 'intake'
    when 'admitted'             then 'admitted'
    else 'screening-call'
  end,
  disposition = case
    when status in ('admitted', 'outpatient-pathway', 'referred', 'declined', 'withdrawn') then 'closed'
    when status = 'deferred' then 'parked'
    else 'active-us'
  end,
  closure_reason = case status
    when 'admitted'           then 'admitted'
    when 'outpatient-pathway' then 'routed-outpatient'
    when 'referred'           then 'referred-out'
    when 'declined'           then 'declined-by-hor'
    when 'withdrawn'          then 'withdrawn'
    else null
  end,
  -- Legacy 'deferred' files are parked. Give them a review date 14 days out so
  -- they surface on someone's list instead of ageing silently.
  parked_until = case when status = 'deferred' then (current_date + 14) else null end,
  stage_entered_at = coalesce(stage_entered_at, updated_at, created_at, now())
where stage = 'submitted' and disposition = 'active-us' and closure_reason is null;

-- A paid deposit is evidence the family is self-funding.
update applications
set funding_route = 'self-funded'
where deposit_paid = true and funding_route = 'undetermined';

-- ── 3. Constrain each axis ─────────────────────────────────
alter table applications drop constraint if exists applications_stage_check;
alter table applications add constraint applications_stage_check check (stage in (
  'submitted',            -- arrived, nobody has called yet
  'screening-call',       -- the Programme Director's review call
  'clinical-assessment',  -- psychiatrist
  'pastoral-interview',   -- mandatory, patient and family, after the psychiatrist
  'admission-decision',   -- MDT
  'documentation',        -- consents signed, funding settled
  'intake',               -- date set, arrival planned
  'admitted'              -- became a resident
));

alter table applications drop constraint if exists applications_disposition_check;
alter table applications add constraint applications_disposition_check check (disposition in (
  'active-us',      -- next action is ours
  'active-family',  -- next action is theirs
  'parked',         -- on hold, with a review date
  'closed'          -- no further action
));

alter table applications drop constraint if exists applications_gate_contact_check;
alter table applications add constraint applications_gate_contact_check check (
  gate_contact is null or gate_contact in ('reached', 'no-answer', 'unreachable')
);

alter table applications drop constraint if exists applications_gate_willingness_check;
alter table applications add constraint applications_gate_willingness_check check (
  gate_willingness is null or gate_willingness in ('voluntary', 'ambivalent', 'coerced')
);

alter table applications drop constraint if exists applications_gate_clinical_fit_check;
alter table applications add constraint applications_gate_clinical_fit_check check (
  gate_clinical_fit is null or gate_clinical_fit in ('residential', 'outpatient', 'out-of-scope')
);

alter table applications drop constraint if exists applications_funding_route_check;
alter table applications add constraint applications_funding_route_check check (funding_route in (
  'undetermined',          -- not yet asked
  'self-funded',           -- family pays the deposit
  'assistance-requested',  -- Freedom Foundation case open
  'assistance-approved',   -- sponsored place confirmed
  'assistance-declined',   -- assistance refused, needs another route
  'third-party'            -- employer, church or other sponsor
));

alter table applications drop constraint if exists applications_closure_reason_check;
alter table applications add constraint applications_closure_reason_check check (
  closure_reason is null or closure_reason in (
    'admitted',           -- became a resident
    'routed-outpatient',  -- became an outpatient client
    'referred-out',       -- sent to another provider, outside our scope
    'declined-by-hor',    -- did not meet criteria, or refused the terms
    'not-willing',        -- failed the willingness gateway
    'unfunded',           -- willing and suitable, every funding route failed
    'withdrawn',          -- reached at least once, then chose not to proceed
    'unreachable',        -- never reached after the agreed attempts
    'duplicate',          -- same person, another file
    'other'               -- requires closure_note, keeps the set exhaustive
  )
);

-- The axes have to agree with each other.
alter table applications drop constraint if exists applications_disposition_coherence;
alter table applications add constraint applications_disposition_coherence check (
  (disposition = 'closed' and closure_reason is not null)
  or (disposition = 'parked' and parked_until is not null and closure_reason is null)
  or (disposition in ('active-us', 'active-family') and closure_reason is null)
);

-- 'other' without a note is how taxonomies rot.
alter table applications drop constraint if exists applications_closure_note_required;
alter table applications add constraint applications_closure_note_required check (
  closure_reason is distinct from 'other'
  or (closure_note is not null and length(btrim(closure_note)) > 0)
);

-- ── 4. Keep the legacy `status` mirror in step ─────────────
-- One-way derivation: the four axes are authoritative, `status` follows.
create or replace function derive_application_status() returns trigger as $$
begin
  if new.disposition = 'closed' then
    new.status := case new.closure_reason
      when 'admitted'           then 'admitted'
      when 'routed-outpatient'  then 'outpatient-pathway'
      when 'referred-out'       then 'referred'
      when 'declined-by-hor'    then 'declined'
      when 'not-willing'        then 'declined'
      when 'withdrawn'          then 'withdrawn'
      when 'unreachable'        then 'withdrawn'
      when 'duplicate'          then 'withdrawn'
      else 'deferred'  -- 'unfunded' and 'other': the file may yet come back
    end;
  elsif new.disposition = 'parked' then
    new.status := 'deferred';
  else
    new.status := case new.stage
      when 'submitted'            then 'submitted'
      when 'screening-call'       then 'pre-screening'
      when 'clinical-assessment'  then 'clinical-assessment'
      when 'pastoral-interview'   then 'clinical-assessment'
      when 'admission-decision'   then 'admission-decision'
      when 'documentation'        then 'documentation'
      when 'intake'               then 'intake'
      when 'admitted'             then 'admitted'
    end;
  end if;

  if tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    new.stage_entered_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_derive_application_status on applications;
create trigger trg_derive_application_status
  before insert or update on applications
  for each row execute function derive_application_status();

-- ── 5. Contact log ─────────────────────────────────────────
-- Every call attempt, recorded. Without this there was no way to tell an
-- applicant nobody had rung from one who had refused three times.
create table if not exists application_contacts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  contacted_by uuid references profiles(id),
  contacted_by_name text,
  method text not null check (method in ('phone', 'whatsapp', 'email', 'sms', 'in-person')),
  outcome text not null check (outcome in (
    'reached', 'no-answer', 'wrong-number', 'call-back-requested', 'left-message'
  )),
  notes text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_app_contacts_application on application_contacts(application_id, occurred_at desc);

-- Keep the attempt counter on the application in step with the log.
create or replace function touch_application_contact_count() returns trigger as $$
begin
  update applications
  set contact_attempts = (
    select count(*) from application_contacts where application_id = new.application_id
  )
  where id = new.application_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_contact_count on application_contacts;
create trigger trg_touch_contact_count
  after insert on application_contacts
  for each row execute function touch_application_contact_count();

-- ── 6. Transition audit ────────────────────────────────────
-- Which gate was answered, what the answer was, who answered it. The reason a
-- file moved used to be collected in a dropdown and then discarded.
create table if not exists application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  actor_id uuid references profiles(id),
  actor_name text,
  gate text check (gate is null or gate in ('contact', 'willingness', 'clinical-fit', 'funding')),
  answer text,
  from_stage text, to_stage text,
  from_disposition text, to_disposition text,
  from_funding_route text, to_funding_route text,
  reason text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_events_application on application_events(application_id, created_at desc);

-- ── 7. Indexes for the worklist ────────────────────────────
create index if not exists idx_applications_disposition on applications(disposition);
create index if not exists idx_applications_stage on applications(stage);
create index if not exists idx_applications_funding_route on applications(funding_route);
create index if not exists idx_applications_parked_until on applications(parked_until)
  where disposition = 'parked';

-- ── 8. RLS on the new tables ───────────────────────────────
-- Same posture as `applications`: staff only, no anon read. These rows carry
-- call notes and decision reasoning about named people.
alter table application_contacts enable row level security;
alter table application_events enable row level security;

drop policy if exists app_contacts_staff_all on application_contacts;
create policy app_contacts_staff_all on application_contacts
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists app_events_staff_all on application_events;
create policy app_events_staff_all on application_events
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ── 9. Verify ──────────────────────────────────────────────
-- Where the pipeline actually stands, on the new axes.
select disposition, stage, funding_route, count(*)
from applications
group by disposition, stage, funding_route
order by disposition, stage;

-- Every file that owes us an action, oldest first. This is the worklist that
-- did not exist before.
select id, first_name, last_name, stage, funding_route,
       (current_date - stage_entered_at::date) as days_in_stage
from applications
where disposition = 'active-us'
order by stage_entered_at asc;
