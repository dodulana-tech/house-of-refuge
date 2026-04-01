import React, { useState } from 'react'

/*
  Shift Scheduler — 24/7 Coverage per HR Manual
  Nursing: Day (6AM-2PM), Evening (2PM-10PM), Night (10PM-6AM)
  House Master: On-site 24/7, on-call
  Security: Day (6AM-6PM), Night (6PM-6AM)
*/

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const STAFF = [
  { id: 'BO', name: 'Blessing Okafor', role: 'Head Nurse' },
  { id: 'AB', name: 'Aisha Bello', role: 'Day Nurse' },
  { id: 'CE', name: 'Chioma Eze', role: 'Night Nurse' },
  { id: 'DO', name: 'David Olumide', role: 'House Master' },
  { id: 'Sec1', name: 'Security 1', role: 'Security' },
  { id: 'Sec2', name: 'Security 2', role: 'Security' },
]

const NURSING_SHIFTS = [
  { label: 'Day (6AM–2PM)', key: 'nurseDay', color: '#FFF3CD', textColor: '#856404' },
  { label: 'Evening (2PM–10PM)', key: 'nurseEvening', color: '#D1ECF1', textColor: '#0C5460' },
  { label: 'Night (10PM–6AM)', key: 'nurseNight', color: '#2D3748', textColor: '#fff' },
]

const SECURITY_SHIFTS = [
  { label: 'Day (6AM–6PM)', key: 'secDay', color: '#FFF3CD', textColor: '#856404' },
  { label: 'Night (6PM–6AM)', key: 'secNight', color: '#2D3748', textColor: '#fff' },
]

const initSchedule = () => {
  const s = {}
  DAYS.forEach(d => {
    s[d] = {
      nurseDay: 'AB',
      nurseEvening: 'BO',
      nurseNight: 'CE',
      houseMaster: 'DO',
      secDay: 'Sec1',
      secNight: 'Sec2',
    }
  })
  // Weekend rotation
  s['Sat'].nurseDay = 'BO'
  s['Sat'].nurseEvening = 'AB'
  s['Sun'].nurseDay = 'BO'
  s['Sun'].nurseEvening = 'AB'
  return s
}

const initHandoverNotes = () => {
  const notes = {}
  DAYS.forEach(d => {
    notes[d] = {
      'Day→Evening': '',
      'Evening→Night': '',
      'Night→Day': '',
    }
  })
  notes['Mon']['Day→Evening'] = 'Client J.A. reported mild headache at 1PM. Paracetamol administered.'
  notes['Mon']['Evening→Night'] = 'All clients settled. Group session completed successfully.'
  return notes
}

export default function ShiftScheduler() {
  const [schedule, setSchedule] = useState(initSchedule)
  const [handoverNotes, setHandoverNotes] = useState(initHandoverNotes)
  const [selectedDay, setSelectedDay] = useState('Mon')
  const [editCell, setEditCell] = useState(null)

  const handleAssign = (day, shiftKey, staffId) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [shiftKey]: staffId },
    }))
    setEditCell(null)
  }

  const handleNoteChange = (day, transition, value) => {
    setHandoverNotes(prev => ({
      ...prev,
      [day]: { ...prev[day], [transition]: value },
    }))
  }

  const cellStyle = (bg, fg) => ({
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: '.78rem',
    fontWeight: 700,
    background: bg,
    color: fg,
    cursor: 'pointer',
    textAlign: 'center',
    minWidth: 44,
  })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Shift Scheduler</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>24/7 coverage roster — Nursing, House Master, Security</p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {STAFF.map(s => (
          <span key={s.id} style={{ padding: '4px 12px', borderRadius: 14, fontSize: '.72rem', fontWeight: 700, background: 'var(--blue)' + '14', color: 'var(--blue)' }}>
            {s.id} — {s.role}
          </span>
        ))}
      </div>

      {/* Nursing Shifts Grid */}
      <div className="card" style={{ padding: 18, marginBottom: 16, overflowX: 'auto' }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Nursing Shifts</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--g200)' }}>Shift</th>
              {DAYS.map(d => (
                <th key={d} style={{ padding: '8px 10px', borderBottom: '2px solid var(--g200)', textAlign: 'center' }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NURSING_SHIFTS.map(shift => (
              <tr key={shift.key}>
                <td style={{ padding: '8px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>{shift.label}</td>
                {DAYS.map(d => (
                  <td key={d} style={{ padding: '4px 6px', textAlign: 'center' }}>
                    {editCell === `${d}-${shift.key}` ? (
                      <select
                        value={schedule[d][shift.key]}
                        onChange={e => handleAssign(d, shift.key, e.target.value)}
                        onBlur={() => setEditCell(null)}
                        autoFocus
                        style={{ fontSize: '.78rem', padding: 2, borderRadius: 4 }}
                      >
                        {STAFF.filter(s => s.role.includes('Nurse') || s.role === 'Head Nurse').map(s => (
                          <option key={s.id} value={s.id}>{s.id}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        style={cellStyle(shift.color, shift.textColor)}
                        onClick={() => setEditCell(`${d}-${shift.key}`)}
                        title="Click to reassign"
                      >
                        {schedule[d][shift.key]}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* House Master */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 8 }}>House Master — On-Site 24/7</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DAYS.map(d => (
            <div key={d} style={{ padding: '8px 14px', borderRadius: 8, background: '#DD6B20' + '14', textAlign: 'center' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--g500)', marginBottom: 2 }}>{d}</div>
              <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#DD6B20' }}>{schedule[d].houseMaster}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '.75rem', color: 'var(--g500)', marginTop: 8 }}>
          House Master resides on-site and is on-call 24/7. Responsible for evening roll call, lights-out enforcement, and overnight emergency response.
        </p>
      </div>

      {/* Security Shifts */}
      <div className="card" style={{ padding: 18, marginBottom: 16, overflowX: 'auto' }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Security Shifts (12-hour rotation)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--g200)' }}>Shift</th>
              {DAYS.map(d => (
                <th key={d} style={{ padding: '8px 10px', borderBottom: '2px solid var(--g200)', textAlign: 'center' }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SECURITY_SHIFTS.map(shift => (
              <tr key={shift.key}>
                <td style={{ padding: '8px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>{shift.label}</td>
                {DAYS.map(d => (
                  <td key={d} style={{ padding: '4px 6px', textAlign: 'center' }}>
                    <span style={cellStyle(shift.color, shift.textColor)}>
                      {schedule[d][shift.key]}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Shift Handover Notes */}
      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Shift Handover Notes</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {DAYS.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '.8rem',
                background: selectedDay === d ? 'var(--blue)' : 'var(--g100)',
                color: selectedDay === d ? '#fff' : 'var(--g600)',
              }}
            >
              {d}
            </button>
          ))}
        </div>

        {['Day→Evening', 'Evening→Night', 'Night→Day'].map(transition => (
          <div key={transition} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '.78rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>{transition} Handover</label>
            <textarea
              value={handoverNotes[selectedDay][transition]}
              onChange={e => handleNoteChange(selectedDay, transition, e.target.value)}
              placeholder={`Enter handover notes for ${transition} transition on ${selectedDay}...`}
              rows={2}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.82rem', resize: 'vertical' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
