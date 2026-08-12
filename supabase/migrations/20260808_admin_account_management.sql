-- House of Refuge — admin-managed account roles.
-- Run in the Supabase SQL Editor. Safe to run on a live database, idempotent.
--
-- Until now the only way to grant staff or admin access was to hand-edit
-- profiles.role in the SQL Editor, because prevent_role_self_escalation blocks
-- role changes from any end-user session that is not already an admin.
--
-- This adds a narrow, audited path so an existing admin can manage roles from
-- the dashboard, without ever exposing the service-role key to the browser.

-- ── Audit trail ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_change_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id   UUID NOT NULL,
  target_email TEXT,
  old_role    TEXT,
  new_role    TEXT NOT NULL,
  changed_by  UUID,
  changed_by_email TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.role_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read role log" ON public.role_change_log;
CREATE POLICY "Admins read role log" ON public.role_change_log
  FOR SELECT USING (public.current_user_role() = 'admin');

-- No INSERT/UPDATE/DELETE policy: only the SECURITY DEFINER function below
-- writes here, so the log cannot be forged or cleared from a browser session.

-- ── Role assignment ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_role(target_id UUID, new_role TEXT)
RETURNS TABLE (id UUID, email TEXT, full_name TEXT, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role  TEXT := public.current_user_role();
  caller_id    UUID := auth.uid();
  old_role     TEXT;
  target_email TEXT;
  admin_count  INT;
BEGIN
  IF caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only an administrator may change account roles';
  END IF;

  IF new_role NOT IN ('patient', 'family', 'staff', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  SELECT p.role, p.email INTO old_role, target_email
  FROM public.profiles p WHERE p.id = target_id;

  IF old_role IS NULL THEN
    RAISE EXCEPTION 'No such account';
  END IF;

  -- An admin demoting themselves could lock the facility out of its own system.
  IF target_id = caller_id AND new_role <> 'admin' THEN
    RAISE EXCEPTION 'You cannot remove your own administrator access';
  END IF;

  -- Never leave the platform with zero admins.
  IF old_role = 'admin' AND new_role <> 'admin' THEN
    SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'This is the last administrator account and cannot be demoted';
    END IF;
  END IF;

  UPDATE public.profiles p
  SET role = new_role, updated_at = NOW()
  WHERE p.id = target_id;

  INSERT INTO public.role_change_log (target_id, target_email, old_role, new_role, changed_by, changed_by_email)
  VALUES (
    target_id, target_email, old_role, new_role, caller_id,
    (SELECT p.email FROM public.profiles p WHERE p.id = caller_id)
  );

  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.role FROM public.profiles p WHERE p.id = target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_role(UUID, TEXT) TO authenticated;

-- ── Profile detail update (name / title / department / phone) ──
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  target_id UUID, new_name TEXT, new_phone TEXT, new_department TEXT, new_title TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only an administrator may edit staff profiles';
  END IF;

  UPDATE public.profiles
  SET full_name  = COALESCE(NULLIF(new_name, ''), full_name),
      phone      = COALESCE(new_phone, phone),
      department = COALESCE(new_department, department),
      title      = COALESCE(new_title, title),
      updated_at = NOW()
  WHERE id = target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_profile(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ── Verify ─────────────────────────────────────────────────
-- SELECT proname FROM pg_proc WHERE proname IN ('admin_set_role','admin_update_profile');
-- SELECT email, full_name, role FROM public.profiles WHERE role IN ('admin','staff') ORDER BY role;
