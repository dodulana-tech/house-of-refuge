import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Therapy Session Attendance Tracker — per Treatment Protocol Section 6.4
  (Weekly Therapy Schedule). Tracks compliance across 11 modalities.
  Initials only (HIPAA). All fields are selects/checkboxes — zero free text.
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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const ATTENDANCE_OPTIONS = ['Present', 'Absent', 'Excused', 'Medical']

const MODALITIES = [
  { id: 'individual_cbt', name: 'Individual CBT', frequency: '1x weekly', durationMin: 60, expectedPerWeek: 1, days: ['Wed'], citation: 'PMC10572095' },
  { id: 'group_cbt', name: 'Group CBT / Relapse Prevention', frequency: '3x weekly', durationMin: 90, expectedPerWeek: 3, days: ['Mon', 'Wed', 'Fri'] },
  { id: 'psychoeducation', name: 'Psychoeducation Group', frequency: '2x weekly', durationMin: 60, expectedPerWeek: 2, days: ['Tue', 'Thu'] },
  { id: 'life_skills', name: 'Life Skills Group', frequency: '3x weekly', durationMin: 60, expectedPerWeek: 3, days: ['Mon', 'Wed', 'Fri'] },
  { id: 'spiritual_formation', name: 'Spiritual Formation Class', frequency: '5x weekly (Mon-Fri)', durationMin: 120, expectedPerWeek: 5, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { id: 'sunday_chapel', name: 'Sunday Chapel Service', frequency: '1x weekly', durationMin: 150, expectedPerWeek: 1, days: ['Sun'] },
  { id: 'evening_bible', name: 'Evening Bible Study', frequency: '7x weekly (daily)', durationMin: 90, expectedPerWeek: 7, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  { id: 'family_therapy', name: 'Family Therapy', frequency: 'As scheduled', durationMin: 75, expectedPerWeek: 0, days: [], pathwayA: true },
  { id: 'peer_recovery', name: 'Peer Recovery Circle', frequency: '7x weekly (daily, informal)', durationMin: 30, expectedPerWeek: 7, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  { id: 'relaxation', name: 'Relaxation Group', frequency: '1x weekly (Fri PM)', durationMin: 60, expectedPerWeek: 1, days: ['Fri'] },
  { id: 'medical_review', name: 'Medical/Nursing Review', frequency: 'Daily + weekly doctor', durationMin: 30, expectedPerWeek: 7, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
]

const WEEKS = Array.from({ length: 12 }, (_, i) => i + 1)

// Build initial attendance data: { patientInitials: { week: { modalityId: { day: status } } } }
function buildInitialData() {
  const data = {}

  // CO — Week 6 demo data (~90% compliance)
  data.CO = {}
  data.CO[6] = {
    individual_cbt: { Wed: 'Present' },
    group_cbt: { Mon: 'Present', Wed: 'Present', Fri: 'Present' },
    psychoeducation: { Tue: 'Present', Thu: 'Present' },
    life_skills: { Mon: 'Present', Wed: 'Absent', Fri: 'Present' },
    spiritual_formation: { Mon: 'Present', Tue: 'Present', Wed: 'Present', Thu: 'Present', Fri: 'Present' },
    sunday_chapel: { Sun: 'Present' },
    evening_bible: { Mon: 'Present', Tue: 'Present', Wed: 'Present', Thu: 'Present', Fri: 'Present', Sat: 'Present', Sun: 'Absent' },
    family_therapy: {},
    peer_recovery: { Mon: 'Present', Tue: 'Present', Wed: 'Present', Thu: 'Absent', Fri: 'Present', Sat: 'Absent', Sun: 'Present' },
    relaxation: { Fri: 'Present' },
    medical_review: { Mon: 'Present', Tue: 'Present', Wed: 'Present', Thu: 'Present', Fri: 'Present', Sat: 'Present', Sun: 'Present' },
  }

  // AN — Week 9 demo data (~75% compliance)
  data.AN = {}
  data.AN[9] = {
    individual_cbt: { Wed: 'Present' },
    group_cbt: { Mon: 'Present', Wed: 'Absent', Fri: 'Present' },
    psychoeducation: { Tue: 'Present', Thu: 'Absent' },
    life_skills: { Mon: 'Absent', Wed: 'Present', Fri: 'Present' },
    spiritual_formation: { Mon: 'Present', Tue: 'Present', Wed: 'Absent', Thu: 'Present', Fri: 'Present' },
    sunday_chapel: { Sun: 'Present' },
    evening_bible: { Mon: 'Present', Tue: 'Absent', Wed: 'Present', Thu: 'Present', Fri: 'Absent', Sat: 'Present', Sun: 'Present' },
    family_therapy: { Sat: 'Present' },
    peer_recovery: { Mon: 'Present', Tue: 'Present', Wed: 'Absent', Thu: 'Present', Fri: 'Present', Sat: 'Absent', Sun: 'Absent' },
    relaxation: { Fri: 'Present' },
    medical_review: { Mon: 'Present', Tue: 'Present', Wed: 'Present', Thu: 'Present', Fri: 'Present', Sat: 'Present', Sun: 'Present' },
  }

  // KA — Week 3 demo data (~60% compliance)
  data.KA = {}
  data.KA[3] = {
    individual_cbt: { Wed: 'Absent' },
    group_cbt: { Mon: 'Present', Wed: 'Absent', Fri: 'Present' },
    psychoeducation: { Tue: 'Absent', Thu: 'Present' },
    life_skills: { Mon: 'Present', Wed: 'Absent', Fri: 'Absent' },
    spiritual_formation: { Mon: 'Present', Tue: 'Absent', Wed: 'Present', Thu: 'Absent', Fri: 'Present' },
    sunday_chapel: { Sun: 'Absent' },
    evening_bible: { Mon: 'Present', Tue: 'Present', Wed: 'Absent', Thu: 'Absent', Fri: 'Present', Sat: 'Absent', Sun: 'Absent' },
    family_therapy: {},
    peer_recovery: { Mon: 'Present', Tue: 'Absent', Wed: 'Absent', Thu: 'Present', Fri: 'Present', Sat: 'Absent', Sun: 'Absent' },
    relaxation: { Fri: 'Absent' },
    medical_review: { Mon: 'Present', Tue: 'Present', Wed: 'Present', Thu: 'Present', Fri: 'Present', Sat: 'Medical', Sun: 'Excused' },
  }

  // IM — Week 2 demo data (~50% compliance)
  data.IM = {}
  data.IM[2] = {
    individual_cbt: { Wed: 'Absent' },
    group_cbt: { Mon: 'Absent', Wed: 'Present', Fri: 'Absent' },
    psychoeducation: { Tue: 'Medical', Thu: 'Medical' },
    life_skills: { Mon: 'Absent', Wed: 'Absent', Fri: 'Present' },
    spiritual_formation: { Mon: 'Present', Tue: 'Absent', Wed: 'Present', Thu: 'Absent', Fri: 'Absent' },
    sunday_chapel: { Sun: 'Absent' },
    evening_bible: { Mon: 'Present', Tue: 'Absent', Wed: 'Absent', Thu: 'Present', Fri: 'Absent', Sat: 'Absent', Sun: 'Absent' },
    family_therapy: {},
    peer_recovery: { Mon: 'Absent', Tue: 'Present', Wed: 'Absent', Thu: 'Absent', Fri: 'Present', Sat: 'Absent', Sun: 'Absent' },
    relaxation: { Fri: 'Absent' },
    medical_review: { Mon: 'Present', Tue: 'Present', Wed: 'Medical', Thu: 'Present', Fri: 'Present', Sat: 'Present', Sun: 'Present' },
  }

  return data
}

// Session log entries
function buildInitialLogs() {
  return {
    CO: {
      6: [
        { id: 1, date: '2026-03-09', modality: 'group_cbt', duration: 90, facilitator: 'TA', status: 'Present' },
        { id: 2, date: '2026-03-09', modality: 'life_skills', duration: 60, facilitator: 'SN', status: 'Present' },
        { id: 3, date: '2026-03-09', modality: 'spiritual_formation', duration: 120, facilitator: 'PK', status: 'Present' },
        { id: 4, date: '2026-03-10', modality: 'psychoeducation', duration: 60, facilitator: 'TA', status: 'Present' },
        { id: 5, date: '2026-03-10', modality: 'spiritual_formation', duration: 120, facilitator: 'PK', status: 'Present' },
        { id: 6, date: '2026-03-11', modality: 'individual_cbt', duration: 60, facilitator: 'AI', status: 'Present' },
        { id: 7, date: '2026-03-11', modality: 'group_cbt', duration: 90, facilitator: 'TA', status: 'Present' },
        { id: 8, date: '2026-03-11', modality: 'life_skills', duration: 60, facilitator: 'SN', status: 'Absent' },
        { id: 9, date: '2026-03-12', modality: 'psychoeducation', duration: 60, facilitator: 'TA', status: 'Present' },
        { id: 10, date: '2026-03-13', modality: 'group_cbt', duration: 90, facilitator: 'TA', status: 'Present' },
        { id: 11, date: '2026-03-13', modality: 'relaxation', duration: 60, facilitator: 'SN', status: 'Present' },
      ],
    },
    AN: { 9: [] },
    KA: { 3: [] },
    IM: { 2: [] },
  }
}

function getDefaultWeek(patient) {
  const weekMap = { CO: 6, AN: 9, KA: 3, IM: 2 }
  return weekMap[patient] || 1
}

function complianceColor(pct) {
  if (pct === null) return { color: '#718096', bg: '#EDF2F7', border: '#CBD5E0' }
  if (pct >= 80) return { color: '#38A169', bg: '#F0FFF4', border: '#C6F6D5' }
  if (pct >= 60) return { color: '#D69E2E', bg: '#FFFFF0', border: '#FEFCBF' }
  return { color: '#E53E3E', bg: '#FFF5F5', border: '#FED7D7' }
}

function complianceBadgeStyle(pct) {
  const c = complianceColor(pct)
  return {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
    color: c.color,
    background: c.bg,
    border: `1px solid ${c.border}`,
  }
}

function statusDotColor(status) {
  if (status === 'Present') return '#38A169'
  if (status === 'Excused' || status === 'Medical') return '#D69E2E'
  if (status === 'Absent') return '#E53E3E'
  return '#CBD5E0'
}

function calculateModalityCompliance(attended, expected) {
  if (expected === 0) return null
  return Math.round((attended / expected) * 100)
}

export default function TherapySessions() {
  const { user } = useAuth()
  const [selectedPatient, setSelectedPatient] = useState('CO')
  const [selectedWeek, setSelectedWeek] = useState(6)
  const [attendanceData, setAttendanceData] = useState(buildInitialData)
  const [sessionLogs, setSessionLogs] = useState(buildInitialLogs)
  const [showLogForm, setShowLogForm] = useState(false)
  const [logForm, setLogForm] = useState({
    modality: '',
    date: '',
    facilitator: '',
    status: '',
  })

  const weekData = (attendanceData[selectedPatient] && attendanceData[selectedPatient][selectedWeek]) || {}

  // Calculate per-modality stats
  const modalityStats = MODALITIES.map((mod) => {
    const dayData = weekData[mod.id] || {}
    const expected = mod.expectedPerWeek
    const attended = Object.values(dayData).filter((s) => s === 'Present').length
    const pct = calculateModalityCompliance(attended, expected)
    return { ...mod, attended, expected, pct, dayData }
  })

  // Overall compliance
  const totalExpected = modalityStats.reduce((sum, m) => sum + m.expected, 0)
  const totalAttended = modalityStats.reduce((sum, m) => sum + m.attended, 0)
  const overallPct = totalExpected > 0 ? Math.round((totalAttended / totalExpected) * 100) : null

  const patientLogs = (sessionLogs[selectedPatient] && sessionLogs[selectedPatient][selectedWeek]) || []

  const handlePatientChange = (initials) => {
    setSelectedPatient(initials)
    setSelectedWeek(getDefaultWeek(initials))
    setShowLogForm(false)
  }

  const toggleDayAttendance = (modalityId, day) => {
    setAttendanceData((prev) => {
      const patientData = { ...prev }
      if (!patientData[selectedPatient]) patientData[selectedPatient] = {}
      if (!patientData[selectedPatient][selectedWeek]) patientData[selectedPatient][selectedWeek] = {}
      const weekCopy = { ...patientData[selectedPatient][selectedWeek] }
      const modCopy = { ...weekCopy[modalityId] }

      if (modCopy[day]) {
        // Cycle: Present -> Absent -> Excused -> Medical -> clear
        const cycle = ['Present', 'Absent', 'Excused', 'Medical']
        const idx = cycle.indexOf(modCopy[day])
        if (idx >= 0 && idx < cycle.length - 1) {
          modCopy[day] = cycle[idx + 1]
        } else {
          delete modCopy[day]
        }
      } else {
        modCopy[day] = 'Present'
      }

      weekCopy[modalityId] = modCopy
      patientData[selectedPatient] = { ...patientData[selectedPatient], [selectedWeek]: weekCopy }
      return patientData
    })
  }

  const updateLogForm = (field, value) => setLogForm((prev) => ({ ...prev, [field]: value }))

  const handleLogSubmit = () => {
    if (!logForm.modality || !logForm.date || !logForm.facilitator || !logForm.status) return
    const mod = MODALITIES.find((m) => m.id === logForm.modality)
    const newLog = {
      id: Date.now(),
      date: logForm.date,
      modality: logForm.modality,
      duration: mod ? mod.durationMin : 60,
      facilitator: logForm.facilitator,
      status: logForm.status,
    }
    setSessionLogs((prev) => {
      const copy = { ...prev }
      if (!copy[selectedPatient]) copy[selectedPatient] = {}
      if (!copy[selectedPatient][selectedWeek]) copy[selectedPatient][selectedWeek] = []
      copy[selectedPatient] = {
        ...copy[selectedPatient],
        [selectedWeek]: [...copy[selectedPatient][selectedWeek], newLog],
      }
      return copy
    })
    setShowLogForm(false)
    setLogForm({ modality: '', date: '', facilitator: '', status: '' })
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            Therapy Sessions
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            Weekly Attendance Tracker (Protocol Section 6.4)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>Patient:</label>
          <select
            value={selectedPatient}
            onChange={(e) => handlePatientChange(e.target.value)}
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
          <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>Week:</label>
          <select
            value={selectedWeek}
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
            {WEEKS.map((w) => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Weekly Compliance Summary Card */}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: 0 }}>
            Weekly Compliance Summary — {selectedPatient} (Week {selectedWeek})
          </h2>
          <span style={complianceBadgeStyle(overallPct)}>
            {overallPct !== null ? `${overallPct}%` : 'No Data'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#4A5568' }}>
          <span><strong>Programme Week:</strong> {selectedWeek} of 12</span>
          <span><strong>Phase:</strong> {selectedWeek <= 2 ? 'Phase 1 — Stabilisation' : selectedWeek <= 6 ? 'Phase 2 — Core Treatment' : selectedWeek <= 10 ? 'Phase 3 — Consolidation' : 'Phase 4 — Transition'}</span>
          <span><strong>Sessions Attended:</strong> {totalAttended} / {totalExpected}</span>
          <span>
            <strong>Status: </strong>
            {overallPct === null ? 'No data recorded' : overallPct >= 80 ? 'On Track' : overallPct >= 60 ? 'Needs Improvement' : 'At Risk'}
          </span>
        </div>
        {/* Compliance bar */}
        {overallPct !== null && (
          <div style={{ marginTop: 14 }}>
            <div style={{ width: '100%', height: 10, borderRadius: 5, background: '#EDF2F7' }}>
              <div
                style={{
                  width: `${Math.min(overallPct, 100)}%`,
                  height: 10,
                  borderRadius: 5,
                  background: complianceColor(overallPct).color,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modality Grid/Table */}
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
          Modality Attendance Grid
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600, minWidth: 180 }}>Modality</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600, minWidth: 80 }}>Frequency</th>
                {DAYS.map((d) => (
                  <th key={d} style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600, minWidth: 44 }}>{d}</th>
                ))}
                <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600, minWidth: 70 }}>Attended</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600, minWidth: 70 }}>Expected</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600, minWidth: 80 }}>Compliance</th>
              </tr>
            </thead>
            <tbody>
              {modalityStats.map((mod) => {
                const cc = complianceColor(mod.pct)
                return (
                  <tr key={mod.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#2D3748' }}>
                      {mod.name}
                      {mod.pathwayA && (
                        <span style={{ fontSize: 11, color: '#718096', fontWeight: 400, marginLeft: 6 }}>(Pathway A)</span>
                      )}
                      {mod.citation && (
                        <span style={{ fontSize: 10, color: '#A0AEC0', fontWeight: 400, marginLeft: 6 }}>[{mod.citation}]</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12, color: '#718096' }}>{mod.frequency}</td>
                    {DAYS.map((day) => {
                      const isScheduled = mod.days.includes(day) || (mod.expectedPerWeek === 0 && false)
                      const status = mod.dayData[day] || ''
                      return (
                        <td
                          key={day}
                          style={{ padding: '4px 2px', textAlign: 'center' }}
                        >
                          {isScheduled || status ? (
                            <button
                              onClick={() => toggleDayAttendance(mod.id, day)}
                              title={status || 'Click to mark attendance'}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                border: status ? `2px solid ${statusDotColor(status)}` : '2px dashed #CBD5E0',
                                background: status ? statusDotColor(status) + '22' : 'transparent',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 700,
                                color: status ? statusDotColor(status) : '#CBD5E0',
                              }}
                            >
                              {status === 'Present' ? 'P' : status === 'Absent' ? 'A' : status === 'Excused' ? 'E' : status === 'Medical' ? 'M' : ''}
                            </button>
                          ) : (
                            <span style={{ color: '#EDF2F7', fontSize: 16 }}>-</span>
                          )}
                        </td>
                      )
                    })}
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{mod.attended}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#718096' }}>{mod.expected}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      {mod.pct !== null ? (
                        <span style={complianceBadgeStyle(mod.pct)}>{mod.pct}%</span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#A0AEC0' }}>N/A</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap', fontSize: 12, color: '#718096' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#38A16922', border: '2px solid #38A169', display: 'inline-block' }} />
            P = Present
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#E53E3E22', border: '2px solid #E53E3E', display: 'inline-block' }} />
            A = Absent
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#D69E2E22', border: '2px solid #D69E2E', display: 'inline-block' }} />
            E = Excused
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#D69E2E22', border: '2px solid #D69E2E', display: 'inline-block' }} />
            M = Medical
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px dashed #CBD5E0', display: 'inline-block' }} />
            Scheduled (not yet recorded)
          </span>
          <span>Click to cycle: Present &rarr; Absent &rarr; Excused &rarr; Medical &rarr; Clear</span>
        </div>
      </div>

      {/* Session Log */}
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
            Session Log
          </h2>
          <button
            onClick={() => { setShowLogForm(!showLogForm); setLogForm({ modality: '', date: '', facilitator: '', status: '' }) }}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: '#2B6CB0',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {showLogForm ? 'Cancel' : 'Quick Log'}
          </button>
        </div>

        {patientLogs.length === 0 && !showLogForm && (
          <p style={{ color: '#A0AEC0', fontSize: 14 }}>No session logs recorded for this week.</p>
        )}

        {patientLogs.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Modality</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Duration</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Facilitator</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...patientLogs].reverse().map((log) => {
                  const mod = MODALITIES.find((m) => m.id === log.modality)
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                      <td style={{ padding: '8px 10px' }}>{log.date}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{mod ? mod.name : log.modality}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{log.duration} min</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{log.facilitator}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            color: statusDotColor(log.status),
                            background: statusDotColor(log.status) + '18',
                            border: `1px solid ${statusDotColor(log.status)}40`,
                          }}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick-Log Form */}
      {showLogForm && (
        <div
          className="card"
          style={{
            padding: 24,
            borderRadius: 12,
            border: '2px solid #2B6CB0',
            background: '#fff',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: '0 0 8px' }}>
            Quick Log — {selectedPatient} (Week {selectedWeek})
          </h2>
          <p style={{ fontSize: 13, color: '#718096', margin: '0 0 20px' }}>
            Log an individual session attendance record.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Modality */}
            <div>
              <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                Modality
              </label>
              <select
                value={logForm.modality}
                onChange={(e) => updateLogForm('modality', e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E0',
                  fontSize: 14,
                  width: '100%',
                  background: '#fff',
                }}
              >
                <option value="">-- Select Modality --</option>
                {MODALITIES.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                Date
              </label>
              <input
                type="date"
                value={logForm.date}
                onChange={(e) => updateLogForm('date', e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E0',
                  fontSize: 14,
                  width: '100%',
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Facilitator */}
            <div>
              <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                Facilitator
              </label>
              <select
                value={logForm.facilitator}
                onChange={(e) => updateLogForm('facilitator', e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E0',
                  fontSize: 14,
                  width: '100%',
                  background: '#fff',
                }}
              >
                <option value="">-- Select Facilitator --</option>
                {STAFF_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Attendance Status */}
            <div>
              <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                Attendance Status
              </label>
              <select
                value={logForm.status}
                onChange={(e) => updateLogForm('status', e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E0',
                  fontSize: 14,
                  width: '100%',
                  background: '#fff',
                }}
              >
                <option value="">-- Select Status --</option>
                {ATTENDANCE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleLogSubmit}
              disabled={!logForm.modality || !logForm.date || !logForm.facilitator || !logForm.status}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: (!logForm.modality || !logForm.date || !logForm.facilitator || !logForm.status) ? '#CBD5E0' : '#2B6CB0',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: (!logForm.modality || !logForm.date || !logForm.facilitator || !logForm.status) ? 'not-allowed' : 'pointer',
              }}
            >
              Log Session
            </button>
            <button
              onClick={() => { setShowLogForm(false); setLogForm({ modality: '', date: '', facilitator: '', status: '' }) }}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: '1px solid #CBD5E0',
                background: '#fff',
                color: '#4A5568',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
