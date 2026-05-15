-- House of Refuge — Test data seed for client UAT
-- Run in Supabase SQL Editor. All rows tagged with notes containing
-- "[TEST DATA]" so they are easy to find and delete before production launch:
--   DELETE FROM applications WHERE notes LIKE '%[TEST DATA]%';
--   DELETE FROM patients     WHERE discharge_notes LIKE '%[TEST DATA]%';
--   DELETE FROM payments     WHERE description LIKE '%[TEST DATA]%';

BEGIN;

-- ───────────────────────────────────────────────────────────────────
-- APPLICATIONS — 9 rows covering every pipeline state
-- ───────────────────────────────────────────────────────────────────

-- Stage 1: Just submitted (no deposit requested yet)
INSERT INTO applications (
  id, pathway, willingness_confirm, first_name, last_name, date_of_birth, gender,
  phone, email, address, state, occupation, marital_status,
  substance, duration, frequency, route_of_use, prev_treatment,
  insight_level, insight_score, motivation_source, change_readiness,
  family_awareness, family_support, pfsp_name, pfsp_phone, pfsp_relationship,
  nok_name, nok_relationship, nok_phone, nok_email,
  consent_admission, consent_detox, consent_confidentiality, consent_rights, consent_financial,
  status, deposit_paid, notes, created_at
) VALUES
('11111111-1111-1111-1111-111111111111', 'A', 'yes',
 'Tunde', 'Bakare', '1992-03-14', 'Male',
 '+2348012345601', 'tunde.test@example.com', '12 Admiralty Way, Lekki', 'Lagos', 'Software developer', 'Married',
 'Cannabis / Marijuana', '5–10 years', 'Daily', 'Smoking / Inhalation', '1 attempt',
 'preparation', 4, 'Self-motivated', 'fully',
 'fully', 'strong', 'Bukola Bakare', '+2348012345602', 'Spouse',
 'Bukola Bakare', 'Spouse', '+2348012345602', 'bukola.test@example.com',
 true, true, true, true, true,
 'submitted', false, '[TEST DATA] Just-submitted Pathway A — fresh application, awaiting admin review',
 NOW() - INTERVAL '2 hours'),

('22222222-2222-2222-2222-222222222222', 'B', 'family_persuaded',
 'Adaeze', 'Okonkwo', '1988-11-02', 'Female',
 '+2348012345603', 'adaeze.test@example.com', 'No fixed address', 'Lagos', 'Trader (informal)', 'Single',
 'Tramadol / Codeine', '2–5 years', 'Daily', 'Oral', 'None',
 'contemplation', 3, 'Family pressure', 'mostly',
 'partially', 'weak', NULL, NULL, NULL,
 'Pastor John Eze', 'Pastor', '+2348012345604', 'pastor.test@example.com',
 true, true, true, true, true,
 'submitted', false, '[TEST DATA] Pathway B — community sponsorship pending, no fixed address',
 NOW() - INTERVAL '1 day');

-- Stage 2: Pre-screening — deposit request EMAIL SENT but not paid yet
INSERT INTO applications (
  id, pathway, willingness_confirm, first_name, last_name, date_of_birth, gender,
  phone, email, address, state, occupation,
  substance, duration, frequency, route_of_use,
  insight_level, insight_score, motivation_source, change_readiness,
  family_awareness, family_support,
  nok_name, nok_relationship, nok_phone,
  consent_admission, consent_detox, consent_confidentiality, consent_rights, consent_financial,
  status, deposit_paid,
  deposit_request_sent_at, deposit_request_recipient_email, deposit_request_count,
  notes, created_at
) VALUES
('33333333-3333-3333-3333-333333333333', 'A', 'yes',
 'Chiamaka', 'Eze', '1995-06-21', 'Female',
 '+2348012345605', 'chiamaka.test@example.com', '24 Awolowo Road, Ikoyi', 'Lagos', 'Marketing manager',
 'Alcohol', '6 months – 2 years', 'Several times a week', 'Oral',
 'preparation', 4, 'Health crisis', 'fully',
 'fully', 'strong',
 'Obi Eze', 'Spouse', '+2348012345606',
 true, true, true, true, true,
 'pre-screening', false,
 NOW() - INTERVAL '3 hours', 'chiamaka.test@example.com', 1,
 '[TEST DATA] Deposit request email sent — awaiting payment', NOW() - INTERVAL '3 days'),

