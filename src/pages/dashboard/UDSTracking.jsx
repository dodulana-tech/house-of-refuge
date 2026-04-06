import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Urine Drug Screen (UDS) Tracking — Treatment Protocol Section 5.5
  Monthly screening for ALL residents (NIDA Principle 12: drug use must
  be monitored continuously). Additional testing on clinical suspicion,
  return from pass, or behavioral changes. Initials only (HIPAA).
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

const SUBSTANCES = [
  'Cannabis',
  'Opioids',
  'Cocaine',
  'Amphetamines',
  'Benzodiazepines',
  'Alcohol',
  'Methamphetamine',
]

const TEST_REASONS = [
  'Routine Monthly',
  'Clinical Suspicion',
  'Post-Pass',
  'Random',
]

const POSITIVE_ACTIONS = [
  'Document in clinical file',
  'Notify Clinical Lead and Program Director',
  'Review treatment plan at next MDT',
  'Behavioral management assessment (Tier 2 if on pass)',
  'Increase monitoring frequency',
  'Compassionate clinical conversation (not punitive)',
]

const TODAY = '2026-04-06'

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function daysBetween(dateA, dateB) {
  const a = new Date(dateA)
  const b = new Date(dateB)
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

function getNextDueDate(tests) {
  const routineTests = tests.filter((t) => t.reason === 'Routine Monthly')
  if (routineTests.length === 0) {
    // Use earliest test date + 30
    if (tests.length === 0) return null
    return addDays(tests[tests.length - 1].date, 30)
  }
  const lastRoutine = routineTests[routineTests.length - 1]
  return addDays(lastRoutine.date, 30)
}

function isOverdue(tests) {
  const routineTests = tests.filter((t) => t.reason === 'Routine Monthly')
  if (routineTests.length === 0 && tests.length > 0) {
    return daysBetween(tests[tests.length - 1].date, TODAY) > 35
  }
  if (routineTests.length === 0) return false
  const lastRoutine = routineTests[routineTests.length - 1]
  return daysBetween(lastRoutine.date, TODAY) > 35
}

function getOverallResult(substances) {
  const positives = SUBSTANCES.filter((s) => substances[s] === 'Positive')
  if (positives.length === 0) return { status: 'Clean', positives: [] }
  return { status: 'Positive', positives }
}

const INITIAL_TESTS = {
  CO: [
    {
      id: 1,
      date: '2026-02-01',
      reason: 'Routine Monthly',
      orderedBy: 'AI',
      substances: { Cannabis: 'Negative', Opioids: 'Negative', Cocaine: 'Negative', Amphetamines: 'Negative', Benzodiazepines: 'Negative', Alcohol: 'Negative', Methamphetamine: 'Negative' },
    },
    {
      id: 2,
      date: '2026-03-01',
      reason: 'Routine Monthly',
      orderedBy: 'AI',
      substances: { Cannabis: 'Negative', Opioids: 'Negative', Cocaine: 'Negative', Amphetamines: 'Negative', Benzodiazepines: 'Negative', Alcohol: 'Negative', Methamphetamine: 'Negative' },
    },
    {
      id: 3,
      date: '2026-03-31',
      reason: 'Routine Monthly',
      orderedBy: 'FA',
      substances: { Cannabis: 'Negative', Opioids: 'Negative', Cocaine: 'Negative', Amphetamines: 'Negative', Benzodiazepines: 'Negative', Alcohol: 'Negative', Methamphetamine: 'Negative' },
    },
  ],
  AN: [
    {
      id: 4,
      date: '2026-02-15',
      reason: 'Routine Monthly',
      orderedBy: 'AI',
      substances: { Cannabis: 'Negative', Opioids: 'Negative', Cocaine: 'Negative', Amphetamines: 'Negative', Benzodiazepines: 'Negative', Alcohol: 'Negative', Methamphetamine: 'Negative' },
    },
    {
      id: 5,
      date: '2026-03-20',
      reason: 'Clinical Suspicion',
      orderedBy: 'AI',
      substances: { Cannabis: 'Positive', Opioids: 'Negative', Cocaine: 'Negative', Amphetamines: 'Negative', Benzodiazepines: 'Negative', Alcohol: 'Negative', Methamphetamine: 'Negative' },
    },
  ],
  KA: [
    {
      id: 6,
      date: '2026-01-05',
      reason: 'Routine Monthly',
      orderedBy: 'FA',
      substances: { Cannabis: 'Negative', Opioids: 'Negative', Cocaine: 'Negative', Amphetamines: 'Negative', Benzodiazepines: 'Negative', Alcohol: 'Negative', Methamphetamine: 'Negative' },
    },
    {
      id: 7,
      date: '2026-02-04',
      reason: 'Routine Monthly',
      orderedBy: 'FA',
      substances: { Cannabis: 'Negative', Opioids: 'Negative', Cocaine: 'Negative', Amphetamines: 'Negative', Benzodiazepines: 'Negative', Alcohol: 'Negative', Methamphetamine: 'Negative' },
    },
    {
      id: 8,
      date: '2026-03-05',
      reason: 'Routine Monthly',
      orderedBy: 'AI',
      substances: { Cannabis: 'Negative', Opioids: 'Negative', Cocaine: 'Negative', Amphetamines: 'Negative', Benzodiazepines: 'Negative', Alcohol: 'Negative', Methamphetamine: 'Negative' },
    },
    {
      id: 9,
      date: '2026-04-03',
      reason: 'Routine Monthly',
      orderedBy: 'AI',
      substances: { Cannabis: 'Negative', Opioids: 'Negative', Cocaine: 'Negative', Amphetamines: 'Negative', Benzodiazepines: 'Negative', Alcohol: 'Negative', Methamphetamine: 'Negative' },
    },
  ],
  IM: [
    {
      id: 10,
      date: '2026-03-07',
      reason: 'Routine Monthly',
      orderedBy: 'AI',
      substances: { Cannabis: 'Negative', Opioids: 'Negative', Cocaine: 'Negative', Amphetamines: 'Negative', Benzodiazepines: 'Negative', Alcohol: 'Negative', Methamphetamine: 'Negative' },
    },
  ],
}

const resultBadgeStyle = (status) => ({
  display: 'inline-block',
  padding: '4px 14px',
  borderRadius: 20,
  fontSize: 13,
  fontWeight: 700,
  color: status === 'Clean' ? '#38A169' : '#E53E3E',
  background: status === 'Clean' ? '#F0FFF4' : '#FFF5F5',
  border: `1px solid ${status === 'Clean' ? '#C6F6D5' : '#FED7D7'}`,
})

const overdueBadgeStyle = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 700,
  color: '#E53E3E',
  background: '#FFF5F5',
  border: '1px solid #FED7D7',
}

