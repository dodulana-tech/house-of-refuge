import React, { useState } from 'react'

/*
  Training Tracker — Mandatory Compliance per HR Manual Section 10
  All staff must complete mandatory training within 30 days of hire.
*/

const MANDATORY_MODULES = [
  { id: 'SAF', name: 'Safeguarding of Vulnerable Adults' },
  { id: 'TIC', name: 'Trauma-Informed Care' },
  { id: 'MHA', name: 'Basic Mental Health & Addiction Awareness' },
  { id: 'DEC', name: 'De-escalation & Crisis Management' },
  { id: 'CON', name: 'Confidentiality & Documentation' },
  { id: 'WHS', name: 'Workplace Health & Safety' },
  { id: 'FAC', name: 'First Aid & CPR' },
  { id: 'SCB', name: 'Spiritual Care Boundaries' },
]

const STAFF = [
  { id: 'BO', name: 'Blessing O.', role: 'Head Nurse', hireDate: '2024-06-01' },
  { id: 'AB', name: 'Aisha B.', role: 'Day Nurse', hireDate: '2025-01-15' },
  { id: 'CE', name: 'Chioma E.', role: 'Night Nurse', hireDate: '2025-09-01' },
  { id: 'DO', name: 'David O.', role: 'House Master', hireDate: '2024-08-10' },
  { id: 'FA', name: 'Folake A.', role: 'Program Manager', hireDate: '2024-03-01' },
  { id: 'EN', name: 'Pastor Emeka N.', role: 'Chaplain', hireDate: '2024-05-15' },
  { id: 'TA', name: 'Tope A.', role: 'Psychologist', hireDate: '2025-11-01' },
]

// Mock completion data: staffId -> moduleId -> { date, cert, expiry }
const initRecords = () => {
  const r = {}
  const now = new Date('2026-03-31')
  STAFF.forEach(s => {
    r[s.id] = {}
    MANDATORY_MODULES.forEach(m => {
      const random = Math.random()
      if (random < 0.55) {
        // completed
        const d = new Date(s.hireDate)
        d.setDate(d.getDate() + Math.floor(Math.random() * 25))
        const exp = new Date(d)
        exp.setFullYear(exp.getFullYear() + 2)
        r[s.id][m.id] = {
          date: d.toISOString().split('T')[0],
          cert: `CERT-${s.id}-${m.id}-${Math.floor(Math.random() * 9000 + 1000)}`,
          expiry: exp.toISOString().split('T')[0],
          status: exp < now ? 'overdue' : 'completed',
        }
      } else if (random < 0.75) {
        // due soon (within next 14 days of their 30-day deadline)
        r[s.id][m.id] = { status: 'due-soon' }
      } else {
        // overdue
        r[s.id][m.id] = { status: 'overdue' }
      }
    })
  })
  // Ensure BO (longest tenure) has all completed
  MANDATORY_MODULES.forEach(m => {
    r['BO'][m.id] = { date: '2024-06-20', cert: `CERT-BO-${m.id}-5001`, expiry: '2026-06-20', status: 'completed' }
  })
  return r
}

const STATUS_COLORS = {
  completed: { bg: '#C6F6D5', color: '#22543D', label: 'Done' },
  'due-soon': { bg: '#FEFCBF', color: '#744210', label: 'Due' },
  overdue: { bg: '#FED7D7', color: '#742A2A', label: 'Late' },
}

