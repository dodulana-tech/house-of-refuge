-- House of Refuge — Remove UAT seed/test data before / at production launch.
-- Companion to seed_test_applications.sql. Safe to run in the Supabase SQL Editor
-- (runs as table owner, bypasses RLS) or via psql with the service-role/DB connection.
--
-- Deletes in child -> parent order to respect foreign keys:
--   checkins -> payments -> patients -> applications
-- Matches the same "[TEST DATA]" markers / test refs the seed used, so it only
-- ever touches seeded rows and never real applicant data.

BEGIN;

-- Show what will be removed (pre-delete counts)
SELECT '[TEST DATA] applications' AS table_name, COUNT(*) AS rows FROM applications WHERE notes LIKE '%[TEST DATA]%'
UNION ALL SELECT 'payments',  COUNT(*) FROM payments  WHERE description LIKE '%[TEST DATA]%' OR paystack_ref LIKE 'HOR_DEP_TEST_%'
UNION ALL SELECT 'patients',  COUNT(*) FROM patients  WHERE discharge_notes LIKE '%[TEST DATA]%'
UNION ALL SELECT 'checkins',  COUNT(*) FROM checkins  WHERE notes LIKE '%[TEST DATA]%';

-- 1. Check-ins (also cascade-deleted with patients, removed explicitly for clarity)
DELETE FROM checkins
 WHERE notes LIKE '%[TEST DATA]%'
    OR patient_id IN (SELECT id FROM patients WHERE discharge_notes LIKE '%[TEST DATA]%');

-- 2. Payments (reference both patients and applications)
DELETE FROM payments
 WHERE description LIKE '%[TEST DATA]%'
    OR paystack_ref LIKE 'HOR_DEP_TEST_%'
    OR application_id IN (SELECT id FROM applications WHERE notes LIKE '%[TEST DATA]%');

-- 3. Patients (reference applications)
DELETE FROM patients
 WHERE discharge_notes LIKE '%[TEST DATA]%'
    OR application_id IN (SELECT id FROM applications WHERE notes LIKE '%[TEST DATA]%');

-- 4. Applications
DELETE FROM applications
 WHERE notes LIKE '%[TEST DATA]%';

-- Verify nothing tagged remains (all counts should be 0)
SELECT '[TEST DATA] applications' AS table_name, COUNT(*) AS remaining FROM applications WHERE notes LIKE '%[TEST DATA]%'
UNION ALL SELECT 'payments',  COUNT(*) FROM payments  WHERE description LIKE '%[TEST DATA]%' OR paystack_ref LIKE 'HOR_DEP_TEST_%'
UNION ALL SELECT 'patients',  COUNT(*) FROM patients  WHERE discharge_notes LIKE '%[TEST DATA]%'
UNION ALL SELECT 'checkins',  COUNT(*) FROM checkins  WHERE notes LIKE '%[TEST DATA]%';

COMMIT;
