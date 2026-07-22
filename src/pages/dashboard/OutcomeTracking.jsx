import React, { useState, useEffect } from 'react'
import { isSupabaseReady, getPatients } from '../../utils/supabase'

/*
  Outcome Tracking / M&E Dashboard — per SOP Chapter 8.5
  Programme KPIs. Metrics that can be derived from the patients table
  (census, graduation, admissions-by-month) are live; longitudinal
  follow-up KPIs (relapse, employment, church, family) require an
  aftercare/alumni follow-up dataset that isn't wired yet, so they render
  an explicit 'n/a' placeholder rather than a fabricated figure.
*/

const NA = 'n/a'
const ACTIVE_STATUSES = ['admitted', 'on-pass', 'suspended']
const GRADUATED_STATUSES = ['graduated', 'completed', 'discharged-complete']
const DROPPED_STATUSES = ['dropped-out', 'dropped', 'withdrawn', 'left', 'ama']

// KPI definitions (labels/targets/colours static). `derivable` marks the
// ones we can compute from available tables today.
const KPIS = [
  { key: 'graduation', label: 'Graduation Rate', desc: '% of admitted clients who complete the programme', color: '#1A7A4A', target: 80, derivable: true },
  { key: 'relapse', label: 'Relapse Rate', desc: '% relapsed within 12 months of discharge', color: '#E53E3E', target: 20, inverse: true, derivable: false },
  { key: 'employment', label: 'Employment Rate', desc: '% employed at 6 months post-discharge', color: 'var(--blue)', target: 70, derivable: false },
  { key: 'church', label: 'Church Attendance', desc: '% active in church community at 6 months', color: '#805AD5', target: 75, derivable: false },
  { key: 'family', label: 'Family Reunification', desc: '% reunified with family post-discharge', color: '#DD6B20', target: 65, derivable: false },
]

// Trailing 6 calendar months (oldest → newest) for the admissions trend.
function lastSixMonths() {
  const out = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    out.push({ label: start.toLocaleString('en', { month: 'short' }), start, end })
  }
  return out
}

