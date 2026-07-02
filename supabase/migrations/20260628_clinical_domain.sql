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
