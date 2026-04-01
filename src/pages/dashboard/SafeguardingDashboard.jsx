import React, { useState } from 'react'

/*
  Safeguarding Dashboard — per HR Manual Section 6
  Designated Safeguarding Lead (DSL) oversees all safeguarding concerns.
  Golden Rules: "No client is turned away empty-handed" / "Every client leaves with a safety plan"
*/

const INCIDENT_TYPES = [
  'Physical Abuse',
  'Emotional Abuse',
  'Sexual Abuse',
  'Neglect',
  'Financial Exploitation',
  'Spiritual Abuse',
]

const DSL_INFO = {
  name: 'Dr. Amina Ibrahim',
  role: 'Head of Clinical Services / Designated Safeguarding Lead',
  phone: '08055667788',
  email: 'clinical@hor.ng',
  deputy: 'Folake Adebayo (Program Manager)',
}

const STAFF_TRAINING = [
  { initials: 'BO', role: 'Head Nurse', safeguardingTrained: true, expiryDate: '2026-06-20' },
  { initials: 'AB', role: 'Day Nurse', safeguardingTrained: true, expiryDate: '2026-08-15' },
  { initials: 'CE', role: 'Night Nurse', safeguardingTrained: false, expiryDate: null },
  { initials: 'DO', role: 'House Master', safeguardingTrained: true, expiryDate: '2026-09-01' },
  { initials: 'FA', role: 'Program Manager', safeguardingTrained: true, expiryDate: '2026-04-10' },
  { initials: 'EN', role: 'Chaplain', safeguardingTrained: true, expiryDate: '2026-07-15' },
  { initials: 'TA', role: 'Psychologist', safeguardingTrained: false, expiryDate: null },
]

const initIncidents = () => [
  { id: 1, date: '2026-03-20', type: 'Emotional Abuse', reporter: 'BO', description: 'Client reported feeling bullied by another client during group activities.', action: 'Separated clients immediately. Individual counselling session arranged. Incident documented.', status: 'investigating' },
  { id: 2, date: '2026-03-05', type: 'Neglect', reporter: 'DO', description: 'Observed client not receiving prescribed medication on night shift.', action: 'Medication protocol reviewed with night nurse. Additional checks implemented.', status: 'resolved' },
  { id: 3, date: '2026-02-15', type: 'Financial Exploitation', reporter: 'FA', description: 'Family member attempting to access client personal funds without consent.', action: 'Family meeting arranged with social worker. Client funds secured. Legal advice sought.', status: 'resolved' },
]

const AUDIT_RESULTS = [
  { date: '2026-03-01', area: 'Staff DBS/Background Checks', score: 100, notes: 'All staff background checks current.' },
  { date: '2026-03-01', area: 'Safeguarding Training Compliance', score: 71, notes: '5 of 7 staff completed training. 2 overdue.' },
  { date: '2026-03-01', area: 'Incident Response Time', score: 95, notes: 'Average response time: 15 minutes. Target: 30 minutes.' },
  { date: '2026-03-01', area: 'Client Safety Plans', score: 100, notes: 'All current clients have documented safety plans.' },
  { date: '2026-03-01', area: 'Professional Boundaries', score: 90, notes: 'One minor concern addressed via supervision.' },
]

const BOUNDARY_CONCERNS = [
  { date: '2026-02-28', staff: 'CE', concern: 'Observed exchanging personal phone numbers with a client.', action: 'Discussed in supervision. Policy reiterated. No further issues.' },
]

