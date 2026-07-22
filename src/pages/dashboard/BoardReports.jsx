import React, { useState, useEffect } from 'react'
import { fmt } from '../../utils/paystack'
import {
  isSupabaseReady,
  getPatients,
  getPayments,
  getIncidents,
  getDischarges,
  getLatestCheckinsByPatient,
  getTherapySessions,
} from '../../utils/supabase'
import { mapPatientRow } from '../../utils/patients'

/*
  Board Reports — Governance Reporting (SOP Chapter 13)
  Headline metrics are aggregated live from Supabase; sub-metrics that cannot
  yet be derived from available tables render an explicit '—' placeholder
  (no fabricated numbers).
*/

const REPORT_PERIODS = ['This Month', 'Last Month', 'This Quarter', 'Last Quarter', 'Custom']

const TOTAL_BEDS = 24
const ACTIVE_STATUSES = ['admitted', 'on-pass', 'suspended']
const PAID_STATUSES = ['success', 'successful', 'completed', 'paid']

// Phase definitions (labels/colours are static; counts come from live data).
const PHASES = [
  { key: 'stabilization', label: 'Phase 1: Medical Stabilisation', color: '#E53E3E' },
  { key: 'foundation', label: 'Phase 2: Therapeutic Foundation', color: '#DD6B20' },
  { key: 'deepening', label: 'Phase 3: Deepening & Skills', color: '#D69E2E' },
  { key: 'reintegration', label: 'Phase 4: Reintegration', color: '#1A7A4A' },
]

// ── Period / range helpers ────────────────────────────────
function periodRange(period, customStart, customEnd) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const som = (yy, mm) => new Date(yy, mm, 1)
  switch (period) {
    case 'This Month':
      return { start: som(y, m), end: som(y, m + 1) }
    case 'Last Month':
      return { start: som(y, m - 1), end: som(y, m) }
    case 'This Quarter': {
      const q = Math.floor(m / 3)
      return { start: som(y, q * 3), end: som(y, q * 3 + 3) }
    }
    case 'Last Quarter': {
      const q = Math.floor(m / 3)
      return { start: som(y, q * 3 - 3), end: som(y, q * 3) }
    }
    case 'Custom': {
      const start = customStart ? new Date(customStart) : null
      let end = null
      if (customEnd) {
        end = new Date(customEnd)
        end.setDate(end.getDate() + 1) // inclusive of the end day
      }
      return { start, end }
    }
    default:
      return { start: null, end: null }
  }
}

function inRange(dateStr, range) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return false
  if (range.start && d < range.start) return false
  if (range.end && d >= range.end) return false
  return true
}

const isPaid = (s) => !s || PAID_STATUSES.includes(String(s).toLowerCase())
const isOpenIncident = (s) => !s || !['resolved', 'closed', 'completed'].includes(String(s).toLowerCase())

