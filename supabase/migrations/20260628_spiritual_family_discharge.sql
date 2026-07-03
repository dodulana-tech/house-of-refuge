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
