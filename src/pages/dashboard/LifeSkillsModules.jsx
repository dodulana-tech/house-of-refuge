import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Life Skills Group Modules — Attendance & Completion Tracker
  per Treatment Protocol Section 11.2. Initials only (HIPAA).
  Tracks 13 structured group modules across the 12-week programme.
*/

const PATIENTS = [
  { id: 'P001', initials: 'CO' },
  { id: 'P002', initials: 'AN' },
  { id: 'P003', initials: 'KA' },
  { id: 'P004', initials: 'IM' },
]

const STAFF_OPTIONS = [
  { value: 'AI', label: 'AI — Clinical Lead' },
  { value: 'FA', label: 'FA — Nurse' },
  { value: 'PK', label: 'PK — Chaplain' },
  { value: 'SN', label: 'SN — Social Worker' },
  { value: 'MO', label: 'MO — Support Staff' },
  { value: 'TA', label: 'TA — Counsellor' },
  { value: 'HM', label: 'HM — Nurse' },
]

const MODULES = [
  {
    id: 1,
    name: 'Morning Community Meeting',
    schedule: 'Daily (Mon-Fri), 8:30 AM',
    facilitators: 'House Master + Counsellor',
    weeklyFrequency: 5,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    weeksAvailable: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 2,
    name: 'Care Planning Group',
    schedule: 'Thursday, 12:00 PM',
    facilitators: '2 Clinical/Nursing Staff',
    weeklyFrequency: 1,
    days: ['Thu'],
    weeksAvailable: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 3,
    name: 'CBT and Relapse Prevention',
    schedule: '3x weekly',
    facilitators: 'Clinical Lead / Counsellor',
    weeklyFrequency: 3,
    days: ['Mon', 'Wed', 'Fri'],
    weeksAvailable: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 4,
    name: 'Small Group (Process Group)',
    schedule: 'Wednesday, 12:00 PM',
    facilitators: '1-2 Facilitators',
    weeklyFrequency: 1,
    days: ['Wed'],
    weeksAvailable: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 5,
    name: 'Psychoeducation',
    schedule: '2x weekly',
    facilitators: 'Nurse / Counsellor',
    weeklyFrequency: 2,
    days: ['Tue', 'Thu'],
    weeksAvailable: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 6,
    name: 'Relaxation & Stress Management',
    schedule: 'Friday, 2:30 PM',
    facilitators: 'Nurse + Counsellor',
    weeklyFrequency: 1,
    days: ['Fri'],
    weeksAvailable: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 7,
    name: 'Relationship and Family Group',
    schedule: 'Friday, 3:00 PM',
    facilitators: '1-2 Staff',
    weeklyFrequency: 1,
    days: ['Fri'],
    weeksAvailable: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 8,
    name: 'Transition Group',
    schedule: 'Weeks 10-12, Thu/Fri',
    facilitators: '2 Staff',
    weeklyFrequency: 2,
    days: ['Thu', 'Fri'],
    weeksAvailable: [10, 11, 12],
  },
  {
    id: 9,
    name: 'Work, Craft, and Vocational',
    schedule: 'Monday, 2:00 PM',
    facilitators: '2 Staff + Volunteers',
    weeklyFrequency: 1,
    days: ['Mon'],
    weeksAvailable: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 10,
    name: 'Cooking, Nutrition & Life Practical',
    schedule: 'Wednesday, 2:00 PM',
    facilitators: 'Cook + Counsellor',
    weeklyFrequency: 1,
    days: ['Wed'],
    weeksAvailable: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 11,
    name: 'News and Current Affairs',
    schedule: 'Monday, 11:00 AM',
    facilitators: '2 Staff',
    weeklyFrequency: 1,
    days: ['Mon'],
    weeksAvailable: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 12,
    name: 'Creative Writing',
    schedule: 'Thursday, 12:00 PM',
    facilitators: '2 Staff',
    weeklyFrequency: 1,
    days: ['Thu'],
    weeksAvailable: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 13,
    name: 'End-of-Day Wrap-Up',
    schedule: 'Daily (Mon-Fri), 8:30 PM',
    facilitators: 'House Master / Counsellor',
    weeklyFrequency: 5,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    weeksAvailable: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
]

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

// Generate weekly attendance data for a patient
function generateWeeklyData(moduleId, weeks, attended, lastDate) {
  const mod = MODULES.find((m) => m.id === moduleId)
  const data = {}
  for (let w = 1; w <= weeks; w++) {
    if (!mod.weeksAvailable.includes(w)) continue
    const weekData = {}
    mod.days.forEach((day) => {
      weekData[day] = true // default attended
    })
    data[w] = weekData
  }
  // Now mark some as missed to match the attended count
  const totalExpected = Object.values(data).reduce((sum, wd) => sum + Object.keys(wd).length, 0)
  let missCount = totalExpected - attended
  // Remove attendance from later weeks first
  const weekKeys = Object.keys(data).map(Number).reverse()
  for (const wk of weekKeys) {
    if (missCount <= 0) break
    const days = Object.keys(data[wk]).reverse()
    for (const day of days) {
      if (missCount <= 0) break
      data[wk][day] = false
      missCount--
    }
  }
  return { data, lastDate }
}

// Demo data — CO at Week 5
const INITIAL_ATTENDANCE = {
  CO: {
    currentWeek: 5,
    modules: {
      1: generateWeeklyData(1, 5, 23, '2026-04-04'),
      2: generateWeeklyData(2, 5, 5, '2026-04-02'),
      3: generateWeeklyData(3, 5, 14, '2026-04-04'),
      4: generateWeeklyData(4, 5, 4, '2026-04-01'),
      5: generateWeeklyData(5, 5, 9, '2026-04-03'),
      6: generateWeeklyData(6, 5, 5, '2026-04-04'),
      7: generateWeeklyData(7, 5, 4, '2026-04-04'),
      8: generateWeeklyData(8, 5, 0, null), // N/A weeks 1-9
      9: generateWeeklyData(9, 5, 4, '2026-03-30'),
      10: generateWeeklyData(10, 5, 3, '2026-04-01'),
      11: generateWeeklyData(11, 5, 5, '2026-03-30'),
      12: generateWeeklyData(12, 5, 4, '2026-04-02'),
      13: generateWeeklyData(13, 5, 22, '2026-04-04'),
    },
  },
  AN: {
    currentWeek: 8,
    modules: {
      1: generateWeeklyData(1, 8, 36, '2026-04-04'),
      2: generateWeeklyData(2, 8, 7, '2026-04-02'),
      3: generateWeeklyData(3, 8, 20, '2026-04-04'),
      4: generateWeeklyData(4, 8, 7, '2026-04-01'),
      5: generateWeeklyData(5, 8, 14, '2026-04-03'),
      6: generateWeeklyData(6, 8, 6, '2026-04-04'),
      7: generateWeeklyData(7, 8, 6, '2026-04-04'),
      8: generateWeeklyData(8, 8, 0, null),
      9: generateWeeklyData(9, 8, 6, '2026-03-30'),
      10: generateWeeklyData(10, 8, 5, '2026-04-01'),
      11: generateWeeklyData(11, 8, 7, '2026-03-30'),
      12: generateWeeklyData(12, 8, 7, '2026-04-02'),
      13: generateWeeklyData(13, 8, 35, '2026-04-04'),
    },
  },
  KA: {
    currentWeek: 11,
    modules: {
      1: generateWeeklyData(1, 11, 50, '2026-04-04'),
      2: generateWeeklyData(2, 11, 10, '2026-04-02'),
      3: generateWeeklyData(3, 11, 30, '2026-04-04'),
      4: generateWeeklyData(4, 11, 9, '2026-04-01'),
      5: generateWeeklyData(5, 11, 19, '2026-04-03'),
      6: generateWeeklyData(6, 11, 10, '2026-04-04'),
      7: generateWeeklyData(7, 11, 9, '2026-04-04'),
      8: generateWeeklyData(8, 11, 3, '2026-04-04'),
      9: generateWeeklyData(9, 11, 9, '2026-03-30'),
      10: generateWeeklyData(10, 11, 8, '2026-04-01'),
      11: generateWeeklyData(11, 11, 10, '2026-03-30'),
      12: generateWeeklyData(12, 11, 10, '2026-04-02'),
      13: generateWeeklyData(13, 11, 48, '2026-04-04'),
    },
  },
  IM: {
    currentWeek: 3,
    modules: {
      1: generateWeeklyData(1, 3, 13, '2026-04-04'),
      2: generateWeeklyData(2, 3, 2, '2026-04-02'),
      3: generateWeeklyData(3, 3, 7, '2026-04-04'),
      4: generateWeeklyData(4, 3, 2, '2026-04-01'),
      5: generateWeeklyData(5, 3, 5, '2026-04-03'),
      6: generateWeeklyData(6, 3, 3, '2026-04-04'),
      7: generateWeeklyData(7, 3, 2, '2026-04-04'),
      8: generateWeeklyData(8, 3, 0, null),
      9: generateWeeklyData(9, 3, 2, '2026-03-30'),
      10: generateWeeklyData(10, 3, 2, '2026-04-01'),
      11: generateWeeklyData(11, 3, 3, '2026-03-30'),
      12: generateWeeklyData(12, 3, 3, '2026-04-02'),
      13: generateWeeklyData(13, 3, 12, '2026-04-04'),
    },
  },
}

function getExpectedSessions(mod, currentWeek) {
  let count = 0
  for (let w = 1; w <= currentWeek; w++) {
    if (mod.weeksAvailable.includes(w)) {
      count += mod.weeklyFrequency
    }
  }
  return count
}

function getAttendedSessions(moduleData) {
  if (!moduleData || !moduleData.data) return 0
  let count = 0
  Object.values(moduleData.data).forEach((weekData) => {
    Object.values(weekData).forEach((attended) => {
      if (attended) count++
    })
  })
  return count
}

function getAttendanceColor(pct) {
  if (pct >= 80) return { color: '#38A169', bg: '#F0FFF4', border: '#C6F6D5', label: 'On Track' }
  if (pct >= 60) return { color: '#D69E2E', bg: '#FFFFF0', border: '#FEFCBF', label: 'At Risk' }
  return { color: '#E53E3E', bg: '#FFF5F5', border: '#FED7D7', label: 'Below Target' }
}

const statusBadge = (pct, isNA) => {
  if (isNA) {
    return {
      display: 'inline-block',
      padding: '4px 14px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 700,
      color: '#A0AEC0',
      background: '#EDF2F7',
      border: '1px solid #E2E8F0',
    }
  }
  const cfg = getAttendanceColor(pct)
  return {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    color: cfg.color,
    background: cfg.bg,
    border: `1px solid ${cfg.border}`,
  }
}

export default function LifeSkillsModules() {
  const { user } = useAuth()
  const [selectedPatient, setSelectedPatient] = useState('CO')
  const [attendance, setAttendance] = useState(INITIAL_ATTENDANCE)
  const [selectedWeek, setSelectedWeek] = useState(null)

  const patientData = attendance[selectedPatient]
  const currentWeek = patientData ? patientData.currentWeek : 1

  // Calculate module stats
  const moduleStats = MODULES.map((mod) => {
    const isNA = !mod.weeksAvailable.some((w) => w <= currentWeek)
    const expected = getExpectedSessions(mod, currentWeek)
    const moduleData = patientData ? patientData.modules[mod.id] : null
    const attended = getAttendedSessions(moduleData)
    const pct = expected > 0 ? Math.round((attended / expected) * 100) : 0
    const lastDate = moduleData ? moduleData.lastDate : null
    return { ...mod, expected, attended, pct, lastDate, isNA }
  })

  // Overall stats
  const availableModules = moduleStats.filter((m) => !m.isNA)
  const totalExpected = availableModules.reduce((s, m) => s + m.expected, 0)
  const totalAttended = availableModules.reduce((s, m) => s + m.attended, 0)
  const overallPct = totalExpected > 0 ? Math.round((totalAttended / totalExpected) * 100) : 0
  const flaggedModules = availableModules.filter((m) => m.pct < 70)

  // Weekly detail
  const viewWeek = selectedWeek || currentWeek

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            Life Skills Group Modules
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            Attendance & Completion Tracker (Treatment Protocol Section 11.2)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>Patient:</label>
          <select
            value={selectedPatient}
            onChange={(e) => { setSelectedPatient(e.target.value); setSelectedWeek(null) }}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E0',
              fontSize: 14,
              fontWeight: 600,
              background: '#fff',
            }}
          >
            {PATIENTS.map((p) => (
              <option key={p.id} value={p.initials}>{p.initials}</option>
            ))}
          </select>
          <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568', marginLeft: 8 }}>Week:</label>
          <span
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E0',
              fontSize: 14,
              fontWeight: 700,
              background: '#EBF8FF',
              color: '#2B6CB0',
            }}
          >
            {currentWeek} / 12
          </span>
        </div>
      </div>

      {/* Overall Attendance Summary */}
      <div
        className="card"
        style={{
          padding: 20,
          marginBottom: 20,
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: 0 }}>
            Overall Attendance — {selectedPatient}
          </h2>
          <span style={statusBadge(overallPct, false)}>
            {overallPct}% Overall
          </span>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#4A5568', marginBottom: 12 }}>
          <span><strong>Programme Week:</strong> {currentWeek} of 12</span>
          <span><strong>Total Sessions Expected:</strong> {totalExpected}</span>
          <span><strong>Total Sessions Attended:</strong> {totalAttended}</span>
          <span><strong>Available Modules:</strong> {availableModules.length} / 13</span>
        </div>

        {/* Attendance bar */}
        <div style={{ background: '#EDF2F7', borderRadius: 8, height: 12, marginBottom: 12 }}>
          <div
            style={{
              width: `${overallPct}%`,
              height: '100%',
              borderRadius: 8,
              background: getAttendanceColor(overallPct).color,
              transition: 'width 0.3s',
            }}
          />
        </div>

        {/* Flagged modules */}
        {flaggedModules.length > 0 && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: '#FFFFF0',
              border: '1px solid #FEFCBF',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: '#D69E2E', marginBottom: 6 }}>
              Modules Below 70% Attendance
            </div>
            {flaggedModules.map((m) => (
              <div key={m.id} style={{ fontSize: 13, color: '#744210', marginBottom: 2 }}>
                {m.name}: {m.attended}/{m.expected} ({m.pct}%)
              </div>
            ))}
          </div>
        )}

        {flaggedModules.length === 0 && (
          <div style={{ fontSize: 13, color: '#38A169', fontWeight: 600 }}>
            All active modules at or above 70% attendance threshold.
          </div>
        )}
      </div>

      {/* Module Grid */}
      <div
        className="card"
        style={{
          padding: 20,
          marginBottom: 20,
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          background: '#fff',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: '0 0 16px' }}>
          Module Attendance Grid
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600, minWidth: 40 }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600, minWidth: 200 }}>Module</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600, minWidth: 160 }}>Schedule</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Expected</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Attended</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Rate</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Last Attended</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {moduleStats.map((m) => {
                const isGreyedOut = m.id === 8 && currentWeek < 10
                return (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: '1px solid #EDF2F7',
                      opacity: isGreyedOut ? 0.4 : 1,
                      background: isGreyedOut ? '#F7FAFC' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '10px 10px', fontWeight: 600, color: '#718096' }}>{m.id}</td>
                    <td style={{ padding: '10px 10px', fontWeight: 600, color: '#2D3748' }}>{m.name}</td>
                    <td style={{ padding: '10px 10px', fontSize: 12, color: '#718096' }}>{m.schedule}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>
                      {isGreyedOut ? '--' : m.expected}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>
                      {isGreyedOut ? '--' : m.attended}
                    </td>
                    <td
                      style={{
                        padding: '10px 10px',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: isGreyedOut ? '#A0AEC0' : getAttendanceColor(m.pct).color,
                      }}
                    >
                      {isGreyedOut ? 'N/A' : `${m.pct}%`}
                    </td>
                    <td style={{ padding: '10px 10px', fontSize: 12, color: '#4A5568' }}>
                      {isGreyedOut ? '--' : (m.lastDate || '--')}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      <span style={statusBadge(m.pct, isGreyedOut)}>
                        {isGreyedOut ? 'Weeks 10-12' : getAttendanceColor(m.pct).label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly Detail View */}
      <div
        className="card"
        style={{
          padding: 20,
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: 0 }}>
            Weekly Detail View
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>Week:</label>
            <select
              value={viewWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E0',
                fontSize: 14,
                fontWeight: 600,
                background: '#fff',
              }}
            >
              {Array.from({ length: currentWeek }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600, minWidth: 200 }}>Module</th>
                {DAY_LABELS.map((day) => (
                  <th key={day} style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600, minWidth: 60 }}>
                    {day}
                  </th>
                ))}
                <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Week Total</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod) => {
                const isGreyedOut = mod.id === 8 && viewWeek < 10
                const isUnavailableWeek = !mod.weeksAvailable.includes(viewWeek)
                const moduleData = patientData ? patientData.modules[mod.id] : null
                const weekData = moduleData && moduleData.data[viewWeek] ? moduleData.data[viewWeek] : {}
                let weekAttended = 0

                return (
                  <tr
                    key={mod.id}
                    style={{
                      borderBottom: '1px solid #EDF2F7',
                      opacity: isGreyedOut || isUnavailableWeek ? 0.4 : 1,
                      background: isGreyedOut || isUnavailableWeek ? '#F7FAFC' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#2D3748', fontSize: 12 }}>
                      {mod.name}
                    </td>
                    {DAY_LABELS.map((day) => {
                      const isScheduled = mod.days.includes(day)
                      const didAttend = weekData[day] === true
                      const didMiss = weekData[day] === false
                      if (didAttend) weekAttended++

                      if (isGreyedOut || isUnavailableWeek) {
                        return (
                          <td key={day} style={{ padding: '8px 10px', textAlign: 'center', color: '#CBD5E0' }}>
                            --
                          </td>
                        )
                      }

                      if (!isScheduled) {
                        return (
                          <td key={day} style={{ padding: '8px 10px', textAlign: 'center', color: '#CBD5E0' }}>
                            --
                          </td>
                        )
                      }

                      return (
                        <td key={day} style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {didAttend && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                background: '#F0FFF4',
                                color: '#38A169',
                                fontWeight: 700,
                                fontSize: 14,
                                border: '1px solid #C6F6D5',
                              }}
                            >
                              Y
                            </span>
                          )}
                          {didMiss && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                background: '#FFF5F5',
                                color: '#E53E3E',
                                fontWeight: 700,
                                fontSize: 14,
                                border: '1px solid #FED7D7',
                              }}
                            >
                              N
                            </span>
                          )}
                          {!didAttend && !didMiss && isScheduled && viewWeek <= currentWeek && (
                            <span style={{ color: '#A0AEC0' }}>--</span>
                          )}
                        </td>
                      )
                    })}
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#2D3748' }}>
                      {isGreyedOut || isUnavailableWeek
                        ? 'N/A'
                        : `${weekAttended}/${mod.days.length}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, marginTop: 16, fontSize: 12, color: '#718096' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#F0FFF4',
                border: '1px solid #C6F6D5',
                textAlign: 'center',
                lineHeight: '18px',
                color: '#38A169',
                fontWeight: 700,
                fontSize: 10,
              }}
            >
              Y
            </span>
            Attended
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#FFF5F5',
                border: '1px solid #FED7D7',
                textAlign: 'center',
                lineHeight: '18px',
                color: '#E53E3E',
                fontWeight: 700,
                fontSize: 10,
              }}
            >
              N
            </span>
            Missed
          </span>
          <span>-- Not scheduled</span>
          <span style={{ marginLeft: 'auto' }}>
            <strong>Color Key:</strong>{' '}
            <span style={{ color: '#38A169', fontWeight: 700 }}>Green &gt;80%</span>{' '}
            <span style={{ color: '#D69E2E', fontWeight: 700 }}>Orange 60-80%</span>{' '}
            <span style={{ color: '#E53E3E', fontWeight: 700 }}>Red &lt;60%</span>
          </span>
        </div>
      </div>
    </div>
  )
}
