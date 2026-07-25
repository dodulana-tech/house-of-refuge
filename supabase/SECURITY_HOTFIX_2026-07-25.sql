-- ============================================================================
-- SECURITY HOTFIX — anon PII exposure on intake tables
-- Run this WHOLE file in the Supabase dashboard → SQL Editor IMMEDIATELY.
-- Idempotent; safe to re-run.
--
-- WHAT THIS CLOSES
--   Confirmed live: any caller holding the public anon key (which ships in the
--   client JS bundle) could read EVERY row of:
--     * public.applications                    (full clinical intake + PII)
--     * public.financial_assistance_applications (financials, addiction, staff notes)
--   Both were caused by RLS SELECT policies scoped `TO anon USING (true)`.
--
-- WHAT STILL WORKS AFTER THIS
--   * Public apply / FA / donation FORMS still submit (anon INSERT untouched).
--   * Public deposit page still reads its record via the get-deposit-application
--     Edge Function (service-role + column whitelist) — not via the dropped policy.
--   * Public FA "check status" page reads status via a new SECURITY DEFINER
--     function that returns ONLY {reference_code, status, submitted_at}.
--   * Staff dashboards read/write as before (is_staff()).
-- ============================================================================

-- ── 1. applications: remove the anon full-table read hole ────────────────────
-- The deposit page does NOT need this — it uses the get-deposit-application
-- Edge Function. Confirm that function is deployed before/after running this:
--   supabase functions deploy get-deposit-application --no-verify-jwt
drop policy if exists "Anyone can read application by id" on public.applications;

-- ── 2. financial_assistance_applications: remove anon full-table read hole ────
drop policy if exists fa_anon_select_by_ref on public.financial_assistance_applications;

-- Safe replacement for the public "check your status" page: a definer function
-- that returns ONLY non-sensitive status columns for an exact reference match.
-- No PII, no financials, no internal_notes are ever returned to anon.
create or replace function public.fa_status_by_reference(p_ref text)
returns table (reference_code text, status text, submitted_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select reference_code, status, submitted_at
  from public.financial_assistance_applications
  where reference_code = p_ref
  limit 1
$$;

revoke all on function public.fa_status_by_reference(text) from public;
grant execute on function public.fa_status_by_reference(text) to anon, authenticated;

-- ── 3. Tighten FA read to committee/staff only (was: any authenticated user) ──
-- The submitted page promises "HOR clinical staff do not see your financial
-- details." `authenticated USING (true)` let ANY logged-in account (incl.
-- self-registered patients/family) read all FA rows. Restrict to is_staff().
-- (Long-term: introduce a dedicated Freedom Foundation committee role.)
drop policy if exists fa_authed_full on public.financial_assistance_applications;
create policy fa_staff_full on public.financial_assistance_applications
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ── 4. Force PostgREST to reload the schema cache ────────────────────────────
notify pgrst, 'reload schema';

-- ── 5. VERIFY — run these after applying ─────────────────────────────────────
-- (a) No anon SELECT policy should remain on either table:
--   select tablename, policyname, roles, cmd, qual
--     from pg_policies
--    where schemaname='public'
--      and tablename in ('applications','financial_assistance_applications')
--    order by tablename, policyname;
--
-- (b) Anon read must now return EMPTY (RLS denies all rows). From a shell:
--   curl -s "$URL/rest/v1/applications?select=id" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
--   curl -s "$URL/rest/v1/financial_assistance_applications?select=id" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
--   -> both should return: []
--
-- (c) Status function still works for a real reference:
--   select * from public.fa_status_by_reference('FA-136230');
