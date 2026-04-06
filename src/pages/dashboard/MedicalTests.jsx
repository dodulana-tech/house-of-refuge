import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Pre-Admission Medical Tests — Treatment Protocol Section 4.8
  9 mandatory tests within 48 hours of admission.
  NIDA Principle 13, ASAM Dimension 2, WHO mhGAP LMIC.
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

const ADMISSION_DATES = {
  CO: '2026-03-06',
  AN: '2026-02-18',
  KA: '2026-01-10',
  IM: '2026-03-21',
}

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
    key: 'hiv',
    name: 'HIV/AIDS Screening',
    rationale: 'NIDA Principle 13. HIV-positive clients NOT excluded.',
    statusOptions: ['Pending', 'Ordered', 'Completed (Negative)', 'Completed (Positive)', 'Completed (Inconclusive)'],
    flagStatuses: { 'Completed (Positive)': 'Link to ART services' },
  },
  {
    key: 'hepatitis',
    name: 'Hepatitis A & B Serology',
    rationale: 'NIDA Principle 13',
    statusOptions: ['Pending', 'Ordered', 'Completed (Negative)', 'Completed (Positive-A)', 'Completed (Positive-B)', 'Completed (Positive-Both)', 'Completed (Immune)'],
    flagStatuses: {
      'Completed (Positive-A)': 'Immunisation/treatment referral',
      'Completed (Positive-B)': 'Immunisation/treatment referral',
      'Completed (Positive-Both)': 'Immunisation/treatment referral',
    },
  },
  {
    key: 'uds',
    name: 'Urine Drug Screen (UDS)',
    rationale: 'NIDA Principle 12, baseline for detox planning',
    statusOptions: ['Pending', 'Ordered', 'Completed'],
    flagStatuses: {},
    hasSubstanceSelect: true,
  },
  {
    key: 'fbc',
    name: 'Full Blood Count (FBC)',
    rationale: 'ASAM Dimension 2',
    statusOptions: ['Pending', 'Ordered', 'Completed (Normal)', 'Completed (Abnormal)'],
    flagStatuses: { 'Completed (Abnormal)': 'Flag for doctor review' },
  },
  {
    key: 'lfts',
    name: 'Liver Function Tests (LFTs)',
    rationale: 'ASAM Clinical Practice Guideline',
    statusOptions: ['Pending', 'Ordered', 'Completed (Normal)', 'Completed (Elevated)', 'Completed (Significantly Elevated)'],
    flagStatuses: {
      'Completed (Elevated)': 'Medication safety flag — critical for alcohol-dependent clients',
      'Completed (Significantly Elevated)': 'Medication safety flag — critical for alcohol-dependent clients',
    },
  },
  {
    key: 'malaria',
    name: 'Malaria Parasite Smear',
    rationale: 'Nigerian clinical context, WHO mhGAP LMIC',
    statusOptions: ['Pending', 'Ordered', 'Completed (Negative)', 'Completed (Positive)'],
    flagStatuses: { 'Completed (Positive)': 'Treat before/during detox (confounding factor)' },
  },
  {
    key: 'widal',
    name: 'Widal Test',
    rationale: 'Nigerian clinical context',
    statusOptions: ['Pending', 'Ordered', 'Completed (Negative)', 'Completed (Positive)'],
    flagStatuses: { 'Completed (Positive)': 'Typhoid treatment required' },
  },
  {
    key: 'cxr',
    name: 'Chest X-Ray (CXR)',
    rationale: 'NIDA Principle 13, WHO TB screening',
    statusOptions: ['Pending', 'Ordered', 'Completed (Normal)', 'Completed (Abnormal)'],
    flagStatuses: { 'Completed (Abnormal)': 'TB screening, pulmonary assessment required' },
  },
  {
    key: 'glucose',
    name: 'Blood Glucose (Random)',
    rationale: 'ASAM Dimension 2',
    statusOptions: ['Pending', 'Ordered', 'Completed (Normal)', 'Completed (Low)', 'Completed (High)'],
    flagStatuses: {
      'Completed (Low)': 'Nutritional management required',
      'Completed (High)': 'Diabetes assessment required',
    },
  },
]

