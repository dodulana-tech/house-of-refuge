import React, { useState } from 'react'

/*
  Outcome Tracking / M&E Dashboard — per SOP Chapter 8.5
  Key Performance Indicators for programme effectiveness.
*/

const KPIS = [
  { key: 'graduation', label: 'Graduation Rate', value: 85, desc: '% of admitted clients who complete the programme', color: '#1A7A4A', target: 80 },
  { key: 'relapse', label: 'Relapse Rate', value: 25, desc: '% relapsed within 12 months of discharge', color: '#E53E3E', target: 20, inverse: true },
  { key: 'employment', label: 'Employment Rate', value: 60, desc: '% employed at 6 months post-discharge', color: 'var(--blue)', target: 70 },
  { key: 'church', label: 'Church Attendance', value: 78, desc: '% active in church community at 6 months', color: '#805AD5', target: 75 },
  { key: 'family', label: 'Family Reunification', value: 70, desc: '% reunified with family post-discharge', color: '#DD6B20', target: 65 },
]

// Monthly trend data (last 6 months)
const MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
const TRENDS = {
  graduation: [80, 82, 78, 84, 83, 85],
  relapse:    [30, 28, 32, 27, 26, 25],
  employment: [52, 55, 54, 57, 58, 60],
  church:     [70, 72, 74, 75, 76, 78],
  family:     [62, 64, 65, 68, 69, 70],
}

const COHORT_DATA = {
  totalAdmitted: 120,
  totalGraduated: 102,
  currentInProgramme: 14,
  droppedOut: 4,
  totalDischargedOver12Months: 80,
  relapsedCount: 20,
  employedAt6Months: 48,
  churchActiveAt6Months: 62,
  familyReunified: 56,
}

export default function OutcomeTracking() {
  const [selectedKpi, setSelectedKpi] = useState('graduation')

  const maxVal = Math.max(...TRENDS[selectedKpi])

  const generateBoardReport = () => {
    const grad = KPIS.find(k => k.key === 'graduation')
    const rel = KPIS.find(k => k.key === 'relapse')
    const emp = KPIS.find(k => k.key === 'employment')
    const ch = KPIS.find(k => k.key === 'church')
    const fam = KPIS.find(k => k.key === 'family')

    return `HOUSE OF REFUGE — QUARTERLY OUTCOME REPORT (Q1 2026)

Programme Performance Summary:
The rehabilitation programme continues to demonstrate strong outcomes across key indicators. The graduation rate stands at ${grad.value}%, ${grad.value >= grad.target ? 'exceeding' : 'below'} our target of ${grad.target}%. Of ${COHORT_DATA.totalAdmitted} clients admitted to date, ${COHORT_DATA.totalGraduated} have successfully completed the programme.

Relapse Prevention:
The 12-month relapse rate is ${rel.value}%, ${rel.value <= rel.target ? 'meeting' : 'above'} the target ceiling of ${rel.target}%. This represents ${COHORT_DATA.relapsedCount} clients out of ${COHORT_DATA.totalDischargedOver12Months} discharged over 12 months ago. Continued aftercare monitoring remains essential.

Reintegration Outcomes:
Employment at 6 months post-discharge: ${emp.value}% (target: ${emp.target}%). ${emp.value >= emp.target ? 'Target achieved.' : `${emp.target - emp.value}% gap to close — vocational training partnerships being expanded.`}
Church community engagement: ${ch.value}% (target: ${ch.target}%). ${ch.value >= ch.target ? 'Target achieved.' : 'Additional church partnerships needed.'}
Family reunification: ${fam.value}% (target: ${fam.target}%). ${fam.value >= fam.target ? 'Target achieved.' : 'Family therapy sessions being increased.'}

Trend Analysis:
All five KPIs show positive trajectory over the past 6 months. Graduation rates have improved from 80% to ${grad.value}%. Relapse rates have decreased from 30% to ${rel.value}%.

Recommendations:
1. Continue expanding vocational skills partnerships to improve employment outcomes.
2. Strengthen alumni support network to maintain low relapse rates.
3. Increase family therapy sessions in months 4-6 of treatment.
4. Current cohort: ${COHORT_DATA.currentInProgramme} clients in programme, ${COHORT_DATA.droppedOut} dropped out.`
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Outcome Tracking</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>M&E Dashboard — Programme KPIs per SOP Chapter 8.5</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 24 }}>
        {KPIS.map(kpi => {
          const onTrack = kpi.inverse ? kpi.value <= kpi.target : kpi.value >= kpi.target
          return (
            <div key={kpi.key} className="card"
              onClick={() => setSelectedKpi(kpi.key)}
              style={{ padding: 16, cursor: 'pointer', borderLeft: `4px solid ${kpi.color}`, outline: selectedKpi === kpi.key ? `2px solid ${kpi.color}` : 'none' }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: kpi.color }}>{kpi.value}%</div>
              <div style={{ fontSize: '.82rem', fontWeight: 700, marginTop: 2 }}>{kpi.label}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 2 }}>{kpi.desc}</div>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '.7rem', fontWeight: 700, color: onTrack ? '#1A7A4A' : '#E53E3E' }}>
                  {onTrack ? 'On Track' : 'Below Target'}
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
            { label: 'Total Admitted', value: COHORT_DATA.totalAdmitted },
            { label: 'Graduated', value: COHORT_DATA.totalGraduated },
            { label: 'Currently In Programme', value: COHORT_DATA.currentInProgramme },
            { label: 'Dropped Out', value: COHORT_DATA.droppedOut },
            { label: 'Relapsed (12mo)', value: COHORT_DATA.relapsedCount },
            { label: 'Employed (6mo)', value: COHORT_DATA.employedAt6Months },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center', padding: 10, background: 'var(--g50, #F7FAFC)', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{item.value}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--g500)' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend Chart (div-based bar chart) */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 4 }}>
          Monthly Trend — {KPIS.find(k => k.key === selectedKpi)?.label}
        </h3>
        <p style={{ fontSize: '.75rem', color: 'var(--g500)', marginBottom: 16 }}>Last 6 months</p>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 180, padding: '0 8px' }}>
          {MONTHS.map((month, i) => {
            const val = TRENDS[selectedKpi][i]
            const barHeight = (val / 100) * 160
            const kpiColor = KPIS.find(k => k.key === selectedKpi)?.color || 'var(--blue)'
            return (
              <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '.72rem', fontWeight: 700, color: kpiColor }}>{val}%</span>
                <div style={{
                  width: '100%',
                  maxWidth: 48,
                  height: barHeight,
                  background: kpiColor + '22',
                  borderRadius: '6px 6px 0 0',
                  position: 'relative',
                  border: `2px solid ${kpiColor}`,
                  borderBottom: 'none',
                  transition: 'height 0.3s ease',
                }} />
                <span style={{ fontSize: '.72rem', color: 'var(--g500)', fontWeight: 600 }}>{month}</span>
              </div>
            )
          })}
        </div>

        {/* Target line reference */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: '.72rem', color: 'var(--g500)' }}>
          <span style={{ width: 20, height: 2, background: '#E53E3E', display: 'inline-block' }} />
          Target: {KPIS.find(k => k.key === selectedKpi)?.target}%
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
