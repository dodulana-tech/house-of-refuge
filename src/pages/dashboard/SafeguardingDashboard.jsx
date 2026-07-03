import React, { useState, useEffect } from 'react'
import {
  isSupabaseReady,
  getIncidents,
  getStaff,
  getStaffTraining,
  addIncident,
  updateIncident,
} from '../../utils/supabase'

/*
  Safeguarding Dashboard — per HR Manual Section 6
  Designated Safeguarding Lead (DSL) oversees all safeguarding concerns.
  Golden Rules: "No client is turned away empty-handed" / "Every client leaves with a safety plan"
*/

// ── Static reference taxonomy (KEEP) ──────────────────────
const INCIDENT_TYPES = [
  'Physical Abuse',
  'Emotional Abuse',
  'Sexual Abuse',
  'Neglect',
  'Financial Exploitation',
  'Spiritual Abuse',
]

// Static reference: designated lead contact (policy content, not per-record data)
const DSL_INFO = {
  name: 'Dr. Amina Ibrahim',
  role: 'Head of Clinical Services / Designated Safeguarding Lead',
  phone: '08055667788',
  email: 'clinical@hor.ng',
  deputy: 'Folake Adebayo (Program Manager)',
}

// Which training modules count toward safeguarding / child-protection compliance
const SAFEGUARDING_MODULE_RE = /safe\s*guard|child\s*protection/i

const initialsFrom = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || '—'

// Derive per-staff safeguarding training status from live staff + training rows.
// status comes from the real training row; "not started" when no matching row exists.
function deriveTraining(staff, training) {
  return staff.map(s => {
    const rows = training.filter(
      t => t.staff_id === s.id && SAFEGUARDING_MODULE_RE.test(t.module || '')
    )
    const completed = rows.find(r => /complete/i.test(r.status || ''))
    const chosen = completed || rows[0] || null
    const status = chosen ? (chosen.status || 'in progress') : 'not started'
    const trained = /complete/i.test(status)
    return {
      id: s.id,
      initials: initialsFrom(s.full_name || s.name || ''),
      role: s.role || s.title || '—',
      status,
      trained,
      expiryDate: chosen?.expiry_date || null,
    }
  })
}

