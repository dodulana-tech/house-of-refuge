-- House of Refuge — Remove remaining @example.com test applications.
-- These rows were NOT covered by cleanup_test_data.sql (they carry no
-- "[TEST DATA]" marker); they are identified solely by their @example.com email.
-- Run in the Supabase SQL Editor (bypasses RLS) or via psql w/ service-role.
--
-- Deletes child -> parent to respect foreign keys:
--   checkins -> payments -> patients -> applications
-- SAFETY: matches ONLY emails ending in @example.com. Real applicant rows
-- (real email domains) are never touched. The pre/post SELECTs let you eyeball
-- exactly which rows go before COMMIT.

BEGIN;

-- Preview: which applications will be deleted
SELECT id, first_name, last_name, email, phone, status, created_at
  FROM applications
 WHERE email ILIKE '%@example.com'
 ORDER BY created_at;

-- 1. Check-ins for any patient tied to an @example.com application
DELETE FROM checkins
 WHERE patient_id IN (
   SELECT p.id FROM patients p
   JOIN applications a ON a.id = p.application_id
   WHERE a.email ILIKE '%@example.com'
 )
 OR patient_id IN (SELECT id FROM patients WHERE email ILIKE '%@example.com');

-- 2. Payments tied to an @example.com application/patient
DELETE FROM payments
 WHERE application_id IN (SELECT id FROM applications WHERE email ILIKE '%@example.com')
    OR patient_id IN (SELECT id FROM patients WHERE email ILIKE '%@example.com');

-- 3. Patients created from an @example.com application
DELETE FROM patients
 WHERE email ILIKE '%@example.com'
    OR application_id IN (SELECT id FROM applications WHERE email ILIKE '%@example.com');

-- 4. The applications themselves
DELETE FROM applications
 WHERE email ILIKE '%@example.com';

-- Verify: should be 0, and the surviving applications listed below should be the real ones
SELECT COUNT(*) AS remaining_example_rows FROM applications WHERE email ILIKE '%@example.com';
SELECT id, first_name, last_name, email, phone, status FROM applications ORDER BY created_at;

COMMIT;
