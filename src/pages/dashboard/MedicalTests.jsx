import React, { useState, useEffect, useCallback } from 'react'
import { getPatients, getLabTests, addLabTest, updateLabTest, isSupabaseReady } from '../../utils/supabase'
import { initialsFromName } from '../../utils/patients'

/*
  Pre-Admission Medical Tests — Treatment Protocol Section 4.8
  9 mandatory tests within 48 hours of admission. Live `lab_tests` table
  (one row per patient+panel; rich status/dates/substances in results JSONB).
  NIDA Principle 13, ASAM Dimension 2, WHO mhGAP LMIC.
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

const UDS_SUBSTANCES = [
  'Cannabis',
  'Opioids',
  'Cocaine',
  'Amphetamines',
  'Benzodiazepines',
  'Alcohol',
  'None detected',
]

const TEST_DEFINITIONS = [
  {
    key: 'fbc',
    name: 'Full Blood Count (CBC)',
    rationale: 'ASAM Dimension 2',
    statusOptions: ['Pending', 'Ordered', 'Completed (Normal)', 'Completed (Abnormal)'],
    flagStatuses: { 'Completed (Abnormal)': 'Flag for doctor review' },
  },
  {
    key: 'fbs',
    name: 'Fasting Blood Sugar (FBS)',
    rationale: 'ASAM Dimension 2 — baseline glucose / diabetes screen',
    statusOptions: ['Pending', 'Ordered', 'Completed (Normal)', 'Completed (Low)', 'Completed (High)'],
    flagStatuses: {
      'Completed (Low)': 'Nutritional management required',
      'Completed (High)': 'Diabetes assessment required',
    },
  },
  {
    key: 'lft',
    name: 'Liver Function Test',
    rationale: 'ASAM Clinical Practice Guideline — critical for alcohol-dependent clients',
    statusOptions: ['Pending', 'Ordered', 'Completed (Normal)', 'Completed (Elevated)', 'Completed (Significantly Elevated)'],
    flagStatuses: {
      'Completed (Elevated)': 'Medication safety flag — critical for alcohol-dependent clients',
      'Completed (Significantly Elevated)': 'Medication safety flag — critical for alcohol-dependent clients',
    },
  },
  {
    key: 'toxicology',
    name: 'Toxicology Screen (Drug of Abuse)',
    rationale: 'NIDA Principle 12 — baseline for detox planning',
    statusOptions: ['Pending', 'Ordered', 'Completed'],
    flagStatuses: {},
    hasSubstanceSelect: true,
  },
  {
    key: 'bloodAlcohol',
    name: 'Blood Alcohol',
    rationale: 'Detox planning — confirms alcohol presence + level',
    statusOptions: ['Pending', 'Ordered', 'Completed (Negative)', 'Completed (Positive)'],
    flagStatuses: { 'Completed (Positive)': 'Confirm alcohol-related detox protocol' },
  },
  {
    key: 'urinalysis',
    name: 'Urinalysis',
    rationale: 'General health screen — renal function, infection, hydration',
    statusOptions: ['Pending', 'Ordered', 'Completed (Normal)', 'Completed (Abnormal)'],
    flagStatuses: { 'Completed (Abnormal)': 'Flag for doctor review' },
  },
  {
    key: 'rft',
    name: 'Renal Function Test',
    rationale: 'Medication safety — dose adjustment for impaired kidney function',
    statusOptions: ['Pending', 'Ordered', 'Completed (Normal)', 'Completed (Impaired)'],
    flagStatuses: { 'Completed (Impaired)': 'Medication dosing adjustment required' },
  },
  {
    key: 'hepB',
    name: 'Serology (Hepatitis B)',
    rationale: 'NIDA Principle 13 — infectious disease screen',
    statusOptions: ['Pending', 'Ordered', 'Completed (Negative)', 'Completed (Positive)', 'Completed (Immune)'],
    flagStatuses: { 'Completed (Positive)': 'Immunisation/treatment referral' },
  },
  {
    key: 'hepC',
    name: 'Serology (Hepatitis C)',
    rationale: 'NIDA Principle 13 — infectious disease screen',
    statusOptions: ['Pending', 'Ordered', 'Completed (Negative)', 'Completed (Positive)'],
    flagStatuses: { 'Completed (Positive)': 'Treatment referral' },
  },
  {
    key: 'hiv',
    name: 'Serology (HIV)',
    rationale: 'NIDA Principle 13. HIV-positive clients NOT excluded.',
    statusOptions: ['Pending', 'Ordered', 'Completed (Negative)', 'Completed (Positive)', 'Completed (Inconclusive)'],
    flagStatuses: { 'Completed (Positive)': 'Link to ART services' },
  },
]

const EMPTY_TEST = { status: 'Pending', dateOrdered: '', dateCompleted: '', orderedBy: '', substances: [] }

// Map a rich status label to the constrained lab_tests.status column value.
function statusColumn(label) {
  if ((label || '').startsWith('Completed')) return 'resulted'
  if (label === 'Ordered') return 'ordered'
  return 'pending'
}

function isCompleted(status) {
  return status.startsWith('Completed')
}

function getCompletionCount(patientTests) {
  return TEST_DEFINITIONS.filter((t) => isCompleted(patientTests[t.key]?.status || '')).length
}

function getDeadlineStatus(admissionDate) {
  if (!admissionDate) return { label: 'N/A', color: '#718096', bg: '#F7FAFC', border: '#E2E8F0', hours: null }
  const admission = new Date(admissionDate)
  const deadline = new Date(admission.getTime() + 48 * 60 * 60 * 1000)
  const now = new Date()
  const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursRemaining <= 0) return { label: 'OVERDUE', color: '#E53E3E', bg: '#FFF5F5', border: '#FED7D7', hours: hoursRemaining }
  if (hoursRemaining <= 12) return { label: `${Math.ceil(hoursRemaining)}h remaining`, color: '#DD6B20', bg: '#FFFAF0', border: '#FEEBC8', hours: hoursRemaining }
  return { label: `${Math.ceil(hoursRemaining)}h remaining`, color: '#38A169', bg: '#F0FFF4', border: '#C6F6D5', hours: hoursRemaining }
}

function getCompletionBadge(count, admissionDate) {
  if (count === 9) {
    return { text: 'Medical Panel Complete — Ready for Treatment Planning', color: '#38A169', bg: '#F0FFF4', border: '#C6F6D5' }
  }
  if (count > 0) {
    const pending = 9 - count
    const deadline = getDeadlineStatus(admissionDate)
    return { text: `${count}/10 tests complete — ${pending} pending`, color: '#DD6B20', bg: '#FFFAF0', border: '#FEEBC8', deadline }
  }
  return { text: 'Medical panel not started — 48-hour deadline', color: '#E53E3E', bg: '#FFF5F5', border: '#FED7D7' }
}

function getFlagForStatus(testDef, status) {
  return testDef.flagStatuses[status] || null
}

export default function MedicalTests() {
  const [patients, setPatients] = useState([]) // [{id, initials, admittedAt}]
  const [selectedPatient, setSelectedPatient] = useState('') // patient_id
  const [tests, setTests] = useState({}) // { [key]: testData }
  const [rowIds, setRowIds] = useState({}) // { [key]: lab_test id }
  const [loading, setLoading] = useState(true)

  const loadPatientTests = useCallback(async (patientId) => {
    if (!patientId || !isSupabaseReady()) { setTests({}); setRowIds({}); return }
    const { data: rows } = await getLabTests(patientId)
    const nextTests = {}
    const nextRows = {}
    for (const r of (rows || [])) {
      const key = r.panel
      if (!TEST_DEFINITIONS.some((t) => t.key === key)) continue
      if (nextRows[key]) continue // keep first (latest by ordered_date desc)
      const res = r.results || {}
      nextTests[key] = {
        status: res.status || 'Pending',
        dateOrdered: res.dateOrdered || r.ordered_date || '',
        dateCompleted: res.dateCompleted || r.result_date || '',
        orderedBy: res.orderedBy || r.ordered_by_code || '',
        substances: res.substances || [],
      }
      nextRows[key] = r.id
    }
    setTests(nextTests)
    setRowIds(nextRows)
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!isSupabaseReady()) { setLoading(false); return }
      const { data: rows } = await getPatients()
      const active = (rows || []).filter(p => ['admitted', 'on-pass', 'suspended'].includes(p.status))
      const briefs = active.map(p => ({ id: p.id, initials: initialsFromName(p.full_name), admittedAt: p.admitted_at }))
      setPatients(briefs)
      const first = briefs[0]?.id || ''
      setSelectedPatient(first)
      if (first) await loadPatientTests(first)
      setLoading(false)
    })()
  }, [loadPatientTests])

  const onSelectPatient = async (id) => {
    setSelectedPatient(id)
    await loadPatientTests(id)
  }

  const patientTests = tests
  const admissionDate = patients.find(p => p.id === selectedPatient)?.admittedAt
    ? String(patients.find(p => p.id === selectedPatient).admittedAt).slice(0, 10)
    : null
  const completionCount = getCompletionCount(patientTests)
  const badge = getCompletionBadge(completionCount, admissionDate)
  const deadlineStatus = getDeadlineStatus(admissionDate)
  const progressPct = Math.round((completionCount / 9) * 100)

  // Persist a test row (insert or update) after local state change.
  const persistTest = async (testKey, testData) => {
    if (!isSupabaseReady() || !selectedPatient) return
    const payload = {
      patient_id: selectedPatient,
      panel: testKey,
      status: statusColumn(testData.status),
      ordered_date: testData.dateOrdered || null,
      result_date: testData.dateCompleted || null,
      ordered_by_code: testData.orderedBy || null,
      results: { ...testData },
    }
    const existing = rowIds[testKey]
    if (existing) {
      const { error } = await updateLabTest(existing, payload)
      if (error) alert(`Could not save test: ${error.message}`)
    } else {
      const { data, error } = await addLabTest(payload)
      if (error) { alert(`Could not save test: ${error.message}`); return }
      if (data?.id) setRowIds((prev) => ({ ...prev, [testKey]: data.id }))
    }
  }

  const updateTestField = (testKey, field, value) => {
    const current = tests[testKey] || EMPTY_TEST
    const updated = { ...current, [field]: value }
    setTests((prev) => ({ ...prev, [testKey]: updated }))
    persistTest(testKey, updated)
  }

  const toggleSubstance = (testKey, substance) => {
    const current = (tests[testKey] || EMPTY_TEST).substances || []
    let list
    if (substance === 'None detected') {
      list = current.includes('None detected') ? [] : ['None detected']
    } else {
      const without = current.filter((s) => s !== 'None detected')
      list = without.includes(substance) ? without.filter((s) => s !== substance) : [...without, substance]
    }
    const updated = { ...(tests[testKey] || EMPTY_TEST), substances: list }
    setTests((prev) => ({ ...prev, [testKey]: updated }))
    persistTest(testKey, updated)
  }

  // Collect all active flags
  const activeFlags = TEST_DEFINITIONS
    .map((t) => {
      const status = patientTests[t.key]?.status || 'Pending'
      const flag = getFlagForStatus(t, status)
      return flag ? { testName: t.name, flag } : null
    })
    .filter(Boolean)

  const selectedInitials = patients.find(p => p.id === selectedPatient)?.initials || ''

  if (!loading && patients.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>Pre-Admission Medical Tests</h1>
        <p style={{ color: '#718096', fontSize: 14, marginTop: 12 }}>No active patients on record yet.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            Pre-Admission Medical Tests
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            Treatment Protocol Section 4.8 — 9 mandatory tests within 48 hours of admission
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>Patient:</label>
          <select
            value={selectedPatient}
            onChange={(e) => onSelectPatient(e.target.value)}
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
        </div>
      </div>

      {/* Completion Status Card with Progress Bar */}
      <div
        className="card"
        style={{
          padding: 20,
          marginBottom: 20,
          borderRadius: 12,
          border: `1px solid ${badge.border}`,
          background: badge.bg,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: 0 }}>
            Completion Status — {selectedInitials}
          </h2>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
              color: badge.color,
              background: '#fff',
              border: `1px solid ${badge.border}`,
            }}
          >
            {completionCount}/9
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{ background: '#E2E8F0', borderRadius: 8, height: 12, marginBottom: 12, overflow: 'hidden' }}>
          <div
            style={{
              width: `${progressPct}%`,
              height: '100%',
              borderRadius: 8,
              background: completionCount === 9 ? '#38A169' : completionCount > 0 ? '#DD6B20' : '#E53E3E',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div style={{ fontSize: 14, fontWeight: 600, color: badge.color, marginBottom: 8 }}>
          {badge.text}
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#4A5568' }}>
          <span><strong>Admission Date:</strong> {admissionDate}</span>
          <span>
            <strong>48-Hour Deadline:</strong>{' '}
            <span
              style={{
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                color: deadlineStatus.color,
                background: deadlineStatus.bg,
                border: `1px solid ${deadlineStatus.border}`,
              }}
            >
              {deadlineStatus.label}
            </span>
          </span>
        </div>
      </div>

      {/* Alert Flags for Positive/Abnormal Results */}
      {activeFlags.length > 0 && (
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
            Clinical Flags — Follow-Up Required
          </h3>
          {activeFlags.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                marginBottom: 8,
                borderRadius: 8,
                background: '#fff',
                border: '1px solid #FED7D7',
              }}
            >
              <span style={{ fontSize: 18, color: '#E53E3E' }}>!</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#2D3748' }}>{f.testName}:</span>
              <span style={{ fontSize: 14, color: '#E53E3E', fontWeight: 600 }}>{f.flag}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tests Grid/Table */}
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
          Medical Panel — 9 Mandatory Tests
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600, minWidth: 180 }}>Test</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600, minWidth: 200 }}>Status</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600, minWidth: 140 }}>Date Ordered</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600, minWidth: 140 }}>Date Completed</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600, minWidth: 160 }}>Ordered By</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600, minWidth: 140 }}>Flag</th>
              </tr>
            </thead>
            <tbody>
              {TEST_DEFINITIONS.map((testDef) => {
                const testData = patientTests[testDef.key] || { status: 'Pending', dateOrdered: '', dateCompleted: '', orderedBy: '', substances: [] }
                const completed = isCompleted(testData.status)
                const flag = getFlagForStatus(testDef, testData.status)

                return (
                  <React.Fragment key={testDef.key}>
                    <tr style={{ borderBottom: '1px solid #EDF2F7', background: flag ? '#FFF5F5' : 'transparent' }}>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontWeight: 600, color: '#2D3748' }}>{testDef.name}</div>
                        <div style={{ fontSize: 11, color: '#A0AEC0', marginTop: 2 }}>{testDef.rationale}</div>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <select
                          value={testData.status}
                          onChange={(e) => updateTestField(testDef.key, 'status', e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E0',
                            fontSize: 13,
                            width: '100%',
                            background: completed ? '#F0FFF4' : testData.status === 'Ordered' ? '#EBF8FF' : '#fff',
                            color: completed ? '#38A169' : testData.status === 'Ordered' ? '#2B6CB0' : '#4A5568',
                            fontWeight: 600,
                          }}
                        >
                          {testDef.statusOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <select
                          value={testData.dateOrdered}
                          onChange={(e) => updateTestField(testDef.key, 'dateOrdered', e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E0',
                            fontSize: 13,
                            width: '100%',
                            background: '#fff',
                          }}
                        >
                          <option value="">-- Select --</option>
                          {(() => {
                            const dates = []
                            const start = new Date(admissionDate || Date.now())
                            for (let i = 0; i < 7; i++) {
                              const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
                              dates.push(d.toISOString().split('T')[0])
                            }
                            return dates.map((d) => <option key={d} value={d}>{d}</option>)
                          })()}
                        </select>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <select
                          value={testData.dateCompleted}
                          onChange={(e) => updateTestField(testDef.key, 'dateCompleted', e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E0',
                            fontSize: 13,
                            width: '100%',
                            background: '#fff',
                          }}
                        >
                          <option value="">-- Select --</option>
                          {(() => {
                            const dates = []
                            const start = new Date(admissionDate || Date.now())
                            for (let i = 0; i < 14; i++) {
                              const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
                              dates.push(d.toISOString().split('T')[0])
                            }
                            return dates.map((d) => <option key={d} value={d}>{d}</option>)
                          })()}
                        </select>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <select
                          value={testData.orderedBy}
                          onChange={(e) => updateTestField(testDef.key, 'orderedBy', e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E0',
                            fontSize: 13,
                            width: '100%',
                            background: '#fff',
                          }}
                        >
                          <option value="">-- Select --</option>
                          {STAFF_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        {flag ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#E53E3E',
                              background: '#FFF5F5',
                              border: '1px solid #FED7D7',
                            }}
                          >
                            {flag}
                          </span>
                        ) : completed ? (
                          <span style={{ fontSize: 12, color: '#38A169', fontWeight: 600 }}>OK</span>
                        ) : (
                          <span style={{ fontSize: 12, color: '#A0AEC0' }}>--</span>
                        )}
                      </td>
                    </tr>

                    {/* UDS Substance Multi-Select */}
                    {testDef.hasSubstanceSelect && testData.status === 'Completed' && (
                      <tr style={{ borderBottom: '1px solid #EDF2F7', background: '#F7FAFC' }}>
                        <td colSpan={6} style={{ padding: '10px 10px 10px 30px' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#2D3748', marginBottom: 8 }}>
                            Substances Detected:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {UDS_SUBSTANCES.map((substance) => {
                              const checked = (testData.substances || []).includes(substance)
                              return (
                                <label
                                  key={substance}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '4px 12px',
                                    borderRadius: 8,
                                    border: `1px solid ${checked ? (substance === 'None detected' ? '#C6F6D5' : '#FED7D7') : '#E2E8F0'}`,
                                    background: checked ? (substance === 'None detected' ? '#F0FFF4' : '#FFF5F5') : '#fff',
                                    fontSize: 13,
                                    fontWeight: checked ? 600 : 400,
                                    color: checked ? (substance === 'None detected' ? '#38A169' : '#E53E3E') : '#4A5568',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleSubstance(testDef.key, substance)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  {substance}
                                </label>
                              )
                            })}
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
      </div>

      {/* Clinical Rationale Footer */}
      <div
        className="card"
        style={{
          padding: 16,
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          background: '#F7FAFC',
        }}
      >
        <p style={{ fontSize: 12, color: '#718096', margin: 0, lineHeight: 1.6 }}>
          <strong>Clinical Basis:</strong> NIDA Principle 13 (medically assisted detoxification is only the first stage of addiction treatment);
          ASAM Dimension 2 (biomedical conditions and complications);
          ASAM Clinical Practice Guideline (liver function monitoring for pharmacotherapy safety);
          WHO mhGAP LMIC (malaria co-morbidity in low-and-middle-income country clinical contexts);
          WHO TB Screening Guidelines (chest X-ray for at-risk populations).
          All 10 tests must be completed within 48 hours of admission per Treatment Protocol Section 4.8.
        </p>
      </div>
    </div>
  )
}
