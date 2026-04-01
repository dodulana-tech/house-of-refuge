import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'

const alumni = [
  {
    id: 1, name: 'C.O.', graduationDate: '2025-12-15', substance: 'Alcohol',
    phaseCompleted: 'Phase 4 — Reintegration', churchPlacement: 'Living Faith Chapel, Ikorodu',
    employmentStatus: 'Employed — Bakery Assistant',
    riskLevel: 'low', lastAssessment: '2026-03-20',
    riskFactors: ['Occasional peer pressure', 'Limited savings'],
    housing: 'Living with family — stable', familyReunification: 'Fully reunited',
    churchAttendance: 'Weekly — active member',
  },
  {
    id: 2, name: 'A.N.', graduationDate: '2025-06-01', substance: 'Alcohol & Cannabis',
    phaseCompleted: 'Phase 4 — Reintegration', churchPlacement: 'Grace Assembly, Surulere',
    employmentStatus: 'Unemployed — lost job Feb 2026',
    riskLevel: 'high', lastAssessment: '2026-03-15',
    riskFactors: ['Recent relapse (alcohol)', 'Job loss', 'Isolation from support network', 'Financial stress'],
    housing: 'Renting alone — unstable', familyReunification: 'Partial — estranged from siblings',
    churchAttendance: 'Irregular — last attended 3 weeks ago',
  },
  {
    id: 3, name: 'K.A.', graduationDate: '2024-04-01', substance: 'Cannabis',
    phaseCompleted: 'Phase 4 — Reintegration', churchPlacement: 'Redeemed Christian Church, Ikeja',
    employmentStatus: 'Self-employed — small business owner',
    riskLevel: 'low', lastAssessment: '2026-02-10',
    riskFactors: ['None identified'],
    housing: 'Own accommodation — stable', familyReunification: 'Fully reunited',
    churchAttendance: 'Weekly — serves as usher',
  },
]

const contactHistory = [
  { date: '2026-03-25', type: 'phone', notes: 'Routine check-in. Client in good spirits, maintaining employment.', contactedBy: 'Sister Adaeze' },
  { date: '2026-03-10', type: 'visit', notes: 'Home visit — stable environment, family supportive. No signs of relapse.', contactedBy: 'Brother Chuka' },
  { date: '2026-02-20', type: 'group', notes: 'Attended alumni group meeting. Shared testimony with current clients.', contactedBy: 'Pastor Emeka' },
  { date: '2026-02-05', type: 'phone', notes: 'Bi-weekly call. Reported minor stress at work but coping well with prayer.', contactedBy: 'Sister Adaeze' },
  { date: '2026-01-15', type: 'visit', notes: 'Scheduled home visit. Living conditions improved since last visit.', contactedBy: 'Brother Chuka' },
  { date: '2026-01-02', type: 'phone', notes: 'New year check-in. Client set goals for the year — volunteering and saving.', contactedBy: 'Sister Adaeze' },
  { date: '2025-12-20', type: 'group', notes: 'Christmas alumni gathering. Client brought family members along.', contactedBy: 'Pastor Emeka' },
  { date: '2025-12-15', type: 'phone', notes: 'Post-graduation follow-up. Settled into new routine at home.', contactedBy: 'Sister Adaeze' },
]

const RISK_COLORS = {
  low: { bg: '#C6F6D5', color: '#22543D' },
  medium: { bg: '#FEFCBF', color: '#744210' },
  high: { bg: '#FED7D7', color: '#742A2A' },
}

const TYPE_ICONS = { phone: '\u260E', visit: '\u{1F3E0}', group: '\u{1F465}' }

