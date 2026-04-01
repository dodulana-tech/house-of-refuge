import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Risk Assessment — Columbia Suicide Severity Rating Scale (C-SSRS) +
  general safety screening per SOP 2.3. Initials only (HIPAA).
  All fields are selects/checkboxes — zero free text.
*/

const PATIENTS = [
  { id: 'P001', initials: 'CO' },
  { id: 'P002', initials: 'AN' },
  { id: 'P003', initials: 'KA' },
  { id: 'P004', initials: 'IM' },
]

const CSSRS_QUESTIONS = [
  {
    id: 1,
    label: 'Wish to be dead',
    question: 'Have you wished you were dead or wished you could go to sleep and not wake up?',
    severityGroup: 'low',
  },
  {
    id: 2,
    label: 'Suicidal thoughts',
    question: 'Have you actually had any thoughts of killing yourself?',
    severityGroup: 'low',
  },
  {
    id: 3,
    label: 'Suicidal thoughts with method',
    question: 'Have you been thinking about how you might do this?',
    severityGroup: 'moderate',
  },
  {
    id: 4,
    label: 'Suicidal intent',
    question: 'Have you had these thoughts and had some intention of acting on them?',
    severityGroup: 'moderate',
  },
  {
    id: 5,
    label: 'Suicidal intent with plan',
    question: 'Have you started to work out or worked out the details of how to kill yourself? Do you intend to carry out this plan?',
    severityGroup: 'high',
  },
  {
    id: 6,
    label: 'Suicidal behavior',
    question: 'Have you ever done anything, started to do anything, or prepared to do anything to end your life?',
    severityGroup: 'high',
    hasTimeframe: true,
  },
]

const TIMEFRAME_OPTIONS = ['Lifetime', 'Past 3 months', 'Past month', 'Since last visit']

const PSYCHOSIS_OPTIONS = [
  'None',
  'Auditory hallucinations',
  'Visual hallucinations',
  'Paranoid delusions',
  'Disorganized speech',
  'Bizarre behavior',
]

const SELF_HARM_OPTIONS = ['None reported', 'Historical only', 'Past 3 months', 'Current']

const CLINICAL_ACTIONS = {
  Low: {
    color: '#38A169',
    bg: '#F0FFF4',
    border: '#C6F6D5',
    actions: ['Continue routine monitoring', 'Document in clinical file', 'Reassess at next scheduled check-in'],
  },
  Moderate: {
    color: '#D69E2E',
    bg: '#FFFFF0',
    border: '#FEFCBF',
    actions: [
      'Increase observation frequency',
      'Notify Clinical Lead immediately',
      'Document in clinical file with risk flag',
      'Schedule follow-up assessment within 24 hours',
    ],
  },
  High: {
    color: '#E53E3E',
    bg: '#FFF5F5',
    border: '#FED7D7',
    actions: [
      'Immediate 1-to-1 supervision required',
      'Notify Program Director immediately',
      'Contact family/PFSP',
      'Remove access to potential means',
      'Document as high-risk in clinical file',
    ],
  },
  Critical: {
    color: '#9B2C2C',
    bg: '#FFF5F5',
    border: '#FC8181',
    actions: [
      'EMERGENCY PROTOCOL ACTIVATED',
      'Immediate 1-to-1 supervision — do not leave patient alone',
      'Notify Program Director and Medical Director',
      'Refer to Yaba Psychiatric Hospital or nearest A&E',
      'Contact family/PFSP immediately',
      'Complete incident report',
      'Debrief staff involved within 24 hours',
    ],
  },
}

const STAFF_OPTIONS = [
  { value: 'AI', label: 'AI — Clinical Lead' },
  { value: 'FA', label: 'FA — Nurse' },
  { value: 'PK', label: 'PK — Chaplain' },
  { value: 'SN', label: 'SN — Social Worker' },
  { value: 'MO', label: 'MO — Support Staff' },
  { value: 'TA', label: 'TA — Counsellor' },
  { value: 'HM', label: 'HM — Nurse' },
]