('44444444-4444-4444-4444-444444444444', 'A', 'yes',
 'Kelechi', 'Nwosu', '1985-08-09', 'Male',
 '+2348012345607', 'kelechi.test@example.com', '18 Bourdillon Road, Ikoyi', 'Lagos', 'Investment banker',
 'Cocaine / Crack', '2–5 years', 'Weekly', 'Nasal / Snorting',
 'action', 5, 'Employer / Work issues', 'fully',
 'aware_unsupportive', 'moderate',
 'Adaobi Nwosu', 'Sister', '+2348012345608',
 true, true, true, true, true,
 'pre-screening', false,
 NOW() - INTERVAL '5 days', 'kelechi.test@example.com', 2,
 '[TEST DATA] Resent deposit request after first reminder', NOW() - INTERVAL '7 days');

-- Stage 3: Clinical Assessment — deposit PAID, currently being assessed
INSERT INTO applications (
  id, pathway, willingness_confirm, first_name, last_name, date_of_birth, gender,
  phone, email, address, state, occupation,
  substance, duration, frequency, route_of_use, prev_treatment, prev_treatment_details,
  medical_conditions, medications, mental_health, suicide_history,
  insight_level, insight_score, motivation_source, change_readiness,
  family_awareness, family_support, pfsp_name, pfsp_phone, pfsp_relationship,
  nok_name, nok_relationship, nok_phone, nok_email,
  consent_admission, consent_detox, consent_confidentiality, consent_rights, consent_financial,
  status, deposit_paid, payment_ref, deposit_amount,
  deposit_request_sent_at, deposit_request_recipient_email, deposit_request_count,
  notes, created_at
) VALUES
('55555555-5555-5555-5555-555555555555', 'A', 'yes',
 'Ibrahim', 'Yusuf', '1990-01-18', 'Male',
 '+2348012345609', 'ibrahim.test@example.com', '7 Kingsway Road, Ikoyi', 'Lagos', 'Architect',
 'Heroin / Opioids', 'Over 10 years', 'Daily', 'Injection', '2–3 attempts',
 'Two prior detox attempts at private clinics, both relapsed within 6 months due to weak aftercare',
 'Hepatitis C positive (treated 2024)', 'None currently', 'Depression', 'past',
 'action', 5, 'Spiritual conviction', 'fully',
 'fully', 'strong', 'Fatima Yusuf', '+2348012345610', 'Spouse',
 'Fatima Yusuf', 'Spouse', '+2348012345610', 'fatima.test@example.com',
 true, true, true, true, true,
 'clinical-assessment', true, 'HOR_DEP_TEST_001', 100000000,
 NOW() - INTERVAL '10 days', 'ibrahim.test@example.com', 1,
 '[TEST DATA] Deposit paid, undergoing full clinical workup. Hep-C history flagged for medical team',
 NOW() - INTERVAL '14 days');

-- Stage 4: Admission Decision — assessment complete, awaiting admit/refer/defer call
INSERT INTO applications (
  id, pathway, willingness_confirm, first_name, last_name, date_of_birth, gender,
  phone, email, address, state, occupation,
  substance, duration, frequency, insight_level, insight_score,
  family_awareness, family_support,
  nok_name, nok_relationship, nok_phone,
  consent_admission, consent_detox, consent_confidentiality, consent_rights, consent_financial,
  status, deposit_paid, payment_ref, deposit_amount,
  deposit_request_sent_at, deposit_request_recipient_email, deposit_request_count,
  sponsor_type, community_partner,
  notes, created_at
) VALUES
('66666666-6666-6666-6666-666666666666', 'B', 'yes',
 'Samuel', 'Okafor', '1998-04-30', 'Male',
 '+2348012345611', 'samuel.test@example.com', 'C/o House of Refuge', 'Lagos', 'Unemployed',
 'Methamphetamine', '2–5 years', 'Daily', 'preparation', 4,
 'no_family', 'none',
 'Pastor Daniel Okoro', 'Pastor', '+2348012345612',
 true, true, true, true, true,
 'admission-decision', true, 'HOR_DEP_TEST_002', 100000000,
 NOW() - INTERVAL '18 days', 'samuel.test@example.com', 1,
 'community', 'Redeemed Christian Church of God — Province 12',
 '[TEST DATA] Pathway B — assessment complete, MDT review scheduled. Church sponsorship confirmed',
 NOW() - INTERVAL '21 days');

