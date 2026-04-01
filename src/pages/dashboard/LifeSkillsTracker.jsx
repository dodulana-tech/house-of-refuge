import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Life Skills Tracker — SOP Chapter 7
  13 Life Skills Group modules tracked per patient.
  Completion % reflects each patient's programme day and schedule frequency.
  HIPAA: initials only.
*/

const PATIENTS = [
  { initials: 'CO', id: 'P001', day: 23, phase: 'foundation' },
  { initials: 'AN', id: 'P002', day: 45, phase: 'deepening' },
  { initials: 'KA', id: 'P003', day: 74, phase: 'reintegration' },
  { initials: 'IM', id: 'P004', day: 8, phase: 'stabilization' },
]

const MODULES = [
  { id: 1, name: 'Morning Community Meeting', frequency: 'Daily', day: 'Mon–Sat', sessionsPerWeek: 6 },
  { id: 2, name: 'Care Planning Group', frequency: 'Weekly', day: 'Thursday', sessionsPerWeek: 1 },
  { id: 3, name: 'CBT and Relapse Prevention', frequency: '3x/week', day: 'Mon/Wed/Fri', sessionsPerWeek: 3 },
  { id: 4, name: 'Small Group / Process Group', frequency: 'Weekly', day: 'Wednesday', sessionsPerWeek: 1 },
  { id: 5, name: 'Psychoeducation', frequency: '2x/week', day: 'Tue/Thu', sessionsPerWeek: 2 },
  { id: 6, name: 'Relaxation and Stress Management', frequency: 'Weekly', day: 'Friday', sessionsPerWeek: 1 },
  { id: 7, name: 'Relationship and Family Group', frequency: 'Weekly', day: 'Friday', sessionsPerWeek: 1 },
  { id: 8, name: 'Transition Group / Discharge Readiness', frequency: 'Weeks 10–12', day: 'Varies', sessionsPerWeek: 2 },
  { id: 9, name: 'Work, Craft, and Vocational', frequency: 'Weekly', day: 'Monday', sessionsPerWeek: 1 },
  { id: 10, name: 'Cooking, Nutrition and Life Practical', frequency: 'Weekly', day: 'Wednesday', sessionsPerWeek: 1 },
  { id: 11, name: 'News and Current Affairs', frequency: 'Weekly', day: 'Monday', sessionsPerWeek: 1 },
  { id: 12, name: 'Creative Writing', frequency: 'Weekly', day: 'Thursday', sessionsPerWeek: 1 },
  { id: 13, name: 'End-of-Day Wrap-Up', frequency: 'Daily', day: 'Mon–Sat', sessionsPerWeek: 6 },
]

/*
  Completion logic:
  - KA (day 74): mostly complete (85-100% on most modules, started transition group)
  - AN (day 45): moderate (55-80%)
  - CO (day 23): early progress (20-50%)
  - IM (day 8): minimal (0-15%, detox phase)
  - Transition Group only applies for days >= 70 (Weeks 10-12)
*/
function getCompletion(patientInitials, moduleId) {
  const p = PATIENTS.find(pt => pt.initials === patientInitials)
  if (!p) return 0
  const day = p.day
  const totalDays = 84 // 12-week programme

  // Transition group only for weeks 10-12
  if (moduleId === 8) {
    if (day < 70) return 0
    return Math.min(100, Math.round(((day - 70) / 14) * 100))
  }

  // IM (day 8) — detox, minimal participation
  if (day <= 14) {
    if (moduleId === 1 || moduleId === 13) return Math.round((day / totalDays) * 100 * 0.6) // daily modules, limited
    return Math.round(Math.random() * 10 + (day > 5 ? 5 : 0))
  }

  // Base completion scaled by day
  const basePct = (day / totalDays) * 100
  // Add some variance per module
  const variance = ((moduleId * 7 + day * 3) % 20) - 10
  return Math.min(100, Math.max(0, Math.round(basePct + variance)))
}

// Precompute all completions
const COMPLETIONS = {}
PATIENTS.forEach(p => {
  COMPLETIONS[p.initials] = {}
  MODULES.forEach(m => {
    COMPLETIONS[p.initials][m.id] = getCompletion(p.initials, m.id)
  })
})

const phaseColors = { stabilization: '#E53E3E', foundation: '#DD6B20', deepening: '#D69E2E', reintegration: '#1A7A4A' }

