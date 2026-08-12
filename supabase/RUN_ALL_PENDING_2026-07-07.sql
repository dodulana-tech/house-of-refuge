-- ============================================================================
-- House of Refuge — ALL PENDING MIGRATIONS (bundled 2026-07-07)
-- Paste this whole file into Supabase → SQL Editor and Run. Idempotent.
-- Order matters; do not reorder.
-- ============================================================================


-- ####################################################################
-- >>> 20260628_patients_operational_fields.sql
-- ####################################################################

-- House of Refuge — operational fields on patients for the residential dashboards.
-- Adds the columns the Patient Records / Bed Management screens need so they can
-- run on real data instead of hardcoded samples. Idempotent.

ALTER TABLE patients ADD COLUMN IF NOT EXISTS bed TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS care_level TEXT DEFAULT 'residential';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS population_pathway TEXT DEFAULT 'standard';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS substance_pathway TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS counselor_code TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS age INT;

-- A bed can only be occupied by one active resident at a time.
CREATE UNIQUE INDEX IF NOT EXISTS patients_active_bed_unique
  ON patients (bed)
  WHERE bed IS NOT NULL AND status IN ('admitted', 'on-pass', 'suspended');

-- ####################################################################
-- >>> 20260628_clinical_domain.sql
-- ####################################################################

-- House of Refuge — Wave 2: clinical-domain tables.
-- Backs Clinical Notes, UDS Tracking, Medications/MAR, Medical Tests,
-- Detox Tracker, and assessments (URICA / ACE / Risk / outcomes).
-- All staff-managed (is_staff); patients may read their own rows.
-- Idempotent where practical.

-- ── Clinical notes (SOAP) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  author_code TEXT,
  type TEXT NOT NULL,
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Urine drug screens ────────────────────────────────────
CREATE TABLE IF NOT EXISTS uds_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  ordered_by_code TEXT,
  substances JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "Cannabis": "Negative", ... }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Medications + administration record (MAR) ─────────────
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dose TEXT,
  route TEXT,
  frequency TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  prescriber_code TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_administrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  administered_at TIMESTAMPTZ DEFAULT NOW(),
  administered_by_code TEXT,
  status TEXT DEFAULT 'given' CHECK (status IN ('given', 'refused', 'held', 'missed')),
  notes TEXT
);

-- ── Lab / medical tests ───────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  panel TEXT NOT NULL,
  ordered_date DATE DEFAULT CURRENT_DATE,
  result_date DATE,
  status TEXT DEFAULT 'ordered' CHECK (status IN ('ordered', 'pending', 'resulted', 'reviewed')),
  results JSONB DEFAULT '{}'::jsonb,
  ordered_by_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Detox monitoring (CIWA / COWS) ────────────────────────
CREATE TABLE IF NOT EXISTS detox_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  scale TEXT,                 -- 'CIWA-Ar' | 'COWS'
  score INT,
  day INT,
  symptoms JSONB DEFAULT '{}'::jsonb,
  meds_given TEXT,
  recorded_by_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Generic assessments (URICA / ACE / Risk / outcomes) ───
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,         -- 'urica' | 'ace' | 'risk' | 'outcome' | ...
  score INT,
  level TEXT,
  responses JSONB DEFAULT '{}'::jsonb,
  assessed_by_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS: staff manage all; patients read their own ────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clinical_notes','uds_tests','medications','medication_administrations',
    'lab_tests','detox_records','assessments'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t||'_staff_all', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff())', t||'_staff_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t||'_patient_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))',
      t||'_patient_read', t
    );
  END LOOP;
END $$;