export default function SafeguardingDashboard() {
  const ready = isSupabaseReady()
  const [loading, setLoading] = useState(true)
  const [incidents, setIncidents] = useState([])
  const [staffTraining, setStaffTraining] = useState([])
  const [showIncidentForm, setShowIncidentForm] = useState(false)
  const [incidentForm, setIncidentForm] = useState({ type: '', reporter: '', location: '', incidentDate: '', incidentTime: '', personsInvolved: [], witnesses: '', description: '', actions: [] })

  const load = async () => {
    if (!ready) { setLoading(false); return }
    setLoading(true)
    const [incRes, staffRes, trainRes] = await Promise.all([
      getIncidents(),
      getStaff(),
      getStaffTraining(),
    ])
    setIncidents(incRes.data || [])
    setStaffTraining(deriveTraining(staffRes.data || [], trainRes.data || []))
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  const trainedCount = staffTraining.filter(s => s.trained).length
  const compliancePct = staffTraining.length ? Math.round((trainedCount / staffTraining.length) * 100) : 0
  const openIncidents = incidents.filter(i => (i.status || '').toLowerCase() !== 'resolved').length

  // AUDIT_RESULTS and BOUNDARY_CONCERNS previously held mock per-record data with no
  // backing table. Rather than fabricate, they render as empty states below.
  const audits = []
  const boundaryConcerns = []

  const handleSubmitIncident = async e => {
    e.preventDefault()
    if (!incidentForm.type || !incidentForm.reporter || !incidentForm.location) return
    const descParts = [
      `Location: ${incidentForm.location}`,
      incidentForm.incidentDate ? `Date: ${incidentForm.incidentDate}` : '',
      incidentForm.incidentTime ? `Time: ${incidentForm.incidentTime}` : '',
      incidentForm.personsInvolved.length ? `Persons involved: ${incidentForm.personsInvolved.join(', ')}` : '',
      `Witnesses: ${incidentForm.witnesses || 'Not specified'}`,
    ].filter(Boolean).join('. ')
    const actionText = incidentForm.actions.length ? incidentForm.actions.join('; ') : 'Pending review by DSL'
    const row = {
      type: incidentForm.type,
      description: `${descParts}. Actions: ${actionText}. Reported by: ${incidentForm.reporter}`,
      status: 'investigating',
    }
    const { error } = await addIncident(row)
    if (error) { alert(`Could not save incident: ${error.message}`); return }
    setIncidentForm({ type: '', reporter: '', location: '', incidentDate: '', incidentTime: '', personsInvolved: [], witnesses: '', description: '', actions: [] })
    setShowIncidentForm(false)
    load()
  }

  const setIncidentStatus = async (id, status) => {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    await updateIncident(id, { status })
  }

  if (!ready) {
    return (
      <div>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 8 }}>Safeguarding Dashboard</h1>
        <div className="card" style={{ padding: 20, color: 'var(--g500)', fontSize: '.9rem' }}>
          Live data is unavailable — Supabase is not configured for this environment.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Safeguarding Dashboard</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Safeguarding compliance and incident management — HR Manual Section 6</p>
      </div>

      {/* Golden Rules Banner */}
      <div className="card" style={{ padding: 16, marginBottom: 20, background: '#FFFFF0', borderLeft: '4px solid var(--gold, #D69E2E)' }}>
        <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#744210', marginBottom: 6 }}>HOR Golden Rules</div>
        <div style={{ fontSize: '.82rem', color: '#744210', lineHeight: 1.6 }}>
          <div>&bull; &quot;No client is turned away empty-handed&quot;</div>
          <div>&bull; &quot;Every client leaves with a safety plan&quot;</div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--g500)', fontSize: '.9rem' }}>
          Loading safeguarding data…
        </div>
      ) : (
      <>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Training Compliance', value: `${compliancePct}%`, color: compliancePct >= 80 ? '#1A7A4A' : '#E53E3E' },
          { label: 'Staff Trained', value: `${trainedCount}/${staffTraining.length}`, color: 'var(--blue)' },
          { label: 'Open Incidents', value: openIncidents, color: openIncidents > 0 ? '#E53E3E' : '#1A7A4A' },
          { label: 'Total Incidents', value: incidents.length, color: 'var(--blue)' },
        ].map(kpi => (
          <div key={kpi.label} className="card" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* DSL Info */}
      <div className="card" style={{ padding: 18, marginBottom: 16, borderLeft: '4px solid var(--blue)' }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 10 }}>Designated Safeguarding Lead (DSL)</h3>
        <div style={{ fontSize: '.85rem', lineHeight: 1.8 }}>
          <div><strong>{DSL_INFO.name}</strong> — {DSL_INFO.role}</div>
          <div>Phone: {DSL_INFO.phone} | Email: {DSL_INFO.email}</div>
          <div style={{ color: 'var(--g500)' }}>Deputy: {DSL_INFO.deputy}</div>
        </div>
        <p style={{ fontSize: '.75rem', color: 'var(--g500)', marginTop: 8 }}>
          All safeguarding concerns must be reported to the DSL within 1 hour. If the DSL is unavailable, contact the Deputy.
        </p>
      </div>

      {/* Staff Training Compliance */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Staff Safeguarding Training Status</h3>
        {staffTraining.length === 0 ? (
          <div style={{ fontSize: '.85rem', color: 'var(--g500)' }}>No staff records found.</div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {staffTraining.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 6, background: s.trained ? '#C6F6D522' : '#FED7D722' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '.75rem',
                  background: s.trained ? '#C6F6D5' : '#FED7D7',
                  color: s.trained ? '#22543D' : '#742A2A',
                }}>{s.initials}</span>
                <span style={{ fontSize: '.82rem' }}>
                  <strong>{s.initials}</strong> <span style={{ color: 'var(--g500)' }}>({s.role})</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {s.expiryDate && <span style={{ fontSize: '.72rem', color: 'var(--g400)' }}>Expires: {s.expiryDate}</span>}
                <span style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: '.7rem', fontWeight: 700,
                  background: s.trained ? '#C6F6D5' : '#FED7D7',
                  color: s.trained ? '#22543D' : '#742A2A',
                }}>
                  {s.trained ? 'Trained' : s.status === 'not started' ? 'NOT STARTED' : s.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Audit Results — no backing table; empty state instead of mock records */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Safeguarding Audits</h3>
        {audits.length === 0 ? (
          <div style={{ fontSize: '.85rem', color: 'var(--g500)' }}>No audits recorded yet.</div>
        ) : null}
      </div>

      {/* Professional Boundary Concerns — no backing table; empty state instead of mock records */}
      <div className="card" style={{ padding: 18, marginBottom: 16, borderLeft: '4px solid #DD6B20' }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 10 }}>Professional Boundary Concerns</h3>
        {boundaryConcerns.length === 0 ? (
          <div style={{ fontSize: '.85rem', color: 'var(--g500)' }}>No boundary concerns logged.</div>
        ) : null}
      </div>

      {/* Incident Reporting */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem' }}>Safeguarding Incidents</h3>
          <button onClick={() => setShowIncidentForm(!showIncidentForm)}
            style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#E53E3E', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.8rem' }}>
            {showIncidentForm ? 'Cancel' : 'Report Incident'}
          </button>
        </div>

        {/* Incident Form */}
        {showIncidentForm && (
          <form onSubmit={handleSubmitIncident} style={{ padding: 14, background: '#FFF5F5', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Incident Type</label>
                <select value={incidentForm.type} onChange={e => setIncidentForm(p => ({ ...p, type: e.target.value }))}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }}>
                  <option value="">Select type</option>
                  {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Reporter (Staff)</label>
                <select value={incidentForm.reporter} onChange={e => setIncidentForm(p => ({ ...p, reporter: e.target.value }))}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }}>
                  <option value="">Select reporter</option>
                  {staffTraining.map(s => (
                    <option key={s.id} value={s.initials}>{s.initials} ({s.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Location</label>
                <select value={incidentForm.location} onChange={e => setIncidentForm(p => ({ ...p, location: e.target.value }))}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }}>
                  <option value="">Select location</option>
                  {['Dormitory', 'Common area', 'Clinical room', 'Kitchen', 'Garden/Grounds', 'Off-site'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Date of Incident</label>
                <input type="date" value={incidentForm.incidentDate} onChange={e => setIncidentForm(p => ({ ...p, incidentDate: e.target.value }))}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Time of Incident</label>
                <select value={incidentForm.incidentTime} onChange={e => setIncidentForm(p => ({ ...p, incidentTime: e.target.value }))}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }}>
                  <option value="">Select time range</option>
                  {['06:00–08:00 (Early morning)', '08:00–12:00 (Morning)', '12:00–14:00 (Midday)', '14:00–18:00 (Afternoon)', '18:00–22:00 (Evening)', '22:00–06:00 (Night)'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Persons Involved</label>
                <select multiple value={incidentForm.personsInvolved} onChange={e => setIncidentForm(p => ({ ...p, personsInvolved: Array.from(e.target.selectedOptions, o => o.value) }))}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem', minHeight: 80 }}>
                  {staffTraining.map(s => <option key={s.id} value={`Staff ${s.initials}`}>Staff {s.initials}</option>)}
                </select>
                <div style={{ fontSize: '.68rem', color: 'var(--g400)', marginTop: 2 }}>Hold Ctrl/Cmd to select multiple</div>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Witnesses Present</label>
                <select value={incidentForm.witnesses} onChange={e => setIncidentForm(p => ({ ...p, witnesses: e.target.value }))}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }}>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>Immediate Actions Taken</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 6 }}>
                  {['Ensured safety of individual at risk', 'Provided medical/emergency support', 'Separated alleged perpetrator', 'Notified nursing staff', 'Notified Program Director', 'Notified DSL', 'Documented in client file', 'Family/emergency contact notified'].map(action => (
                    <label key={action} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.8rem', cursor: 'pointer' }}>
                      <input type="checkbox"
                        checked={incidentForm.actions.includes(action)}
                        onChange={e => {
                          setIncidentForm(p => ({
                            ...p,
                            actions: e.target.checked
                              ? [...p.actions, action]
                              : p.actions.filter(a => a !== action)
                          }))
                        }} />
                      {action}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <button type="submit"
              style={{ marginTop: 10, padding: '8px 24px', borderRadius: 6, border: 'none', background: '#E53E3E', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.82rem' }}>
              Submit Incident Report
            </button>
          </form>
        )}

        {/* Incident List */}
        {incidents.length === 0 ? (
          <div style={{ fontSize: '.85rem', color: 'var(--g500)' }}>No incidents recorded yet.</div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {incidents.map(inc => {
            const status = (inc.status || 'investigating').toLowerCase()
            const dateStr = (inc.created_at || '').split('T')[0]
            return (
            <div key={inc.id} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--g100)', borderLeft: `4px solid ${status === 'resolved' ? '#1A7A4A' : '#E53E3E'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '.85rem' }}>{inc.type || 'Incident'}</span>
                  {inc.tier && (
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '.66rem', fontWeight: 700, background: 'var(--g100)', color: 'var(--g600)' }}>
                      Tier {inc.tier}
                    </span>
                  )}
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: '.66rem', fontWeight: 700,
                    background: status === 'resolved' ? '#C6F6D5' : status === 'escalated' ? '#FEF3C7' : '#FED7D7',
                    color: status === 'resolved' ? '#22543D' : status === 'escalated' ? '#92400E' : '#742A2A',
                  }}>
                    {status === 'resolved' ? 'Resolved' : status === 'escalated' ? 'Escalated' : 'Investigating'}
                  </span>
                </div>
                <span style={{ fontSize: '.75rem', color: 'var(--g400)' }}>{dateStr}</span>
              </div>
              <div style={{ fontSize: '.8rem', color: 'var(--g600)', marginBottom: 4 }}>{inc.description}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--g500)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                {status !== 'resolved' && (
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setIncidentStatus(inc.id, 'resolved')}
                      style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: '#C6F6D5', color: '#22543D', cursor: 'pointer', fontSize: '.72rem', fontWeight: 700 }}>
                      Resolve
                    </button>
                    <button onClick={() => setIncidentStatus(inc.id, 'escalated')}
                      style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: '#FED7D7', color: '#742A2A', cursor: 'pointer', fontSize: '.72rem', fontWeight: 700 }}>
                      Escalate
                    </button>
                  </span>
                )}
              </div>
            </div>
          )})}
        </div>
        )}
      </div>
      </>
      )}
    </div>
  )
}
