-- Pastoral interview tracking
-- Pastor Tony Rapu (Freedom Foundation founder) meets with patient + family
-- after psychiatrist clearance, before bed allocation. Mandatory across all admission pathways.

-- Add to financial_assistance_applications
alter table financial_assistance_applications
  add column if not exists pastoral_interview_status text default 'pending'
    check (pastoral_interview_status in ('pending', 'scheduled', 'completed', 'declined', 'rescheduling', 'not_required')),
  add column if not exists pastoral_interview_scheduled_at timestamptz,
  add column if not exists pastoral_interview_completed_at timestamptz,
  add column if not exists pastoral_interview_notes text;

create index if not exists idx_fa_pastoral_status on financial_assistance_applications(pastoral_interview_status);

-- Add to applications (paying pathway) if the table exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'applications') then
    execute 'alter table applications
      add column if not exists pastoral_interview_status text default ''pending''
        check (pastoral_interview_status in (''pending'', ''scheduled'', ''completed'', ''declined'', ''rescheduling'', ''not_required'')),
      add column if not exists pastoral_interview_scheduled_at timestamptz,
      add column if not exists pastoral_interview_completed_at timestamptz,
      add column if not exists pastoral_interview_notes text';

    execute 'create index if not exists idx_applications_pastoral_status on applications(pastoral_interview_status)';
  end if;
end
$$;
