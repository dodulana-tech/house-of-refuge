import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Visitation Booking — SOP Section 5.4.2
  Sunday 12:00–6:00 PM visitation management.
  HIPAA: initials only.
*/

const PATIENTS = [
  { initials: 'CO', id: 'P001' },
  { initials: 'AN', id: 'P002' },
  { initials: 'KA', id: 'P003' },
  { initials: 'IM', id: 'P004' },
]

const TIME_SLOTS = ['12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM']

const RULES = [
  'Visiting hours: Sundays, 12:00 PM – 6:00 PM (max 6 hours)',
  'Visitors must remain in designated visiting areas only',
  'No access to dormitory or clinical areas',
  'Children must be supervised by their guardian at all times',
  'All visitors must sign in and out at reception',
  'Staff may end visits early if patient becomes distressed',
]

function getNextSundays(count) {
  const sundays = []
  const d = new Date(2026, 2, 31) // today
  for (let i = 0; i < 60 && sundays.length < count; i++) {
    const check = new Date(d)
    check.setDate(d.getDate() + i)
    if (check.getDay() === 0) {
      sundays.push(check.toISOString().slice(0, 10))
    }
  }
  return sundays
}

const NEXT_SUNDAYS = getNextSundays(4)

const INITIAL_VISITS = [
  { id: 1, patient: 'KA', visitor: 'M. Kamara', relationship: 'Mother', timeSlot: '1:00 PM', visitors: 3, date: NEXT_SUNDAYS[0], status: 'approved' },
  { id: 2, patient: 'CO', visitor: 'B. Cole', relationship: 'Father', timeSlot: '2:00 PM', visitors: 2, date: NEXT_SUNDAYS[0], status: 'pending' },
  { id: 3, patient: 'AN', visitor: 'F. Annan', relationship: 'Sister', timeSlot: '12:00 PM', visitors: 1, date: NEXT_SUNDAYS[1], status: 'pending' },
  { id: 4, patient: 'KA', visitor: 'J. Kamara', relationship: 'Brother', timeSlot: '3:00 PM', visitors: 2, date: NEXT_SUNDAYS[1], status: 'approved' },
  // past visits
  { id: 5, patient: 'KA', visitor: 'M. Kamara', relationship: 'Mother', timeSlot: '1:00 PM', visitors: 4, date: '2026-03-22', status: 'completed' },
  { id: 6, patient: 'AN', visitor: 'F. Annan', relationship: 'Sister', timeSlot: '12:00 PM', visitors: 2, date: '2026-03-22', status: 'completed' },
  { id: 7, patient: 'CO', visitor: 'B. Cole', relationship: 'Father', timeSlot: '2:00 PM', visitors: 1, date: '2026-03-15', status: 'completed' },
]

const statusColors = { approved: '#1A7A4A', pending: '#DD6B20', completed: 'var(--g500)', declined: '#E53E3E' }

