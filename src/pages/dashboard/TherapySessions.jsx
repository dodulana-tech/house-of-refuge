import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { getPatients, getTherapySessions, addTherapySession, updateTherapySession, deleteTherapySession } from '../../utils/supabase'
import { activeBriefs } from '../../utils/patients'

/*
  Therapy Session Attendance Tracker — per Treatment Protocol Section 6.4
  (Weekly Therapy Schedule). Tracks compliance across 11 modalities.
  Initials only (HIPAA). All fields are selects/checkboxes — zero free text.
*/

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

// Map a YYYY-MM-DD date to a short weekday label used by the attendance grid.
function weekdayFromDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
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
  const [patients, setPatients] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState('')
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [showLogForm, setShowLogForm] = useState(false)
  const [logForm, setLogForm] = useState({
    modality: '',
    date: '',
    facilitator: '',
    status: '',
  })

  const reloadSessions = useCallback(async () => {
    const { data } = await getTherapySessions('individual')
    setSessions(data || [])
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: pRows }, { data: sRows }] = await Promise.all([
      getPatients(),
      getTherapySessions('individual'),
    ])
    const briefs = activeBriefs(pRows)
    setPatients(briefs)
    setSessions(sRows || [])
    setSelectedPatient((prev) => prev || briefs[0]?.id || '')
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Fold the flat individual-session rows into the nested shapes the JSX reads:
  //   attendanceData[patientId][week][modalityId][day] = status
  //   sessionLogs[patientId][week] = [{ id, date, modality, duration, facilitator, status }]
  // Rich per-session fields (week, weekday, duration) live in row.data (JSONB).
  const { attendanceData, sessionLogs } = useMemo(() => {
    const att = {}
    const logs = {}
    for (const row of sessions) {
      const pid = row.patient_id
      const week = Number(row.data?.week) || 1
      const day = row.data?.day || weekdayFromDate(row.session_date)
      if (!att[pid]) att[pid] = {}
      if (!att[pid][week]) att[pid][week] = {}
      if (!att[pid][week][row.modality]) att[pid][week][row.modality] = {}
      if (day) att[pid][week][row.modality][day] = row.status
      if (!logs[pid]) logs[pid] = {}
      if (!logs[pid][week]) logs[pid][week] = []
      logs[pid][week].push({
        id: row.id,
        date: row.session_date,
        modality: row.modality,
        duration: row.data?.duration ?? (MODALITIES.find((m) => m.id === row.modality)?.durationMin ?? 60),
        facilitator: row.therapist_code,
        status: row.status,
      })
    }
    return { attendanceData: att, sessionLogs: logs }
  }, [sessions])

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
  const patientHasSessions = !!sessionLogs[selectedPatient]
  const selectedInitials = patients.find((p) => p.id === selectedPatient)?.initials || '—'

  const handlePatientChange = (id) => {
    setSelectedPatient(id)
    const weeks = Object.keys(sessionLogs[id] || {}).map(Number)
    setSelectedWeek(weeks.length ? Math.max(...weeks) : 1)
    setShowLogForm(false)
  }

  // Grid cell click: cycle the matching session's status, or create/delete its row.
  const toggleDayAttendance = async (modalityId, day) => {
    if (saving || !selectedPatient) return
    const existing = sessions.find((r) =>
      r.patient_id === selectedPatient &&
      (Number(r.data?.week) || 1) === selectedWeek &&
      r.modality === modalityId &&
      (r.data?.day || weekdayFromDate(r.session_date)) === day
    )
    setSaving(true)
    try {
      if (existing) {
        // Cycle: Present -> Absent -> Excused -> Medical -> clear (delete)
        const cycle = ['Present', 'Absent', 'Excused', 'Medical']
        const idx = cycle.indexOf(existing.status)
        if (idx >= 0 && idx < cycle.length - 1) {
          const { error } = await updateTherapySession(existing.id, { status: cycle[idx + 1] })
          if (error) { alert(`Could not update session: ${error.message}`); return }
        } else {
          const { error } = await deleteTherapySession(existing.id)
          if (error) { alert(`Could not delete session: ${error.message}`); return }
        }
      } else {
        const mod = MODALITIES.find((m) => m.id === modalityId)
        const { error } = await addTherapySession({
          patient_id: selectedPatient,
          type: 'individual',
          session_date: new Date().toISOString().slice(0, 10),
          session_time: '',
          therapist_code: '',
          modality: modalityId,
          status: 'Present',
          attendees: null,
          data: { week: selectedWeek, day, duration: mod ? mod.durationMin : 60 },
        })
        if (error) { alert(`Could not record session: ${error.message}`); return }
      }
      await reloadSessions()
    } finally {
      setSaving(false)
    }
  }

  const updateLogForm = (field, value) => setLogForm((prev) => ({ ...prev, [field]: value }))

  const handleLogSubmit = async () => {
    if (!logForm.modality || !logForm.date || !logForm.facilitator || !logForm.status || !selectedPatient) return
    const mod = MODALITIES.find((m) => m.id === logForm.modality)
    setSaving(true)
    try {
      const { error } = await addTherapySession({
        patient_id: selectedPatient,
        type: 'individual',
        session_date: logForm.date,
        session_time: '',
        therapist_code: logForm.facilitator,
        modality: logForm.modality,
        status: logForm.status,
        attendees: null,
        data: { week: selectedWeek, day: weekdayFromDate(logForm.date), duration: mod ? mod.durationMin : 60 },
      })
      if (error) { alert(`Could not log session: ${error.message}`); return }
      setShowLogForm(false)
      setLogForm({ modality: '', date: '', facilitator: '', status: '' })
      await reloadSessions()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: '#718096', fontSize: 14 }}>Loading therapy sessions…</p>
      </div>
    )
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
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.initials}</option>
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
            Weekly Compliance Summary — {selectedInitials} (Week {selectedWeek})
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
          <p style={{ color: '#A0AEC0', fontSize: 14 }}>
            {patientHasSessions ? 'No session logs recorded for this week.' : 'No therapy sessions recorded yet.'}
          </p>
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
            Quick Log — {selectedInitials} (Week {selectedWeek})
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
              disabled={!logForm.modality || !logForm.date || !logForm.facilitator || !logForm.status || saving || !selectedPatient}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: (!logForm.modality || !logForm.date || !logForm.facilitator || !logForm.status || saving || !selectedPatient) ? '#CBD5E0' : '#2B6CB0',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: (!logForm.modality || !logForm.date || !logForm.facilitator || !logForm.status || saving || !selectedPatient) ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Log Session'}
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
