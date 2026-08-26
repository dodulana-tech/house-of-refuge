import React, { useState, useEffect } from 'react'
import { isSupabaseReady, getProgrammeKpis } from '../../utils/supabase'

/*
  Programme KPIs Dashboard — Treatment Protocol Section 18.3
  Quarterly board-level reporting. 10 KPIs tracking programme outcomes.
  No patient-level data — programme-level metrics only.

  The KPI framework below (names, targets, evidence) is fixed config. The measured
  VALUES are live from the `programme_kpis` table — empty until entered per quarter,
  so nothing is fabricated.
*/

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const YEARS = [2025, 2026, 2027]

const STATUS_CONFIG = {
  'On Target': { color: '#38A169', bg: '#F0FFF4', border: '#C6F6D5' },
  'Below Target': { color: '#D69E2E', bg: '#FFFFF0', border: '#FEFCBF' },
  Critical: { color: '#E53E3E', bg: '#FFF5F5', border: '#FED7D7' },
  Tracking: { color: '#2B6CB0', bg: '#EBF8FF', border: '#BEE3F8' },
}

// KPI framework (config, not data). `key` matches programme_kpis.kpi_key.
const KPI_META = [
  { id: 1, key: 'graduation_rate', name: 'Graduation Rate', target: 75, targetLabel: '>75%', unit: '%', evidence: 'TC retention benchmarks (De Leon)' },
  { id: 2, key: 'abstinence_12m', name: '12-Month Abstinence Rate', target: 60, targetLabel: '>60%', unit: '%', evidence: 'UNODC outcome standards; alumni monitoring data' },
  { id: 3, key: 'employment_6m', name: 'Employment at 6 Months', target: 50, targetLabel: '>50%', unit: '%', evidence: 'WHO mhGAP vocational outcomes' },
  { id: 4, key: 'church_attendance_6m', name: 'Church Attendance at 6 Months', target: 70, targetLabel: '>70%', unit: '%', evidence: 'Faith-integrated recovery model (HOR)' },
  { id: 5, key: 'family_reunification', name: 'Family Reunification Rate', target: 60, targetLabel: '>60%', unit: '%', evidence: 'Family therapy outcome snapshots' },
  { id: 6, key: 'phq9_improvement', name: 'PHQ-9 Improvement (Admission to Discharge)', target: null, targetLabel: 'Clinically significant reduction', unit: 'pts', evidence: 'PHQ-9 validated instrument; mean score change', isScoreChange: true },
  { id: 7, key: 'gad7_improvement', name: 'GAD-7 Improvement (Admission to Discharge)', target: null, targetLabel: 'Clinically significant reduction', unit: 'pts', evidence: 'GAD-7 validated instrument; mean score change', isScoreChange: true },
  { id: 8, key: 'readmission_rate', name: 'Re-admission Rate', target: null, targetLabel: 'Track (not punitive)', unit: '%', evidence: 'Re-admission / total graduates; continuous monitoring', isTracking: true },
  { id: 9, key: 'adverse_events', name: 'Adverse Events', target: 0, targetLabel: 'Zero', unit: 'events', evidence: 'Incident reports; safety protocol compliance', isZeroTarget: true },
  { id: 10, key: 'aftercare_3m', name: 'Aftercare Engagement at 3 Months', target: 80, targetLabel: '>80%', unit: '%', evidence: 'Contact logs; aftercare programme records' },
]
const META_BY_KEY = Object.fromEntries(KPI_META.map((m) => [m.key, m]))

function displayValue(meta, value) {
  if (value === null || value === undefined) return '—'
  if (meta.isScoreChange) return `-${value}`
  if (meta.unit === '%') return `${value}%`
  return `${value}`
}

function getProgressPercent(kpi) {
  if (kpi.value === null || kpi.value === undefined) return 0
  if (kpi.isScoreChange) return Math.min((kpi.value / 8) * 100, 100)
  if (kpi.isZeroTarget) return kpi.value === 0 ? 100 : 0
  if (kpi.isTracking) return kpi.value
  if (kpi.target) return Math.min((kpi.value / kpi.target) * 100, 100)
  return 50
}

