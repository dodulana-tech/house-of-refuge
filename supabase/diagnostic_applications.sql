-- READ-ONLY diagnostic. Deletes nothing. Run in Supabase SQL Editor.
-- Shows every application currently in the database so we can see exactly
-- what exists, what is test (@example.com), and what is real.

SELECT
  created_at,
  first_name || ' ' || last_name AS name,
  email,
  phone,
  status,
  pathway,
  deposit_paid,
  CASE WHEN email ILIKE '%@example.com' THEN 'TEST (@example.com)' ELSE 'looks real' END AS classification,
  left(coalesce(notes,''), 60) AS notes_preview
FROM applications
ORDER BY created_at DESC;

-- Totals
SELECT
  count(*)                                            AS total_applications,
  count(*) FILTER (WHERE email ILIKE '%@example.com') AS example_com_rows,
  count(*) FILTER (WHERE email NOT ILIKE '%@example.com') AS other_rows
FROM applications;
