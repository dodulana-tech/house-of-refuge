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
