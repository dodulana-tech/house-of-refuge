import React, { useState, useEffect, useCallback } from 'react'
import {
  isSupabaseReady,
  getStaff,
  getStaffTraining,
  addStaffTraining,
  updateStaffTraining,
} from '../../utils/supabase'
import { requireFields } from '../../utils/formGuard'

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

const STATUS_COLORS = {
  completed: { bg: '#C6F6D5', color: '#22543D', label: 'Done' },
  'due-soon': { bg: '#FEFCBF', color: '#744210', label: 'Due' },
  overdue: { bg: '#FED7D7', color: '#742A2A', label: 'Late' },
  'not started': { bg: '#EDF2F7', color: '#4A5568', label: '—' },
}

// The set of statuses a user can assign to a cell.
const STATUS_OPTIONS = ['not started', 'due-soon', 'completed', 'overdue']

export default function TrainingTracker() {
  const [staff, setStaff] = useState([])
  // training[staff_id][module] -> row
  const [training, setTraining] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ staffId: '', moduleId: '', date: '', expiry: '' })

  const load = useCallback(async () => {
    if (!isSupabaseReady()) {
      setStaff([])
      setTraining({})
      setLoading(false)
      return
    }
    setLoading(true)
    const [staffRes, trainingRes] = await Promise.all([getStaff(), getStaffTraining()])
    if (staffRes.error) alert('Failed to load staff: ' + staffRes.error.message)
    if (trainingRes.error) alert('Failed to load training: ' + trainingRes.error.message)

    const lookup = {}
    for (const row of trainingRes.data || []) {
      if (!lookup[row.staff_id]) lookup[row.staff_id] = {}
      // Keep the most recent row per (staff, module); getStaffTraining is
      // ordered newest-first, so only set if not already present.
      if (!lookup[row.staff_id][row.module]) lookup[row.staff_id][row.module] = row
    }
    setStaff(staffRes.data || [])
    setTraining(lookup)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const cellFor = (staffId, moduleId) => training[staffId]?.[moduleId] || null

  // Upsert a training cell then reload.
  const saveCell = async (member, moduleId, updates) => {
    if (saving) return
    setSaving(true)
    const existing = cellFor(member.id, moduleId)
    let error
    if (existing) {
      ;({ error } = await updateStaffTraining(existing.id, updates))
    } else {
      ;({ error } = await addStaffTraining({
        staff_id: member.id,
        staff_code: member.code,
        module: moduleId,
        status: updates.status,
        completed_date: updates.completed_date || null,
      }))
    }
    if (error) {
      alert('Failed to save: ' + error.message)
      setSaving(false)
      return
    }
    await load()
    setSaving(false)
  }

  const handleCellStatus = (member, moduleId, status) => {
    const existing = cellFor(member.id, moduleId)
    saveCell(member, moduleId, {
      status,
      completed_date: status === 'completed'
        ? existing?.completed_date || new Date().toISOString().split('T')[0]
        : existing?.completed_date || null,
      expiry_date: existing?.expiry_date || null,
    })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!requireFields([
      [form.staffId, 'Staff member'],
      [form.moduleId, 'Training module'],
      [form.date, 'Completion date'],
    ])) return
    const member = staff.find(s => s.id === form.staffId)
    if (!member) return
    await saveCell(member, form.moduleId, {
      status: 'completed',
      completed_date: form.date,
      expiry_date: form.expiry || null,
    })
    setForm({ staffId: '', moduleId: '', date: '', expiry: '' })
    setShowForm(false)
  }

  // ── Metrics (derived only from real rows) ──
  const totalCells = staff.length * MANDATORY_MODULES.length
  const countStatus = target =>
    staff.reduce(
      (sum, s) => sum + MANDATORY_MODULES.filter(m => cellFor(s.id, m.id)?.status === target).length,
      0
    )
  const completedCount = countStatus('completed')
  const overdueCount = countStatus('overdue')
  const compliancePct = totalCells ? Math.round((completedCount / totalCells) * 100) : 0

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

        {loading ? (
          <p style={{ fontSize: '.85rem', color: 'var(--g500)' }}>Loading training records…</p>
        ) : staff.length === 0 ? (
          <p style={{ fontSize: '.85rem', color: 'var(--g500)' }}>No staff on record yet.</p>
        ) : (
          <>
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
                {staff.map(s => (
                  <tr key={s.id}>
                    <td style={{ padding: '6px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {s.full_name} <span style={{ fontWeight: 400, color: 'var(--g500)' }}>({s.role || '—'})</span>
                    </td>
                    {MANDATORY_MODULES.map(m => {
                      const rec = cellFor(s.id, m.id)
                      const status = rec?.status || 'not started'
                      const st = STATUS_COLORS[status] || STATUS_COLORS['not started']
                      return (
                        <td key={m.id} style={{ padding: '4px', textAlign: 'center' }}>
                          <select
                            value={status}
                            disabled={saving}
                            onChange={e => handleCellStatus(s, m.id, e.target.value)}
                            title={rec?.completed_date ? `Completed: ${rec.completed_date}${rec.expiry_date ? ` | Expires: ${rec.expiry_date}` : ''}` : status}
                            style={{
                              padding: '3px 4px',
                              borderRadius: 4,
                              fontSize: '.7rem',
                              fontWeight: 700,
                              background: st.bg,
                              color: st.color,
                              border: 'none',
                              cursor: saving ? 'wait' : 'pointer',
                            }}
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{STATUS_COLORS[opt]?.label || opt}</option>
                            ))}
                          </select>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: '.72rem', flexWrap: 'wrap' }}>
              {Object.entries(STATUS_COLORS).map(([key, val]) => (
                <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: val.bg, border: `1px solid ${val.color}` }} />
                  {key === 'completed' ? 'Completed' : key === 'due-soon' ? 'Due Soon' : key === 'overdue' ? 'Overdue' : 'Not Started'}
                </span>
              ))}
            </div>
          </>
        )}
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
            disabled={staff.length === 0}
            style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: staff.length === 0 ? 'var(--g200)' : 'var(--blue)', color: '#fff', cursor: staff.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '.8rem' }}
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
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} — {s.role || '—'}</option>)}
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
              <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Expiry Date</label>
              <input type="date" value={form.expiry} onChange={e => setForm(p => ({ ...p, expiry: e.target.value }))}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" disabled={saving}
                style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: saving ? 'var(--g200)' : '#1A7A4A', color: '#fff', cursor: saving ? 'wait' : 'pointer', fontWeight: 700, fontSize: '.82rem' }}>
                {saving ? 'Saving…' : 'Save Record'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
