-- House of Refuge — track when admin sends the refundable-deposit request email.
-- Idempotent: safe to run multiple times.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS deposit_request_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deposit_request_sent_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS deposit_request_recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS deposit_request_count INT DEFAULT 0;

-- For the admissions list view: index by sent state for quick filtering.
CREATE INDEX IF NOT EXISTS applications_deposit_request_sent_at_idx
  ON applications (deposit_request_sent_at);