const INITIAL_ASSESSMENTS = {
  CO: [
    {
      id: 1,
      date: '2026-03-08',
      assessor: 'AI',
      q1: 'No', q2: 'No', q3: 'No', q4: 'No', q5: 'No', q6: 'No',
      q6Timeframe: '',
      psychosis: 'None',
      homicidalIdeation: 'No',
      selfHarmHistory: 'None reported',
      riskLevel: 'Low',
    },
    {
      id: 2,
      date: '2026-03-15',
      assessor: 'AI',
      q1: 'Yes', q2: 'No', q3: 'No', q4: 'No', q5: 'No', q6: 'No',
      q6Timeframe: '',
      psychosis: 'None',
      homicidalIdeation: 'No',
      selfHarmHistory: 'None reported',
      riskLevel: 'Low',
    },
    {
      id: 3,
      date: '2026-03-22',
      assessor: 'AI',
      q1: 'No', q2: 'No', q3: 'No', q4: 'No', q5: 'No', q6: 'No',
      q6Timeframe: '',
      psychosis: 'None',
      homicidalIdeation: 'No',
      selfHarmHistory: 'None reported',
      riskLevel: 'Low',
    },
  ],
  AN: [
    {
      id: 4,
      date: '2026-02-20',
      assessor: 'AI',
      q1: 'No', q2: 'No', q3: 'No', q4: 'No', q5: 'No', q6: 'No',
      q6Timeframe: '',
      psychosis: 'None',
      homicidalIdeation: 'No',
      selfHarmHistory: 'Historical only',
      riskLevel: 'Low',
    },
    {
      id: 5,
      date: '2026-03-10',
      assessor: 'AI',
      q1: 'Yes', q2: 'Yes', q3: 'No', q4: 'No', q5: 'No', q6: 'No',
      q6Timeframe: '',
      psychosis: 'None',
      homicidalIdeation: 'No',
      selfHarmHistory: 'Historical only',
      riskLevel: 'Low',
    },
  ],
  KA: [
    {
      id: 6,
      date: '2026-01-15',
      assessor: 'FA',
      q1: 'No', q2: 'No', q3: 'No', q4: 'No', q5: 'No', q6: 'No',
      q6Timeframe: '',
      psychosis: 'None',
      homicidalIdeation: 'No',
      selfHarmHistory: 'None reported',
      riskLevel: 'Low',
    },
  ],
  IM: [
    {
      id: 7,
      date: '2026-03-23',
      assessor: 'AI',
      q1: 'Yes', q2: 'Yes', q3: 'Yes', q4: 'No', q5: 'No', q6: 'No',
      q6Timeframe: '',
      psychosis: 'None',
      homicidalIdeation: 'No',
      selfHarmHistory: 'Past 3 months',
      riskLevel: 'Moderate',
    },
  ],
}

function calculateRiskLevel(form) {
  // Critical: active psychosis with suicidal intent, or q5/q6 Yes with plan
  if (
    (form.q5 === 'Yes' || form.q6 === 'Yes') &&
    (form.psychosis !== 'None' || form.homicidalIdeation === 'Yes')
  ) {
    return 'Critical'
  }
  // High: Q5 or Q6 = Yes
  if (form.q5 === 'Yes' || form.q6 === 'Yes') return 'High'
  // Moderate: Q3 or Q4 = Yes, OR psychosis present, OR homicidal, OR current self-harm
  if (
    form.q3 === 'Yes' ||
    form.q4 === 'Yes' ||
    (form.psychosis && form.psychosis !== 'None') ||
    form.homicidalIdeation === 'Yes' ||
    form.selfHarmHistory === 'Current'
  ) {
    return 'Moderate'
  }
  // Low
  return 'Low'
}

const riskLevelStyle = (level) => {
  const config = CLINICAL_ACTIONS[level] || CLINICAL_ACTIONS.Low
  return {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
    color: config.color,
    background: config.bg,
    border: `1px solid ${config.border}`,
  }
}

