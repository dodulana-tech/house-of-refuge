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
