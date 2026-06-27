-- House of Refuge — Contact & triage report for REAL applications.
-- Excludes all @example.com test rows. Read-only (safe to run anytime).
-- Run in the Supabase SQL Editor; the result grid IS the report — export to CSV
-- via the "Download CSV" button, or copy/paste it back to format into a doc.

SELECT
  first_name || ' ' || last_name                       AS applicant,
  to_char(created_at, 'DD Mon YYYY')                    AS applied,
  status                                                AS pipeline_stage,
  CASE pathway WHEN 'A' THEN 'A — Family-funded'
               WHEN 'B' THEN 'B — Sponsored'
               ELSE pathway END                         AS pathway,
  phone                                                 AS applicant_phone,
  email                                                 AS applicant_email,
  substance,
  COALESCE(insight_level, '—')                          AS insight,
  COALESCE(family_support, '—')                         AS family_support,
  COALESCE(willingness_confirm, '—')                    AS willingness,
  CASE WHEN deposit_paid THEN 'Paid' ELSE 'Not paid' END AS deposit,
  COALESCE(nok_name, '—')   AS next_of_kin,
  COALESCE(nok_relationship, '—') AS nok_relationship,
  COALESCE(nok_phone, '—')  AS nok_phone,
  -- Suggested next action by pipeline stage
  CASE status
    WHEN 'submitted'           THEN 'Call applicant — acknowledge & begin pre-screening'
    WHEN 'pre-screening'       THEN 'Send/chase refundable deposit request'
    WHEN 'clinical-assessment' THEN 'Schedule clinical assessment'
    WHEN 'admission-decision'  THEN 'Convene MDT review for admit/refer/defer'
    WHEN 'outpatient-pathway'  THEN 'Book outpatient / motivational engagement'
    WHEN 'deferred'            THEN 'Follow up on deferral condition'
    ELSE 'Review'
  END                                                   AS next_action
FROM applications
WHERE email NOT ILIKE '%@example.com'
ORDER BY
  array_position(ARRAY['submitted','pre-screening','clinical-assessment',
    'admission-decision','documentation','intake','treatment-planning',
    'admitted','outpatient-pathway','referred','deferred','declined','withdrawn'],
    status),
  created_at;