export default function OutcomeTracking() {
  const ready = isSupabaseReady()
  const [selectedKpi, setSelectedKpi] = useState('graduation')
  const [live, setLive] = useState(null)
  const [loading, setLoading] = useState(ready)

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const { data } = await getPatients()
      if (cancelled) return
      const patients = data || []

      const totalAdmitted = patients.length
      const graduated = patients.filter(p => GRADUATED_STATUSES.includes(p.status)).length
      const currentInProgramme = patients.filter(p => ACTIVE_STATUSES.includes(p.status)).length
      const droppedOut = patients.filter(p => DROPPED_STATUSES.includes(p.status)).length
      const graduationRate = totalAdmitted ? Math.round((graduated / totalAdmitted) * 100) : null

      const monthly = lastSixMonths().map(({ label, start, end }) => ({
        label,
        count: patients.filter(p => {
          if (!p.admitted_at) return false
          const d = new Date(p.admitted_at)
          return d >= start && d < end
        }).length,
      }))

      setLive({ totalAdmitted, graduated, currentInProgramme, droppedOut, graduationRate, monthly })
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [ready])

  const L = live || {}
  const has = (v) => v !== undefined && v !== null

  // Live value per KPI (only graduation is derivable from current tables).
  const kpiValue = (kpi) => (kpi.key === 'graduation' ? L.graduationRate ?? null : null)

  const monthly = L.monthly || lastSixMonths().map(m => ({ label: m.label, count: null }))
  const maxCount = Math.max(1, ...monthly.map(m => m.count || 0))

  const generateBoardReport = () => {
    const g = (v) => (has(v) ? v : '—')
    const rate = has(L.graduationRate) ? `${L.graduationRate}%` : '—'
    return `HOUSE OF REFUGE — OUTCOME REPORT

Programme Performance Summary:
Of ${g(L.totalAdmitted)} clients admitted to date, ${g(L.graduated)} have completed the programme (graduation rate: ${rate}, target: 80%). ${g(L.currentInProgramme)} clients are currently in programme and ${g(L.droppedOut)} have left early.

Longitudinal Outcomes:
Relapse, employment, church-engagement and family-reunification KPIs are tracked via post-discharge aftercare follow-up, which is not yet wired to live reporting — these are shown as "n/a" until the follow-up dataset is connected.

Admissions Trend (last 6 months):
${monthly.map(m => `  ${m.label}: ${has(m.count) ? m.count : '—'}`).join('\n')}

Recommendations:
1. Connect the aftercare/alumni follow-up dataset to surface relapse and reintegration KPIs.
2. Continue monitoring graduation and admissions trends month over month.`
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Outcome Tracking</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
          M&amp;E Dashboard — Programme KPIs per SOP Chapter 8.5
          {!ready && <span style={{ color: 'var(--gold)' }}> · live data not connected (showing placeholders)</span>}
          {ready && loading && <span style={{ color: 'var(--g400)' }}> · loading live data…</span>}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 24 }}>
        {KPIS.map(kpi => {
          const val = kpiValue(kpi)
          const onTrack = has(val) ? (kpi.inverse ? val <= kpi.target : val >= kpi.target) : null
          return (
            <div key={kpi.key} className="card"
              onClick={() => setSelectedKpi(kpi.key)}
              style={{ padding: 16, cursor: 'pointer', borderLeft: `4px solid ${kpi.color}`, outline: selectedKpi === kpi.key ? `2px solid ${kpi.color}` : 'none' }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: has(val) ? kpi.color : 'var(--g400)' }}>
                {has(val) ? `${val}%` : NA}
              </div>
              <div style={{ fontSize: '.82rem', fontWeight: 700, marginTop: 2 }}>{kpi.label}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 2 }}>{kpi.desc}</div>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '.7rem', fontWeight: 700, color: onTrack == null ? 'var(--g400)' : (onTrack ? '#1A7A4A' : '#E53E3E') }}>
                  {onTrack == null ? 'Not yet measured' : (onTrack ? 'On Track' : 'Below Target')}
                </span>
                <span style={{ fontSize: '.68rem', color: 'var(--g400)' }}>Target: {kpi.target}%</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cohort Summary */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Cohort Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {[
            { label: 'Total Admitted', value: has(L.totalAdmitted) ? L.totalAdmitted : '—' },
            { label: 'Graduated', value: has(L.graduated) ? L.graduated : '—' },
            { label: 'Currently In Programme', value: has(L.currentInProgramme) ? L.currentInProgramme : '—' },
            { label: 'Dropped Out', value: has(L.droppedOut) ? L.droppedOut : '—' },
            { label: 'Relapsed (12mo)', value: '—' },
            { label: 'Employed (6mo)', value: '—' },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center', padding: 10, background: 'var(--g50, #F7FAFC)', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{item.value}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--g500)' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Admissions trend (div-based bar chart) */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 4 }}>Monthly Admissions</h3>
        <p style={{ fontSize: '.75rem', color: 'var(--g500)', marginBottom: 16 }}>Last 6 months — from live admission dates</p>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 180, padding: '0 8px' }}>
          {monthly.map((m, i) => {
            const barHeight = has(m.count) ? (m.count / maxCount) * 160 : 0
            const color = '#1A7A4A'
            return (
              <div key={m.label + i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '.72rem', fontWeight: 700, color: has(m.count) ? color : 'var(--g400)' }}>
                  {has(m.count) ? m.count : '—'}
                </span>
                <div style={{
                  width: '100%',
                  maxWidth: 48,
                  height: barHeight,
                  background: color + '22',
                  borderRadius: '6px 6px 0 0',
                  position: 'relative',
                  border: has(m.count) && m.count > 0 ? `2px solid ${color}` : '2px solid var(--g200)',
                  borderBottom: 'none',
                  transition: 'height 0.3s ease',
                }} />
                <span style={{ fontSize: '.72rem', color: 'var(--g500)', fontWeight: 600 }}>{m.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Board Report */}
      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Board Report Summary</h3>
        <pre style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'inherit',
          fontSize: '.8rem',
          lineHeight: 1.6,
          color: 'var(--g600)',
          background: 'var(--g50, #F7FAFC)',
          padding: 16,
          borderRadius: 8,
          maxHeight: 400,
          overflow: 'auto',
        }}>
          {generateBoardReport()}
        </pre>
        <button
          onClick={() => navigator.clipboard?.writeText(generateBoardReport())}
          style={{ marginTop: 10, padding: '6px 16px', borderRadius: 6, border: '1px solid var(--g200)', background: '#fff', cursor: 'pointer', fontSize: '.78rem', fontWeight: 600 }}>
          Copy Report
        </button>
      </div>
    </div>
  )
}
