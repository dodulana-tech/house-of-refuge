-- Full export of the 3 real (non-test) applications, every column, as JSON.
-- Run in the Supabase SQL Editor, then copy the whole result and paste it back
-- so the detailed applicant PDF can be rebuilt with all submitted fields.

SELECT jsonb_pretty(to_jsonb(a.*)) AS application_json
FROM applications a
WHERE a.email NOT ILIKE '%@example.com'
ORDER BY a.created_at DESC;
