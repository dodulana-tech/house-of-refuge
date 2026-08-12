-- House of Refuge — grant admin to the Programme Director account.
-- Run in Supabase dashboard → SQL Editor. Idempotent, safe on a live database.
--
-- PREREQUISITE: the auth user must already exist. Create it first via
--   Dashboard → Authentication → Users → Add user → Create new user
--   Email: programme.director@houseofrefugeng.org
--   Password: (set one) · tick "Auto Confirm User"
--
-- Why this script is needed: the on_auth_user_created trigger runs
-- handle_new_user(), which force-creates the profiles row as 'patient'
-- regardless of signup metadata. Only the SQL Editor or an existing admin can
-- raise it to 'admin' (prevent_role_self_escalation allows it here because
-- auth.uid() is NULL outside an end-user session).

-- If the person or title differs, edit the literals in section 2 below.
-- full_name is what the dashboard sidebar and header display.

-- ── 1. Confirm the auth user exists ────────────────────────
-- Expect exactly 1 row. If 0, stop and create the user in the dashboard first.
SELECT id, email, email_confirmed_at IS NOT NULL AS confirmed, created_at
FROM auth.users
WHERE email = 'programme.director@houseofrefugeng.org';

-- ── 2. Create or promote the profile ───────────────────────
INSERT INTO public.profiles (id, email, full_name, phone, role, department, title)
SELECT u.id,
       u.email,
       'Dr Adediwura Okeleye',
       '09112777600',
       'admin',
       'Administration',
       'Programme Director'
FROM auth.users u
WHERE u.email = 'programme.director@houseofrefugeng.org'
ON CONFLICT (id) DO UPDATE
SET role       = 'admin',
    email      = EXCLUDED.email,
    full_name  = EXCLUDED.full_name,
    phone      = EXCLUDED.phone,
    department = EXCLUDED.department,
    title      = EXCLUDED.title,
    updated_at = NOW();

-- ── 3. Verify ──────────────────────────────────────────────
-- Expect: role = 'admin'.
SELECT p.id, p.email, p.full_name, p.role, p.title, p.department
FROM public.profiles p
WHERE p.email = 'programme.director@houseofrefugeng.org';

-- ── 4. Confirm the escalation guards are actually installed ─
-- Both rows must be present. If either is missing, the hardening migration
-- (20260703_harden_role_security.sql) has not been applied to this database
-- and self-signup can still request elevated roles. Apply it before go-live.
SELECT tgname
FROM pg_trigger
WHERE tgname IN ('trg_prevent_role_self_escalation', 'on_auth_user_created');

-- ── 5. Audit every privileged account before opening the doors ─
-- Anything here that you do not recognise should be demoted immediately.
SELECT email, full_name, role, title, created_at
FROM public.profiles
WHERE role IN ('admin', 'staff')
ORDER BY role, created_at;
