import React, { useState } from 'react'
import { Link } from 'react-router-dom'

/*
  Alumni CRM — 24-Month Post-Discharge Monitoring per SOP Chapter 8.5
  Year 1: weekly (months 1-3), bi-weekly (4-6), monthly (7-12). Home visits at 3, 6, 12 months.
  Year 2: monthly contact, bi-monthly visits. Case closure at 24 months.
*/

const STATUSES = ['active', 'relapsed', 'lost-to-follow-up', 'closed']

const STATUS_COLORS = {
  active: { bg: '#C6F6D5', color: '#22543D' },
  relapsed: { bg: '#FED7D7', color: '#742A2A' },
  'lost-to-follow-up': { bg: '#FEFCBF', color: '#744210' },
  closed: { bg: '#E2E8F0', color: '#4A5568' },
}

const calcMonthsSince = (dateStr) => {
  const d = new Date(dateStr)
  const now = new Date('2026-03-31')
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
}

const getNextContactSchedule = (monthsSince, status) => {
  if (status === 'closed' || status === 'lost-to-follow-up') return 'N/A'
  if (monthsSince <= 3) return 'Weekly'
  if (monthsSince <= 6) return 'Bi-weekly'
  if (monthsSince <= 12) return 'Monthly'
  if (monthsSince <= 24) return 'Monthly'
  return 'Case Closed'
}

const getHomeVisitDue = (monthsSince) => {
  if (monthsSince < 3) return 'At 3 months'
  if (monthsSince < 6) return 'At 6 months'
  if (monthsSince < 12) return 'At 12 months'
  if (monthsSince < 14) return 'Bi-monthly'
  return 'Bi-monthly'
}

const initAlumni = () => [
  {
    id: 1, initials: 'C.O.', graduationDate: '2025-12-15', lastContact: '2026-03-25',
    status: 'active',
    contacts: [
      { date: '2026-03-25', type: 'phone', notes: 'Client in good spirits. Employed at a bakery. Attending weekly church services.', relapse: false },
      { date: '2026-03-10', type: 'visit', notes: 'Home visit — living with family, stable environment. No signs of relapse.', relapse: false },
      { date: '2026-02-20', type: 'group', notes: 'Attended alumni group meeting. Shared testimony with current clients.', relapse: false },
    ],
  },
  {
    id: 2, initials: 'A.N.', graduationDate: '2025-06-01', lastContact: '2026-03-15',
    status: 'relapsed',
    contacts: [
      { date: '2026-03-15', type: 'phone', notes: 'Client admitted to alcohol use over the past 2 weeks. Offered re-admission counselling.', relapse: true },
      { date: '2026-02-28', type: 'visit', notes: 'Home visit — client appeared distressed. Lost employment in February.', relapse: false },
      { date: '2026-01-20', type: 'phone', notes: 'Routine check-in. Client reported stress at work but coping.', relapse: false },
    ],
  },
  {
    id: 3, initials: 'K.A.', graduationDate: '2024-04-01', lastContact: '2026-02-10',
    status: 'active',
    contacts: [
      { date: '2026-02-10', type: 'phone', notes: 'Monthly check-in. Running his own small business. Very stable.', relapse: false },
      { date: '2025-12-15', type: 'visit', notes: 'Annual home visit. Family fully reunited. Active church member.', relapse: false },
    ],
  },
]

