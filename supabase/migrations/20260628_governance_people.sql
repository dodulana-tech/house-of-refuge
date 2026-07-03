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