-- Helpful indexes for per-patient lookups
CREATE INDEX IF NOT EXISTS clinical_notes_patient_idx ON clinical_notes (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS uds_tests_patient_idx ON uds_tests (patient_id, test_date DESC);
CREATE INDEX IF NOT EXISTS medications_patient_idx ON medications (patient_id, status);
CREATE INDEX IF NOT EXISTS med_admin_patient_idx ON medication_administrations (patient_id, administered_at DESC);
CREATE INDEX IF NOT EXISTS lab_tests_patient_idx ON lab_tests (patient_id, ordered_date DESC);
CREATE INDEX IF NOT EXISTS detox_patient_idx ON detox_records (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assessments_patient_idx ON assessments (patient_id, type, created_at DESC);

-- ####################################################################
-- >>> 20260628_treatment_plans.sql
-- ####################################################################

-- House of Refuge — Wave 2: per-patient treatment plans.
-- Backs the Treatment Plan Builder (Columbia Model) and the PRPP Builder.
-- One row per patient; the whole structured plan lives in the `plan` JSONB.
-- Staff-managed (is_staff); patients may read their own row.
--
-- NOTE: run this migration in the Supabase SQL Editor (it is not applied
-- automatically by the app).

CREATE TABLE IF NOT EXISTS treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  prpp JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by_code TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS: staff manage all; patients read their own ────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['treatment_plans'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t||'_staff_all', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff())', t||'_staff_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t||'_patient_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))',
      t||'_patient_read', t
    );
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS treatment_plans_patient_idx ON treatment_plans (patient_id);

-- ####################################################################
-- >>> 20260628_residential_domain.sql
-- ####################################################################

-- House of Refuge — Wave 3: residential & behavioural-operations tables.
-- Backs Pass Management, MDT Reviews, Inventory, Shift Scheduler and the
-- Daily Schedule attendance grid. Behavioural incidents reuse the existing
-- `incidents` table (see schema.sql). All staff-managed (is_staff); patients
-- may read their own per-patient rows where applicable.
--
-- NOTE: run this migration in the Supabase SQL Editor (it is not applied
-- automatically by the app).

-- ── Resident passes (SOP 5.4) ─────────────────────────────
CREATE TABLE IF NOT EXISTS passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                 -- '3hr' | '24hr' | '48hr' | 'emergency'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','denied','cancelled')),
  start_date DATE,
  end_date DATE,
  guardian TEXT,
  reason TEXT,
  returned_on_time BOOLEAN,
  substance_clear BOOLEAN,
  notes TEXT,
  requested_by_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── MDT meetings (one row per meeting; per-patient reviews in JSONB) ──
CREATE TABLE IF NOT EXISTS mdt_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date DATE,
  meeting_time TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  attendees JSONB DEFAULT '[]'::jsonb,
  reviews JSONB DEFAULT '{}'::jsonb,   -- { "<initials>": { concerns:[], decisions:[], nextReviewDate } }
  recorded_by_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Inventory items + requisitions ────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,                       -- 'medical' | 'medication' | 'equipment' | 'household'
  unit TEXT,
  current_qty NUMERIC DEFAULT 0,
  min_qty NUMERIC DEFAULT 0,
  max_qty NUMERIC DEFAULT 0,
  status TEXT,                         -- 'adequate' | 'low' | 'critical' | 'ordered'
  location TEXT,
  last_restocked DATE,
  expiry_date DATE,
  cost_per_unit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name TEXT,
  qty NUMERIC,
  urgency TEXT,
  supplier TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','ordered','received','cancelled')),
  requested_by_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Shift roster (one JSONB document per week) ────────────
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  schedule JSONB DEFAULT '{}'::jsonb,
  handovers JSONB DEFAULT '{}'::jsonb,
  updated_by_code TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Daily schedule attendance (per date/patient/slot) ─────
CREATE TABLE IF NOT EXISTS schedule_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attend_date DATE NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  slot INT NOT NULL,                   -- index into the day's schedule template
  status TEXT NOT NULL DEFAULT 'dash', -- 'check' | 'x' | 'dash'
  recorded_by_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (attend_date, patient_id, slot)
);

-- ── RLS: staff manage all; patients read their own rows ───
DO $$
DECLARE t TEXT;
BEGIN
  -- Tables with a patient_id column (staff manage + patient-read-own)
  FOREACH t IN ARRAY ARRAY['passes','schedule_attendance'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t||'_staff_all', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff())', t||'_staff_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t||'_patient_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))',
      t||'_patient_read', t
    );
  END LOOP;

  -- Staff-only operational tables (no per-patient read path)
  FOREACH t IN ARRAY ARRAY['mdt_reviews','inventory_items','inventory_orders','shifts'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t||'_staff_all', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff())', t||'_staff_all', t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS passes_patient_idx ON passes (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passes_status_idx ON passes (status);