-- Stage 5: ADMITTED — currently in residential programme
INSERT INTO applications (
  id, pathway, willingness_confirm, first_name, last_name, date_of_birth, gender,
  phone, email, state, occupation,
  substance, duration, frequency, insight_level, insight_score,
  family_awareness, family_support, pfsp_name, pfsp_phone, pfsp_relationship,
  nok_name, nok_relationship, nok_phone,
  consent_admission, consent_detox, consent_confidentiality, consent_rights, consent_financial,
  status, deposit_paid, payment_ref, deposit_amount,
  deposit_request_sent_at, deposit_request_recipient_email, deposit_request_count,
  notes, created_at
) VALUES
('77777777-7777-7777-7777-777777777777', 'A', 'yes',
 'Olamide', 'Adeyemi', '1993-09-11', 'Male',
 '+2348012345613', 'olamide.test@example.com', 'Lagos', 'Music producer',
 'Codeine Syrup', '5–10 years', 'Daily', 'action', 5,
 'fully', 'strong', 'Tope Adeyemi', '+2348012345614', 'Sister',
 'Tope Adeyemi', 'Sister', '+2348012345614',
 true, true, true, true, true,
 'admitted', true, 'HOR_DEP_TEST_003', 100000000,
 NOW() - INTERVAL '35 days', 'olamide.test@example.com', 1,
 '[TEST DATA] Currently in Week 3 of residential programme — Therapeutic Foundation phase',
 NOW() - INTERVAL '42 days');

-- Stage 6: Referred to outpatient pathway (low willingness)
INSERT INTO applications (
  id, pathway, willingness_confirm, first_name, last_name, date_of_birth, gender,
  phone, email, state,
  substance, duration, insight_level, insight_score, motivation_source,
  family_awareness,
  nok_name, nok_relationship, nok_phone,
  consent_admission, consent_detox, consent_confidentiality, consent_rights, consent_financial,
  status, deposit_paid,
  notes, created_at
) VALUES
('88888888-8888-8888-8888-888888888888', 'A', 'family_persuaded',
 'Emeka', 'Obi', '1991-12-05', 'Male',
 '+2348012345615', 'emeka.test@example.com', 'Lagos',
 'Cannabis / Marijuana', '2–5 years', 'precontemplation', 2, 'Family pressure',
 'fully',
 'Chioma Obi', 'Mother', '+2348012345616',
 true, true, true, true, true,
 'outpatient-pathway', false,
 '[TEST DATA] Referred to outpatient — low willingness, MI engagement recommended for 4 weeks before re-assessment',
 NOW() - INTERVAL '12 days');

-- Stage 7: Deferred (bed unavailable / awaiting clearance)
INSERT INTO applications (
  id, pathway, willingness_confirm, first_name, last_name, date_of_birth, gender,
  phone, email, state,
  substance, duration, insight_level, insight_score,
  family_awareness, family_support, pfsp_name, pfsp_phone,
  nok_name, nok_relationship, nok_phone,
  consent_admission, consent_detox, consent_confidentiality, consent_rights, consent_financial,
  status, deposit_paid,
  notes, created_at
) VALUES
('99999999-9999-9999-9999-999999999999', 'A', 'yes',
 'Funmi', 'Lawal', '1996-07-22', 'Female',
 '+2348012345617', 'funmi.test@example.com', 'Lagos',
 'Alcohol', '2–5 years', 'preparation', 4,
 'fully', 'strong', 'Wale Lawal', '+2348012345618',
 'Wale Lawal', 'Spouse', '+2348012345618',
 true, true, true, true, true,
 'deferred', false,
 '[TEST DATA] Deferred — awaiting medical clearance for thyroid condition. Re-assess in 4 weeks',
 NOW() - INTERVAL '8 days');

-- Stage 8: Declined (active psychosis exclusion)
INSERT INTO applications (
  id, pathway, willingness_confirm, first_name, last_name, date_of_birth, gender,
  phone, email, state,
  substance, duration, mental_health, suicide_history,
  active_psychosis, antipsychotic_need,
  insight_level, insight_score,
  nok_name, nok_relationship, nok_phone,
  consent_admission, consent_detox, consent_confidentiality, consent_rights, consent_financial,
  status, deposit_paid,
  notes, created_at
) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family_persuaded',
 'Ahmed', 'Mohammed', '1987-02-14', 'Male',
 '+2348012345619', 'ahmed.test@example.com', 'Lagos',
 'Methamphetamine', 'Over 10 years', 'Schizophrenia', 'recent',
 'yes', 'yes',
 'denial', 1,
 'Hauwa Mohammed', 'Mother', '+2348012345620',
 true, true, true, true, true,
 'declined', false,
 '[TEST DATA] Declined — active psychosis, beyond HOR clinical scope. Referred to Yaba Psychiatric Hospital with letter',
 NOW() - INTERVAL '15 days');

