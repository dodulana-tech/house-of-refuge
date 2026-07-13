-- Programme KPIs — quarterly board-level metrics (Treatment Protocol Section 18.3)
-- Stores the actual value + status per KPI, per quarter/year. The KPI framework
-- (names, targets, evidence basis) lives in the app as config; only the measured
-- values are data. Empty until staff enter a quarter's figures — no seeded numbers.

CREATE TABLE IF NOT EXISTS programme_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  quarter TEXT NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  kpi_key TEXT NOT NULL,            -- stable key, e.g. 'graduation_rate'
  value NUMERIC,
  status TEXT,                      -- 'On Target' | 'Below Target' | 'Critical' | 'Tracking'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (year, quarter, kpi_key)
);

ALTER TABLE programme_kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS programme_kpis_staff_all ON programme_kpis;
CREATE POLICY programme_kpis_staff_all ON programme_kpis
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE INDEX IF NOT EXISTS programme_kpis_period_idx ON programme_kpis (year, quarter);
