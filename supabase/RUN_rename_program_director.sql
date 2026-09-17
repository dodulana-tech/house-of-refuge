-- Set the Programme Director account to the current holder: Dr Onyeka Obilo.
-- Run in Supabase dashboard → SQL Editor. Idempotent, safe to re-run.
--
-- History of this account's display name:
--   'Emmanuel Abutu'        (dummy name used when the account was created)
--   'Dr Adediwura Okeleye'  (Programme Director until September 2026)
--   'Dr Onyeka Obilo'       (Programme Director from September 2026)

-- ── 1. Who currently holds the account ─────────────────────
SELECT id, email, full_name, role, title
FROM public.profiles
WHERE email = 'programme.director@houseofrefugeng.org'
   OR full_name IN ('Emmanuel Abutu', 'Dr Adediwura Okeleye');

-- ── 2. Rename the login account ────────────────────────────
-- profiles.full_name is what the dashboard sidebar and header display.
-- Matched on the role email first, with the legacy names as a fallback in
-- case the account was created under a different address.
UPDATE public.profiles
SET full_name  = 'Dr Onyeka Obilo',
    title      = 'Programme Director',
    updated_at = NOW()
WHERE email = 'programme.director@houseofrefugeng.org'
   OR full_name IN ('Emmanuel Abutu', 'Dr Adediwura Okeleye');

-- ── 3. Keep the staff directory consistent ─────────────────
UPDATE public.staff
SET full_name  = 'Dr Onyeka Obilo',
    role       = 'Programme Director',
    updated_at = NOW()
WHERE email = 'programme.director@houseofrefugeng.org'
   OR full_name IN ('Emmanuel Abutu', 'Dr Adediwura Okeleye');

-- OPTIONAL, instead of section 3: if the staff directory should keep
-- Dr Okeleye on record as a past member of staff rather than be overwritten,
-- run this block in place of the UPDATE above.
--
--   UPDATE public.staff
--   SET status = 'inactive',
--       data = COALESCE(data, '{}'::jsonb)
--              || jsonb_build_object('left_on', '2026-09-01',
--                                    'note', 'Handed over Programme Director role to Dr Onyeka Obilo'),
--       updated_at = NOW()
--   WHERE full_name = 'Dr Adediwura Okeleye';
--
--   INSERT INTO public.staff (full_name, role, department, email, phone, status, start_date)
--   SELECT 'Dr Onyeka Obilo', 'Programme Director', 'Administration',
--          'programme.director@houseofrefugeng.org', '09112777600', 'active', '2026-09-01'
--   WHERE NOT EXISTS (SELECT 1 FROM public.staff WHERE full_name = 'Dr Onyeka Obilo');

-- ── 4. Verify ──────────────────────────────────────────────
-- Expect the profile row to read 'Dr Onyeka Obilo' with role = 'admin',
-- and no rows left under either legacy name.
SELECT 'profiles' AS source, full_name, role, title FROM public.profiles
WHERE email = 'programme.director@houseofrefugeng.org'
UNION ALL
SELECT 'staff', full_name, role, NULL FROM public.staff
WHERE full_name ILIKE '%obilo%' OR full_name ILIKE '%okeleye%';
