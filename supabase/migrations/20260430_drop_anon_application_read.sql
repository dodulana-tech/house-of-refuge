-- House of Refuge — Tighten application reads.
--
-- The earlier migration added "Anyone can read application by id" with
-- USING (true) so the public /deposit/:appId page could load. That policy
-- effectively makes every application row readable to any anon caller who
-- knows OR guesses a UUID; while UUIDs are unguessable, REST allows enumerating
-- the table without a filter, so an anon caller could dump every applicant's
-- PII.
--
-- This migration removes that policy. Public access is now solely through the
-- `get-deposit-application` Edge Function which uses the service-role key
-- and a strict column whitelist (id, first_name, email, pathway, deposit_paid,
-- status, deposit_request_sent_at).
--
-- BEFORE applying this: deploy the function and confirm it's reachable.
--   supabase functions deploy get-deposit-application --no-verify-jwt
-- Then verify with:
--   curl -X POST https://<ref>.supabase.co/functions/v1/get-deposit-application \
--        -H "apikey: <anon-key>" -H "Content-Type: application/json" \
--        -d '{"applicationId":"<some-uuid>"}'
--
-- AFTER applying: anon SELECT applications returns 200 with empty array (RLS
-- denies all rows). Patient SELECT still returns own row by email match.
-- Staff/admin SELECT still works via is_staff().

DROP POLICY IF EXISTS "Anyone can read application by id" ON public.applications;

-- Verify: this query should return zero rows for the anon role after the drop.
SELECT policyname, cmd, roles, qual
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename = 'applications'
 ORDER BY policyname;
