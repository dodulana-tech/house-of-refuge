import React, { useState, useMemo, useEffect } from 'react'
import { getPatients, getAssessments } from '../../utils/supabase'
import { mapPatientRow } from '../../utils/patients'

/*
  Clinical Assessment Schedule — Treatment Protocol Section 5.5 / Appendix B.
  Automated "assessments due" tracker. Calculates next-due dates based on
  admission date, frequency rules, and last-completed dates. Initials only (HIPAA).

  Live data: active patients (getPatients) + their recorded assessment results
  (getAssessments). The schedule template below (which assessments exist and how
  often) stays static config; each patient's "last completed" per assessment is
  derived from the newest matching assessment row's created_at.
*/

const TODAY = new Date().toISOString().split('T')[0]

const ACTIVE_STATUSES = ['admitted', 'on-pass', 'suspended']

// Assessment schedule per Appendix B. `type` is the value stored in the
// `assessments` table's `type` column (defaults to `id` when the same).
const ASSESSMENTS = [
  { id: 'cssrs',    type: 'risk', name: 'C-SSRS',          admission: true, weekly: true,      fortnightly: false, monthly: false, discharge: true,  asNeeded: false },
  { id: 'ciwa',     name: 'CIWA-Ar (Alcohol)', admission: true, weekly: false,   fortnightly: false, monthly: false, discharge: false, asNeeded: true },
  { id: 'cows',     name: 'COWS (Opioid)',    admission: true, weekly: false,     fortnightly: false, monthly: false, discharge: false, asNeeded: true },
  { id: 'audit',    name: 'AUDIT',            admission: true, weekly: false,     fortnightly: false, monthly: false, discharge: true,  asNeeded: false },
  { id: 'dast10',   name: 'DAST-10',          admission: true, weekly: false,     fortnightly: false, monthly: false, discharge: true,  asNeeded: false },
  { id: 'phq9',     name: 'PHQ-9',            admission: true, weekly: false,     fortnightly: false, monthly: true,  discharge: true,  asNeeded: false },
  { id: 'gad7',     name: 'GAD-7',            admission: true, weekly: false,     fortnightly: false, monthly: true,  discharge: true,  asNeeded: false },
  { id: 'urica',    type: 'urica', name: 'URICA',            admission: true, weekly: false,     fortnightly: true,  monthly: false, discharge: true,  asNeeded: false },
  { id: 'ace',      type: 'ace', name: 'ACE (Trauma)',     admission: true, weekly: false,     fortnightly: false, monthly: false, discharge: false, asNeeded: false },
  { id: 'vitals',   name: 'Vitals',           admission: true, weekly: true,      fortnightly: false, monthly: false, discharge: true,  asNeeded: false },
  { id: 'uds',      name: 'UDS',              admission: true, weekly: false,     fortnightly: false, monthly: true,  discharge: true,  asNeeded: false },
  { id: 'weightbmi', name: 'Weight/BMI',      admission: true, weekly: false,     fortnightly: false, monthly: true,  discharge: true,  asNeeded: false },
]

// The DB `type` for an assessment row that satisfies this schedule item.
const assessmentType = (assessment) => assessment.type || assessment.id

// Newest matching assessment row's date (YYYY-MM-DD), or null. Rows arrive
// newest-first, so the first row of a given type is the most recent.
function lastCompletedFor(rows, type) {
  const match = (rows || []).find((r) => r.type === type)
  if (!match || !match.created_at) return null
  return String(match.created_at).split('T')[0]
}

function daysBetween(dateA, dateB) {
  const a = new Date(dateA)
  const b = new Date(dateB)
  return Math.floor((b - a) / (1000 * 60 * 60 * 24))
}

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function getWeekNumber(admissionDate, today) {
  const days = daysBetween(admissionDate, today)
  return Math.min(12, Math.max(1, Math.floor(days / 7) + 1))
}

function isNearDischarge(admissionDate, today) {
  const week = getWeekNumber(admissionDate, today)
  return week >= 11
}

function getFrequencyLabel(assessment) {
  if (assessment.weekly) return 'Weekly'
  if (assessment.fortnightly) return 'Fortnightly'
  if (assessment.monthly) return 'Monthly'
  if (assessment.asNeeded) return 'As Needed'
  if (assessment.admission && !assessment.discharge) return 'Admission Only'
  if (assessment.admission && assessment.discharge) return 'Admission + Discharge'
  return '—'
}