CREATE INDEX IF NOT EXISTS mdt_reviews_date_idx ON mdt_reviews (meeting_date DESC);
CREATE INDEX IF NOT EXISTS inventory_items_category_idx ON inventory_items (category);
CREATE INDEX IF NOT EXISTS inventory_orders_status_idx ON inventory_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS schedule_attendance_date_idx ON schedule_attendance (attend_date, patient_id);

-- ####################################################################
-- >>> 20260628_spiritual_family_discharge.sql
-- ####################################################################

-- House of Refuge — Wave 4: spiritual formation, family/therapy, discharge,
-- alumni, life-skills, church placement, consent.
-- `progress_records` is a flexible one-row-per-(patient,domain) JSONB store
-- used by the several per-patient "builder/tracker" pages. Record-oriented
-- pages get their own tables. Visitation pages reuse the existing
-- `visitations` table (see schema.sql). All staff-managed (is_staff);
-- patients may read their own per-patient rows.
--
-- NOTE: run this migration in the Supabase SQL Editor (it is not applied
-- automatically by the app).

-- ── Flexible per-patient progress (domain-keyed JSONB) ────
-- domains: 'spiritual_formation','spiritual_milestones','fruit_of_spirit',
--          'life_skills','church_placement','discharge_checklist',
--          'outpatient_client', ...
CREATE TABLE IF NOT EXISTS progress_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by_code TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (patient_id, domain)
);

-- ── Therapy / counselling sessions (individual|family|group|outpatient) ──
CREATE TABLE IF NOT EXISTS therapy_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'individual',
  session_date DATE,
  session_time TEXT,
  therapist_code TEXT,
  modality TEXT,
  status TEXT DEFAULT 'scheduled',
  attendees JSONB DEFAULT '[]'::jsonb,
  data JSONB DEFAULT '{}'::jsonb,   -- notes, goals, homework, ratings, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Alumni / aftercare CRM ────────────────────────────────
CREATE TABLE IF NOT EXISTS alumni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  initials TEXT,
  full_name TEXT,
  discharge_date DATE,
  status TEXT DEFAULT 'active',
  risk_level TEXT,
  data JSONB DEFAULT '{}'::jsonb,    -- contact, check-ins, employment, sobriety
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Consent register (one row per patient + consent type) ─
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  granted BOOLEAN DEFAULT FALSE,
  signed_date DATE,
  data JSONB DEFAULT '{}'::jsonb,
  recorded_by_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (patient_id, consent_type)
);

-- ── Discharge events + readmission log ────────────────────
CREATE TABLE IF NOT EXISTS discharges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  discharge_date DATE,
  discharge_type TEXT,               -- 'planned' | 'ama' | 'transfer' | ...
  status TEXT DEFAULT 'in-progress',
  data JSONB DEFAULT '{}'::jsonb,    -- criteria checklist, aftercare plan
  readmission JSONB DEFAULT '{}'::jsonb,
  recorded_by_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  -- Tables with a patient_id column: staff manage + patient-read-own.
  FOREACH t IN ARRAY ARRAY['progress_records','therapy_sessions','consents','discharges'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t||'_staff_all', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff())', t||'_staff_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t||'_patient_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))',
      t||'_patient_read', t
    );
  END LOOP;

  -- alumni: staff-only (patient_id may be null after discharge).
  FOREACH t IN ARRAY ARRAY['alumni'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t||'_staff_all', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff())', t||'_staff_all', t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS progress_records_domain_idx ON progress_records (domain);
CREATE INDEX IF NOT EXISTS progress_records_patient_idx ON progress_records (patient_id, domain);
CREATE INDEX IF NOT EXISTS therapy_sessions_patient_idx ON therapy_sessions (patient_id, type, session_date DESC);
CREATE INDEX IF NOT EXISTS therapy_sessions_type_idx ON therapy_sessions (type, session_date DESC);
CREATE INDEX IF NOT EXISTS alumni_status_idx ON alumni (status);
CREATE INDEX IF NOT EXISTS consents_patient_idx ON consents (patient_id);
CREATE INDEX IF NOT EXISTS discharges_patient_idx ON discharges (patient_id, created_at DESC);

-- ####################################################################
-- >>> 20260628_governance_people.sql
-- ####################################################################

