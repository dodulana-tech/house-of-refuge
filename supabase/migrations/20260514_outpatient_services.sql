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

-- Anonymous can read own booking by reference code (status page)
drop policy if exists bookings_public_select on outpatient_bookings;
create policy bookings_public_select on outpatient_bookings
  for select to anon using (true);

-- Authenticated staff have full access
drop policy if exists practitioners_authed on outpatient_practitioners;
create policy practitioners_authed on outpatient_practitioners
  for all to authenticated using (true) with check (true);

drop policy if exists services_authed on outpatient_services;
create policy services_authed on outpatient_services
  for all to authenticated using (true) with check (true);

drop policy if exists bookings_authed on outpatient_bookings;
create policy bookings_authed on outpatient_bookings
  for all to authenticated using (true) with check (true);

-- ── Seed practitioners ───────────────────────────────────────
insert into outpatient_practitioners (full_name, title, role_type, public, active, display_order)
values
  ('Dr Alex Adenuga',   'Specialist Psychiatrist', 'visiting', true, true, 10),
  ('Dr Toba Babarinsa', 'Specialist Psychiatrist', 'visiting', true, true, 20)
on conflict do nothing;

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