export default function VisitationBooking() {
  const { user } = useAuth()
  const [visits, setVisits] = useState(INITIAL_VISITS)
  const [tab, setTab] = useState('calendar')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ patient: '', visitor: '', relationship: '', timeSlot: '', visitors: '1', children: 'None', specialRequirements: [], date: NEXT_SUNDAYS[0] || '' })

  const pendingVisits = visits.filter(v => v.status === 'pending')
  const pastVisits = visits.filter(v => v.status === 'completed')
  const upcomingVisits = visits.filter(v => v.status === 'approved' || v.status === 'pending')

  const handleApprove = (id) => setVisits(visits.map(v => v.id === id ? { ...v, status: 'approved' } : v))
  const handleDecline = (id) => setVisits(visits.map(v => v.id === id ? { ...v, status: 'declined' } : v))

  const handleSubmit = () => {
    if (!form.patient || !form.relationship || !form.timeSlot || !form.date) return
    const visitorLabel = `${form.relationship} (${form.visitors} visitor${form.visitors !== '1' ? 's' : ''}${form.children !== 'None' ? `, ${form.children} child${form.children !== '1' ? 'ren' : ''}` : ''})`
    setVisits([{
      id: Date.now(), patient: form.patient, visitor: visitorLabel, relationship: form.relationship,
      timeSlot: form.timeSlot, visitors: parseInt(form.visitors) || 1, date: form.date, status: 'pending',
    }, ...visits])
    setForm({ patient: '', visitor: '', relationship: '', timeSlot: '', visitors: '1', children: 'None', specialRequirements: [], date: NEXT_SUNDAYS[0] || '' })
    setShowForm(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Visitation Booking</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>SOP 5.4.2 — Sunday 12:00–6:00 PM visitation management</p>
        </div>
        <button className="btn btn--primary" style={{ padding: '10px 20px' }} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Visit Request'}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--blue)' }}>{upcomingVisits.length}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Upcoming</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: '#DD6B20' }}>{pendingVisits.length}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Pending</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: '#1A7A4A' }}>{pastVisits.length}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Completed</div>
        </div>
      </div>

      {/* Visitation Rules */}
      <div className="card" style={{ padding: 16, marginBottom: 20, background: '#FFFFF0', borderLeft: '4px solid var(--gold)' }}>
        <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 8, color: 'var(--gold)' }}>Visitation Rules</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: '.78rem', color: 'var(--g600)', lineHeight: 1.8 }}>
          {RULES.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>

      {/* New Visit Form */}
      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 16 }}>New Visit Request</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Patient</label>
              <select style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
                value={form.patient} onChange={e => setForm({ ...form, patient: e.target.value })}>
                <option value="">Select patient</option>
                {PATIENTS.map(p => <option key={p.initials} value={p.initials}>{p.initials}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Visitor Relationship</label>
              <select style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
                value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })}>
                <option value="">Select relationship</option>
                {['Spouse', 'Parent', 'Sibling', 'Child (adult)', 'Extended family', 'Pastor/Church leader', 'Friend (approved)', 'Employer'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Sunday</label>
              <select style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
                value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}>
                {NEXT_SUNDAYS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Time Slot</label>
              <select style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
                value={form.timeSlot} onChange={e => setForm({ ...form, timeSlot: e.target.value })}>
                <option value="">Select time</option>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Number of Visitors</label>
              <select style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
                value={form.visitors} onChange={e => setForm({ ...form, visitors: e.target.value })}>
                {['1', '2', '3', '4', '5+'].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Children Accompanying</label>
              <select style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
                value={form.children} onChange={e => setForm({ ...form, children: e.target.value })}>
                {['None', '1', '2', '3+'].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 6 }}>Special Requirements</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Wheelchair access', 'Interpreter needed', 'Extended visit requested', 'Brought items for inspection', 'None'].map(req => (
                  <label key={req} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.8rem', cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={form.specialRequirements.includes(req)}
                      onChange={e => {
                        if (req === 'None') {
                          setForm(prev => ({ ...prev, specialRequirements: e.target.checked ? ['None'] : [] }))
                        } else {
                          setForm(prev => ({
                            ...prev,
                            specialRequirements: e.target.checked
                              ? [...prev.specialRequirements.filter(r => r !== 'None'), req]
                              : prev.specialRequirements.filter(r => r !== req)
                          }))
                        }
                      }} />
                    {req}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn btn--primary" style={{ padding: '8px 20px' }} onClick={handleSubmit}>Submit Request</button>
            <button className="btn btn--secondary" style={{ padding: '8px 20px' }} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[{ key: 'calendar', label: 'Upcoming Sundays' }, { key: 'pending', label: `Pending (${pendingVisits.length})` }, { key: 'past', label: 'Past Visits' }].map(t => (
          <button key={t.key}
            className={`btn btn--sm ${tab === t.key ? 'btn--primary' : 'btn--secondary'}`}
            style={{ padding: '8px 16px', fontSize: '.82rem' }}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Calendar View — next 4 Sundays */}
      {tab === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {NEXT_SUNDAYS.map(sunday => {
            const dayVisits = visits.filter(v => v.date === sunday && (v.status === 'approved' || v.status === 'pending'))
            return (
              <div className="card" key={sunday} style={{ padding: 16 }}>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', fontWeight: 700, marginBottom: 10, color: 'var(--blue)' }}>
                  Sunday {sunday}
                </div>
                {dayVisits.length === 0 && (
                  <div style={{ fontSize: '.82rem', color: 'var(--g400)', fontStyle: 'italic' }}>No visits scheduled</div>
                )}
                {dayVisits.map(v => (
                  <div key={v.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--g100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '.85rem', fontWeight: 600 }}>
                        <span style={{ background: 'var(--blue)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: '.72rem', marginRight: 6 }}>{v.patient}</span>
                        {v.timeSlot}
                      </div>
                      <div style={{ fontSize: '.75rem', color: 'var(--g500)', marginTop: 2 }}>{v.visitor} ({v.relationship}) · {v.visitors} visitor{v.visitors > 1 ? 's' : ''}</div>
                    </div>
                    <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: '.68rem', fontWeight: 600, background: `${statusColors[v.status]}18`, color: statusColors[v.status], textTransform: 'capitalize' }}>
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Pending View */}
      {tab === 'pending' && (
        <div>
          {pendingVisits.length === 0 && (
            <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--g500)', fontSize: '.88rem' }}>No pending visit requests.</div>
          )}
          {pendingVisits.map(v => (
            <div className="card" key={v.id} style={{ padding: 16, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.88rem' }}>
                    {v.patient}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.92rem' }}>{v.visitor} — {v.relationship}</div>
                    <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>
                      {v.date} at {v.timeSlot} · {v.visitors} visitor{v.visitors > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn--sm btn--primary" style={{ padding: '5px 14px', fontSize: '.74rem' }} onClick={() => handleApprove(v.id)}>Approve</button>
                  <button className="btn btn--sm btn--secondary" style={{ padding: '5px 14px', fontSize: '.74rem', color: '#E53E3E' }} onClick={() => handleDecline(v.id)}>Decline</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past Visits Log */}
      {tab === 'past' && (
        <div>
          {pastVisits.length === 0 && (
            <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--g500)', fontSize: '.88rem' }}>No past visits.</div>
          )}
          {pastVisits.map(v => (
            <div className="card" key={v.id} style={{ padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ background: 'var(--g200)', color: 'var(--g600)', padding: '4px 8px', borderRadius: 4, fontSize: '.76rem', fontWeight: 700 }}>{v.patient}</span>
                  <div>
                    <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{v.visitor} ({v.relationship})</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--g500)' }}>{v.date} at {v.timeSlot} · {v.visitors} visitor{v.visitors > 1 ? 's' : ''}</div>
                  </div>
                </div>
                <span style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Completed</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