function getPctColor(pct) {
  if (pct >= 80) return '#1A7A4A'
  if (pct >= 50) return '#DD6B20'
  if (pct >= 20) return '#D69E2E'
  return '#E53E3E'
}

export default function LifeSkillsTracker() {
  const { user } = useAuth()
  const [selectedPatient, setSelectedPatient] = useState(null)

  // Overall completion per patient
  const overalls = PATIENTS.map(p => {
    const values = Object.values(COMPLETIONS[p.initials])
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    return { ...p, avg }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Life Skills Tracker</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>SOP Chapter 7 — 13 modules tracked per resident</p>
        </div>
        {selectedPatient && (
          <button className="btn btn--secondary" style={{ padding: '8px 16px' }} onClick={() => setSelectedPatient(null)}>
            Show All Patients
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        {overalls.map(p => (
          <div className="card" key={p.initials}
            style={{ padding: 16, textAlign: 'center', cursor: 'pointer', border: selectedPatient === p.initials ? '2px solid var(--blue)' : '2px solid transparent' }}
            onClick={() => setSelectedPatient(selectedPatient === p.initials ? null : p.initials)}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: phaseColors[p.phase], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.92rem', margin: '0 auto 8px' }}>
              {p.initials}
            </div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', fontWeight: 700, color: getPctColor(p.avg) }}>{p.avg}%</div>
            <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Overall · Day {p.day}</div>
            <div style={{ fontSize: '.68rem', color: phaseColors[p.phase], fontWeight: 600, marginTop: 2, textTransform: 'capitalize' }}>{p.phase}</div>
          </div>
        ))}
      </div>

      {/* Module Grid */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
          <thead>
            <tr style={{ background: 'var(--g50)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '.74rem', color: 'var(--g500)', borderBottom: '2px solid var(--g200)', width: 30 }}>#</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '.74rem', color: 'var(--g500)', borderBottom: '2px solid var(--g200)' }}>Module</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '.74rem', color: 'var(--g500)', borderBottom: '2px solid var(--g200)', whiteSpace: 'nowrap' }}>Frequency</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '.74rem', color: 'var(--g500)', borderBottom: '2px solid var(--g200)', whiteSpace: 'nowrap' }}>Day</th>
              {(selectedPatient ? PATIENTS.filter(p => p.initials === selectedPatient) : PATIENTS).map(p => (
                <th key={p.initials} style={{ padding: '10px 8px', fontWeight: 700, fontSize: '.74rem', color: 'var(--g500)', borderBottom: '2px solid var(--g200)', width: 80, textAlign: 'center' }}>
                  {p.initials}
                  <div style={{ fontSize: '.64rem', fontWeight: 400 }}>Day {p.day}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--g100)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--g400)', fontFamily: 'var(--fd)' }}>{m.id}</td>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{m.name}</td>
                <td style={{ padding: '10px 12px', color: 'var(--g500)', fontSize: '.78rem' }}>{m.frequency}</td>
                <td style={{ padding: '10px 12px', color: 'var(--g500)', fontSize: '.78rem', whiteSpace: 'nowrap' }}>{m.day}</td>
                {(selectedPatient ? PATIENTS.filter(p => p.initials === selectedPatient) : PATIENTS).map(p => {
                  const pct = COMPLETIONS[p.initials][m.id]
                  const color = getPctColor(pct)
                  return (
                    <td key={p.initials} style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: '.82rem', color }}>{pct}%</span>
                        <div style={{ width: '100%', maxWidth: 60, height: 6, borderRadius: 3, background: 'var(--g100)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: color, transition: 'width .3s' }} />
                        </div>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail view for selected patient */}
      {selectedPatient && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', marginBottom: 12 }}>
            {selectedPatient} — Module Breakdown
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {MODULES.map(m => {
              const pct = COMPLETIONS[selectedPatient][m.id]
              const color = getPctColor(pct)
              return (
                <div className="card" key={m.id} style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{m.id}. {m.name}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>{m.frequency} · {m.day}</div>
                    </div>
                    <span style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '1.1rem', color }}>{pct}%</span>
                  </div>
                  <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--g100)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: color, transition: 'width .3s' }} />
                  </div>
                  {m.id === 8 && pct === 0 && (
                    <div style={{ fontSize: '.72rem', color: 'var(--g400)', marginTop: 6, fontStyle: 'italic' }}>Available Weeks 10–12 only</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