export default function SafeguardingDashboard() {
  const [incidents, setIncidents] = useState(initIncidents)
  const [showIncidentForm, setShowIncidentForm] = useState(false)
  const [incidentForm, setIncidentForm] = useState({ type: '', reporter: '', location: '', incidentDate: '', incidentTime: '', personsInvolved: [], witnesses: '', description: '', actions: [] })

  const trainedCount = STAFF_TRAINING.filter(s => s.safeguardingTrained).length
  const compliancePct = Math.round((trainedCount / STAFF_TRAINING.length) * 100)
  const openIncidents = incidents.filter(i => i.status !== 'resolved').length
  const avgAuditScore = Math.round(AUDIT_RESULTS.reduce((s, a) => s + a.score, 0) / AUDIT_RESULTS.length)

  const handleSubmitIncident = e => {
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
    setIncidents(prev => [{
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      type: incidentForm.type,
      reporter: incidentForm.reporter,
      description: descParts,
      action: actionText,
      status: 'investigating',
    }, ...prev])
    setIncidentForm({ type: '', reporter: '', location: '', incidentDate: '', incidentTime: '', personsInvolved: [], witnesses: '', description: '', actions: [] })
    setShowIncidentForm(false)
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

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Training Compliance', value: `${compliancePct}%`, color: compliancePct >= 80 ? '#1A7A4A' : '#E53E3E' },
          { label: 'Open Incidents', value: openIncidents, color: openIncidents > 0 ? '#E53E3E' : '#1A7A4A' },
          { label: 'Boundary Concerns', value: BOUNDARY_CONCERNS.length, color: BOUNDARY_CONCERNS.length > 0 ? '#DD6B20' : '#1A7A4A' },
          { label: 'Avg Audit Score', value: `${avgAuditScore}%`, color: avgAuditScore >= 80 ? '#1A7A4A' : '#E53E3E' },
          { label: 'Total Incidents (YTD)', value: incidents.length, color: 'var(--blue)' },
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {STAFF_TRAINING.map(s => (
            <div key={s.initials} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 6, background: s.safeguardingTrained ? '#C6F6D522' : '#FED7D722' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '.75rem',
                  background: s.safeguardingTrained ? '#C6F6D5' : '#FED7D7',
                  color: s.safeguardingTrained ? '#22543D' : '#742A2A',
                }}>{s.initials}</span>
                <span style={{ fontSize: '.82rem' }}>
                  <strong>{s.initials}</strong> <span style={{ color: 'var(--g500)' }}>({s.role})</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {s.expiryDate && <span style={{ fontSize: '.72rem', color: 'var(--g400)' }}>Expires: {s.expiryDate}</span>}
                <span style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: '.7rem', fontWeight: 700,
                  background: s.safeguardingTrained ? '#C6F6D5' : '#FED7D7',
                  color: s.safeguardingTrained ? '#22543D' : '#742A2A',
                }}>
                  {s.safeguardingTrained ? 'Trained' : 'OVERDUE'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Results */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Recent Safeguarding Audit — {AUDIT_RESULTS[0]?.date}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {AUDIT_RESULTS.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, fontSize: '.82rem', fontWeight: 600 }}>{a.area}</div>
              <div style={{ width: 120, height: 8, borderRadius: 4, background: 'var(--g100)', overflow: 'hidden' }}>
                <div style={{
                  width: `${a.score}%`, height: '100%', borderRadius: 4,
                  background: a.score >= 90 ? '#1A7A4A' : a.score >= 70 ? '#D69E2E' : '#E53E3E',
                }} />
              </div>
              <span style={{ fontSize: '.78rem', fontWeight: 700, minWidth: 36, textAlign: 'right', color: a.score >= 90 ? '#1A7A4A' : a.score >= 70 ? '#D69E2E' : '#E53E3E' }}>
                {a.score}%
              </span>
              <span style={{ fontSize: '.72rem', color: 'var(--g500)', flex: 1 }}>{a.notes}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Professional Boundary Concerns */}
      {BOUNDARY_CONCERNS.length > 0 && (
        <div className="card" style={{ padding: 18, marginBottom: 16, borderLeft: '4px solid #DD6B20' }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 10 }}>Professional Boundary Concerns</h3>
          {BOUNDARY_CONCERNS.map((b, i) => (
            <div key={i} style={{ fontSize: '.82rem', padding: '8px 0', borderTop: i > 0 ? '1px solid var(--g100)' : 'none' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--g400)' }}>{b.date}</span>
                <span style={{ fontWeight: 700 }}>Staff: {b.staff}</span>
              </div>
              <div style={{ color: 'var(--g600)' }}>{b.concern}</div>
              <div style={{ color: '#1A7A4A', marginTop: 4 }}>Action: {b.action}</div>
            </div>
          ))}
        </div>
      )}

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
                  {['EA (Program Director)', 'AI (Clinical Lead)', 'BO (Head Nurse)', 'EN (Chaplain)', 'FA (Program Manager)', 'DO (House Master)', 'AB (Nurse)', 'CE (Nurse)', 'TA (Psychologist)', 'MO (Social Worker)'].map(s => (
                    <option key={s} value={s.split(' ')[0]}>{s}</option>
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
                  <optgroup label="Patients">
                    {['CO', 'AN', 'KA', 'IM'].map(pt => <option key={pt} value={`Patient ${pt}`}>Patient {pt}</option>)}
                  </optgroup>
                  <optgroup label="Staff">
                    {['EA', 'AI', 'BO', 'EN', 'FA', 'DO', 'AB', 'CE', 'TA', 'MO'].map(st => <option key={st} value={`Staff ${st}`}>Staff {st}</option>)}
                  </optgroup>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {incidents.map(inc => (
            <div key={inc.id} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--g100)', borderLeft: `4px solid ${inc.status === 'resolved' ? '#1A7A4A' : '#E53E3E'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '.85rem' }}>{inc.type}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: '.66rem', fontWeight: 700,
                    background: inc.status === 'resolved' ? '#C6F6D5' : inc.status === 'escalated' ? '#FEF3C7' : '#FED7D7',
                    color: inc.status === 'resolved' ? '#22543D' : inc.status === 'escalated' ? '#92400E' : '#742A2A',
                  }}>
                    {inc.status === 'resolved' ? 'Resolved' : inc.status === 'escalated' ? 'Escalated' : 'Investigating'}
                  </span>
                </div>
                <span style={{ fontSize: '.75rem', color: 'var(--g400)' }}>{inc.date}</span>
              </div>
              <div style={{ fontSize: '.8rem', color: 'var(--g600)', marginBottom: 4 }}>{inc.description}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--g500)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span><strong>Action:</strong> {inc.action} &middot; <em>Reported by: {inc.reporter}</em></span>
                {inc.status !== 'resolved' && (
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setIncidents(prev => prev.map(i => i.id === inc.id ? { ...i, status: 'resolved' } : i))}
                      style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: '#C6F6D5', color: '#22543D', cursor: 'pointer', fontSize: '.72rem', fontWeight: 700 }}>
                      Resolve
                    </button>
                    <button onClick={() => setIncidents(prev => prev.map(i => i.id === inc.id ? { ...i, status: 'escalated' } : i))}
                      style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: '#FED7D7', color: '#742A2A', cursor: 'pointer', fontSize: '.72rem', fontWeight: 700 }}>
                      Escalate
                    </button>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