export default function ProgrammeKPIs() {
  const [selectedQuarter, setSelectedQuarter] = useState('Q1')
  const [selectedYear, setSelectedYear] = useState(2026)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!isSupabaseReady()) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    getProgrammeKpis(selectedYear, selectedQuarter)
      .then(({ data, error }) => {
        if (!active) return
        if (error) console.error(error)
        setRows(data || [])
      })
      // Without this the page spins forever on a rejected fetch instead of
      // rendering an empty quarter.
      .catch((err) => { console.error(err); if (active) setRows([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [selectedQuarter, selectedYear])

  // Merge live rows onto the KPI framework, in display order. Only KPIs with a
  // recorded value for this quarter are shown.
  const kpis = rows
    .filter((r) => META_BY_KEY[r.kpi_key])
    .map((r) => {
      const meta = META_BY_KEY[r.kpi_key]
      return { ...meta, value: r.value, status: r.status || 'Tracking', displayValue: displayValue(meta, r.value) }
    })
    .sort((a, b) => a.id - b.id)

  const hasData = kpis.length > 0
  const onTargetCount = kpis.filter((k) => k.status === 'On Target').length
  const totalKpis = KPI_META.length
  const boardReady = hasData && onTargetCount >= 7

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>Programme KPIs</h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            Treatment Protocol Section 18.3 — Quarterly Board Report
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>Quarter:</label>
          <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E0', fontSize: 14, fontWeight: 600, background: '#fff' }}>
            {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
          <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>Year:</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E0', fontSize: 14, fontWeight: 600, background: '#fff' }}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Banner */}
      {hasData && (
        <div style={{ padding: 16, marginBottom: 20, borderRadius: 12, background: boardReady ? '#F0FFF4' : '#FFFFF0', border: `1px solid ${boardReady ? '#C6F6D5' : '#FEFCBF'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: boardReady ? '#38A169' : '#D69E2E', color: '#fff', fontWeight: 700, fontSize: 20 }}>
              {onTargetCount}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#2D3748' }}>
                {onTargetCount}/{totalKpis} KPIs on target this quarter
              </div>
              <div style={{ fontSize: 13, color: '#718096', marginTop: 2 }}>
                {selectedQuarter} {selectedYear} — Programme Performance Summary
              </div>
            </div>
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, color: boardReady ? '#38A169' : '#D69E2E', background: boardReady ? '#C6F6D5' : '#FEFCBF' }}>
            {boardReady ? 'Board Report Ready' : 'Review Required'}
          </div>
        </div>
      )}

      {/* Loading / No Data */}
      {loading && (
        <div className="card" style={{ padding: 40, borderRadius: 12, border: '1px solid #E2E8F0', background: '#fff', textAlign: 'center' }}>
          <p style={{ color: '#A0AEC0', fontSize: 16, margin: 0 }}>Loading KPIs…</p>
        </div>
      )}
      {!loading && !hasData && (
        <div className="card" style={{ padding: 40, borderRadius: 12, border: '1px solid #E2E8F0', background: '#fff', textAlign: 'center' }}>
          <p style={{ color: '#A0AEC0', fontSize: 16, margin: 0 }}>
            No KPI data recorded for {selectedQuarter} {selectedYear} yet.
          </p>
        </div>
      )}

      {/* KPI Cards Grid */}
      {!loading && hasData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
          {kpis.map((kpi) => {
            const config = STATUS_CONFIG[kpi.status] || STATUS_CONFIG['On Target']
            const progressPercent = getProgressPercent(kpi)
            return (
              <div key={kpi.id} className="card" style={{ padding: 20, borderRadius: 12, border: `1px solid ${config.border}`, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ flex: 1, marginRight: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#2D3748', marginBottom: 4 }}>{kpi.id}. {kpi.name}</div>
                  </div>
                  <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: config.color, background: config.bg, border: `1px solid ${config.border}`, whiteSpace: 'nowrap' }}>
                    {(kpi.status || '').toUpperCase()}
                  </span>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: config.color }}>{kpi.displayValue}</span>
                  {kpi.isScoreChange && <span style={{ fontSize: 14, color: '#718096', marginLeft: 6 }}>mean change</span>}
                </div>
                <div style={{ fontSize: 13, color: '#4A5568', marginBottom: 12 }}>
                  <strong>Target:</strong> {kpi.targetLabel}
                </div>
                <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#EDF2F7', marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(progressPercent, 100)}%`, height: '100%', borderRadius: 4, background: config.color, transition: 'width 0.3s ease' }} />
                </div>
                {kpi.target && !kpi.isZeroTarget && (
                  <div style={{ fontSize: 11, color: '#A0AEC0', marginBottom: 8 }}>
                    {kpi.value}/{kpi.target}{kpi.unit === '%' ? '%' : ` ${kpi.unit}`} of target
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#A0AEC0', fontStyle: 'italic', borderTop: '1px solid #EDF2F7', paddingTop: 8 }}>
                  Evidence: {kpi.evidence}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer Note */}
      {hasData && (
        <div style={{ marginTop: 24, padding: 16, borderRadius: 12, border: '1px solid #E2E8F0', background: '#fff', fontSize: 13, color: '#718096', lineHeight: 1.6 }}>
          <strong style={{ color: '#2D3748' }}>Reporting Notes:</strong> KPIs are reported quarterly to the Board
          per Treatment Protocol Section 18.3. Targets are benchmarked against TC retention standards (De Leon),
          UNODC outcome frameworks, and WHO mhGAP guidelines. PHQ-9 and GAD-7 improvements are assessed as
          clinically significant reductions from admission to discharge scores. Re-admission rate is tracked
          for continuous improvement purposes and is not used punitively.
        </div>
      )}
    </div>
  )
}
