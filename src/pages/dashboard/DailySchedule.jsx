import React, { useState, useEffect } from 'react'
import { isSupabaseReady, getPatients, getScheduleAttendance, setScheduleAttendance } from '../../utils/supabase'
import { activeBriefs } from '../../utils/patients'

/*
  Daily Schedule — SOP Chapter 4.2
  Full 5:30 AM – 11:00 PM schedule as interactive timeline.
  Modified schedule for Weeks 1-2 (detox) and Sundays.
  HIPAA: initials only. Attendance is live from Supabase.
*/

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

const SUNDAY_NOTE = 'Sunday schedule: Shortened programme. Visitation 12:00–6:00 PM. No group therapy sessions.'

const STATUS_CYCLE = { dash: 'check', check: 'x', x: 'dash' }

export default function DailySchedule() {
  const [selectedDate, setSelectedDate] = useState('2026-03-31')
  const [patients, setPatients] = useState([]) // [{ id, initials, full_name }]
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [attendance, setAttendance] = useState({}) // `${patient_id}-${slot}` -> status
  const [attendanceLoading, setAttendanceLoading] = useState(true)

  const dateObj = new Date(selectedDate + 'T12:00:00')
  const dayOfWeek = dateObj.getDay()
  const isSunday = dayOfWeek === 0
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const schedule = isSunday ? SUNDAY_SCHEDULE : WEEKDAY_SCHEDULE

  // Load active patients once.
  useEffect(() => {
    let alive = true
    if (!isSupabaseReady()) { setPatients([]); setPatientsLoading(false); return }
    setPatientsLoading(true)
    getPatients().then(({ data }) => {
      if (!alive) return
      setPatients(activeBriefs(data))
      setPatientsLoading(false)
    })
    return () => { alive = false }
  }, [])

  // Load attendance whenever the selected date changes.
  useEffect(() => {
    let alive = true
    if (!isSupabaseReady()) { setAttendance({}); setAttendanceLoading(false); return }
    setAttendanceLoading(true)
    getScheduleAttendance(selectedDate).then(({ data }) => {
      if (!alive) return
      const map = {}
      ;(data || []).forEach(r => { map[`${r.patient_id}-${r.slot}`] = r.status })
      setAttendance(map)
      setAttendanceLoading(false)
    })
    return () => { alive = false }
  }, [selectedDate])

  const statusFor = (patientId, slot) => attendance[`${patientId}-${slot}`] || 'dash'

  const cycleCell = async (patientId, slot) => {
    if (!isSupabaseReady()) return
    const key = `${patientId}-${slot}`
    const next = STATUS_CYCLE[statusFor(patientId, slot)]
    const { error } = await setScheduleAttendance({
      attend_date: selectedDate,
      patient_id: patientId,
      slot,
      status: next,
      recorded_by_code: 'BO',
    })
    if (!error) setAttendance(prev => ({ ...prev, [key]: next }))
  }

  const loading = patientsLoading || attendanceLoading

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

      {loading && (
        <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--g500)', fontSize: '.86rem' }}>
          Loading schedule…
        </div>
      )}

      {!loading && patients.length === 0 && (
        <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--g500)', fontSize: '.86rem' }}>
          No active patients on record yet.
        </div>
      )}

      {!loading && patients.length > 0 && (
        <>
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
              {patients.map(p => (
                <th key={p.id} title={p.full_name} style={{ padding: '10px 8px', fontWeight: 700, fontSize: '.74rem', color: 'var(--g500)', borderBottom: '2px solid var(--g200)', width: 44, textAlign: 'center' }}>
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
                {patients.map(p => {
                  const att = statusFor(p.id, idx)
                  const icon = icons[att]
                  return (
                    <td key={p.id} onClick={() => cycleCell(p.id, idx)} title="Click to change attendance" style={{ padding: '10px 8px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
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
        {patients.map(p => {
          const total = schedule.length
          const present = schedule.reduce((n, _, idx) => n + (statusFor(p.id, idx) === 'check' ? 1 : 0), 0)
          const marked = schedule.reduce((n, _, idx) => n + (statusFor(p.id, idx) !== 'dash' ? 1 : 0), 0)
          const pct = marked > 0 ? Math.round((present / marked) * 100) : 0
          return (
            <div className="card" key={p.id} style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.82rem', margin: '0 auto 8px' }}>
                {p.initials}
              </div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', fontWeight: 700, color: pct >= 80 ? '#1A7A4A' : pct >= 50 ? '#DD6B20' : '#E53E3E' }}>{pct}%</div>
              <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Present · {present}/{total}</div>
            </div>
          )
        })}
      </div>
        </>
      )}
    </div>
  )
}