export default function AlumniCRM() {
  const [alumni, setAlumni] = useState(initAlumni)
  const [showContactForm, setShowContactForm] = useState(null)
  const [contactForm, setContactForm] = useState({ date: '', type: 'phone', notes: '', relapse: false })
  const [filterStatus, setFilterStatus] = useState('all')

  const handleLogContact = (alumniId) => {
    if (!contactForm.date || !contactForm.notes) return
    setAlumni(prev => prev.map(a =>
      a.id === alumniId ? {
        ...a,
        lastContact: contactForm.date,
        status: contactForm.relapse ? 'relapsed' : a.status,
        contacts: [{ ...contactForm }, ...a.contacts],
      } : a
    ))
    setContactForm({ date: '', type: 'phone', notes: '', relapse: false })
    setShowContactForm(null)
  }

  const filtered = filterStatus === 'all' ? alumni : alumni.filter(a => a.status === filterStatus)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Alumni CRM</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>24-month post-discharge monitoring — SOP Chapter 8.5</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Alumni', value: alumni.length, color: 'var(--blue)' },
          { label: 'Active', value: alumni.filter(a => a.status === 'active').length, color: '#1A7A4A' },
          { label: 'Relapsed', value: alumni.filter(a => a.status === 'relapsed').length, color: '#E53E3E' },
          { label: 'Lost to Follow-up', value: alumni.filter(a => a.status === 'lost-to-follow-up').length, color: '#D69E2E' },
          { label: 'Cases Closed', value: alumni.filter(a => a.status === 'closed').length, color: 'var(--g500)' },
        ].map(kpi => (
          <div key={kpi.label} className="card" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Follow-up Schedule Reference */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 10 }}>Follow-up Schedule</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '.8rem' }}>
          <div>
            <strong style={{ color: 'var(--blue)' }}>Year 1:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: 18, lineHeight: 1.8, color: 'var(--g600)' }}>
              <li>Months 1-3: Weekly contact</li>
              <li>Months 4-6: Bi-weekly contact</li>
              <li>Months 7-12: Monthly contact</li>
              <li>Home visits at 3, 6, and 12 months</li>
            </ul>
          </div>
          <div>
            <strong style={{ color: '#805AD5' }}>Year 2:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: 18, lineHeight: 1.8, color: 'var(--g600)' }}>
              <li>Monthly contact throughout</li>
              <li>Bi-monthly home visits</li>
              <li>Case closure at 24 months</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '.78rem',
              background: filterStatus === s ? 'var(--blue)' : 'var(--g100)', color: filterStatus === s ? '#fff' : 'var(--g600)',
            }}>
            {s === 'all' ? 'All' : s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </button>
        ))}
      </div>

      {/* Alumni List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(a => {
          const months = calcMonthsSince(a.graduationDate)
          const sc = STATUS_COLORS[a.status]
          const schedule = getNextContactSchedule(months, a.status)
          const visitDue = getHomeVisitDue(months)
          const nearClosure = months >= 22 && a.status === 'active'

          return (
            <div key={a.id} className="card" style={{ padding: 18, borderLeft: `4px solid ${sc.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      width: 36, height: 36, borderRadius: '50%', background: sc.bg, color: sc.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.82rem',
                    }}>
                      {a.initials}
                    </span>
                    <div>
                      <Link to={'/dashboard/alumni/' + a.id} style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--charcoal)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--blue)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--charcoal)'}>{a.initials}</Link>
                      <span style={{
                        marginLeft: 8, padding: '2px 10px', borderRadius: 12, fontSize: '.68rem', fontWeight: 700,
                        background: sc.bg, color: sc.color,
                      }}>
                        {a.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '.8rem', color: 'var(--g500)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span>Graduated: {a.graduationDate}</span>
                    <span>{months} months post-discharge</span>
                    <span>Last contact: {a.lastContact}</span>
                  </div>
                  <div style={{ fontSize: '.78rem', marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span>Contact freq: <strong>{schedule}</strong></span>
                    <span>Next home visit: <strong>{visitDue}</strong></span>
                    {nearClosure && <span style={{ color: '#DD6B20', fontWeight: 700 }}>Approaching case closure</span>}
                  </div>
                </div>
                <button onClick={() => setShowContactForm(showContactForm === a.id ? null : a.id)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--g200)', background: '#fff', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600 }}>
                  {showContactForm === a.id ? 'Close' : 'Log Contact'}
                </button>
              </div>

              {/* Contact Log Form */}
              {showContactForm === a.id && (
                <div style={{ marginTop: 12, padding: 14, background: 'var(--g50, #F7FAFC)', borderRadius: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>Date</label>
                      <input type="date" value={contactForm.date} onChange={e => setContactForm(p => ({ ...p, date: e.target.value }))}
                        style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.8rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>Type</label>
                      <select value={contactForm.type} onChange={e => setContactForm(p => ({ ...p, type: e.target.value }))}
                        style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.8rem' }}>
                        <option value="phone">Phone</option>
                        <option value="visit">Home Visit</option>
                        <option value="group">Alumni Group</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>Relapse Indicator</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={contactForm.relapse} onChange={e => setContactForm(p => ({ ...p, relapse: e.target.checked }))} />
                        Signs of relapse observed
                      </label>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>Notes</label>
                      <textarea value={contactForm.notes} onChange={e => setContactForm(p => ({ ...p, notes: e.target.value }))}
                        rows={2} placeholder="Contact summary, observations, action items..."
                        style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.8rem', resize: 'vertical' }} />
                    </div>
                  </div>
                  <button onClick={() => handleLogContact(a.id)}
                    style={{ marginTop: 8, padding: '6px 18px', borderRadius: 6, border: 'none', background: 'var(--blue)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.78rem' }}>
                    Save Contact
                  </button>
                </div>
              )}

              {/* Contact History */}
              {a.contacts.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', marginBottom: 4 }}>Contact History</div>
                  {a.contacts.slice(0, 4).map((c, i) => (
                    <div key={i} style={{ fontSize: '.78rem', padding: '5px 0', borderTop: '1px solid var(--g100)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--g400)', minWidth: 80 }}>{c.date}</span>
                      <span style={{ fontWeight: 600, minWidth: 50, textTransform: 'capitalize' }}>{c.type}</span>
                      {c.relapse && <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: '.66rem', fontWeight: 700, background: '#FED7D7', color: '#742A2A' }}>RELAPSE</span>}
                      <span style={{ color: 'var(--g600)' }}>{c.notes}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
