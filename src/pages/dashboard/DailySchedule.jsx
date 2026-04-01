import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Daily Schedule — SOP Chapter 4.2
  Full 5:30 AM – 11:00 PM schedule as interactive timeline.
  Modified schedule for Weeks 1-2 (detox) and Sundays.
  HIPAA: initials only.
*/

const PATIENTS = [
  { initials: 'CO', day: 23 },
  { initials: 'AN', day: 45 },
  { initials: 'KA', day: 74 },
  { initials: 'IM', day: 8 },
]

const typeColors = {
  spiritual: '#805AD5',
  therapy: '#3182CE',
  meal: '#DD6B20',
  activity: '#1A7A4A',
  medical: '#E53E3E',
  routine: 'var(--g500)',
}

const typeLabels = {
  spiritual: 'Spiritual',
  therapy: 'Therapy',
  meal: 'Meal',
  activity: 'Activity',
  medical: 'Medical',
  routine: 'Routine',
}

const WEEKDAY_SCHEDULE = [
  { time: '5:30 AM', activity: 'Wake Up & Personal Hygiene', responsible: 'House Parent', type: 'routine' },
  { time: '6:00 AM', activity: 'Morning Prayer & Devotion', responsible: 'Chaplain', type: 'spiritual' },
  { time: '6:45 AM', activity: 'Breakfast', responsible: 'Kitchen Staff', type: 'meal' },
  { time: '7:30 AM', activity: 'Morning Community Meeting', responsible: 'Counselor', type: 'therapy' },
  { time: '8:00 AM', activity: 'Chores & Wing Inspection', responsible: 'House Parent', type: 'routine' },
  { time: '9:00 AM', activity: 'Bible School / Spiritual Formation', responsible: 'Chaplain', type: 'spiritual' },
  { time: '10:00 AM', activity: 'Tea Break', responsible: 'Kitchen Staff', type: 'meal' },
  { time: '10:30 AM', activity: 'Group Therapy (CBT / Relapse Prevention)', responsible: 'Clinical Psychologist', type: 'therapy' },
  { time: '12:00 PM', activity: 'Lunch', responsible: 'Kitchen Staff', type: 'meal' },
  { time: '1:00 PM', activity: 'Rest / Quiet Time', responsible: 'House Parent', type: 'routine' },
  { time: '1:30 PM', activity: 'Life Skills Training Group', responsible: 'Social Worker', type: 'therapy' },
  { time: '3:00 PM', activity: 'Individual Counseling / Free Time', responsible: 'Assigned Counselor', type: 'therapy' },
  { time: '4:00 PM', activity: 'Recreation & Exercise', responsible: 'Activity Coordinator', type: 'activity' },
  { time: '5:00 PM', activity: 'Dinner', responsible: 'Kitchen Staff', type: 'meal' },
  { time: '6:00 PM', activity: 'Evening Chapel / Worship', responsible: 'Chaplain', type: 'spiritual' },
  { time: '7:00 PM', activity: 'Free Time / Journaling', responsible: 'House Parent', type: 'activity' },
  { time: '8:00 PM', activity: 'End-of-Day Wrap-Up', responsible: 'Counselor', type: 'therapy' },
  { time: '8:30 PM', activity: 'Medication Administration', responsible: 'Nurse', type: 'medical' },
  { time: '9:00 PM', activity: 'Personal Time & Hygiene', responsible: 'House Parent', type: 'routine' },
  { time: '10:00 PM', activity: 'Lights Out (common areas)', responsible: 'House Parent', type: 'routine' },
  { time: '11:00 PM', activity: 'Lights Out (all)', responsible: 'Night Supervisor', type: 'routine' },
]

const SUNDAY_SCHEDULE = [
  { time: '6:00 AM', activity: 'Wake Up & Personal Hygiene', responsible: 'House Parent', type: 'routine' },
  { time: '6:30 AM', activity: 'Morning Prayer & Devotion', responsible: 'Chaplain', type: 'spiritual' },
  { time: '7:30 AM', activity: 'Breakfast', responsible: 'Kitchen Staff', type: 'meal' },
  { time: '8:30 AM', activity: 'Prepare for Church', responsible: 'House Parent', type: 'routine' },
  { time: '9:00 AM', activity: 'Sunday Chapel Service', responsible: 'Chaplain', type: 'spiritual' },
  { time: '11:00 AM', activity: 'Free Time', responsible: 'House Parent', type: 'activity' },
  { time: '12:00 PM', activity: 'Lunch', responsible: 'Kitchen Staff', type: 'meal' },
  { time: '12:00 PM', activity: 'Visitation Hours Begin (12–6 PM)', responsible: 'Reception', type: 'activity' },
  { time: '5:00 PM', activity: 'Dinner', responsible: 'Kitchen Staff', type: 'meal' },
  { time: '6:00 PM', activity: 'Visitation Ends', responsible: 'Reception', type: 'activity' },
  { time: '6:30 PM', activity: 'Evening Reflection', responsible: 'Chaplain', type: 'spiritual' },
  { time: '8:00 PM', activity: 'Medication Administration', responsible: 'Nurse', type: 'medical' },
  { time: '9:00 PM', activity: 'Personal Time & Hygiene', responsible: 'House Parent', type: 'routine' },
  { time: '10:00 PM', activity: 'Lights Out', responsible: 'Night Supervisor', type: 'routine' },
]

const DETOX_NOTE = 'Modified schedule: Weeks 1–2 patients (IM) follow a reduced activity load. Medical monitoring every 4 hours. Group therapy attendance is optional — replaced with rest and individual check-ins.'
const SUNDAY_NOTE = 'Sunday schedule: Shortened programme. Visitation 12:00–6:00 PM. No group therapy sessions.'

