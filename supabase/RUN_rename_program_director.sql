-- Rename the Program Director account from the dummy name to the real one.
-- Run in Supabase dashboard → SQL Editor. Idempotent.

-- Primary display name (what the dashboard sidebar/header reads: profiles.full_name)
update public.profiles
set full_name = 'Dr Adediwura Okeleye'
where full_name = 'Emmanuel Abutu';

-- If a staff-directory row exists for the same person, keep it consistent too.
update public.staff
set full_name = 'Dr Adediwura Okeleye'
where full_name = 'Emmanuel Abutu';

-- VERIFY:
--   select id, full_name, role from public.profiles where full_name ilike '%okeleye%';
