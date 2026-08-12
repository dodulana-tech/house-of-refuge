-- ============================================================================
-- HOR — de-duplicate outpatient_practitioners  (2026-08-12)
--
-- Run in the Supabase SQL Editor. Safe to re-run.
--
-- WHY
--   The seed block in 20260514_outpatient_services.sql ends with a bare
--   `on conflict do nothing`. That clause only suppresses a conflict against an
--   existing unique index, and outpatient_practitioners had none, so every run
--   of the migration inserted another copy of both doctors. The public
--   /outpatient page and the booking practitioner picker list each of them once
--   per run.
--
--   This removes the duplicates, keeping the earliest row for each name, and
--   adds the unique index the seed always assumed was there. After this the
--   migration is genuinely idempotent.
-- ============================================================================

-- 1. Point any existing bookings at the row we are keeping, so the de-dup
--    cannot orphan them. (There are no bookings yet; this is defensive.)
with keep as (
  select distinct on (full_name) id, full_name
  from public.outpatient_practitioners
  order by full_name, created_at, id
)
update public.outpatient_bookings b
set practitioner_id = k.id
from public.outpatient_practitioners p
join keep k on k.full_name = p.full_name
where b.practitioner_id = p.id
  and b.practitioner_id is distinct from k.id;

-- 2. Delete the extra copies, keeping the earliest row per name.
with keep as (
  select distinct on (full_name) id
  from public.outpatient_practitioners
  order by full_name, created_at, id
)
delete from public.outpatient_practitioners
where id not in (select id from keep);

-- 3. Make the seed's `on conflict` clause actually have something to conflict
--    against, so re-running the migration stops duplicating.
create unique index if not exists outpatient_practitioners_full_name_key
  on public.outpatient_practitioners (full_name);

notify pgrst, 'reload schema';

-- VERIFY — expect exactly 2 rows, one per doctor:
--   select full_name, count(*) from public.outpatient_practitioners
--   group by full_name order by full_name;
