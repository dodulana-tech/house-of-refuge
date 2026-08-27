-- ============================================================================
-- HOR — unblock staff accounts without relying on email.
--
-- Supabase's built-in mail sender is rate limited (a few per hour) and is not
-- intended for production. The account-creation flow depends on it twice: the
-- signup confirmation, then the password-reset link the new member uses to set
-- a password. When either does not arrive, the account exists but cannot sign
-- in — Supabase refuses with "Email not confirmed" no matter how correct the
-- password is.
--
-- Run the sections you need. Replace the example addresses.
-- ============================================================================

-- ── 1. WHO IS STUCK, AND WHY ────────────────────────────────
-- Run this first. It names every account and what is wrong with it.
select u.email,
       p.role,
       u.email_confirmed_at is not null as confirmed,
       u.last_sign_in_at,
       case
         when u.email_confirmed_at is null      then 'BLOCKED - never confirmed, cannot sign in'
         when p.id is null                      then 'no profile row'
         when p.role not in ('admin','staff')   then 'signs in, but every page is empty (RLS)'
         else 'ok'
       end as diagnosis
  from auth.users u
  left join public.profiles p on p.id = u.id
 order by u.created_at desc;

-- ── 2. CONFIRM AN ACCOUNT MANUALLY ──────────────────────────
-- Skips the confirmation email. Do this for anyone showing BLOCKED above.
-- update auth.users
--    set email_confirmed_at = coalesce(email_confirmed_at, now())
--  where email = 'person@houseofrefugeng.org';

-- Confirm ALL unconfirmed accounts at once (only if you trust every address):
-- update auth.users
--    set email_confirmed_at = now()
--  where email_confirmed_at is null;

-- ── 3. GRANT STAFF OR ADMIN ─────────────────────────────────
-- The dashboard is gated on is_staff(), which is true only for 'staff' or
-- 'admin'. Anything else loads every page and shows nothing, because RLS
-- filters each query to zero rows.
--
-- The Programme Director needs 'admin' specifically: admin_set_role refuses a
-- non-admin caller, which is why she cannot add new staff from the dashboard.
-- update public.profiles
--    set role = 'admin'
--  where email = 'programme.director@houseofrefugeng.org';

-- update public.profiles
--    set role = 'staff'
--  where email = 'nurse@houseofrefugeng.org';

-- ── 4. SET A PASSWORD WITHOUT THE EMAIL LINK ────────────────
-- There is no SQL-safe way to set an auth password by hand: the encryption is
-- handled by GoTrue, not by the database. Use ONE of these instead:
--
--   a. Dashboard -> Authentication -> Users -> the user -> "Send magic link"
--      or "Reset password". Same rate limit, but you control the timing.
--   b. Dashboard -> Authentication -> Users -> "Add user", which lets you set
--      a password directly and tick "Auto Confirm User".
--   c. Fix the root cause: Dashboard -> Project Settings -> Authentication ->
--      SMTP Settings, and point it at the same Zoho mailbox setup-email.sh
--      uses. That lifts the rate limit and makes every future invite work.
--      This is the real fix and it takes about two minutes.

-- ── 5. VERIFY ───────────────────────────────────────────────
-- Re-run section 1. Everyone who should have access should read 'ok'.
