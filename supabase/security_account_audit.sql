-- House of Refuge — Access audit + test-account cleanup.
-- Run in the Supabase SQL Editor (service-role context). Read each section
-- and its output before running the DELETE section.

-- ── 1. AUDIT: who has an account, and what role ──────────────
-- Review this. There should be NO unexpected 'staff'/'admin' rows.
SELECT p.email, p.role, p.full_name, u.last_sign_in_at, u.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY
  array_position(ARRAY['admin','staff','family','patient'], p.role),
  u.created_at;

-- ── 2. AUDIT: flag known demo / test emails that may linger ──
SELECT email, role
FROM public.profiles
WHERE email IN (
  'patient@hor.ng','family@hor.ng','staff@hor.ng','clinical@hor.ng',
  'nurse@hor.ng','chaplain@hor.ng','manager@hor.ng','housemaster@hor.ng'
);
-- NOTE: admin@hor.ng is intentionally NOT auto-deleted below — it may be your
-- real admin login. If it is a test account, remove it manually and create a
-- fresh admin with a real email + strong password.

-- ── 3. CLEANUP: delete test accounts (cascades to profiles) ──
-- Preview exactly what will be removed:
SELECT id, email FROM auth.users
WHERE email IN (
  'patient@hor.ng','family@hor.ng','staff@hor.ng','clinical@hor.ng',
  'nurse@hor.ng','chaplain@hor.ng','manager@hor.ng','housemaster@hor.ng'
);

-- If the preview is correct, run the delete (profiles row cascades via FK):
DELETE FROM auth.users
WHERE email IN (
  'patient@hor.ng','family@hor.ng','staff@hor.ng','clinical@hor.ng',
  'nurse@hor.ng','chaplain@hor.ng','manager@hor.ng','housemaster@hor.ng'
);

-- ── 4. PROMOTE real staff (run per person, as admin) ─────────
-- The hardening migration blocks self-promotion; grant staff/admin here:
-- UPDATE public.profiles SET role = 'staff' WHERE email = 'realstaff@houseofrefugeng.org';
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'director@houseofrefugeng.org';

-- ── 5. VERIFY hardening is active ────────────────────────────
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_prevent_role_self_escalation';
-- Expect one row. If empty, run 20260703_harden_role_security.sql first.
