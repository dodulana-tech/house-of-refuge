import React from 'react'
import { useParams, Link } from 'react-router-dom'

const STAFF = [
  { id: 1, name: 'Emmanuel Abutu', role: 'Program Director', department: 'Leadership', qualification: 'MSc Public Health, NAFDAC Cert.', email: 'admin@hor.ng', phone: '09011277600', reports: 'Board / Executive Director', hireDate: '2023-01-15' },
  { id: 2, name: 'Folake Adebayo', role: 'Program Manager', department: 'Operations', qualification: 'BSc Business Admin, PMP', email: 'manager@hor.ng', phone: '08011223344', reports: 'Program Director', hireDate: '2023-03-01' },
  { id: 3, name: 'Pastor Emeka Nwachukwu', role: 'Chaplain', department: 'Spiritual Care', qualification: 'MDiv Theology, CPE Level II', email: 'chaplain@hor.ng', phone: '08033445566', reports: 'Program Director', hireDate: '2023-06-10' },
  { id: 4, name: 'Dr. Amina Ibrahim', role: 'Head of Clinical Services', department: 'Clinical', qualification: 'MBBS, FMCPsych', email: 'clinical@hor.ng', phone: '08055667788', reports: 'Program Director', hireDate: '2023-02-20' },
  { id: 5, name: 'Blessing Okafor', role: 'Head Nurse', department: 'Nursing', qualification: 'BNSc, RN, Addiction Nursing Cert.', email: 'nurse@hor.ng', phone: '08077889900', reports: 'Head of Clinical Services', hireDate: '2023-04-15' },
  { id: 6, name: 'David Olumide', role: 'House Master', department: 'Residential', qualification: 'Diploma Social Work', email: 'housemaster@hor.ng', phone: '08099001122', reports: 'Program Manager / Chaplain', hireDate: '2023-07-01' },
  { id: 7, name: 'Nurse Aisha Bello', role: 'Shift Nurse (Day)', department: 'Nursing', qualification: 'BNSc, RN', email: 'aisha.bello@hor.ng', phone: '08012345678', reports: 'Head Nurse', hireDate: '2024-01-10' },
  { id: 8, name: 'Nurse Chioma Eze', role: 'Shift Nurse (Night)', department: 'Nursing', qualification: 'BNSc, RN', email: 'chioma.eze@hor.ng', phone: '08098765432', reports: 'Head Nurse', hireDate: '2024-01-10' },
  { id: 9, name: 'Tope Akinwale', role: 'Clinical Psychologist', department: 'Clinical', qualification: 'MSc Clinical Psychology', email: 'psychology@hor.ng', phone: '08067891234', reports: 'Head of Clinical Services', hireDate: '2023-09-01' },
  { id: 10, name: 'Mary Oguche', role: 'Social Worker', department: 'Psychosocial', qualification: 'BSW, MSW', email: 'social@hor.ng', phone: '08054321098', reports: 'Head of Clinical Services', hireDate: '2024-02-15' },
  { id: 11, name: 'Admin Officer', role: 'Admin Coordinator', department: 'Administration', qualification: 'HND Business Admin', email: 'admin.coord@hor.ng', phone: '08045678901', reports: 'Program Manager', hireDate: '2023-08-20' },
]

const deptColors = {
  Leadership: 'var(--blue)',
  Operations: '#1A7A4A',
  'Spiritual Care': 'var(--gold)',
  Clinical: '#805AD5',
  Nursing: '#E53E3E',
  Residential: '#DD6B20',
  Psychosocial: '#D69E2E',
  Administration: 'var(--g500)',
}

const MOCK_CERTS = {
  1: [
    { name: 'NAFDAC Facility Licence Renewal', date: '2025-06-15', status: 'Valid', expiry: '2027-06-15' },
    { name: 'First Aid & CPR', date: '2025-01-20', status: 'Valid', expiry: '2027-01-20' },
    { name: 'Leadership in Addiction Services', date: '2024-11-10', status: 'Valid', expiry: '2026-11-10' },
  ],
  default: [
    { name: 'First Aid & CPR', date: '2025-03-10', status: 'Valid', expiry: '2027-03-10' },
    { name: 'Safeguarding & Child Protection', date: '2025-05-22', status: 'Valid', expiry: '2026-05-22' },
    { name: 'Trauma-Informed Care Workshop', date: '2024-09-15', status: 'Valid', expiry: '2026-09-15' },
    { name: 'Fire Safety Awareness', date: '2024-06-01', status: 'Expired', expiry: '2025-06-01' },
  ],
}

