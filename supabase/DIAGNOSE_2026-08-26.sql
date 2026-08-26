-- ============================================================================
-- HOR — read-only diagnostic. Paste the WHOLE file into the Supabase SQL Editor
-- and send back the output. Nothing here writes or changes anything.
-- ============================================================================

-- 1. WHO CAN ACTUALLY USE THE DASHBOARD ------------------------------------
-- is_staff() is true only for role 'staff' or 'admin'. Anyone else sees every
-- dashboard page load correctly and show nothing, because RLS filters each
-- query to zero rows. If the people reporting "nothing works" are not listed
-- as staff/admin here, that is the whole explanation.
select role, count(*) as accounts
  from public.profiles group by role order by 2 desc;

select id, email, full_name, role, created_at
  from public.profiles
 order by (role in ('admin','staff')) desc, created_at desc
 limit 40;

-- 2. WHY SOMEONE CANNOT LOG IN ---------------------------------------------
-- email_confirmed_at IS NULL means Supabase will refuse the sign-in with
-- "Email not confirmed", no matter how correct the password is. The project has
-- mailer_autoconfirm = false, so every account needs a confirmation click.
select u.email,
       u.email_confirmed_at,
       u.last_sign_in_at,
       u.created_at,
       p.role,
       case
         when u.email_confirmed_at is null then 'CANNOT SIGN IN - never confirmed'
         when p.id is null                 then 'no profile row - will default to patient'
         when p.role not in ('admin','staff') then 'signs in, but sees an empty dashboard'
         else 'ok'
       end as diagnosis
  from auth.users u
  left join public.profiles p on p.id = u.id
 order by u.created_at desc
 limit 40;

-- 3. IS THE PRIVILEGE-ESCALATION FIX ACTUALLY LIVE? ------------------------
-- Expect BOTH to say OK. If handle_new_user is UNPATCHED, anyone can sign up
-- through the public form with role='admin' in the request metadata and get
-- full read/write access to every patient record.
select case
         when prosrc like '%requested_role IN (''patient'', ''family'')%'
           or prosrc like '%requested_role in (''patient'', ''family'')%'
         then 'OK - signup role is clamped to patient/family'
         else 'UNPATCHED - signup can set its own role. CRITICAL.'
       end as handle_new_user_status
  from pg_proc where proname = 'handle_new_user';

select case when count(*) > 0
            then 'OK - role self-escalation trigger present'
            else 'MISSING - a logged-in user can promote themselves to admin. CRITICAL.'
       end as role_escalation_guard
  from pg_trigger where tgname = 'trg_prevent_role_self_escalation';

-- 4. IS OUTBOUND EMAIL SWITCHED ON? ----------------------------------------
-- The Edge Functions are not deployed (verified from outside), so this is
-- expected to be false/empty. Shown here to confirm.
select enabled,
       coalesce(nullif(function_url, ''), '(not set)') as function_url,
       case when coalesce(webhook_secret,'') = '' then '(not set)' else '(set)' end as webhook_secret
  from private.notification_config;

select count(*) as notifications_ever_logged from public.notification_log;

-- 5. WHAT IS STILL UNMIGRATED ----------------------------------------------
select 'outpatient_clients'    as object,
       to_regclass('public.outpatient_clients')    is not null as exists
union all
select 'outpatient_encounters',
       to_regclass('public.outpatient_encounters') is not null;

-- 6. ANON EXPOSURE DOUBLE-CHECK --------------------------------------------
-- Any row here is a table readable by a logged-out visitor. Expect only the
-- public catalogue tables (outpatient_services, outpatient_practitioners).
select tablename, policyname, cmd
  from pg_policies
 where schemaname = 'public'
   and 'anon' = any(roles)
   and cmd in ('SELECT','ALL')
 order by tablename;

-- 7. DUPLICATE NOTIFICATION TRIGGERS ---------------------------------------
-- Expect at most ONE row per table. Two rows on
-- financial_assistance_applications means both the 2026-08-08 and 2026-08-10
-- email migrations were applied, and every assistance submission will send
-- duplicate mail once email is switched on.
select c.relname as table_name, t.tgname as trigger_name
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
 where not t.tgisinternal
   and t.tgname like 'notify%'
 order by 1, 2;
