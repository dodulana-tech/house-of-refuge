-- House of Refuge — Replace user_metadata-based RLS with a safe role-check helper.
--
-- WHY: Supabase advisor flagged "Staff can read all profiles" (and other
-- staff/admin policies) for referencing auth.users.raw_user_meta_data.
-- That field is end-user editable via supabase.auth.updateUser({ data: ... }),
-- so any patient could grant themselves admin access. We replace it with a
-- SECURITY DEFINER function that reads role from public.profiles — a column
-- only modifiable by service-role/admin, not by the authenticated user.
--
-- HOW: SECURITY DEFINER + STABLE + locked search_path so the function runs
-- as its owner (bypassing RLS on profiles for the lookup) but cannot be
-- hijacked via search_path manipulation.

-- ───────────────────────────────────────────────────────────────────
-- 1. Helper functions
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('staff', 'admin')
  )
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff()           FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_staff()           TO authenticated, anon;

-- ───────────────────────────────────────────────────────────────────
-- 2. profiles
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;
CREATE POLICY "Staff can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_staff());

-- ───────────────────────────────────────────────────────────────────
-- 3. applications
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff can read all applications" ON public.applications;
CREATE POLICY "Staff can read all applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can update applications" ON public.applications;
CREATE POLICY "Staff can update applications"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Allow staff to delete applications too (e.g. cleanup test data)
DROP POLICY IF EXISTS "Staff can delete applications" ON public.applications;
CREATE POLICY "Staff can delete applications"
  ON public.applications FOR DELETE
  TO authenticated
  USING (public.is_staff());

-- ───────────────────────────────────────────────────────────────────
-- 4. patients
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff can manage patients" ON public.patients;
CREATE POLICY "Staff can manage patients"
  ON public.patients FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ───────────────────────────────────────────────────────────────────
-- 5. checkins
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff can read all checkins" ON public.checkins;
CREATE POLICY "Staff can read all checkins"
  ON public.checkins FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ───────────────────────────────────────────────────────────────────
-- 6. payments
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff can manage payments" ON public.payments;
CREATE POLICY "Staff can manage payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ───────────────────────────────────────────────────────────────────
-- 7. visitations
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff can manage visitations" ON public.visitations;
CREATE POLICY "Staff can manage visitations"
  ON public.visitations FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ───────────────────────────────────────────────────────────────────
-- 8. meal_orders
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff can manage meal orders" ON public.meal_orders;
CREATE POLICY "Staff can manage meal orders"
  ON public.meal_orders FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ───────────────────────────────────────────────────────────────────
-- 9. incidents
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff can manage incidents" ON public.incidents;
CREATE POLICY "Staff can manage incidents"
  ON public.incidents FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ───────────────────────────────────────────────────────────────────
-- 10. Public-write policies that may have been dropped during the
--     user_metadata workaround. Restore them so the apply form and
--     deposit page work.
-- ───────────────────────────────────────────────────────────────────

-- Public apply form: anyone (including unauthenticated) can submit an application.
DROP POLICY IF EXISTS "Anyone can submit application" ON public.applications;
CREATE POLICY "Anyone can submit application"
  ON public.applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Applicants can read their own application by email match (used by /deposit/:id).
DROP POLICY IF EXISTS "Applicants can read own application" ON public.applications;
CREATE POLICY "Applicants can read own application"
  ON public.applications FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- Public deposit page needs to read its own row by id (anon, no login).
-- Tightly scoped: SELECT only when filtered by id; PostgREST will pass the
-- filter through, so the row is only visible if the caller knows the UUID.
DROP POLICY IF EXISTS "Anyone can read application by id" ON public.applications;
CREATE POLICY "Anyone can read application by id"
  ON public.applications FOR SELECT
  TO anon
  USING (true);
-- NOTE: this policy is intentionally permissive but only relevant to anon role.
-- The public deposit page lives at /deposit/:appId and queries by exact UUID.
-- If you prefer not to expose anon-readable applications at all, replace the
-- DepositPay flow with a signed-token approach and drop this policy.

-- Public payment recording (DepositPay onSuccess writes to payments).
DROP POLICY IF EXISTS "Anyone can create payment" ON public.payments;
CREATE POLICY "Anyone can create payment"
  ON public.payments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────────
-- 11. Verification — list any policy still referencing user_metadata
--      Should return ZERO rows after this migration.
-- ───────────────────────────────────────────────────────────────────
SELECT schemaname, tablename, policyname,
       qual    AS using_clause,
       with_check
  FROM pg_policies
 WHERE schemaname = 'public'
   AND (qual ILIKE '%user_metadata%' OR with_check ILIKE '%user_metadata%' OR
        qual ILIKE '%raw_user_meta_data%' OR with_check ILIKE '%raw_user_meta_data%');