function calculateNextDue(assessment, patientData, today) {
  const { admissionDate, lastCompleted } = patientData
  const lastDone = lastCompleted[assessment.id]
  const nearDischarge = isNearDischarge(admissionDate, today)

  // Admission-only assessment (e.g., ACE) — once done, nothing more due
  if (assessment.admission && !assessment.weekly && !assessment.fortnightly && !assessment.monthly && !assessment.discharge && !assessment.asNeeded) {
    if (!lastDone) return { nextDue: admissionDate, status: 'Overdue' }
    return { nextDue: null, status: 'Completed' }
  }

  // As-needed assessments (CIWA, COWS) — no scheduled next-due
  if (assessment.asNeeded && !assessment.weekly && !assessment.fortnightly && !assessment.monthly) {
    if (!lastDone) return { nextDue: admissionDate, status: daysBetween(admissionDate, today) > 0 ? 'Overdue' : 'Due' }
    return { nextDue: null, status: 'Completed' }
  }

  // If near discharge and assessment has discharge requirement, check if discharge assessment is due
  if (nearDischarge && assessment.discharge) {
    // Calculate expected discharge date (12 weeks from admission)
    const dischargeDate = addDays(admissionDate, 84)
    const daysToDischarge = daysBetween(today, dischargeDate)

    // If within 7 days of discharge and no recent completion, discharge assessment becomes due
    if (daysToDischarge <= 7 && daysToDischarge >= 0) {
      if (!lastDone || daysBetween(lastDone, today) > 7) {
        return { nextDue: dischargeDate, status: 'Due' }
      }
    }
  }

  // No last completion — admission assessment overdue
  if (!lastDone) {
    return { nextDue: admissionDate, status: 'Overdue' }
  }

  // Calculate next due based on frequency
  let nextDueDate = null
  if (assessment.weekly) {
    nextDueDate = addDays(lastDone, 7)
  } else if (assessment.fortnightly) {
    nextDueDate = addDays(lastDone, 14)
  } else if (assessment.monthly) {
    nextDueDate = addDays(lastDone, 30)
  }

  if (!nextDueDate) {
    return { nextDue: null, status: 'Completed' }
  }

  const daysUntilDue = daysBetween(today, nextDueDate)

  if (daysUntilDue < -2) return { nextDue: nextDueDate, status: 'Overdue' }
  if (daysUntilDue <= 0) return { nextDue: nextDueDate, status: 'Due' }
  if (daysUntilDue <= 3) return { nextDue: nextDueDate, status: 'Due' }
  return { nextDue: nextDueDate, status: 'Not Yet Due' }
}

const STATUS_STYLES = {
  Completed: {
    color: '#38A169',
    bg: '#F0FFF4',
    border: '#C6F6D5',
  },
  Due: {
    color: '#2B6CB0',
    bg: '#EBF8FF',
    border: '#BEE3F8',
  },
  Overdue: {
    color: '#E53E3E',
    bg: '#FFF5F5',
    border: '#FED7D7',
  },
  'Not Yet Due': {
    color: '#718096',
    bg: '#F7FAFC',
    border: '#E2E8F0',
  },
}

function statusBadge(status) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['Not Yet Due']
  return {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    color: s.color,
    background: s.bg,
    border: `1px solid ${s.border}`,
  }
}