const INITIAL_TESTS = {
  CO: {
    hiv: { status: 'Completed (Negative)', dateOrdered: '2026-03-06', dateCompleted: '2026-03-07', orderedBy: 'FA', substances: [] },
    hepatitis: { status: 'Completed (Immune)', dateOrdered: '2026-03-06', dateCompleted: '2026-03-07', orderedBy: 'FA', substances: [] },
    uds: { status: 'Completed', dateOrdered: '2026-03-06', dateCompleted: '2026-03-06', orderedBy: 'FA', substances: ['Alcohol', 'Cannabis'] },
    fbc: { status: 'Completed (Normal)', dateOrdered: '2026-03-06', dateCompleted: '2026-03-07', orderedBy: 'FA', substances: [] },
    lfts: { status: 'Completed (Elevated)', dateOrdered: '2026-03-06', dateCompleted: '2026-03-07', orderedBy: 'FA', substances: [] },
    malaria: { status: 'Completed (Negative)', dateOrdered: '2026-03-06', dateCompleted: '2026-03-07', orderedBy: 'FA', substances: [] },
    widal: { status: 'Completed (Negative)', dateOrdered: '2026-03-06', dateCompleted: '2026-03-07', orderedBy: 'FA', substances: [] },
    cxr: { status: 'Completed (Normal)', dateOrdered: '2026-03-06', dateCompleted: '2026-03-08', orderedBy: 'FA', substances: [] },
    glucose: { status: 'Completed (Normal)', dateOrdered: '2026-03-06', dateCompleted: '2026-03-07', orderedBy: 'FA', substances: [] },
  },
  AN: {
    hiv: { status: 'Completed (Negative)', dateOrdered: '2026-02-18', dateCompleted: '2026-02-19', orderedBy: 'FA', substances: [] },
    hepatitis: { status: 'Completed (Positive-B)', dateOrdered: '2026-02-18', dateCompleted: '2026-02-19', orderedBy: 'FA', substances: [] },
    uds: { status: 'Completed', dateOrdered: '2026-02-18', dateCompleted: '2026-02-18', orderedBy: 'FA', substances: ['Opioids', 'Benzodiazepines'] },
    fbc: { status: 'Completed (Normal)', dateOrdered: '2026-02-18', dateCompleted: '2026-02-19', orderedBy: 'HM', substances: [] },
    lfts: { status: 'Completed (Normal)', dateOrdered: '2026-02-18', dateCompleted: '2026-02-19', orderedBy: 'HM', substances: [] },
    malaria: { status: 'Completed (Negative)', dateOrdered: '2026-02-18', dateCompleted: '2026-02-19', orderedBy: 'HM', substances: [] },
    widal: { status: 'Pending', dateOrdered: '', dateCompleted: '', orderedBy: '', substances: [] },
    cxr: { status: 'Ordered', dateOrdered: '2026-02-18', dateCompleted: '', orderedBy: 'FA', substances: [] },
    glucose: { status: 'Completed (Normal)', dateOrdered: '2026-02-18', dateCompleted: '2026-02-19', orderedBy: 'HM', substances: [] },
  },
  KA: {
    hiv: { status: 'Completed (Negative)', dateOrdered: '2026-01-10', dateCompleted: '2026-01-11', orderedBy: 'FA', substances: [] },
    hepatitis: { status: 'Completed (Negative)', dateOrdered: '2026-01-10', dateCompleted: '2026-01-11', orderedBy: 'FA', substances: [] },
    uds: { status: 'Completed', dateOrdered: '2026-01-10', dateCompleted: '2026-01-10', orderedBy: 'FA', substances: ['Cannabis'] },
    fbc: { status: 'Completed (Normal)', dateOrdered: '2026-01-10', dateCompleted: '2026-01-11', orderedBy: 'HM', substances: [] },
    lfts: { status: 'Completed (Normal)', dateOrdered: '2026-01-10', dateCompleted: '2026-01-11', orderedBy: 'HM', substances: [] },
    malaria: { status: 'Completed (Positive)', dateOrdered: '2026-01-10', dateCompleted: '2026-01-11', orderedBy: 'HM', substances: [] },
    widal: { status: 'Completed (Negative)', dateOrdered: '2026-01-10', dateCompleted: '2026-01-11', orderedBy: 'HM', substances: [] },
    cxr: { status: 'Completed (Normal)', dateOrdered: '2026-01-10', dateCompleted: '2026-01-12', orderedBy: 'FA', substances: [] },
    glucose: { status: 'Completed (Normal)', dateOrdered: '2026-01-10', dateCompleted: '2026-01-11', orderedBy: 'HM', substances: [] },
  },
  IM: {
    hiv: { status: 'Completed (Positive)', dateOrdered: '2026-03-21', dateCompleted: '2026-03-22', orderedBy: 'FA', substances: [] },
    hepatitis: { status: 'Completed (Negative)', dateOrdered: '2026-03-21', dateCompleted: '2026-03-22', orderedBy: 'FA', substances: [] },
    uds: { status: 'Completed', dateOrdered: '2026-03-21', dateCompleted: '2026-03-21', orderedBy: 'FA', substances: ['Cocaine', 'Amphetamines', 'Cannabis'] },
    fbc: { status: 'Ordered', dateOrdered: '2026-03-21', dateCompleted: '', orderedBy: 'HM', substances: [] },
    lfts: { status: 'Ordered', dateOrdered: '2026-03-21', dateCompleted: '', orderedBy: 'HM', substances: [] },
    malaria: { status: 'Completed (Positive)', dateOrdered: '2026-03-21', dateCompleted: '2026-03-22', orderedBy: 'HM', substances: [] },
    widal: { status: 'Pending', dateOrdered: '', dateCompleted: '', orderedBy: '', substances: [] },
    cxr: { status: 'Pending', dateOrdered: '', dateCompleted: '', orderedBy: '', substances: [] },
    glucose: { status: 'Completed (Normal)', dateOrdered: '2026-03-21', dateCompleted: '2026-03-22', orderedBy: 'HM', substances: [] },
  },
}

