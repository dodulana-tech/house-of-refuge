import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Alumni Protocol — Structured 24-month follow-up per SOP 8.5
  REPLACES AlumniCRM.jsx with protocol engine, outcome snapshots,
  contact-due indicators, and relapse response protocol.
  HIPAA: initials only. ALL fields are selects/checkboxes — ZERO free text.
*/

const TODAY = new Date('2026-03-31')

const calcMonthsSince = (dateStr) => {
  const d = new Date(dateStr)
  return (TODAY.getFullYear() - d.getFullYear()) * 12 + (TODAY.getMonth() - d.getMonth())
}

const getPhase = (months) => {
  if (months <= 3) return { label: 'Months 1-3: Weekly phone + Month 3 home visit', freq: 'Weekly', color: '#E53E3E' }
  if (months <= 6) return { label: 'Months 4-6: Bi-weekly phone + Month 6 home visit', freq: 'Bi-weekly', color: '#DD6B20' }
  if (months <= 12) return { label: 'Months 7-12: Monthly phone + Month 12 home visit', freq: 'Monthly', color: '#D69E2E' }
  if (months <= 24) return { label: 'Months 13-24: Monthly phone + Bi-monthly visits', freq: 'Monthly', color: '#2B6CB0' }
  return { label: 'Case closure due', freq: 'N/A', color: '#1A7A4A' }
}

const getDaysUntilNextContact = (lastContactStr, freq) => {
  const last = new Date(lastContactStr)
  let intervalDays = 7
  if (freq === 'Bi-weekly') intervalDays = 14
  if (freq === 'Monthly') intervalDays = 30
  if (freq === 'N/A') return null
  const next = new Date(last.getTime() + intervalDays * 86400000)
  const diff = Math.round((next - TODAY) / 86400000)
  return diff
}

const contactStatusColor = (days) => {
  if (days === null) return 'var(--g500)'
  if (days > 3) return '#1A7A4A'
  if (days >= 0) return '#DD6B20'
  return '#E53E3E'
}

const contactStatusLabel = (days) => {
  if (days === null) return 'N/A'
  if (days > 3) return `On track (${days} days)`
  if (days >= 0) return `Due soon (${days} days)`
  return `OVERDUE (${Math.abs(days)} days)`
}

const SOBRIETY = ['Abstinent', 'Lapse (single use)', 'Relapse', 'Unknown']
const EMPLOYMENT = ['Employed', 'Self-employed', 'Seeking', 'Unemployed', 'In training', 'Studying']
const CHURCH_ATT = ['Weekly', 'Bi-weekly', 'Monthly', 'Occasionally', 'Not attending']
const FAMILY = ['Reunified', 'In progress', 'Estranged', 'N/A']
const HOUSING = ['Stable', 'Transitional', 'Unstable', 'Homeless']
const SUPPORT = ['AA/NA active', 'Church group active', 'HOR alumni group', 'None']
const OVERALL = ['Thriving', 'Stable', 'At risk', 'Relapsed', 'Lost to follow-up']

const overallColor = (v) => {
  if (v === 'Thriving') return '#1A7A4A'
  if (v === 'Stable') return '#2B6CB0'
  if (v === 'At risk') return '#DD6B20'
  if (v === 'Relapsed') return '#E53E3E'
  return '#744210'
}

const CONTACT_TYPES = ['Phone call', 'Home visit', 'Alumni group meeting', 'Church check-in']
const CONTACT_OUTCOMES = ['Connected — doing well', 'Connected — needs support', 'Connected — relapse reported', 'No answer — will retry', 'Number changed — lost contact']