export default function AssessmentSchedule() {
  const [selectedPatient, setSelectedPatient] = useState('ALL')
  // Live roster: [{ id, initials, admissionDate, lastCompleted: { [assessmentId]: date|null } }]
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data: rows } = await getPatients()
      const active = (rows || []).filter((r) => ACTIVE_STATUSES.includes(r.status))

      const derived = await Promise.all(
        active.map(async (row) => {
          const mapped = mapPatientRow(row)
          const { data: assessmentRows } = await getAssessments(mapped.id)
          const lastCompleted = {}
          ASSESSMENTS.forEach((a) => {
            lastCompleted[a.id] = lastCompletedFor(assessmentRows, assessmentType(a))
          })
          return {
            id: mapped.id,
            initials: mapped.initials,
            admissionDate: mapped.admittedAt ? String(mapped.admittedAt).split('T')[0] : null,
            lastCompleted,
          }
        })
      )

      if (!cancelled) {
        setPatients(derived)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Calculate assessment statuses for a single patient (by id)
  const getPatientAssessments = (id) => {
    const data = patients.find((p) => p.id === id)
    if (!data || !data.admissionDate) return []
    return ASSESSMENTS.map((assessment) => {
      const { nextDue, status } = calculateNextDue(assessment, data, TODAY)
      return {
        ...assessment,
        lastCompleted: data.lastCompleted[assessment.id] || null,
        nextDue,
        status,
      }
    })
  }

  // Summary stats across all patients
  const summaryStats = useMemo(() => {
    let dueToday = 0
    let overdue = 0
    let upcomingThisWeek = 0
    const patientSummaries = []

    patients.forEach((p) => {
      const assessments = getPatientAssessments(p.id)
      let patientOverdue = 0
      let patientDueToday = 0
      let patientCompleted = 0

      assessments.forEach((a) => {
        if (a.status === 'Due') { dueToday++; patientDueToday++ }
        if (a.status === 'Overdue') { overdue++; patientOverdue++ }
        if (a.status === 'Not Yet Due') { upcomingThisWeek++ }
        if (a.status === 'Completed') { patientCompleted++ }
      })

      const total = assessments.length
      const compliance = total > 0 ? Math.round(((patientCompleted + assessments.filter((a) => a.status === 'Not Yet Due').length) / total) * 100) : 0

      patientSummaries.push({
        id: p.id,
        initials: p.initials,
        admissionDate: p.admissionDate,
        week: p.admissionDate ? getWeekNumber(p.admissionDate, TODAY) : '—',
        overdueCount: patientOverdue,
        dueTodayCount: patientDueToday,
        compliance,
      })
    })

    return { dueToday, overdue, upcomingThisWeek, patientSummaries }
  }, [patients])

  const selectedData = selectedPatient !== 'ALL' ? patients.find((p) => p.id === selectedPatient) : null
  const selectedAssessments = selectedData ? getPatientAssessments(selectedData.id) : []
  const selectedWeek = selectedData && selectedData.admissionDate ? getWeekNumber(selectedData.admissionDate, TODAY) : null

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: '#718096', fontSize: 14 }}>Loading assessment schedule…</p>
      </div>
    )
  }

  if (patients.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
          Assessment Schedule
        </h1>
        <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
          Clinical Assessment Tracker (Protocol Section 5.5 / Appendix B)
        </p>
        <div
          className="card"
          style={{ padding: 40, marginTop: 20, borderRadius: 12, border: '1px solid #E2E8F0', background: '#fff', textAlign: 'center', color: '#718096' }}
        >
          No active patients on record yet.
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            Assessment Schedule
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            Clinical Assessment Tracker (Protocol Section 5.5 / Appendix B)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>View:</label>
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E0',
              fontSize: 14,
              fontWeight: 600,
              background: '#fff',
            }}
          >
            <option value="ALL">All Patients</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.initials}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overdue Alert Banner */}
      {summaryStats.overdue > 0 && (
        <div
          style={{
            padding: 16,
            marginBottom: 20,
            borderRadius: 12,
            background: '#E53E3E',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            border: '2px solid #C53030',
          }}
        >
          <span style={{ fontSize: 24 }}>!</span>
          <span>
            {summaryStats.overdue} OVERDUE ASSESSMENT{summaryStats.overdue !== 1 ? 'S' : ''} — Immediate action required
          </span>
        </div>
      )}

      {/* Summary Dashboard */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div
          className="card"
          style={{
            padding: 20,
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            background: '#fff',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 700, color: '#2B6CB0' }}>
            {summaryStats.dueToday}
          </div>
          <div style={{ fontSize: 14, color: '#4A5568', fontWeight: 600 }}>
            Due Today
          </div>
        </div>
        <div
          className="card"
          style={{
            padding: 20,
            borderRadius: 12,
            border: summaryStats.overdue > 0 ? '2px solid #FED7D7' : '1px solid #E2E8F0',
            background: summaryStats.overdue > 0 ? '#FFF5F5' : '#fff',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 700, color: summaryStats.overdue > 0 ? '#E53E3E' : '#38A169' }}>
            {summaryStats.overdue}
          </div>
          <div style={{ fontSize: 14, color: '#4A5568', fontWeight: 600 }}>
            Overdue
          </div>
        </div>
        <div
          className="card"
          style={{
            padding: 20,
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            background: '#fff',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 700, color: '#718096' }}>
            {summaryStats.upcomingThisWeek}
          </div>
          <div style={{ fontSize: 14, color: '#4A5568', fontWeight: 600 }}>
            Upcoming
          </div>
        </div>
      </div>

      {/* ALL PATIENTS VIEW */}
      {selectedPatient === 'ALL' && (
        <div
          className="card"
          style={{
            padding: 20,
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            background: '#fff',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: '0 0 16px' }}>
            All Patients — Assessment Compliance
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Patient</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Admitted</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Week</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#E53E3E', fontWeight: 600 }}>Overdue</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#2B6CB0', fontWeight: 600 }}>Due Today</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Compliance</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {summaryStats.patientSummaries.map((ps) => (
                  <tr key={ps.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                    <td style={{ padding: '10px 10px', fontWeight: 700, fontSize: 15 }}>{ps.initials}</td>
                    <td style={{ padding: '10px 10px' }}>{ps.admissionDate || '—'}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>
                      {ps.week} / 12
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      {ps.overdueCount > 0 ? (
                        <span style={statusBadge('Overdue')}>{ps.overdueCount}</span>
                      ) : (
                        <span style={{ color: '#38A169', fontWeight: 600 }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      {ps.dueTodayCount > 0 ? (
                        <span style={statusBadge('Due')}>{ps.dueTodayCount}</span>
                      ) : (
                        <span style={{ color: '#38A169', fontWeight: 600 }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 60,
                            height: 8,
                            borderRadius: 4,
                            background: '#E2E8F0',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${ps.compliance}%`,
                              height: '100%',
                              borderRadius: 4,
                              background: ps.compliance >= 80 ? '#38A169' : ps.compliance >= 60 ? '#D69E2E' : '#E53E3E',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#4A5568' }}>
                          {ps.compliance}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedPatient(ps.id)}
                        style={{
                          padding: '4px 14px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E0',
                          background: '#fff',
                          color: '#2B6CB0',
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INDIVIDUAL PATIENT VIEW */}
      {selectedPatient !== 'ALL' && selectedData && (
        <>
          {/* Patient Info Card */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: 0 }}>
                {selectedData.initials} — Programme Week {selectedWeek ?? '—'} of 12
              </h2>
              <button
                onClick={() => setSelectedPatient('ALL')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E0',
                  background: '#fff',
                  color: '#4A5568',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Back to All Patients
              </button>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#4A5568', marginTop: 12 }}>
              <span><strong>Admission Date:</strong> {selectedData.admissionDate || '—'}</span>
              {selectedData.admissionDate && (
                <>
                  <span><strong>Expected Discharge:</strong> {addDays(selectedData.admissionDate, 84)}</span>
                  <span><strong>Days in Programme:</strong> {daysBetween(selectedData.admissionDate, TODAY)}</span>
                  {isNearDischarge(selectedData.admissionDate, TODAY) && (
                    <span style={{ color: '#D69E2E', fontWeight: 700 }}>Near Discharge — Discharge assessments becoming due</span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Assessment Matrix */}
          <div
            className="card"
            style={{
              padding: 20,
              borderRadius: 12,
              border: '1px solid #E2E8F0',
              background: '#fff',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: '0 0 16px' }}>
              Assessment Matrix
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Assessment</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Frequency</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Admission</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Discharge</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Last Completed</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Next Due</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAssessments.map((a) => (
                    <tr
                      key={a.id}
                      style={{
                        borderBottom: '1px solid #EDF2F7',
                        background: a.status === 'Overdue' ? '#FFF5F5' : a.status === 'Due' ? '#EBF8FF' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '10px 10px', fontWeight: 600 }}>{a.name}</td>
                      <td style={{ padding: '10px 10px', textAlign: 'center', fontSize: 12, color: '#718096' }}>
                        {getFrequencyLabel(a)}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        {a.admission ? (
                          <span style={{ color: '#38A169', fontWeight: 700 }}>Yes</span>
                        ) : (
                          <span style={{ color: '#CBD5E0' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        {a.discharge ? (
                          <span style={{ color: '#2B6CB0', fontWeight: 700 }}>Yes</span>
                        ) : (
                          <span style={{ color: '#CBD5E0' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        {a.lastCompleted || <span style={{ color: '#CBD5E0' }}>Never</span>}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        {a.nextDue || <span style={{ color: '#CBD5E0' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <span style={statusBadge(a.status)}>{a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
