-- Financial Assistance Applications
-- Public form submission + admin review by Freedom Foundation Committee
-- See /assistance public flow and /dashboard/financial-assistance admin flow

create extension if not exists "pgcrypto";

create table if not exists financial_assistance_applications (
  id uuid primary key default gen_random_uuid(),
  reference_code text unique not null,

  -- Applicant (the family member submitting; may differ from patient)
  applicant_name text not null,
  applicant_phone text not null,
  applicant_email text not null,
  applicant_relationship text,

  -- Patient (the person seeking treatment)
  patient_name text not null,
  patient_age integer,
  patient_gender text,
  patient_substance text,
  patient_substance_duration text,
  patient_prior_treatment text,
  patient_willingness text,

  -- Financial context
  household_size integer,
  monthly_income_band text,
  dependants integer,
  prior_medical_bills_estimate text,
  financial_situation_narrative text,

  -- Pastoral / community referral
  pastoral_referrer_name text,
  pastoral_referrer_org text,
  pastoral_referrer_phone text,
  pastoral_referrer_email text,
  pastoral_referrer_relationship text,

  -- Documents: array of { name, path, size, type, uploaded_at }
  documents jsonb not null default '[]'::jsonb,

  -- Workflow state
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'more_info_needed', 'approved', 'declined', 'withdrawn')),
  decision_notes text,
  decision_by uuid,
  decision_at timestamptz,
  internal_notes text,

  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Generate reference code on insert (FA-XXXXXX)
create or replace function gen_fa_reference_code() returns trigger as $$
begin
  if new.reference_code is null or new.reference_code = '' then
    loop
      new.reference_code := 'FA-' || lpad(floor(random() * 1000000)::text, 6, '0');
      exit when not exists (
        select 1 from financial_assistance_applications where reference_code = new.reference_code
      );
    end loop;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_gen_fa_ref on financial_assistance_applications;
create trigger trg_gen_fa_ref
  before insert on financial_assistance_applications
  for each row execute function gen_fa_reference_code();

-- updated_at touch
create or replace function touch_fa_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_fa on financial_assistance_applications;
create trigger trg_touch_fa
  before update on financial_assistance_applications
  for each row execute function touch_fa_updated_at();

create index if not exists idx_fa_status on financial_assistance_applications(status);
create index if not exists idx_fa_submitted_at on financial_assistance_applications(submitted_at desc);
create index if not exists idx_fa_reference_code on financial_assistance_applications(reference_code);
create index if not exists idx_fa_applicant_email on financial_assistance_applications(applicant_email);

-- RLS
alter table financial_assistance_applications enable row level security;

-- Anonymous public can insert applications (the form)
drop policy if exists fa_anon_insert on financial_assistance_applications;
create policy fa_anon_insert on financial_assistance_applications
  for insert to anon with check (true);

-- NOTE: There is deliberately NO anon SELECT policy on this table. A
-- `USING (true)` anon policy would expose every applicant's PII, financials,
-- addiction history, and staff notes to anyone holding the public anon key.
-- The public "check status" page reads status via the SECURITY DEFINER
-- function below, which returns only non-sensitive columns for an exact ref.
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

-- Staff (Freedom Foundation committee) can do everything. Scoped to is_staff()
-- so self-registered patient/family accounts cannot read financial files.
drop policy if exists fa_authed_full on financial_assistance_applications;
drop policy if exists fa_staff_full on financial_assistance_applications;
create policy fa_staff_full on financial_assistance_applications
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Storage bucket for uploaded supporting documents
insert into storage.buckets (id, name, public)
  values ('fa-documents', 'fa-documents', false)
  on conflict (id) do nothing;

-- Storage policies: anon can upload to fa-documents, authed can read/manage
drop policy if exists fa_storage_anon_upload on storage.objects;
create policy fa_storage_anon_upload on storage.objects
  for insert to anon with check (bucket_id = 'fa-documents');

drop policy if exists fa_storage_authed_all on storage.objects;
create policy fa_storage_authed_all on storage.objects
  for all to authenticated using (bucket_id = 'fa-documents') with check (bucket_id = 'fa-documents');