export default function RiskAssessment() {
  const { user } = useAuth()
  const [selectedPatient, setSelectedPatient] = useState('CO')
  const [assessments, setAssessments] = useState(INITIAL_ASSESSMENTS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    assessor: '',
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: '',
    q6Timeframe: '',
    psychosis: 'None',
    homicidalIdeation: '',
    selfHarmHistory: 'None reported',
  })

  const patientAssessments = assessments[selectedPatient] || []
  const latestAssessment = patientAssessments.length > 0 ? patientAssessments[patientAssessments.length - 1] : null
  const currentRisk = latestAssessment ? latestAssessment.riskLevel : 'Not assessed'
  const actionConfig = CLINICAL_ACTIONS[currentRisk]

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const resetForm = () => {
    setForm({
      assessor: '',
      q1: '', q2: '', q3: '', q4: '', q5: '', q6: '',
      q6Timeframe: '',
      psychosis: 'None',
      homicidalIdeation: '',
      selfHarmHistory: 'None reported',
    })
  }

  const handleSubmit = () => {
    if (!form.assessor || !form.q1 || !form.q2 || !form.q3 || !form.q4 || !form.q5 || !form.q6 || !form.homicidalIdeation) {
      return
    }
    if (form.q6 === 'Yes' && !form.q6Timeframe) return

    const riskLevel = calculateRiskLevel(form)
    const newAssessment = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      ...form,
      riskLevel,
    }

    setAssessments((prev) => ({
      ...prev,
      [selectedPatient]: [...(prev[selectedPatient] || []), newAssessment],
    }))
    setShowForm(false)
    resetForm()
  }

  const isHighRisk = currentRisk === 'High' || currentRisk === 'Critical'

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            Risk Assessment
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            C-SSRS + Safety Screening (SOP 2.3)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>Patient:</label>
          <select
            value={selectedPatient}
            onChange={(e) => { setSelectedPatient(e.target.value); setShowForm(false) }}
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

      {/* High Risk Alert Banner */}
      {isHighRisk && (
        <div
          style={{
            padding: 16,
            marginBottom: 20,
            borderRadius: 12,
            background: currentRisk === 'Critical' ? '#9B2C2C' : '#E53E3E',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            border: '2px solid ' + (currentRisk === 'Critical' ? '#742A2A' : '#C53030'),
          }}
        >
          <span style={{ fontSize: 24 }}>!</span>
          <span>
            {currentRisk === 'Critical'
              ? 'CRITICAL RISK — EMERGENCY PROTOCOL REQUIRED — Refer to Yaba Psychiatric Hospital or nearest A&E'
              : 'HIGH RISK — Immediate 1-to-1 supervision required — Notify Program Director'}
          </span>
        </div>
      )}

      {/* Current Risk Status */}
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
            Current Risk Status — {selectedPatient}
          </h2>
          <span style={riskLevelStyle(currentRisk)}>{currentRisk}</span>
        </div>

        {latestAssessment && (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#4A5568' }}>
            <span><strong>Last Assessed:</strong> {latestAssessment.date}</span>
            <span><strong>Assessor:</strong> {latestAssessment.assessor}</span>
            <span><strong>C-SSRS Highest Positive:</strong> {
              ['q6', 'q5', 'q4', 'q3', 'q2', 'q1']
                .find((q) => latestAssessment[q] === 'Yes')
                ? `Q${['q6', 'q5', 'q4', 'q3', 'q2', 'q1'].find((q) => latestAssessment[q] === 'Yes').slice(1)}`
                : 'None'
            }</span>
            <span><strong>Psychosis:</strong> {latestAssessment.psychosis}</span>
            <span><strong>Homicidal Ideation:</strong> {latestAssessment.homicidalIdeation}</span>
            <span><strong>Self-Harm History:</strong> {latestAssessment.selfHarmHistory}</span>
          </div>
        )}

        {!latestAssessment && (
          <p style={{ color: '#A0AEC0', fontSize: 14 }}>No assessment on file. Complete initial screening.</p>
        )}
      </div>

      {/* Clinical Action Required */}
      {actionConfig && (
        <div
          className="card"
          style={{
            padding: 20,
            marginBottom: 20,
            borderRadius: 12,
            background: actionConfig.bg,
            border: `1px solid ${actionConfig.border}`,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: actionConfig.color, margin: '0 0 12px' }}>
            Clinical Action Required — {currentRisk} Risk
          </h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {actionConfig.actions.map((action, i) => (
              <li
                key={i}
                style={{
                  fontSize: 14,
                  color: '#2D3748',
                  marginBottom: 6,
                  fontWeight: currentRisk === 'Critical' && i === 0 ? 700 : 400,
                }}
              >
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Assessment History */}
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
            Assessment History
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
            {showForm ? 'Cancel' : 'New Assessment'}
          </button>
        </div>

        {patientAssessments.length === 0 && !showForm && (
          <p style={{ color: '#A0AEC0', fontSize: 14 }}>No assessments recorded.</p>
        )}

        {/* History Table */}
        {patientAssessments.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Assessor</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Q1</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Q2</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Q3</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Q4</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Q5</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Q6</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Psychosis</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>HI</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Self-Harm</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Risk</th>
                </tr>
              </thead>
              <tbody>
                {[...patientAssessments].reverse().map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                    <td style={{ padding: '8px 10px' }}>{a.date}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{a.assessor}</td>
                    {['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].map((q) => (
                      <td
                        key={q}
                        style={{
                          padding: '8px 10px',
                          textAlign: 'center',
                          color: a[q] === 'Yes' ? '#E53E3E' : '#38A169',
                          fontWeight: 600,
                        }}
                      >
                        {a[q]}
                      </td>
                    ))}
                    <td style={{ padding: '8px 10px', fontSize: 12 }}>{a.psychosis}</td>
                    <td
                      style={{
                        padding: '8px 10px',
                        textAlign: 'center',
                        color: a.homicidalIdeation === 'Yes' ? '#E53E3E' : '#38A169',
                        fontWeight: 600,
                      }}
                    >
                      {a.homicidalIdeation}
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 12 }}>{a.selfHarmHistory}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={riskLevelStyle(a.riskLevel)}>{a.riskLevel}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Assessment Form */}
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
            New C-SSRS + Safety Screening — {selectedPatient}
          </h2>
          <p style={{ fontSize: 13, color: '#718096', margin: '0 0 20px' }}>
            Columbia Suicide Severity Rating Scale. All questions require a response.
          </p>

          {/* Assessor */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
              Assessor
            </label>
            <select
              value={form.assessor}
              onChange={(e) => updateForm('assessor', e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E0',
                fontSize: 14,
                width: 280,
                background: '#fff',
              }}
            >
              <option value="">-- Select Assessor --</option>
              {STAFF_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* C-SSRS Questions */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2D3748', margin: '0 0 16px', borderBottom: '2px solid #E2E8F0', paddingBottom: 8 }}>
              C-SSRS Screening Questions
            </h3>
            {CSSRS_QUESTIONS.map((q) => {
              const severityColor =
                q.severityGroup === 'high' ? '#E53E3E' :
                q.severityGroup === 'moderate' ? '#D69E2E' : '#38A169'

              return (
                <div
                  key={q.id}
                  style={{
                    padding: 16,
                    marginBottom: 12,
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    background: form[`q${q.id}`] === 'Yes' ? '#FFF5F5' : '#FAFAFA',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: severityColor,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {q.id}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', marginBottom: 4 }}>
                        {q.label}
                      </div>
                      <div style={{ fontSize: 13, color: '#4A5568', lineHeight: 1.5 }}>
                        {q.question}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 40 }}>
                    <select
                      value={form[`q${q.id}`]}
                      onChange={(e) => updateForm(`q${q.id}`, e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E0',
                        fontSize: 14,
                        width: 120,
                        background: '#fff',
                      }}
                    >
                      <option value="">-- Select --</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>

                    {q.hasTimeframe && form.q6 === 'Yes' && (
                      <select
                        value={form.q6Timeframe}
                        onChange={(e) => updateForm('q6Timeframe', e.target.value)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E0',
                          fontSize: 14,
                          width: 200,
                          background: '#fff',
                        }}
                      >
                        <option value="">-- Timeframe --</option>
                        {TIMEFRAME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Additional Safety Screening */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2D3748', margin: '0 0 16px', borderBottom: '2px solid #E2E8F0', paddingBottom: 8 }}>
              Additional Safety Screening (SOP 2.3)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Psychosis Indicators */}
              <div>
                <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                  Active Psychosis Indicators
                </label>
                <select
                  value={form.psychosis}
                  onChange={(e) => updateForm('psychosis', e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E0',
                    fontSize: 14,
                    width: '100%',
                    background: '#fff',
                  }}
                >
                  {PSYCHOSIS_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              {/* Homicidal Ideation */}
              <div>
                <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                  Homicidal Ideation
                </label>
                <select
                  value={form.homicidalIdeation}
                  onChange={(e) => updateForm('homicidalIdeation', e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E0',
                    fontSize: 14,
                    width: '100%',
                    background: '#fff',
                  }}
                >
                  <option value="">-- Select --</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              {/* Self-Harm History */}
              <div>
                <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                  Self-Harm History
                </label>
                <select
                  value={form.selfHarmHistory}
                  onChange={(e) => updateForm('selfHarmHistory', e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E0',
                    fontSize: 14,
                    width: '100%',
                    background: '#fff',
                  }}
                >
                  {SELF_HARM_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              {/* Auto-calculated Risk Level */}
              <div>
                <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                  Overall Risk Level (auto-calculated)
                </label>
                <div style={{ padding: '8px 12px' }}>
                  {form.q1 && form.q2 && form.q3 && form.q4 && form.q5 && form.q6 && form.homicidalIdeation ? (
                    <span style={riskLevelStyle(calculateRiskLevel(form))}>
                      {calculateRiskLevel(form)}
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, color: '#A0AEC0' }}>Complete all questions to calculate</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Clinical Action */}
          {form.q1 && form.q2 && form.q3 && form.q4 && form.q5 && form.q6 && form.homicidalIdeation && (() => {
            const previewRisk = calculateRiskLevel(form)
            const previewConfig = CLINICAL_ACTIONS[previewRisk]
            return (
              <div
                style={{
                  padding: 16,
                  marginBottom: 20,
                  borderRadius: 10,
                  background: previewConfig.bg,
                  border: `1px solid ${previewConfig.border}`,
                }}
              >
                <h4 style={{ fontSize: 14, fontWeight: 700, color: previewConfig.color, margin: '0 0 8px' }}>
                  Clinical Action Preview — {previewRisk} Risk
                </h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                  {previewConfig.actions.map((a, i) => (
                    <li key={i} style={{ marginBottom: 4, color: '#2D3748' }}>{a}</li>
                  ))}
                </ul>
              </div>
            )
          })()}

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleSubmit}
              disabled={!form.assessor || !form.q1 || !form.q2 || !form.q3 || !form.q4 || !form.q5 || !form.q6 || !form.homicidalIdeation || (form.q6 === 'Yes' && !form.q6Timeframe)}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: (!form.assessor || !form.q1 || !form.q2 || !form.q3 || !form.q4 || !form.q5 || !form.q6 || !form.homicidalIdeation) ? '#CBD5E0' : '#2B6CB0',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: (!form.assessor || !form.q1 || !form.q2 || !form.q3 || !form.q4 || !form.q5 || !form.q6 || !form.homicidalIdeation) ? 'not-allowed' : 'pointer',
              }}
            >
              Submit Assessment
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
    </div>
  )
}