export default function BoardReports() {
  const ready = isSupabaseReady()
  const [period, setPeriod] = useState('This Month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [live, setLive] = useState(null)
  const [loading, setLoading] = useState(ready)

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const range = periodRange(period, customStart, customEnd)
      const [pRes, payRes, incRes, disRes, chkRes, thRes] = await Promise.all([
        getPatients(),
        getPayments(),
        getIncidents(),
        getDischarges(),
        getLatestCheckinsByPatient(),
        getTherapySessions(),
      ])
      if (cancelled) return

      const patients = pRes.data || []
      const active = patients.filter(p => ACTIVE_STATUSES.includes(p.status))

      const phaseCounts = { stabilization: 0, foundation: 0, deepening: 0, reintegration: 0 }
      active.forEach(p => {
        const ph = mapPatientRow(p).phase
        if (phaseCounts[ph] != null) phaseCounts[ph]++
      })

      const admissions = patients.filter(p => inRange(p.admitted_at, range)).length
      const discharges = (disRes.data || []).filter(d => inRange(d.created_at, range)).length

      const revenue = (payRes.data || [])
        .filter(p => isPaid(p.status) && inRange(p.created_at, range))
        .reduce((s, p) => s + (Number(p.amount) || 0), 0)

      const incidents = (incRes.data || []).filter(i => inRange(i.created_at, range)).length
      const openIncidents = (incRes.data || []).filter(i => isOpenIncident(i.status)).length

      const sessions = (thRes.data || []).filter(t => inRange(t.session_date, range)).length

      const chk = Object.values(chkRes.data || {})
      const avg = (key) => {
        const v = chk.map(c => Number(c[key])).filter(n => Number.isFinite(n))
        return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null
      }

      setLive({
        bedsOccupied: active.length,
        phaseCounts,
        admissions,
        discharges,
        revenue,
        incidents,
        openIncidents,
        sessions,
        avgMood: avg('mood'),
        avgCravings: avg('cravings'),
      })
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [ready, period, customStart, customEnd])

  const handleExport = () => {
    alert('Export functionality will generate a PDF report for the selected period.')
  }

  // Display helpers — render '—' when a value is not (yet) derivable.
  const L = live || {}
  const has = (v) => v !== undefined && v !== null
  const NA = '—'
  const num = (v) => (has(v) ? v : NA)
  const pctOf = (occ) => (has(occ) ? `${Math.round((occ / TOTAL_BEDS) * 100)}%` : NA)
  const money = (v) => (has(v) ? fmt(v) : NA)
  const GREY = 'var(--g400)'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Board Reports</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
            Governance reporting — auto-generated from programme data
            {!ready && <span style={{ color: 'var(--gold)' }}> · live data not connected (showing placeholders)</span>}
            {ready && loading && <span style={{ color: 'var(--g400)' }}> · loading live data…</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.84rem' }}>
            {REPORT_PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={handleExport}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--charcoal)', color: '#fff', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer' }}>
            Export Report
          </button>
        </div>
      </div>

      {period === 'Custom' && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '.72rem', color: 'var(--g500)', display: 'block', marginBottom: 2 }}>Start Date</label>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }} />
          </div>
          <div>
            <label style={{ fontSize: '.72rem', color: 'var(--g500)', display: 'block', marginBottom: 2 }}>End Date</label>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }} />
          </div>
        </div>
      )}

      {/* 1. Programme Summary */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Programme Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Beds Occupied', value: has(L.bedsOccupied) ? `${L.bedsOccupied}/${TOTAL_BEDS}` : NA, color: 'var(--blue)' },
            { label: 'Admissions (Period)', value: num(L.admissions), color: '#1A7A4A' },
            { label: 'Discharges (Period)', value: num(L.discharges), color: '#DD6B20' },
            { label: 'Occupancy Rate', value: pctOf(L.bedsOccupied), color: 'var(--gold)' },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'center', padding: 10, background: 'var(--g50)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', fontWeight: 700, color: k.value === NA ? GREY : k.color }}>{k.value}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--g500)' }}>{k.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: 8 }}>Phase Distribution</div>
        {PHASES.map(p => {
          const count = L.phaseCounts ? L.phaseCounts[p.key] : null
          return (
            <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: '.8rem', color: 'var(--g700)', flex: 1 }}>{p.label}</span>
              <span style={{ fontSize: '.8rem', fontWeight: 700, color: has(count) ? p.color : GREY }}>{num(count)}</span>
            </div>
          )
        })}
      </div>

      {/* 2. Clinical Summary */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Clinical Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { label: 'Avg Mood Score', value: has(L.avgMood) ? `${L.avgMood}/5` : NA, color: '#38A169' },
            { label: 'Avg Cravings Score', value: has(L.avgCravings) ? `${L.avgCravings}/5` : NA, color: '#DD6B20' },
            { label: 'CIWA Alerts', value: NA, color: GREY },
            { label: 'COWS Alerts', value: NA, color: GREY },
            { label: 'Incidents', value: num(L.incidents), color: has(L.incidents) ? (L.incidents > 0 ? '#E53E3E' : '#1A7A4A') : GREY },
            { label: 'Sessions Delivered', value: num(L.sessions), color: 'var(--blue)' },
            { label: 'Group Sessions', value: NA, color: GREY },
            { label: 'Attendance Rate', value: NA, color: GREY },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'center', padding: 10, background: 'var(--g50)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', fontWeight: 700, color: k.value === NA ? GREY : k.color }}>{k.value}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--g500)' }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Financial Summary */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Financial Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {[
            { label: 'Revenue (Period)', value: money(L.revenue), color: 'var(--charcoal)' },
            { label: 'Deposits', value: NA, color: GREY },
            { label: 'Treatment Fees', value: NA, color: GREY },
            { label: 'Donations', value: NA, color: GREY },
            { label: 'Sponsorship', value: NA, color: GREY },
            { label: 'Outstanding', value: NA, color: GREY },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'center', padding: 10, background: 'var(--g50)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 700, color: k.value === NA ? GREY : k.color }}>{k.value}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--g500)' }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Safeguarding Summary */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Safeguarding Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {[
            { label: 'Training Compliance', value: NA, color: GREY },
            { label: 'Open Incidents', value: num(L.openIncidents), color: has(L.openIncidents) ? (L.openIncidents > 0 ? '#E53E3E' : '#1A7A4A') : GREY },
            { label: 'Boundary Concerns', value: NA, color: GREY },
            { label: 'DBS Checks Valid', value: NA, color: GREY },
            { label: 'Last Audit', value: NA, color: GREY },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'center', padding: 10, background: 'var(--g50)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 700, color: k.value === NA ? GREY : k.color }}>{k.value}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--g500)' }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Staffing */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Staffing</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {[
            { label: 'Coverage', value: NA },
            { label: 'Training Compliance', value: NA },
            { label: 'Vacancies', value: NA },
            { label: 'Active Staff', value: NA },
            { label: 'Overtime Hours', value: NA },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'center', padding: 10, background: 'var(--g50)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 700, color: GREY }}>{k.value}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--g500)' }}>{k.label}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '.72rem', color: 'var(--g400)', marginTop: 10 }}>
          Staffing metrics require the HR / rota module — not yet wired to live data.
        </p>
      </div>
    </div>
  )
}
