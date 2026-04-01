import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../utils/paystack'

/*
  Board Reports — Governance Reporting (SOP Chapter 13)
  Auto-generated report sections with mock data.
  No free text — all data from constants.
*/

const REPORT_PERIODS = ['This Month', 'Last Month', 'This Quarter', 'Last Quarter', 'Custom']

const MOCK_DATA = {
  programme: {
    bedsOccupied: 4,
    totalBeds: 24,
    admissionsThisMonth: 1,
    dischargesThisMonth: 0,
    phases: [
      { phase: 'Phase 1: Medical Stabilisation', count: 1, color: '#E53E3E' },
      { phase: 'Phase 2: Therapeutic Foundation', count: 2, color: '#DD6B20' },
      { phase: 'Phase 3: Deepening & Skills', count: 1, color: '#D69E2E' },
      { phase: 'Phase 4: Reintegration', count: 0, color: '#1A7A4A' },
    ],
  },
  clinical: {
    avgMoodScore: 3.8,
    avgCravingsScore: 2.1,
    ciwaAlerts: 1,
    cowsAlerts: 0,
    incidentsCount: 0,
    sessionsDelivered: 42,
    groupSessionsHeld: 18,
    attendanceRate: 94,
  },
  financial: {
    revenueMTD: 6495000,
    deposits: 3000000,
    treatmentFees: 1700000,
    donations: 875000,
    sponsorship: 920000,
    outstanding: 850000,
    compassionFund: 150000,
  },
  safeguarding: {
    trainingCompliance: 92,
    openIncidents: 0,
    boundaryConcerns: 0,
    dbsChecksValid: 12,
    dbsChecksTotal: 12,
    lastAuditDate: '2026-03-15',
  },
  staffing: {
    coveragePercent: 95,
    trainingCompliance: 88,
    vacancies: 2,
    totalStaff: 14,
    activeStaff: 12,
    overtimeHours: 24,
  },
}

export default function BoardReports() {
  const { user } = useAuth()
  const [period, setPeriod] = useState('This Month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const d = MOCK_DATA

  const handleExport = () => {
    alert('Export functionality will generate a PDF report for the selected period.')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Board Reports</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Governance reporting — auto-generated from programme data</p>
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
            { label: 'Beds Occupied', value: `${d.programme.bedsOccupied}/${d.programme.totalBeds}`, color: 'var(--blue)' },
            { label: 'Admissions (Month)', value: d.programme.admissionsThisMonth, color: '#1A7A4A' },
            { label: 'Discharges (Month)', value: d.programme.dischargesThisMonth, color: '#DD6B20' },
            { label: 'Occupancy Rate', value: `${Math.round((d.programme.bedsOccupied / d.programme.totalBeds) * 100)}%`, color: 'var(--gold)' },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'center', padding: 10, background: 'var(--g50)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', fontWeight: 700, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--g500)' }}>{k.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: 8 }}>Phase Distribution</div>
        {d.programme.phases.map(p => (
          <div key={p.phase} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
            <span style={{ fontSize: '.8rem', color: 'var(--g700)', flex: 1 }}>{p.phase}</span>
            <span style={{ fontSize: '.8rem', fontWeight: 700, color: p.color }}>{p.count}</span>
          </div>
        ))}
      </div>

      {/* 2. Clinical Summary */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Clinical Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { label: 'Avg Mood Score', value: `${d.clinical.avgMoodScore}/5`, color: '#38A169' },
            { label: 'Avg Cravings Score', value: `${d.clinical.avgCravingsScore}/5`, color: '#DD6B20' },
            { label: 'CIWA Alerts', value: d.clinical.ciwaAlerts, color: d.clinical.ciwaAlerts > 0 ? '#E53E3E' : '#1A7A4A' },
            { label: 'COWS Alerts', value: d.clinical.cowsAlerts, color: '#1A7A4A' },
            { label: 'Incidents', value: d.clinical.incidentsCount, color: d.clinical.incidentsCount > 0 ? '#E53E3E' : '#1A7A4A' },
            { label: 'Sessions Delivered', value: d.clinical.sessionsDelivered, color: 'var(--blue)' },
            { label: 'Group Sessions', value: d.clinical.groupSessionsHeld, color: '#805AD5' },
            { label: 'Attendance Rate', value: `${d.clinical.attendanceRate}%`, color: 'var(--gold)' },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'center', padding: 10, background: 'var(--g50)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', fontWeight: 700, color: k.color }}>{k.value}</div>
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
            { label: 'Revenue MTD', value: fmt(d.financial.revenueMTD), color: 'var(--charcoal)' },
            { label: 'Deposits', value: fmt(d.financial.deposits), color: 'var(--blue)' },
            { label: 'Treatment Fees', value: fmt(d.financial.treatmentFees), color: '#1A7A4A' },
            { label: 'Donations', value: fmt(d.financial.donations), color: 'var(--gold)' },
            { label: 'Sponsorship', value: fmt(d.financial.sponsorship), color: '#805AD5' },
            { label: 'Outstanding', value: fmt(d.financial.outstanding), color: '#E53E3E' },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'center', padding: 10, background: 'var(--g50)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 700, color: k.color }}>{k.value}</div>
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
            { label: 'Training Compliance', value: `${d.safeguarding.trainingCompliance}%`, color: d.safeguarding.trainingCompliance >= 90 ? '#1A7A4A' : '#DD6B20' },
            { label: 'Open Incidents', value: d.safeguarding.openIncidents, color: d.safeguarding.openIncidents > 0 ? '#E53E3E' : '#1A7A4A' },
            { label: 'Boundary Concerns', value: d.safeguarding.boundaryConcerns, color: d.safeguarding.boundaryConcerns > 0 ? '#E53E3E' : '#1A7A4A' },
            { label: 'DBS Checks Valid', value: `${d.safeguarding.dbsChecksValid}/${d.safeguarding.dbsChecksTotal}`, color: 'var(--blue)' },
            { label: 'Last Audit', value: d.safeguarding.lastAuditDate, color: 'var(--g600)' },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'center', padding: 10, background: 'var(--g50)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 700, color: k.color }}>{k.value}</div>
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
            { label: 'Coverage', value: `${d.staffing.coveragePercent}%`, color: d.staffing.coveragePercent >= 90 ? '#1A7A4A' : '#DD6B20' },
            { label: 'Training Compliance', value: `${d.staffing.trainingCompliance}%`, color: d.staffing.trainingCompliance >= 90 ? '#1A7A4A' : '#DD6B20' },
            { label: 'Vacancies', value: d.staffing.vacancies, color: d.staffing.vacancies > 0 ? '#DD6B20' : '#1A7A4A' },
            { label: 'Active Staff', value: `${d.staffing.activeStaff}/${d.staffing.totalStaff}`, color: 'var(--blue)' },
            { label: 'Overtime Hours', value: `${d.staffing.overtimeHours}h`, color: 'var(--gold)' },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'center', padding: 10, background: 'var(--g50)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 700, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--g500)' }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