export default function TrainingTracker() {
  const [records, setRecords] = useState(initRecords)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ staffId: '', moduleId: '', date: '', cert: '', expiry: '' })

  const totalCells = STAFF.length * MANDATORY_MODULES.length
  const completedCount = STAFF.reduce((sum, s) =>
    sum + MANDATORY_MODULES.filter(m => records[s.id]?.[m.id]?.status === 'completed').length, 0)
  const overdueCount = STAFF.reduce((sum, s) =>
    sum + MANDATORY_MODULES.filter(m => records[s.id]?.[m.id]?.status === 'overdue').length, 0)
  const compliancePct = Math.round((completedCount / totalCells) * 100)

  const handleSubmit = e => {
    e.preventDefault()
    if (!form.staffId || !form.moduleId || !form.date) return
    setRecords(prev => ({
      ...prev,
      [form.staffId]: {
        ...prev[form.staffId],
        [form.moduleId]: {
          date: form.date,
          cert: form.cert || 'N/A',
          expiry: form.expiry || 'N/A',
          status: 'completed',
        },
      },
    }))
    setForm({ staffId: '', moduleId: '', date: '', cert: '', expiry: '' })
    setShowForm(false)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Training Tracker</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Mandatory training compliance — HR Manual Section 10</p>
      </div>

      {/* KPI summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Overall Compliance', value: `${compliancePct}%`, color: compliancePct >= 80 ? '#1A7A4A' : '#E53E3E' },
          { label: 'Completed', value: completedCount, color: '#1A7A4A' },
          { label: 'Overdue', value: overdueCount, color: '#E53E3E' },
          { label: 'Modules Tracked', value: MANDATORY_MODULES.length, color: 'var(--blue)' },
        ].map(kpi => (
          <div key={kpi.label} className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Compliance Matrix */}
      <div className="card" style={{ padding: 18, marginBottom: 16, overflowX: 'auto' }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Compliance Matrix</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.75rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '2px solid var(--g200)', whiteSpace: 'nowrap' }}>Staff</th>
              {MANDATORY_MODULES.map(m => (
                <th key={m.id} style={{ padding: '8px 4px', borderBottom: '2px solid var(--g200)', textAlign: 'center', fontSize: '.68rem', maxWidth: 80 }}
                  title={m.name}
                >
                  {m.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAFF.map(s => (
              <tr key={s.id}>
                <td style={{ padding: '6px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {s.id} <span style={{ fontWeight: 400, color: 'var(--g500)' }}>({s.role})</span>
                </td>
                {MANDATORY_MODULES.map(m => {
                  const rec = records[s.id]?.[m.id]
                  const st = rec ? STATUS_COLORS[rec.status] : STATUS_COLORS.overdue
                  return (
                    <td key={m.id} style={{ padding: '4px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: '.7rem',
                          fontWeight: 700,
                          background: st.bg,
                          color: st.color,
                        }}
                        title={rec?.date ? `Completed: ${rec.date} | Cert: ${rec.cert} | Expires: ${rec.expiry}` : rec?.status || 'Not completed'}
                      >
                        {st.label}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: '.72rem' }}>
          {Object.entries(STATUS_COLORS).map(([key, val]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: val.bg, border: `1px solid ${val.color}` }} />
              {key === 'completed' ? 'Completed' : key === 'due-soon' ? 'Due Soon' : 'Overdue'}
            </span>
          ))}
        </div>
      </div>

      {/* Module Legend */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 10 }}>Mandatory Training Modules</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
          {MANDATORY_MODULES.map(m => (
            <div key={m.id} style={{ fontSize: '.82rem', padding: '4px 0' }}>
              <strong>{m.id}</strong> — {m.name}
            </div>
          ))}
        </div>
        <p style={{ fontSize: '.75rem', color: 'var(--g500)', marginTop: 10 }}>
          All modules must be completed within 30 days of hire. Certificates valid for 2 years unless otherwise specified.
        </p>
      </div>

      {/* Record Training Form */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem' }}>Record Training Completion</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: 'var(--blue)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.8rem' }}
          >
            {showForm ? 'Cancel' : '+ Record'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Staff Member</label>
              <select value={form.staffId} onChange={e => setForm(p => ({ ...p, staffId: e.target.value }))}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }}>
                <option value="">Select staff</option>
                {STAFF.map(s => <option key={s.id} value={s.id}>{s.id} — {s.role}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Training Module</label>
              <select value={form.moduleId} onChange={e => setForm(p => ({ ...p, moduleId: e.target.value }))}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }}>
                <option value="">Select module</option>
                {MANDATORY_MODULES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Date Completed</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Certificate Number</label>
              <input type="text" value={form.cert} onChange={e => setForm(p => ({ ...p, cert: e.target.value }))} placeholder="CERT-XXXX"
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Expiry Date</label>
              <input type="date" value={form.expiry} onChange={e => setForm(p => ({ ...p, expiry: e.target.value }))}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit"
                style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: '#1A7A4A', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.82rem' }}>
                Save Record
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