const MOCK_SCHEDULE = [
  { day: 'Monday', shift: '07:00 — 15:00', activity: 'Morning rounds, team huddle, client sessions' },
  { day: 'Tuesday', shift: '07:00 — 15:00', activity: 'CBT groups, documentation, MDT prep' },
  { day: 'Wednesday', shift: '07:00 — 15:00', activity: 'MDT review, supervision, family calls' },
  { day: 'Thursday', shift: '07:00 — 15:00', activity: 'Life skills facilitation, case reviews' },
  { day: 'Friday', shift: '07:00 — 13:00', activity: 'Weekly debrief, admin, early close' },
]

const MOCK_PERFORMANCE = {
  1: [
    { date: '2026-03-15', author: 'Board Chair', note: 'Excellent leadership during accreditation visit. Commended by inspectors for programme quality and documentation.' },
    { date: '2026-01-10', author: 'Self-Assessment', note: 'Goals for Q1: finalise donor CRM, onboard 2 new staff, improve discharge follow-up rates to 80%.' },
    { date: '2025-11-20', author: 'Board Chair', note: 'Annual review — exceeds expectations. Programme outcomes among best in region. Recommended for leadership training sponsorship.' },
  ],
  default: [
    { date: '2026-03-01', author: 'Line Manager', note: 'Consistently punctual and professional. Good rapport with clients. Continue developing group facilitation skills.' },
    { date: '2025-12-15', author: 'Self-Assessment', note: 'Completed all mandatory training. Seeking advanced certification in motivational interviewing.' },
    { date: '2025-09-20', author: 'Line Manager', note: 'Mid-year review — meets expectations. Recommended for additional responsibility in discharge planning.' },
  ],
}

export default function StaffDetail() {
  const { id } = useParams()
  const staff = STAFF.find(s => String(s.id) === id)

  if (!staff) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', marginBottom: 12 }}>Staff Member Not Found</h2>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)', marginBottom: 20 }}>No staff record matches this ID.</p>
        <Link to="/dashboard/staff" style={{ color: 'var(--blue)', fontWeight: 600, fontSize: '.88rem' }}>&larr; Back to Staff Directory</Link>
      </div>
    )
  }

  const deptColor = deptColors[staff.department] || 'var(--g500)'
  const certs = MOCK_CERTS[staff.id] || MOCK_CERTS.default
  const perfNotes = MOCK_PERFORMANCE[staff.id] || MOCK_PERFORMANCE.default
  const initials = staff.name.split(' ').map(n => n[0]).join('').slice(0, 2)

  return (
    <div>
      {/* Back link */}
      <Link to="/dashboard/staff" style={{ color: 'var(--blue)', fontWeight: 600, fontSize: '.84rem', textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}>
        &larr; Back to Staff Directory
      </Link>

      {/* Staff Info Card */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: deptColor + '15', color: deptColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', fontWeight: 700, flexShrink: 0,
          }}>{initials}</div>
          <div>
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', margin: 0 }}>{staff.name}</h1>
            <span style={{ fontSize: '.84rem', color: 'var(--g500)' }}>{staff.role} &middot; {staff.department}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {[
            { label: 'Qualification', value: staff.qualification },
            { label: 'Phone', value: staff.phone || '—' },
            { label: 'Email', value: staff.email || '—' },
            { label: 'Hire Date', value: staff.hireDate },
            { label: 'Reporting Line', value: staff.reports },
            { label: 'Department', value: staff.department },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--charcoal)' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Certifications & Training */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Certifications &amp; Training</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--g200)' }}>
                {['Certification', 'Date Obtained', 'Status', 'Expiry'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, fontSize: '.72rem', color: 'var(--g500)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {certs.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--g100)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{c.name}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--g500)' }}>{c.date}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 12, fontSize: '.7rem', fontWeight: 700,
                      background: c.status === 'Valid' ? '#C6F6D5' : '#FED7D7',
                      color: c.status === 'Valid' ? '#22543D' : '#9B2C2C',
                    }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '8px 10px', color: 'var(--g500)' }}>{c.expiry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule This Week */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Schedule This Week</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--g200)' }}>
                {['Day', 'Shift', 'Key Activities'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, fontSize: '.72rem', color: 'var(--g500)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_SCHEDULE.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--g100)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.day}</td>
                  <td style={{ padding: '8px 10px', color: deptColor, fontWeight: 600 }}>{row.shift}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--g600)' }}>{row.activity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Notes */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Performance Notes</h2>
        {perfNotes.map((note, i) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: i < perfNotes.length - 1 ? '1px solid var(--g100)' : 'none' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: '.78rem', color: 'var(--g400)' }}>{note.date}</span>
              <span style={{ fontSize: '.75rem', fontWeight: 700, color: deptColor }}>{note.author}</span>
            </div>
            <p style={{ fontSize: '.84rem', color: 'var(--g600)', margin: 0 }}>{note.note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
