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

-- Breakdown by status. Compare this against the stage chips on the Admissions
-- page: any status here that the dashboard does not list is a row nobody can
-- see. The unwilling-client tracks write 'outpatient-pathway' and 'referred',
-- which the Overview KPI deliberately excludes from "Pending Applications".
SELECT status, count(*) AS rows, max(created_at) AS most_recent
FROM applications
GROUP BY status
ORDER BY rows DESC;

-- Which accounts can read applications at all? is_staff() accepts only these
-- two roles, so anyone missing from this list sees an empty dashboard.
SELECT id, email, full_name, role
FROM profiles
WHERE role IN ('staff', 'admin')
ORDER BY created_at DESC;

-- ============================================================================
-- ONE-SHOT SUMMARY — the Supabase SQL Editor only renders the result of the
-- LAST statement it runs, so everything above is invisible when the whole file
-- is executed in one go. Select and run just this block to see the counts.
-- ============================================================================
SELECT 'ZZ TOTAL' AS bucket,
       count(*)::text AS rows,
       to_char(max(created_at), 'DD Mon HH24:MI') AS most_recent
FROM applications
UNION ALL
SELECT coalesce(status, '(no status)'),
       count(*)::text,
       to_char(max(created_at), 'DD Mon HH24:MI')
FROM applications
GROUP BY status
UNION ALL
SELECT 'ZZ LAST 14 DAYS',
       count(*)::text,
       to_char(max(created_at), 'DD Mon HH24:MI')
FROM applications
WHERE created_at > now() - interval '14 days'
ORDER BY 1;