const selectS = { width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }
const labelS = { fontSize: '.73rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 3 }

const initAlumni = () => [
  {
    id: 1, initials: 'C.O.', graduationDate: '2025-12-15', lastContact: '2026-03-28', status: 'active',
    snapshots: {
      3: { sobriety: 'Abstinent', employment: 'Employed', church: 'Weekly', family: 'In progress', housing: 'Stable', support: 'Church group active', overall: 'Thriving' },
    },
    contacts: [
      { date: '2026-03-28', type: 'Phone call', outcome: 'Connected — doing well' },
      { date: '2026-03-21', type: 'Phone call', outcome: 'Connected — doing well' },
      { date: '2026-03-10', type: 'Home visit', outcome: 'Connected — doing well' },
    ],
    relapse: { outreach: false, risk: false, counseling: false, readmission: false, gapRule: false },
  },
  {
    id: 2, initials: 'A.N.', graduationDate: '2025-06-01', lastContact: '2026-03-15', status: 'relapsed',
    snapshots: {
      3: { sobriety: 'Abstinent', employment: 'Employed', church: 'Weekly', family: 'Reunified', housing: 'Stable', support: 'AA/NA active', overall: 'Stable' },
      6: { sobriety: 'Abstinent', employment: 'Employed', church: 'Bi-weekly', family: 'Reunified', housing: 'Stable', support: 'AA/NA active', overall: 'Stable' },
    },
    contacts: [
      { date: '2026-03-15', type: 'Phone call', outcome: 'Connected — relapse reported' },
      { date: '2026-02-28', type: 'Home visit', outcome: 'Connected — needs support' },
      { date: '2026-01-20', type: 'Phone call', outcome: 'Connected — needs support' },
    ],
    relapse: { outreach: true, risk: true, counseling: true, readmission: false, gapRule: false },
  },
  {
    id: 3, initials: 'K.A.', graduationDate: '2024-04-01', lastContact: '2026-02-10', status: 'active',
    snapshots: {
      3: { sobriety: 'Abstinent', employment: 'Self-employed', church: 'Weekly', family: 'Reunified', housing: 'Stable', support: 'Church group active', overall: 'Thriving' },
      6: { sobriety: 'Abstinent', employment: 'Self-employed', church: 'Weekly', family: 'Reunified', housing: 'Stable', support: 'HOR alumni group', overall: 'Thriving' },
      12: { sobriety: 'Abstinent', employment: 'Self-employed', church: 'Weekly', family: 'Reunified', housing: 'Stable', support: 'HOR alumni group', overall: 'Thriving' },
    },
    contacts: [
      { date: '2026-02-10', type: 'Phone call', outcome: 'Connected — doing well' },
      { date: '2025-12-15', type: 'Home visit', outcome: 'Connected — doing well' },
    ],
    relapse: { outreach: false, risk: false, counseling: false, readmission: false, gapRule: false },
  },
]

export default function AlumniProtocol() {
  const { user } = useAuth()
  const [alumni, setAlumni] = useState(initAlumni)
  const [selectedId, setSelectedId] = useState(1)
  const [showLogContact, setShowLogContact] = useState(false)
  const [contactForm, setContactForm] = useState({ date: '', type: 'Phone call', outcome: 'Connected — doing well' })
  const [showSnapshot, setShowSnapshot] = useState(false)
  const [snapshotMonth, setSnapshotMonth] = useState('3')
  const [snapshotForm, setSnapshotForm] = useState({ sobriety: 'Abstinent', employment: 'Employed', church: 'Weekly', family: 'N/A', housing: 'Stable', support: 'None', overall: 'Stable' })

  const al = alumni.find(a => a.id === selectedId)
  const months = calcMonthsSince(al.graduationDate)
  const phase = getPhase(months)
  const daysUntil = getDaysUntilNextContact(al.lastContact, phase.freq)

  const logContact = () => {
    if (!contactForm.date) return
    setAlumni(prev => prev.map(a => a.id === selectedId ? {
      ...a,
      lastContact: contactForm.date,
      contacts: [{ date: contactForm.date, type: contactForm.type, outcome: contactForm.outcome }, ...a.contacts],
    } : a))
    setContactForm({ date: '', type: 'Phone call', outcome: 'Connected — doing well' })
    setShowLogContact(false)
  }

  const saveSnapshot = () => {
    setAlumni(prev => prev.map(a => a.id === selectedId ? {
      ...a, snapshots: { ...a.snapshots, [snapshotMonth]: { ...snapshotForm } },
    } : a))
    setShowSnapshot(false)
  }

  const toggleRelapse = (field) => {
    setAlumni(prev => prev.map(a => a.id === selectedId ? {
      ...a, relapse: { ...a.relapse, [field]: !a.relapse[field] },
    } : a))
  }

  const closeCaseHandler = () => {
    setAlumni(prev => prev.map(a => a.id === selectedId ? { ...a, status: 'closed' } : a))
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Alumni Protocol</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>SOP 8.5 — Structured 24-month post-discharge follow-up protocol</p>
      </div>

      {/* Alumni Selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {alumni.map(a => {
          const m = calcMonthsSince(a.graduationDate)
          const ph = getPhase(m)
          return (
            <button key={a.id} onClick={() => setSelectedId(a.id)}
              style={{
                padding: '10px 20px', borderRadius: 8, border: selectedId === a.id ? '2px solid var(--blue)' : '1px solid var(--g200)',
                background: selectedId === a.id ? 'var(--blue)' : '#fff', color: selectedId === a.id ? '#fff' : 'var(--g700)',
                cursor: 'pointer', fontWeight: 600, fontSize: '.9rem', textAlign: 'left',
              }}>
              <div>{a.initials}</div>
              <div style={{ fontSize: '.7rem', opacity: .8 }}>{m} months | {a.status}</div>
            </button>
          )
        })}
      </div>

      {/* Status Overview */}
      <div className="card" style={{ padding: 20, marginBottom: 24, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '.73rem', color: 'var(--g500)', fontWeight: 600 }}>Graduation Date</div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>{al.graduationDate}</div>
        </div>
        <div>
          <div style={{ fontSize: '.73rem', color: 'var(--g500)', fontWeight: 600 }}>Months Since Discharge</div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>{months}</div>
        </div>
        <div>
          <div style={{ fontSize: '.73rem', color: 'var(--g500)', fontWeight: 600 }}>Current Phase</div>
          <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: '.78rem', fontWeight: 600, background: phase.color + '18', color: phase.color }}>{phase.label}</span>
        </div>
        <div>
          <div style={{ fontSize: '.73rem', color: 'var(--g500)', fontWeight: 600 }}>Status</div>
          <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: '.78rem', fontWeight: 600, background: overallColor(al.status === 'relapsed' ? 'Relapsed' : al.status === 'closed' ? 'Lost to follow-up' : 'Thriving') + '18', color: overallColor(al.status === 'relapsed' ? 'Relapsed' : al.status === 'closed' ? 'Lost to follow-up' : 'Thriving') }}>
            {al.status.charAt(0).toUpperCase() + al.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Contact Due Indicator */}
      <div className="card" style={{ padding: 20, marginBottom: 24, borderLeft: `4px solid ${contactStatusColor(daysUntil)}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 4 }}>Next Required Contact</h3>
            <p style={{ fontSize: '.85rem', color: 'var(--g600)' }}>Frequency: <strong>{phase.freq}</strong> | Last contact: <strong>{al.lastContact}</strong></p>
            <span style={{ display: 'inline-block', marginTop: 6, padding: '4px 14px', borderRadius: 20, fontSize: '.82rem', fontWeight: 700, background: contactStatusColor(daysUntil) + '18', color: contactStatusColor(daysUntil) }}>
              {contactStatusLabel(daysUntil)}
            </span>
          </div>
          <button onClick={() => setShowLogContact(!showLogContact)}
            style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }}>
            {showLogContact ? 'Cancel' : '+ Log Contact'}
          </button>
        </div>

        {showLogContact && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: 'var(--g50)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={labelS}>Contact Date</label>
              <input type="date" value={contactForm.date} onChange={e => setContactForm({ ...contactForm, date: e.target.value })} style={selectS} />
            </div>
            <div>
              <label style={labelS}>Contact Type</label>
              <select value={contactForm.type} onChange={e => setContactForm({ ...contactForm, type: e.target.value })} style={selectS}>
                {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelS}>Outcome</label>
              <select value={contactForm.outcome} onChange={e => setContactForm({ ...contactForm, outcome: e.target.value })} style={selectS}>
                {CONTACT_OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={logContact} style={{ padding: '8px 20px', borderRadius: 6, background: '#1A7A4A', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '.82rem' }}>Save Contact</button>
            </div>
          </div>
        )}
      </div>

      {/* Contact History */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 12 }}>Contact History</h3>
        {al.contacts.length === 0 && <p style={{ fontSize: '.85rem', color: 'var(--g400)' }}>No contacts logged yet.</p>}
        {al.contacts.map((c, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: idx < al.contacts.length - 1 ? '1px solid var(--g100)' : 'none' }}>
            <span style={{ fontSize: '.78rem', color: 'var(--g500)', minWidth: 85 }}>{c.date}</span>
            <span style={{ fontSize: '.78rem', padding: '2px 8px', borderRadius: 10, background: 'var(--g100)', fontWeight: 600 }}>{c.type}</span>
            <span style={{ fontSize: '.82rem', color: 'var(--g700)' }}>{c.outcome}</span>
          </div>
        ))}
      </div>

      {/* Outcome Snapshots */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem' }}>Outcome Snapshots (3/6/12/24 months)</h3>
          <button onClick={() => setShowSnapshot(!showSnapshot)}
            style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '.82rem' }}>
            {showSnapshot ? 'Cancel' : '+ Add Snapshot'}
          </button>
        </div>

        {showSnapshot && (
          <div style={{ padding: 16, borderRadius: 8, background: 'var(--g50)', marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={labelS}>Snapshot Month</label>
                <select value={snapshotMonth} onChange={e => setSnapshotMonth(e.target.value)} style={selectS}>
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                  <option value="24">24 months</option>
                </select>
              </div>
              <div>
                <label style={labelS}>Sobriety Status</label>
                <select value={snapshotForm.sobriety} onChange={e => setSnapshotForm({ ...snapshotForm, sobriety: e.target.value })} style={selectS}>
                  {SOBRIETY.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelS}>Employment Status</label>
                <select value={snapshotForm.employment} onChange={e => setSnapshotForm({ ...snapshotForm, employment: e.target.value })} style={selectS}>
                  {EMPLOYMENT.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelS}>Church Attendance</label>
                <select value={snapshotForm.church} onChange={e => setSnapshotForm({ ...snapshotForm, church: e.target.value })} style={selectS}>
                  {CHURCH_ATT.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelS}>Family Status</label>
                <select value={snapshotForm.family} onChange={e => setSnapshotForm({ ...snapshotForm, family: e.target.value })} style={selectS}>
                  {FAMILY.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelS}>Housing</label>
                <select value={snapshotForm.housing} onChange={e => setSnapshotForm({ ...snapshotForm, housing: e.target.value })} style={selectS}>
                  {HOUSING.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelS}>Support Group</label>
                <select value={snapshotForm.support} onChange={e => setSnapshotForm({ ...snapshotForm, support: e.target.value })} style={selectS}>
                  {SUPPORT.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelS}>Overall Assessment</label>
                <select value={snapshotForm.overall} onChange={e => setSnapshotForm({ ...snapshotForm, overall: e.target.value })} style={selectS}>
                  {OVERALL.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <button onClick={saveSnapshot} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 6, background: '#1A7A4A', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '.82rem' }}>Save Snapshot</button>
          </div>
        )}

        {/* Snapshot Grid */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--g200)' }}>
                <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--g500)', fontSize: '.73rem' }}>Metric</th>
                {[3, 6, 12, 24].map(m => (
                  <th key={m} style={{ textAlign: 'center', padding: '8px 6px', color: 'var(--g500)', fontSize: '.73rem' }}>{m} months</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['sobriety', 'employment', 'church', 'family', 'housing', 'support', 'overall'].map(field => (
                <tr key={field} style={{ borderBottom: '1px solid var(--g100)' }}>
                  <td style={{ padding: '6px', fontWeight: 600, textTransform: 'capitalize' }}>{field}</td>
                  {[3, 6, 12, 24].map(m => {
                    const snap = al.snapshots[m]
                    const val = snap ? snap[field] : '--'
                    const color = field === 'overall' && snap ? overallColor(snap[field]) : 'var(--g700)'
                    return <td key={m} style={{ textAlign: 'center', padding: '6px', color }}>{val}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relapse Response Protocol */}
      {al.status === 'relapsed' && (
        <div className="card" style={{ padding: 20, marginBottom: 24, borderLeft: '4px solid #E53E3E' }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 4, color: '#E53E3E' }}>Relapse Response Protocol</h3>
          <p style={{ fontSize: '.8rem', color: 'var(--g500)', marginBottom: 16 }}>Activated upon relapse detection — follow SOP compassionate outreach steps.</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { key: 'outreach', label: 'Immediate compassionate outreach completed' },
              { key: 'risk', label: 'Risk assessment conducted' },
              { key: 'counseling', label: 'Outreach counseling offered' },
              { key: 'readmission', label: 'Residential re-admission offered' },
              { key: 'gapRule', label: '30-day gap rule acknowledged (for behavioural discharge)' },
            ].map(item => (
              <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.85rem', cursor: 'pointer', padding: '6px 0' }}>
                <input type="checkbox" checked={al.relapse[item.key]} onChange={() => toggleRelapse(item.key)}
                  style={{ width: 18, height: 18, accentColor: '#1A7A4A' }} />
                <span style={{ color: al.relapse[item.key] ? '#1A7A4A' : 'var(--g600)' }}>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Case Closure */}
      {months >= 24 && al.status !== 'closed' && (
        <div className="card" style={{ padding: 20, marginBottom: 24, background: '#F0FFF4', borderLeft: '4px solid #1A7A4A' }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 8 }}>24-Month Case Closure</h3>
          <p style={{ fontSize: '.85rem', color: 'var(--g600)', marginBottom: 16 }}>
            {al.initials} has reached {months} months post-discharge. Per SOP 8.5, this case is eligible for formal closure after final assessment.
          </p>
          <button onClick={closeCaseHandler}
            style={{ padding: '10px 24px', borderRadius: 8, background: '#1A7A4A', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '.88rem' }}>
            Close Case — 24-Month Protocol Complete
          </button>
        </div>
      )}

      {al.status === 'closed' && (
        <div className="card" style={{ padding: 20, marginBottom: 24, background: '#F7FAFC', textAlign: 'center' }}>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--g500)' }}>Case Closed</p>
          <p style={{ fontSize: '.85rem', color: 'var(--g400)' }}>24-month follow-up protocol completed for {al.initials}.</p>
        </div>
      )}
    </div>
  )
}