const dueSoonBadgeStyle = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 700,
  color: '#D69E2E',
  background: '#FFFFF0',
  border: '1px solid #FEFCBF',
}

const onTrackBadgeStyle = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 700,
  color: '#38A169',
  background: '#F0FFF4',
  border: '1px solid #C6F6D5',
}

export default function UDSTracking() {
  const { user } = useAuth()
  const [selectedPatient, setSelectedPatient] = useState('CO')
  const [tests, setTests] = useState(INITIAL_TESTS)
  const [showForm, setShowForm] = useState(false)
  const [expandedTest, setExpandedTest] = useState(null)
  const [viewMode, setViewMode] = useState('patient') // 'patient' | 'summary'
  const [form, setForm] = useState({
    reason: '',
    orderedBy: '',
    substances: SUBSTANCES.reduce((acc, s) => ({ ...acc, [s]: 'Negative' }), {}),
  })

  const patientTests = tests[selectedPatient] || []
  const latestTest = patientTests.length > 0 ? patientTests[patientTests.length - 1] : null
  const latestResult = latestTest ? getOverallResult(latestTest.substances) : null
  const nextDue = patientTests.length > 0 ? getNextDueDate(patientTests) : null
  const patientOverdue = isOverdue(patientTests)
  const daysUntilDue = nextDue ? daysBetween(TODAY, nextDue) : null

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const updateSubstance = (substance, value) =>
    setForm((prev) => ({
      ...prev,
      substances: { ...prev.substances, [substance]: value },
    }))

  const resetForm = () => {
    setForm({
      reason: '',
      orderedBy: '',
      substances: SUBSTANCES.reduce((acc, s) => ({ ...acc, [s]: 'Negative' }), {}),
    })
  }

  const handleSubmit = () => {
    if (!form.reason || !form.orderedBy) return

    const newTest = {
      id: Date.now(),
      date: TODAY,
      reason: form.reason,
      orderedBy: form.orderedBy,
      substances: { ...form.substances },
    }

    setTests((prev) => ({
      ...prev,
      [selectedPatient]: [...(prev[selectedPatient] || []), newTest],
    }))
    setShowForm(false)
    resetForm()
  }

  const formResult = getOverallResult(form.substances)
  const isFormPositive = formResult.status === 'Positive'

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            UDS Tracking
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            Urine Drug Screen Monitoring (Protocol 5.5 / NIDA Principle 12)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #CBD5E0' }}>
            <button
              onClick={() => setViewMode('patient')}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: viewMode === 'patient' ? '#2B6CB0' : '#fff',
                color: viewMode === 'patient' ? '#fff' : '#4A5568',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Patient View
            </button>
            <button
              onClick={() => setViewMode('summary')}
              style={{
                padding: '8px 14px',
                border: 'none',
                borderLeft: '1px solid #CBD5E0',
                background: viewMode === 'summary' ? '#2B6CB0' : '#fff',
                color: viewMode === 'summary' ? '#fff' : '#4A5568',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              All Patients
            </button>
          </div>

          {viewMode === 'patient' && (
            <>
              <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>Patient:</label>
              <select
                value={selectedPatient}
                onChange={(e) => { setSelectedPatient(e.target.value); setShowForm(false); setExpandedTest(null) }}
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
            </>
          )}
        </div>
      </div>

      {/* ---- ALL PATIENTS SUMMARY VIEW ---- */}
      {viewMode === 'summary' && (
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
            All Patients — UDS Summary
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Patient</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Total Tests</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Last Test Date</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Last Result</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Next Due</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Days Until Due</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {PATIENTS.map((p) => {
                  const pTests = tests[p.initials] || []
                  const pLatest = pTests.length > 0 ? pTests[pTests.length - 1] : null
                  const pResult = pLatest ? getOverallResult(pLatest.substances) : null
                  const pNextDue = pTests.length > 0 ? getNextDueDate(pTests) : null
                  const pOverdue = isOverdue(pTests)
                  const pDaysUntil = pNextDue ? daysBetween(TODAY, pNextDue) : null

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #EDF2F7',
                        background: pOverdue ? '#FFF5F5' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => { setSelectedPatient(p.initials); setViewMode('patient') }}
                    >
                      <td style={{ padding: '10px 10px', fontWeight: 700 }}>{p.initials}</td>
                      <td style={{ padding: '10px 10px' }}>{pTests.length}</td>
                      <td style={{ padding: '10px 10px' }}>{pLatest ? pLatest.date : 'None'}</td>
                      <td style={{ padding: '10px 10px' }}>
                        {pResult ? (
                          <span style={resultBadgeStyle(pResult.status)}>
                            {pResult.status === 'Positive'
                              ? `Positive (${pResult.positives.join(', ')})`
                              : 'Clean'}
                          </span>
                        ) : (
                          <span style={{ color: '#A0AEC0' }}>No tests</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 10px' }}>{pNextDue || '—'}</td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        {pDaysUntil !== null ? pDaysUntil : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        {pOverdue ? (
                          <span style={overdueBadgeStyle}>OVERDUE</span>
                        ) : pDaysUntil !== null && pDaysUntil <= 7 ? (
                          <span style={dueSoonBadgeStyle}>Due Soon</span>
                        ) : (
                          <span style={onTrackBadgeStyle}>On Track</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- PATIENT VIEW ---- */}
      {viewMode === 'patient' && (
        <>
          {/* Overdue Alert Banner */}
          {patientOverdue && (
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
                UDS OVERDUE — {selectedPatient} has not had a routine drug screen in over 35 days.
                Schedule immediately per Protocol 5.5.
              </span>
            </div>
          )}

          {/* Current UDS Status Card */}
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
                Current UDS Status — {selectedPatient}
              </h2>
              {latestResult && (
                <span style={resultBadgeStyle(latestResult.status)}>
                  {latestResult.status === 'Positive'
                    ? `Positive (${latestResult.positives.join(', ')})`
                    : 'Clean'}
                </span>
              )}
            </div>

            {latestTest ? (
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#4A5568' }}>
                <span><strong>Last Test Date:</strong> {latestTest.date}</span>
                <span><strong>Reason:</strong> {latestTest.reason}</span>
                <span><strong>Ordered By:</strong> {latestTest.orderedBy}</span>
                <span><strong>Next Due:</strong> {nextDue}</span>
                <span>
                  <strong>Days Until Due:</strong>{' '}
                  <span style={{ color: daysUntilDue <= 0 ? '#E53E3E' : daysUntilDue <= 7 ? '#D69E2E' : '#38A169', fontWeight: 700 }}>
                    {daysUntilDue <= 0 ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days`}
                  </span>
                </span>
              </div>
            ) : (
              <p style={{ color: '#A0AEC0', fontSize: 14 }}>No UDS on file. Schedule initial screening.</p>
            )}
          </div>

          {/* Positive Result — Clinical Actions */}
          {latestResult && latestResult.status === 'Positive' && (
            <div
              className="card"
              style={{
                padding: 20,
                marginBottom: 20,
                borderRadius: 12,
                background: '#FFF5F5',
                border: '1px solid #FED7D7',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#E53E3E', margin: '0 0 12px' }}>
                Clinical Action Required — Positive UDS Result
              </h3>
              <p style={{ fontSize: 13, color: '#4A5568', margin: '0 0 12px' }}>
                Substances detected: <strong>{latestResult.positives.join(', ')}</strong>
              </p>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {POSITIVE_ACTIONS.map((action, i) => (
                  <li key={i} style={{ fontSize: 14, color: '#2D3748', marginBottom: 6 }}>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Test History */}
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
                Test History
              </h2>
              <button
                onClick={() => { setShowForm(!showForm); resetForm() }}
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
                {showForm ? 'Cancel' : 'New Test'}
              </button>
            </div>

            {patientTests.length === 0 && !showForm && (
              <p style={{ color: '#A0AEC0', fontSize: 14 }}>No tests recorded.</p>
            )}

            {patientTests.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Reason</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Ordered By</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Result</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...patientTests].reverse().map((t) => {
                      const result = getOverallResult(t.substances)
                      const isExpanded = expandedTest === t.id

                      return (
                        <React.Fragment key={t.id}>
                          <tr style={{ borderBottom: '1px solid #EDF2F7', background: result.status === 'Positive' ? '#FFF5F5' : 'transparent' }}>
                            <td style={{ padding: '8px 10px' }}>{t.date}</td>
                            <td style={{ padding: '8px 10px' }}>{t.reason}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{t.orderedBy}</td>
                            <td style={{ padding: '8px 10px' }}>
                              <span style={resultBadgeStyle(result.status)}>
                                {result.status === 'Positive'
                                  ? `Positive (${result.positives.join(', ')})`
                                  : 'Clean'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <button
                                onClick={() => setExpandedTest(isExpanded ? null : t.id)}
                                style={{
                                  padding: '4px 12px',
                                  borderRadius: 6,
                                  border: '1px solid #CBD5E0',
                                  background: '#fff',
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  color: '#4A5568',
                                  fontWeight: 600,
                                }}
                              >
                                {isExpanded ? 'Hide' : 'Expand'}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr style={{ background: '#F7FAFC' }}>
                              <td colSpan={5} style={{ padding: '12px 20px' }}>
                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                  {SUBSTANCES.map((s) => (
                                    <div
                                      key={s}
                                      style={{
                                        padding: '6px 14px',
                                        borderRadius: 8,
                                        border: `1px solid ${t.substances[s] === 'Positive' ? '#FED7D7' : '#C6F6D5'}`,
                                        background: t.substances[s] === 'Positive' ? '#FFF5F5' : '#F0FFF4',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: t.substances[s] === 'Positive' ? '#E53E3E' : '#38A169',
                                      }}
                                    >
                                      {s}: {t.substances[s]}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* New Test Form */}
          {showForm && (
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
                New UDS — {selectedPatient}
              </h2>
              <p style={{ fontSize: 13, color: '#718096', margin: '0 0 20px' }}>
                Record urine drug screen results. Date auto-set to today ({TODAY}).
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {/* Reason */}
                <div>
                  <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                    Reason for Test
                  </label>
                  <select
                    value={form.reason}
                    onChange={(e) => updateForm('reason', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E0',
                      fontSize: 14,
                      width: '100%',
                      background: '#fff',
                    }}
                  >
                    <option value="">-- Select Reason --</option>
                    {TEST_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Ordered By */}
                <div>
                  <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                    Ordered By
                  </label>
                  <select
                    value={form.orderedBy}
                    onChange={(e) => updateForm('orderedBy', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E0',
                      fontSize: 14,
                      width: '100%',
                      background: '#fff',
                    }}
                  >
                    <option value="">-- Select Staff --</option>
                    {STAFF_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Substance Results */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2D3748', margin: '0 0 16px', borderBottom: '2px solid #E2E8F0', paddingBottom: 8 }}>
                  Substance Results
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {SUBSTANCES.map((substance) => (
                    <div
                      key={substance}
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        border: `1px solid ${form.substances[substance] === 'Positive' ? '#FED7D7' : '#E2E8F0'}`,
                        background: form.substances[substance] === 'Positive' ? '#FFF5F5' : '#FAFAFA',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#2D3748' }}>{substance}</span>
                      <select
                        value={form.substances[substance]}
                        onChange={(e) => updateSubstance(substance, e.target.value)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E0',
                          fontSize: 14,
                          width: 140,
                          background: '#fff',
                          color: form.substances[substance] === 'Positive' ? '#E53E3E' : '#38A169',
                          fontWeight: 600,
                        }}
                      >
                        <option value="Negative">Negative</option>
                        <option value="Positive">Positive</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Result Preview */}
              <div
                style={{
                  padding: 16,
                  marginBottom: 20,
                  borderRadius: 10,
                  background: isFormPositive ? '#FFF5F5' : '#F0FFF4',
                  border: `1px solid ${isFormPositive ? '#FED7D7' : '#C6F6D5'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isFormPositive ? 12 : 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#2D3748' }}>Overall Result:</span>
                  <span style={resultBadgeStyle(formResult.status)}>
                    {formResult.status === 'Positive'
                      ? `Positive (${formResult.positives.join(', ')})`
                      : 'Clean'}
                  </span>
                </div>
                {isFormPositive && (
                  <>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#E53E3E', margin: '0 0 8px' }}>
                      Clinical Action Required on Submission
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                      {POSITIVE_ACTIONS.map((a, i) => (
                        <li key={i} style={{ marginBottom: 4, color: '#2D3748' }}>{a}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleSubmit}
                  disabled={!form.reason || !form.orderedBy}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: (!form.reason || !form.orderedBy) ? '#CBD5E0' : '#2B6CB0',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: (!form.reason || !form.orderedBy) ? 'not-allowed' : 'pointer',
                  }}
                >
                  Submit UDS Result
                </button>
                <button
                  onClick={() => { setShowForm(false); resetForm() }}
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
        </>
      )}
    </div>
  )
}