-- House of Refuge — Wave 5: governance & people tables.
-- Backs Staff Directory/Detail, Training Tracker, Donor CRM detail.
-- Board Reports, Outcome Tracking and Clinical Outcomes are READ-ONLY
-- aggregations over existing live tables (patients, payments, applications,
-- assessments, incidents) and need no new tables. Clinical Outcomes writes
-- AUDIT/DAST/PHQ-9 rows into the existing `assessments` table.
-- All staff-managed (is_staff).
--
-- NOTE: run this migration in the Supabase SQL Editor (it is not applied
-- automatically by the app).

-- ── Staff directory ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  full_name TEXT NOT NULL,
  role TEXT,
  department TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  start_date DATE,
  data JSONB DEFAULT '{}'::jsonb,   -- schedule, certifications, notes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Staff training records ────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  staff_code TEXT,
  module TEXT NOT NULL,
  status TEXT DEFAULT 'not-started',  -- 'not-started'|'in-progress'|'complete'
  completed_date DATE,
  expiry_date DATE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Donors CRM ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,                          -- 'individual'|'corporate'|'foundation'|...
  status TEXT DEFAULT 'active',
  total_given NUMERIC DEFAULT 0,
  email TEXT,
  phone TEXT,
  data JSONB DEFAULT '{}'::jsonb,     -- communications log, gifts, notes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS: staff-only manage across all three ───────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['staff','staff_training','donors'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t||'_staff_all', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff())', t||'_staff_all', t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS staff_status_idx ON staff (status);
CREATE INDEX IF NOT EXISTS staff_training_staff_idx ON staff_training (staff_id);
CREATE INDEX IF NOT EXISTS donors_status_idx ON donors (status);

-- ####################################################################
-- >>> 20260703_harden_role_security.sql
-- ####################################################################

-- House of Refuge — Harden account-role security (privilege-escalation fixes).
-- Run in the Supabase SQL Editor. Safe to run on a live database.
--
-- Closes two escalation paths reachable with the public anon key:
--   1. A logged-in user updating their OWN profiles.role to 'admin'
--      (the "Users can update own profile" RLS policy has no column guard).
--   2. A signup passing role='admin' in metadata, which handle_new_user
--      copied verbatim into profiles.role.
--
-- After this: self-service accounts can only ever be 'patient' or 'family';
-- 'staff'/'admin' can only be granted by an existing admin (or server-side
-- service-role / SQL Editor, which have no end-user JWT).

-- ── 1. Block role changes from end-user sessions unless the caller is admin ──
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL                 -- a real end-user session
     AND public.current_user_role() <> 'admin'  -- who is not an admin
  THEN
    RAISE EXCEPTION 'Only an administrator may change an account role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- ── 2. Signups can only self-assign 'patient' or 'family' ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    CASE WHEN requested_role IN ('patient', 'family') THEN requested_role ELSE 'patient' END
  );
  RETURN NEW;
END;
$$;

-- Trigger already exists (on_auth_user_created) and points at handle_new_user;
-- redefining the function above is sufficient.

-- ── Verify (optional) ──
-- Expect: any UPDATE that changes role as a non-admin user raises the exception.
-- Expect: a new signup with metadata role='admin' still lands as 'patient'.

-- ####################################################################
-- >>> 20260711_programme_kpis.sql
-- ####################################################################

-- Programme KPIs — quarterly board-level metrics (Treatment Protocol Section 18.3)
-- Stores the actual value + status per KPI, per quarter/year. The KPI framework
-- (names, targets, evidence basis) lives in the app as config; only the measured
-- values are data. Empty until staff enter a quarter's figures — no seeded numbers.

CREATE TABLE IF NOT EXISTS programme_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  quarter TEXT NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  kpi_key TEXT NOT NULL,            -- stable key, e.g. 'graduation_rate'
  value NUMERIC,
  status TEXT,                      -- 'On Target' | 'Below Target' | 'Critical' | 'Tracking'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (year, quarter, kpi_key)
);

ALTER TABLE programme_kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS programme_kpis_staff_all ON programme_kpis;
CREATE POLICY programme_kpis_staff_all ON programme_kpis
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE INDEX IF NOT EXISTS programme_kpis_period_idx ON programme_kpis (year, quarter);

-- Force PostgREST to reload schema cache
notify pgrst, 'reload schema';
