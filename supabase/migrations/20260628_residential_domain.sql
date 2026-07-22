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