// Generate mock attendance seeded by date
function getAttendance(dateStr) {
  const seed = dateStr.split('-').join('')
  const hash = (s, i) => ((parseInt(s.slice(-4)) * 7 + i * 13) % 10)
  return WEEKDAY_SCHEDULE.map((_, si) => {
    const row = {}
    PATIENTS.forEach((p, pi) => {
      const v = hash(seed + si, pi + si)
      // IM (detox, day 8) has many dashes for therapy activities
      if (p.initials === 'IM' && ['therapy', 'activity'].includes(WEEKDAY_SCHEDULE[si]?.type)) {
        row[p.initials] = v > 3 ? 'dash' : v > 1 ? 'check' : 'x'
      } else {
        row[p.initials] = v > 2 ? 'check' : v > 0 ? 'x' : 'dash'
      }
    })
    return row
  })
}

function formatDate(d) {
  return d.toISOString().slice(0, 10)
}

export default function DailySchedule() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState('2026-03-31')

  const dateObj = new Date(selectedDate + 'T12:00:00')
  const dayOfWeek = dateObj.getDay()
  const isSunday = dayOfWeek === 0
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const schedule = isSunday ? SUNDAY_SCHEDULE : WEEKDAY_SCHEDULE
  const attendance = getAttendance(selectedDate)

  // Check if any patient is in detox
  const hasDetoxPatient = PATIENTS.some(p => p.day <= 14)

  const icons = {
    check: { symbol: '\u2713', color: '#1A7A4A' },
    x: { symbol: '\u2717', color: '#E53E3E' },
    dash: { symbol: '\u2014', color: 'var(--g300)' },
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Daily Schedule</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>SOP 4.2 — {dayNames[dayOfWeek]}, {selectedDate} · {schedule.length} activities</p>
        </div>
        <div className="card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)' }}>Date:</span>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.84rem' }} />
        </div>
      </div>

      {/* Notes */}
      {isSunday && (
        <div className="card" style={{ padding: 14, marginBottom: 16, background: '#EBF8FF', borderLeft: '4px solid var(--blue)' }}>
          <div style={{ fontSize: '.82rem', color: '#2B6CB0', fontWeight: 600 }}>{SUNDAY_NOTE}</div>
        </div>
      )}
      {hasDetoxPatient && !isSunday && (
        <div className="card" style={{ padding: 14, marginBottom: 16, background: '#FFF5F5', borderLeft: '4px solid #E53E3E' }}>
          <div style={{ fontSize: '.82rem', color: '#E53E3E', fontWeight: 600 }}>{DETOX_NOTE}</div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(typeColors).map(([key, color]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span style={{ fontSize: '.72rem', color: 'var(--g500)' }}>{typeLabels[key]}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <span style={{ fontSize: '.72rem', color: '#1A7A4A' }}>{icons.check.symbol} Present</span>
          <span style={{ fontSize: '.72rem', color: '#E53E3E' }}>{icons.x.symbol} Absent</span>
          <span style={{ fontSize: '.72rem', color: 'var(--g300)' }}>{icons.dash.symbol} N/A</span>
        </div>
      </div>

      {/* Schedule Timeline */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
          <thead>
            <tr style={{ background: 'var(--g50)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '.74rem', color: 'var(--g500)', borderBottom: '2px solid var(--g200)', width: 90, whiteSpace: 'nowrap' }}>Time</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '.74rem', color: 'var(--g500)', borderBottom: '2px solid var(--g200)' }}>Activity</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '.74rem', color: 'var(--g500)', borderBottom: '2px solid var(--g200)', whiteSpace: 'nowrap' }}>Responsible</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '.74rem', color: 'var(--g500)', borderBottom: '2px solid var(--g200)', width: 70, textAlign: 'center' }}>Type</th>
              {PATIENTS.map(p => (
                <th key={p.initials} style={{ padding: '10px 8px', fontWeight: 700, fontSize: '.74rem', color: 'var(--g500)', borderBottom: '2px solid var(--g200)', width: 44, textAlign: 'center' }}>
                  {p.initials}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--g100)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, whiteSpace: 'nowrap', fontFamily: 'var(--fd)', color: 'var(--g600)' }}>{item.time}</td>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{item.activity}</td>
                <td style={{ padding: '10px 12px', color: 'var(--g500)', whiteSpace: 'nowrap' }}>{item.responsible}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '.68rem', fontWeight: 600, background: `${typeColors[item.type]}18`, color: typeColors[item.type] }}>
                    {typeLabels[item.type]}
                  </span>
                </td>
                {PATIENTS.map(p => {
                  const att = attendance[idx]?.[p.initials] || 'dash'
                  const icon = icons[att]
                  return (
                    <td key={p.initials} style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <span style={{ color: icon.color, fontWeight: 700, fontSize: '1rem' }}>{icon.symbol}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginTop: 20 }}>
        {PATIENTS.map(p => {
          const total = attendance.length
          const present = attendance.filter(a => a[p.initials] === 'check').length
          const pct = total > 0 ? Math.round((present / total) * 100) : 0
          return (
            <div className="card" key={p.initials} style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.82rem', margin: '0 auto 8px' }}>
                {p.initials}
              </div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', fontWeight: 700, color: pct >= 80 ? '#1A7A4A' : pct >= 50 ? '#DD6B20' : '#E53E3E' }}>{pct}%</div>
              <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Attendance · Day {p.day}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
