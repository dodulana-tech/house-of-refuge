-- House of Refuge — Supabase Database Schema
-- Run this in your Supabase SQL Editor to set up all tables

-- ═══════════════════════════════════════════════
-- PROFILES (extends Supabase auth.users)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'family', 'staff', 'admin')),
  department TEXT,
  title TEXT,
  patient_id UUID REFERENCES profiles(id),  -- for family members, links to their patient
  relationship TEXT,  -- for family members
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Staff can read all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin'))
);

-- ═══════════════════════════════════════════════
-- APPLICATIONS
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Pathway & Willingness
  pathway TEXT CHECK (pathway IN ('A', 'B')),
  willingness_confirm TEXT,
  seeking_voluntarily TEXT,
  -- Patient info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  state TEXT,
  occupation TEXT,
  marital_status TEXT,
  -- Clinical
  substance TEXT NOT NULL,
  substance_other TEXT,
  co_substances TEXT,
  duration TEXT,
  frequency TEXT,
  route_of_use TEXT,
  prev_treatment TEXT,
  prev_treatment_details TEXT,
  medical_conditions TEXT,
  medications TEXT,
  mental_health TEXT,
  suicide_history TEXT,
  -- Exclusion screening
  active_psychosis TEXT DEFAULT 'no',
  antipsychotic_need TEXT DEFAULT 'no',
  severe_cognitive TEXT DEFAULT 'no',
  legal_detention TEXT DEFAULT 'no',
  children_cohabitation TEXT DEFAULT 'no',
  -- Insight & Readiness
  insight_level TEXT,
  insight_score INT,
  motivation_source TEXT,
  treatment_goals TEXT,
  change_readiness TEXT,
  trigger_awareness TEXT,
  previous_recovery_length TEXT,
  -- Support & Family
  family_awareness TEXT,
  family_support TEXT,
  primary_caregiver TEXT,
  caregiver_phone TEXT,
  caregiver_relationship TEXT,
  household_type TEXT,
  dependents TEXT,
  enablers_present TEXT,
  family_therapy_willing TEXT,
  financial_stability TEXT,
  housing_aftercare TEXT,
  support_group_access TEXT,
  -- Pathway A specifics
  pfsp_name TEXT,
  pfsp_phone TEXT,
  pfsp_relationship TEXT,
  family_consent_given TEXT,
  -- Pathway B specifics
  sponsor_type TEXT,
  community_partner TEXT,
  church_connection TEXT,
  -- Next of kin
  nok_name TEXT,
  nok_relationship TEXT,
  nok_phone TEXT,
  nok_email TEXT,
  nok_address TEXT,
  -- Referral
  referral_source TEXT,
  referral_details TEXT,
  -- Consent
  consent_admission BOOLEAN DEFAULT FALSE,
  consent_detox BOOLEAN DEFAULT FALSE,
  consent_confidentiality BOOLEAN DEFAULT FALSE,
  consent_rights BOOLEAN DEFAULT FALSE,
  consent_financial BOOLEAN DEFAULT FALSE,
  -- Payment
  deposit_paid BOOLEAN DEFAULT FALSE,
  payment_ref TEXT,
  deposit_amount INT DEFAULT 100000000,  -- kobo
  -- Status & Pipeline
  status TEXT DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'pre-screening', 'clinical-assessment', 'admission-decision',
    'documentation', 'intake', 'treatment-planning', 'admitted',
    'outpatient-pathway', 'referred', 'deferred', 'declined', 'withdrawn'
  )),
  assigned_to UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read all applications" ON applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin'))
);
CREATE POLICY "Staff can update applications" ON applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin'))
);
CREATE POLICY "Anyone can submit application" ON applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Applicants can read own application" ON applications FOR SELECT USING (
  email = (SELECT email FROM profiles WHERE id = auth.uid())
);

-- ═══════════════════════════════════════════════
-- PATIENTS (admitted residents)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  application_id UUID REFERENCES applications(id),
  -- Demographics
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  phone TEXT,
  email TEXT,
  -- Programme
  pathway TEXT CHECK (pathway IN ('A', 'B')),
  admitted_at TIMESTAMPTZ DEFAULT NOW(),
  expected_discharge DATE,
  actual_discharge TIMESTAMPTZ,
  current_phase TEXT DEFAULT 'stabilization' CHECK (current_phase IN (
    'stabilization', 'foundation', 'deepening', 'reintegration', 'graduated', 'discharged'
  )),
  day_in_programme INT DEFAULT 1,
  -- Clinical
  primary_substance TEXT,
  insight_level TEXT,
  assigned_counselor UUID REFERENCES profiles(id),
  -- Discharge
  discharge_type TEXT CHECK (discharge_type IN ('planned', 'administrative', 'clinical', 'self-discharge')),
  discharge_notes TEXT,
  -- Status
  status TEXT DEFAULT 'admitted' CHECK (status IN ('admitted', 'on-pass', 'suspended', 'graduated', 'discharged')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage patients" ON patients FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin'))
);
CREATE POLICY "Patients can read own record" ON patients FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Family can read linked patient" ON patients FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'family' AND patient_id = patients.id)
);

-- ═══════════════════════════════════════════════
-- CHECK-INS (daily wellness)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  mood INT CHECK (mood BETWEEN 1 AND 5),
  cravings INT CHECK (cravings BETWEEN 0 AND 5),
  anxiety INT CHECK (anxiety BETWEEN 0 AND 5),
  sleep TEXT,
  energy TEXT,
  appetite TEXT,
  triggers TEXT,
  coping_used TEXT,
  gratitude TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read all checkins" ON checkins FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin'))
);
CREATE POLICY "Patients can manage own checkins" ON checkins FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
);

-- ═══════════════════════════════════════════════
-- PAYMENTS
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  patient_id UUID REFERENCES patients(id),
  application_id UUID REFERENCES applications(id),
  amount INT NOT NULL,  -- in kobo
  currency TEXT DEFAULT 'NGN',
  type TEXT CHECK (type IN ('deposit', 'treatment-fee', 'medication', 'donation', 'sponsorship')),
  description TEXT,
  paystack_ref TEXT UNIQUE,
  paystack_status TEXT,
  verified BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage payments" ON payments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin'))
);
CREATE POLICY "Users can read own payments" ON payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Anyone can create payment" ON payments FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════
-- VISITATIONS
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS visitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  requested_by UUID REFERENCES profiles(id),
  requested_by_name TEXT,
  visit_date DATE NOT NULL,
  visit_time TEXT,
  visitors TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'completed', 'cancelled')),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE visitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage visitations" ON visitations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin'))
);
CREATE POLICY "Family can manage own visitations" ON visitations FOR ALL USING (
  requested_by = auth.uid()
);

-- ═══════════════════════════════════════════════
-- MEAL ORDERS (CookedIndoors integration)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS meal_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  order_date DATE NOT NULL,
  breakfast JSONB,
  lunch JSONB,
  dinner JSONB,
  dietary_preferences TEXT,
  allergies TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meal_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage meal orders" ON meal_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin'))
);
CREATE POLICY "Patients can manage own meals" ON meal_orders FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
);

-- ═══════════════════════════════════════════════
-- INCIDENTS (behavioral management, 3-tier system)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  reported_by UUID REFERENCES profiles(id),
  tier INT CHECK (tier IN (1, 2, 3)),
  type TEXT,
  description TEXT NOT NULL,
  response TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage incidents" ON incidents FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin'))
);

-- ═══════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
