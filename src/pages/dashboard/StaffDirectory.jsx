import React from 'react'

/*
  Staff Directory — per HOR Organogram
  Program Director → Program Manager + Chaplain + Head of Clinical Services
  → Admin Officer, House Masters, Head Nurse
  → Cooks/Janitors/Security, Fitness Coach/Crisis Officers, Nurses/Psychologist/Social Worker
*/

const STAFF = [
  { name: 'Emmanuel Abutu', role: 'Program Director', department: 'Leadership', email: 'admin@hor.ng', phone: '09011277600', reports: 'Board / Executive Director', level: 0 },
  { name: 'Folake Adebayo', role: 'Program Manager', department: 'Operations', email: 'manager@hor.ng', phone: '08011223344', reports: 'Program Director', level: 1 },
  { name: 'Pastor Emeka Nwachukwu', role: 'Chaplain', department: 'Spiritual Care', email: 'chaplain@hor.ng', phone: '08033445566', reports: 'Program Director', level: 1 },
  { name: 'Dr. Amina Ibrahim', role: 'Head of Clinical Services', department: 'Clinical', email: 'clinical@hor.ng', phone: '08055667788', reports: 'Program Director', level: 1 },
  { name: 'Blessing Okafor', role: 'Head Nurse', department: 'Nursing', email: 'nurse@hor.ng', phone: '08077889900', reports: 'Head of Clinical Services', level: 2 },
  { name: 'David Olumide', role: 'House Master', department: 'Residential', email: '', phone: '', reports: 'Program Manager / Chaplain', level: 2 },
  { name: 'Nurse Aisha Bello', role: 'Shift Nurse (Day)', department: 'Nursing', email: '', phone: '', reports: 'Head Nurse', level: 3 },
  { name: 'Nurse Chioma Eze', role: 'Shift Nurse (Night)', department: 'Nursing', email: '', phone: '', reports: 'Head Nurse', level: 3 },
  { name: 'Tope Akinwale', role: 'Clinical Psychologist', department: 'Clinical', email: '', phone: '', reports: 'Head of Clinical Services', level: 2 },
  { name: 'Mary Oguche', role: 'Social Worker', department: 'Psychosocial', email: '', phone: '', reports: 'Head of Clinical Services', level: 2 },
  { name: 'Admin Officer', role: 'Admin Coordinator', department: 'Administration', email: '', phone: '', reports: 'Program Manager', level: 2 },
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

export default function StaffDirectory() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Staff Directory</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>{STAFF.length} team members · Per HOR Organisational Structure</p>
      </div>

      {/* Department summary */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(deptColors).map(([dept, color]) => {
          const count = STAFF.filter(s => s.department === dept).length
          if (!count) return null
          return (
            <span key={dept} style={{ padding: '4px 12px', borderRadius: 14, fontSize: '.72rem', fontWeight: 700, background: color + '12', color }}>
              {dept} ({count})
            </span>
          )
        })}
      </div>

      {/* Staff list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STAFF.map((s, i) => (
          <div key={i} className="card" style={{ padding: '14px 18px', marginLeft: Math.min(s.level * 24, 48), borderLeft: `3px solid ${deptColors[s.department] || 'var(--g300)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: `${deptColors[s.department] || 'var(--g300)'}15`,
                  color: deptColors[s.department] || 'var(--g500)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '.72rem', fontWeight: 700, flexShrink: 0,
                }}>{s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--charcoal)' }}>{s.name}</div>
                  <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>{s.role} · {s.department}</div>
                </div>
              </div>
              <div style={{ fontSize: '.76rem', color: 'var(--g500)', textAlign: 'right' }}>
                {s.email && <div>{s.email}</div>}
                {s.phone && <div>{s.phone}</div>}
                <div style={{ fontSize: '.68rem', marginTop: 2 }}>Reports to: {s.reports}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