-- ───────────────────────────────────────────────────────────────────
-- PAYMENTS — matching deposit payments for the 3 paid applications
-- ───────────────────────────────────────────────────────────────────
INSERT INTO payments (application_id, amount, currency, type, description, paystack_ref, paystack_status, verified, status, created_at) VALUES
('55555555-5555-5555-5555-555555555555', 100000000, 'NGN', 'deposit', '[TEST DATA] Refundable admission booking deposit', 'HOR_DEP_TEST_001', 'success', false, 'paid', NOW() - INTERVAL '9 days'),
('66666666-6666-6666-6666-666666666666', 100000000, 'NGN', 'deposit', '[TEST DATA] Refundable admission booking deposit', 'HOR_DEP_TEST_002', 'success', false, 'paid', NOW() - INTERVAL '17 days'),
('77777777-7777-7777-7777-777777777777', 100000000, 'NGN', 'deposit', '[TEST DATA] Refundable admission booking deposit', 'HOR_DEP_TEST_003', 'success', false, 'paid', NOW() - INTERVAL '34 days');

-- ───────────────────────────────────────────────────────────────────
-- PATIENTS — admitted resident (Olamide from app #7) so the Patients
-- screen and clinical pages have data to render.
-- ───────────────────────────────────────────────────────────────────
INSERT INTO patients (
  id, application_id, full_name, date_of_birth, gender, phone, email,
  pathway, admitted_at, expected_discharge, current_phase, day_in_programme,
  primary_substance, insight_level, status, discharge_notes
) VALUES
('70000000-0000-0000-0000-000000000077',
 '77777777-7777-7777-7777-777777777777',
 'Olamide Adeyemi', '1993-09-11', 'Male', '+2348012345613', 'olamide.test@example.com',
 'A', NOW() - INTERVAL '21 days', (NOW() + INTERVAL '63 days')::date, 'foundation', 21,
 'Codeine Syrup', 'action', 'admitted', '[TEST DATA] Test resident — Week 3, foundation phase');

-- ───────────────────────────────────────────────────────────────────
-- CHECK-INS — 5 daily wellness entries for the test resident
-- ───────────────────────────────────────────────────────────────────
INSERT INTO checkins (patient_id, mood, cravings, anxiety, sleep, energy, appetite, triggers, coping_used, gratitude, notes, created_at) VALUES
('70000000-0000-0000-0000-000000000077', 4, 1, 2, 'Good (7-8 hours)', 'High',     'Good',         'None today',                    'Morning prayer, journaling',         'Recovery community',                       '[TEST DATA] Day 21 check-in', NOW() - INTERVAL '1 hour'),
('70000000-0000-0000-0000-000000000077', 3, 2, 3, 'Fair (5-6 hours)', 'Moderate', 'Good',         'Saw an old friend on Instagram', 'Reached out to counselor, breath work', 'My family',                            '[TEST DATA] Day 20',         NOW() - INTERVAL '1 day'),
('70000000-0000-0000-0000-000000000077', 4, 1, 2, 'Good (7-8 hours)', 'High',     'Good',         'None',                          'Group therapy reflection',           'My counselor',                          '[TEST DATA] Day 19',         NOW() - INTERVAL '2 days'),
('70000000-0000-0000-0000-000000000077', 3, 3, 4, 'Poor (3-4 hours)', 'Low',      'Reduced',      'Withdrawal lingering',          'Deep breathing, hydration',           'Pastor visited',                        '[TEST DATA] Day 18',         NOW() - INTERVAL '3 days'),
('70000000-0000-0000-0000-000000000077', 4, 2, 2, 'Good (7-8 hours)', 'Moderate', 'Good',         'Music made me think of using',  'Talked to peer mentor',               'Sunshine in the courtyard',            '[TEST DATA] Day 17',         NOW() - INTERVAL '4 days');

COMMIT;

-- ───────────────────────────────────────────────────────────────────
-- VERIFY
-- ───────────────────────────────────────────────────────────────────
SELECT status, COUNT(*) AS rows FROM applications WHERE notes LIKE '%[TEST DATA]%' GROUP BY status ORDER BY status;
SELECT COUNT(*) AS test_payments FROM payments WHERE description LIKE '%[TEST DATA]%';
SELECT COUNT(*) AS test_patients FROM patients WHERE discharge_notes LIKE '%[TEST DATA]%';
SELECT COUNT(*) AS test_checkins FROM checkins WHERE notes LIKE '%[TEST DATA]%';
