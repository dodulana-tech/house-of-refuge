-- ============================================================================
-- HOR — outpatient practitioner roster cleanup  (2026-08-12)
--
-- Run in the Supabase SQL Editor. Safe to re-run.
--
-- Does two things:
--
-- 1. DE-DUPLICATES. The seed block in 20260514_outpatient_services.sql ended
--    with a bare `on conflict do nothing`, which only suppresses a conflict
--    against an existing unique index. outpatient_practitioners had none, so
--    every run of the migration inserted another copy of both doctors. The
--    public /outpatient page and the booking practitioner picker currently list
--    each of them four times.
--
-- 2. RETIRES Dr Alex Adenuga, who is no longer with HOR (2026-08-12). He is
--    removed rather than deactivated because no booking has ever referenced
--    him, so there is no history to preserve.
--
-- The unique index added at the end is what makes the seed idempotent, so this
-- cannot happen again.
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

-- 3. Retire the departed clinician.
delete from public.outpatient_practitioners
where full_name = 'Dr Alex Adenuga';

-- 4. Make the seed's `on conflict` clause actually have something to conflict
--    against, so re-running the migration stops duplicating.
create unique index if not exists outpatient_practitioners_full_name_key
  on public.outpatient_practitioners (full_name);

notify pgrst, 'reload schema';

-- VERIFY — expect one row, Dr Toba Babarinsa, until Dr Owolabi is added:
--   select full_name, title, active, public
--   from public.outpatient_practitioners order by display_order;
