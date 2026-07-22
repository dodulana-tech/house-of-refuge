-- ── Public donation submissions ───────────────────────────
-- Captures donor details submitted on the public /donate page. The page shows
-- bank-transfer details after submit (no online payment gateway yet), so each
-- row is a pledge / intent to give that staff reconcile against bank receipts.
--
-- RLS mirrors `applications`: anyone (anon) may INSERT, only staff may read or
-- manage. Donors never read the table back, so there is no public SELECT policy.

CREATE TABLE IF NOT EXISTS donations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name  TEXT NOT NULL,
  last_name   TEXT,
  email       TEXT NOT NULL,
  phone       TEXT,
  amount      NUMERIC,                 -- intended gift in Naira (optional)
  message     TEXT,                    -- dedication / note
  status      TEXT DEFAULT 'pledged',  -- 'pledged'|'received'|'thanked'
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Public submit (anon insert), staff-only read/manage.
DROP POLICY IF EXISTS "Anyone can submit donation" ON donations;
CREATE POLICY "Anyone can submit donation" ON donations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can read donations" ON donations;
CREATE POLICY "Staff can read donations" ON donations FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage donations" ON donations;
CREATE POLICY "Staff can manage donations" ON donations FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can delete donations" ON donations;
CREATE POLICY "Staff can delete donations" ON donations FOR DELETE USING (public.is_staff());

CREATE INDEX IF NOT EXISTS donations_status_idx  ON donations (status);
CREATE INDEX IF NOT EXISTS donations_created_idx ON donations (created_at DESC);

DROP TRIGGER IF EXISTS update_donations_updated_at ON donations;
CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