function isCompleted(status) {
  return status.startsWith('Completed')
}

function getCompletionCount(patientTests) {
  return TEST_DEFINITIONS.filter((t) => isCompleted(patientTests[t.key]?.status || '')).length
}

function getDeadlineStatus(admissionDate) {
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
    return { text: `${count}/9 tests complete — ${pending} pending`, color: '#DD6B20', bg: '#FFFAF0', border: '#FEEBC8', deadline }
  }
  return { text: 'Medical panel not started — 48-hour deadline', color: '#E53E3E', bg: '#FFF5F5', border: '#FED7D7' }
}

function getFlagForStatus(testDef, status) {
  return testDef.flagStatuses[status] || null
}

export default function MedicalTests() {
  const { user } = useAuth()
  const [selectedPatient, setSelectedPatient] = useState('CO')
  const [tests, setTests] = useState(INITIAL_TESTS)

  const patientTests = tests[selectedPatient] || {}
  const admissionDate = ADMISSION_DATES[selectedPatient]
  const completionCount = getCompletionCount(patientTests)
  const badge = getCompletionBadge(completionCount, admissionDate)
  const deadlineStatus = getDeadlineStatus(admissionDate)
  const progressPct = Math.round((completionCount / 9) * 100)

  const updateTestField = (testKey, field, value) => {
    setTests((prev) => ({
      ...prev,
      [selectedPatient]: {
        ...prev[selectedPatient],
        [testKey]: {
          ...prev[selectedPatient][testKey],
          [field]: value,
        },
      },
    }))
  }

  const toggleSubstance = (testKey, substance) => {
    setTests((prev) => {
      const current = prev[selectedPatient][testKey].substances || []
      let updated
      if (substance === 'None detected') {
        updated = current.includes('None detected') ? [] : ['None detected']
      } else {
        const without = current.filter((s) => s !== 'None detected')
        updated = without.includes(substance)
          ? without.filter((s) => s !== substance)
          : [...without, substance]
      }
      return {
        ...prev,
        [selectedPatient]: {
          ...prev[selectedPatient],
          [testKey]: {
            ...prev[selectedPatient][testKey],
            substances: updated,
          },
        },
      }
    })
  }

  // Collect all active flags
  const activeFlags = TEST_DEFINITIONS
    .map((t) => {
      const status = patientTests[t.key]?.status || 'Pending'
      const flag = getFlagForStatus(t, status)
      return flag ? { testName: t.name, flag } : null
    })
    .filter(Boolean)

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
            {PATIENTS.map((p) => (
              <option key={p.id} value={p.initials}>{p.initials}</option>
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
            Completion Status — {selectedPatient}
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
                            const start = new Date(admissionDate)
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
                            const start = new Date(admissionDate)
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
          All 9 tests must be completed within 48 hours of admission per Treatment Protocol Section 4.8.
        </p>
      </div>
    </div>
  )
}