export default function AlumniDetail() {
  const { id } = useParams()
  const alumnus = alumni[parseInt(id)]

  const [contactForm, setContactForm] = useState({ date: '', type: 'phone', notes: '', outcome: 'stable' })

  if (!alumnus) {
    return (
      <div style={{ padding: 24 }}>
        <Link to="/dashboard/alumni" style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: '.88rem', fontWeight: 600 }}>
          &larr; Back to Alumni Programme
        </Link>
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--fd)', color: 'var(--g500)' }}>Alumni record not found</h2>
        </div>
      </div>
    )
  }

  const rc = RISK_COLORS[alumnus.riskLevel]

  const handleSave = () => {
    if (!contactForm.date || !contactForm.notes) return
    alert('Contact logged successfully.')
    setContactForm({ date: '', type: 'phone', notes: '', outcome: 'stable' })
  }

  return (
    <div>
      <Link to="/dashboard/alumni" style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: '.88rem', fontWeight: 600 }}>
        &larr; Back to Alumni Programme
      </Link>

      {/* Header */}
      <div style={{ marginTop: 16, marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>{alumnus.name}</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Alumni detail — 24-month post-discharge monitoring</p>
      </div>

      {/* Demographics */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Profile Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, fontSize: '.84rem' }}>
          {[
            ['Name', alumnus.name],
            ['Graduation Date', alumnus.graduationDate],
            ['Substance', alumnus.substance],
            ['Programme Phase Completed', alumnus.phaseCompleted],
            ['Church Placement', alumnus.churchPlacement],
            ['Employment Status', alumnus.employmentStatus],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', marginBottom: 2 }}>{label}</div>
              <div style={{ color: 'var(--g700)' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Assessment & Reintegration Progress */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Risk Assessment */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Risk Assessment</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{
              padding: '4px 14px', borderRadius: 12, fontSize: '.78rem', fontWeight: 700,
              background: rc.bg, color: rc.color, textTransform: 'uppercase',
            }}>
              {alumnus.riskLevel} risk
            </span>
            <span style={{ fontSize: '.78rem', color: 'var(--g500)' }}>Last assessed: {alumnus.lastAssessment}</span>
          </div>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', marginBottom: 6 }}>Key Risk Factors</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '.82rem', color: 'var(--g600)', lineHeight: 1.8 }}>
            {alumnus.riskFactors.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>

        {/* Reintegration Progress */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Reintegration Progress</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '.84rem' }}>
            {[
              ['Housing Status', alumnus.housing],
              ['Employment', alumnus.employmentStatus],
              ['Family Reunification', alumnus.familyReunification],
              ['Church Attendance', alumnus.churchAttendance],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', marginBottom: 2 }}>{label}</div>
                <div style={{ color: 'var(--g700)' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact History Timeline */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Contact History</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {contactHistory.map((c, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0',
              borderTop: i > 0 ? '1px solid var(--g100)' : 'none',
            }}>
              <div style={{
                minWidth: 36, height: 36, borderRadius: '50%', background: 'var(--g100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
              }}>
                {TYPE_ICONS[c.type] || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: '.82rem', textTransform: 'capitalize' }}>{c.type}</span>
                  <span style={{ fontSize: '.72rem', color: 'var(--g400)' }}>{c.date}</span>
                </div>
                <div style={{ fontSize: '.8rem', color: 'var(--g600)', marginTop: 2 }}>{c.notes}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--g400)', marginTop: 3 }}>Contacted by: {c.contactedBy}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Log Contact Form */}
      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Log Contact</h3>
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
            <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>Outcome</label>
            <select value={contactForm.outcome} onChange={e => setContactForm(p => ({ ...p, outcome: e.target.value }))}
              style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.8rem' }}>
              <option value="stable">Stable</option>
              <option value="improving">Improving</option>
              <option value="declining">Declining</option>
              <option value="relapse-signs">Relapse Signs</option>
              <option value="no-contact">No Contact Made</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>Notes</label>
            <textarea value={contactForm.notes} onChange={e => setContactForm(p => ({ ...p, notes: e.target.value }))}
              rows={3} placeholder="Contact summary, observations, action items..."
              style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.8rem', resize: 'vertical' }} />
          </div>
        </div>
        <button onClick={handleSave}
          style={{ marginTop: 10, padding: '7px 20px', borderRadius: 6, border: 'none', background: 'var(--blue)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.8rem' }}>
          Save Contact
        </button>
      </div>
    </div>
  )
}
