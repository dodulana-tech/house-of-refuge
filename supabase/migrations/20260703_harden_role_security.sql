-- House of Refuge — Harden account-role security (privilege-escalation fixes).
-- Run in the Supabase SQL Editor. Safe to run on a live database.
--
-- Closes two escalation paths reachable with the public anon key:
--   1. A logged-in user updating their OWN profiles.role to 'admin'
--      (the "Users can update own profile" RLS policy has no column guard).
--   2. A signup passing role='admin' in metadata, which handle_new_user
--      copied verbatim into profiles.role.
--
-- After this: self-service accounts can only ever be 'patient' or 'family';
-- 'staff'/'admin' can only be granted by an existing admin (or server-side
-- service-role / SQL Editor, which have no end-user JWT).

-- ── 1. Block role changes from end-user sessions unless the caller is admin ──
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL                 -- a real end-user session
     AND public.current_user_role() <> 'admin'  -- who is not an admin
  THEN
    RAISE EXCEPTION 'Only an administrator may change an account role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- ── 2. Signups can only self-assign 'patient' or 'family' ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    CASE WHEN requested_role IN ('patient', 'family') THEN requested_role ELSE 'patient' END
  );
  RETURN NEW;
END;
$$;

-- Trigger already exists (on_auth_user_created) and points at handle_new_user;
-- redefining the function above is sufficient.

-- ── Verify (optional) ──
-- Expect: any UPDATE that changes role as a non-admin user raises the exception.
-- Expect: a new signup with metadata role='admin' still lands as 'patient'.
