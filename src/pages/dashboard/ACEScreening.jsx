import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  ACE Screening — Adverse Childhood Experiences Questionnaire
  Required at admission per Treatment Protocol Section 9.2.
  Initials only (HIPAA). All fields are selects — zero free text.
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

const ACE_QUESTIONS = [
  {
    id: 1,
    label: 'Emotional Abuse',
    question: 'Did a parent or other adult in the household often swear at you, insult you, put you down, or humiliate you? Or act in a way that made you afraid that you might be physically hurt?',
  },
  {
    id: 2,
    label: 'Physical Abuse',
    question: 'Did a parent or other adult in the household often push, grab, slap, or throw something at you? Or ever hit you so hard that you had marks or were injured?',
  },
  {
    id: 3,
    label: 'Sexual Abuse',
    question: 'Did an adult or person at least 5 years older than you ever touch or fondle you or have you touch their body in a sexual way? Or attempt or actually have oral, anal, or vaginal intercourse with you?',
  },
  {
    id: 4,
    label: 'Emotional Neglect',
    question: 'Did you often feel that no one in your family loved you or thought you were important or special? Or your family didn\'t look out for each other, feel close to each other, or support each other?',
  },
  {
    id: 5,
    label: 'Physical Neglect',
    question: 'Did you often feel that you didn\'t have enough to eat, had to wear dirty clothes, and had no one to protect you? Or your parents were too drunk or high to take care of you or take you to the doctor if you needed it?',
  },
  {
    id: 6,
    label: 'Parental Separation',
    question: 'Were your parents ever separated or divorced?',
  },
  {
    id: 7,
    label: 'Domestic Violence',
    question: 'Was your mother or stepmother often pushed, grabbed, slapped, or had something thrown at her? Or sometimes or often kicked, bitten, hit with a fist, or hit with something hard? Or ever repeatedly hit over at least a few minutes or threatened with a gun or knife?',
  },
  {
    id: 8,
    label: 'Household Substance Abuse',
    question: 'Did you live with anyone who was a problem drinker or alcoholic, or who used street drugs?',
  },
  {
    id: 9,
    label: 'Household Mental Illness',
    question: 'Was a household member depressed or mentally ill, or did a household member attempt suicide?',
  },
  {
    id: 10,
    label: 'Incarcerated Household Member',
    question: 'Did a household member go to prison?',
  },
]

const CLINICAL_ACTIONS = {
  'No ACEs': {
    color: '#38A169',
    bg: '#F0FFF4',
    border: '#C6F6D5',
    actions: [
      'Document in clinical file',
      'Routine care plan',
    ],
  },
  Low: {
    color: '#38A169',
    bg: '#F0FFF4',
    border: '#C6F6D5',
    actions: [
      'Document in treatment plan',
      'Trauma-aware approach in all interactions',
    ],
  },
  Moderate: {
    color: '#D69E2E',
    bg: '#FFFFF0',
    border: '#FEFCBF',
    actions: [
      'Enhanced trauma-focused interventions indicated',
      'Inform treatment plan',
      'Trauma-focused CBT available in Phase 3',
      'Monitor for trauma responses',
    ],
  },
  High: {
    color: '#E53E3E',
    bg: '#FFF5F5',
    border: '#FED7D7',
    actions: [
      'Trauma-focused CBT required (Phase 3)',
      'Consider specialist referral for complex PTSD',
      'Inform MDT',
      'Enhanced monitoring for trauma responses',
      'Spiritual formation — trauma-sensitive pastoral care',
    ],
  },
}

const INITIAL_ASSESSMENTS = {
  CO: [
    {
      id: 1,
      date: '2026-03-08',
      assessor: 'AI',
      q1: 'Yes', q2: 'No', q3: 'No', q4: 'Yes', q5: 'No',
      q6: 'No', q7: 'No', q8: 'No', q9: 'No', q10: 'No',
      aceScore: 2,
      riskLevel: 'Low',
    },
  ],
  AN: [
    {
      id: 2,
      date: '2026-02-20',
      assessor: 'AI',
      q1: 'Yes', q2: 'Yes', q3: 'No', q4: 'Yes', q5: 'No',
      q6: 'Yes', q7: 'No', q8: 'Yes', q9: 'No', q10: 'No',
      aceScore: 5,
      riskLevel: 'Moderate',
    },
  ],
  KA: [
    {
      id: 3,
      date: '2026-01-15',
      assessor: 'FA',
      q1: 'No', q2: 'No', q3: 'No', q4: 'No', q5: 'No',
      q6: 'Yes', q7: 'No', q8: 'No', q9: 'No', q10: 'No',
      aceScore: 1,
      riskLevel: 'Low',
    },
  ],
  IM: [
    {
      id: 4,
      date: '2026-03-23',
      assessor: 'AI',
      q1: 'Yes', q2: 'Yes', q3: 'Yes', q4: 'Yes', q5: 'No',
      q6: 'Yes', q7: 'Yes', q8: 'Yes', q9: 'No', q10: 'No',
      aceScore: 7,
      riskLevel: 'High',
    },
  ],
}

function calculateACEScore(form) {
  let score = 0
  for (let i = 1; i <= 10; i++) {
    if (form[`q${i}`] === 'Yes') score++
  }
  return score
}

function getRiskLevel(score) {
  if (score === 0) return 'No ACEs'
  if (score <= 3) return 'Low'
  if (score <= 6) return 'Moderate'
  return 'High'
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

export default function ACEScreening() {
  const { user } = useAuth()
  const [selectedPatient, setSelectedPatient] = useState('CO')
  const [assessments, setAssessments] = useState(INITIAL_ASSESSMENTS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    assessor: '',
    q1: '', q2: '', q3: '', q4: '', q5: '',
    q6: '', q7: '', q8: '', q9: '', q10: '',
  })

  const patientAssessments = assessments[selectedPatient] || []
  const latestAssessment = patientAssessments.length > 0 ? patientAssessments[patientAssessments.length - 1] : null
  const currentRisk = latestAssessment ? latestAssessment.riskLevel : 'Not assessed'
  const currentScore = latestAssessment ? latestAssessment.aceScore : null
  const actionConfig = CLINICAL_ACTIONS[currentRisk]

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const resetForm = () => {
    setForm({
      assessor: '',
      q1: '', q2: '', q3: '', q4: '', q5: '',
      q6: '', q7: '', q8: '', q9: '', q10: '',
    })
  }

  const allQuestionsAnswered = form.assessor &&
    form.q1 && form.q2 && form.q3 && form.q4 && form.q5 &&
    form.q6 && form.q7 && form.q8 && form.q9 && form.q10

  const handleSubmit = () => {
    if (!allQuestionsAnswered) return

    const aceScore = calculateACEScore(form)
    const riskLevel = getRiskLevel(aceScore)
    const newAssessment = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      ...form,
      aceScore,
      riskLevel,
    }

    setAssessments((prev) => ({
      ...prev,
      [selectedPatient]: [...(prev[selectedPatient] || []), newAssessment],
    }))
    setShowForm(false)
    resetForm()
  }

  const isHighRisk = currentRisk === 'High'

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            ACE Screening
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            Adverse Childhood Experiences Questionnaire (Treatment Protocol 9.2)
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

      {/* High ACE Alert Banner */}
      {isHighRisk && (
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
            HIGH ACE SCORE ({currentScore}/10) — Trauma-focused CBT required. Consider specialist referral for complex PTSD.
          </span>
        </div>
      )}

      {/* Current ACE Status */}
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
            Current ACE Status — {selectedPatient}
          </h2>
          {currentRisk !== 'Not assessed' ? (
            <span style={riskLevelStyle(currentRisk)}>
              {currentRisk} ({currentScore}/10)
            </span>
          ) : (
            <span style={{ fontSize: 13, color: '#A0AEC0', fontWeight: 600 }}>Not assessed</span>
          )}
        </div>

        {latestAssessment && (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#4A5568' }}>
            <span><strong>Date Assessed:</strong> {latestAssessment.date}</span>
            <span><strong>Assessor:</strong> {latestAssessment.assessor}</span>
            <span><strong>ACE Score:</strong> {latestAssessment.aceScore}/10</span>
            <span><strong>Yes Responses:</strong> {
              ACE_QUESTIONS.filter((q) => latestAssessment[`q${q.id}`] === 'Yes')
                .map((q) => q.label)
                .join(', ') || 'None'
            }</span>
          </div>
        )}

        {!latestAssessment && (
          <p style={{ color: '#A0AEC0', fontSize: 14 }}>No assessment on file. Complete initial ACE screening at admission.</p>
        )}

        {latestAssessment && latestAssessment.aceScore >= 4 && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#FFF5F5', border: '1px solid #FED7D7', fontSize: 13, color: '#E53E3E', fontWeight: 600 }}>
            Individuals with 4+ ACEs are 7x more likely to develop alcohol use disorder and 4.5x more likely to develop depression.
          </div>
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
            Clinical Action Required — {currentRisk} {currentRisk !== 'No ACEs' ? 'ACE Score' : ''}
          </h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {actionConfig.actions.map((action, i) => (
              <li
                key={i}
                style={{
                  fontSize: 14,
                  color: '#2D3748',
                  marginBottom: 6,
                  fontWeight: currentRisk === 'High' && i === 0 ? 700 : 400,
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
                  {ACE_QUESTIONS.map((q) => (
                    <th key={q.id} style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Q{q.id}</th>
                  ))}
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Score</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Risk</th>
                </tr>
              </thead>
              <tbody>
                {[...patientAssessments].reverse().map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                    <td style={{ padding: '8px 10px' }}>{a.date}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{a.assessor}</td>
                    {ACE_QUESTIONS.map((q) => (
                      <td
                        key={q.id}
                        style={{
                          padding: '8px 10px',
                          textAlign: 'center',
                          color: a[`q${q.id}`] === 'Yes' ? '#E53E3E' : '#38A169',
                          fontWeight: 600,
                        }}
                      >
                        {a[`q${q.id}`]}
                      </td>
                    ))}
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>{a.aceScore}/10</td>
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
            New ACE Screening — {selectedPatient}
          </h2>
          <p style={{ fontSize: 13, color: '#718096', margin: '0 0 4px' }}>
            Adverse Childhood Experiences Questionnaire. All questions refer to events before the age of 18.
          </p>
          <p style={{ fontSize: 12, color: '#A0AEC0', margin: '0 0 20px' }}>
            Each "Yes" = 1 point. Maximum score: 10.
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
                width: '100%', maxWidth: 280,
                background: '#fff',
              }}
            >
              <option value="">-- Select Assessor --</option>
              {STAFF_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* ACE Questions */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2D3748', margin: '0 0 16px', borderBottom: '2px solid #E2E8F0', paddingBottom: 8 }}>
              Before your 18th birthday...
            </h3>
            {ACE_QUESTIONS.map((q) => (
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
                      background: '#4A5568',
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
                </div>
              </div>
            ))}
          </div>

          {/* Auto-calculated Score and Risk Level */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2D3748', margin: '0 0 16px', borderBottom: '2px solid #E2E8F0', paddingBottom: 8 }}>
              Score Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                  ACE Score (auto-calculated)
                </label>
                <div style={{ padding: '8px 12px' }}>
                  {allQuestionsAnswered ? (
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#2D3748' }}>
                      {calculateACEScore(form)}/10
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, color: '#A0AEC0' }}>Complete all questions to calculate</span>
                  )}
                </div>
              </div>
              <div>
                <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                  Risk Level (auto-calculated)
                </label>
                <div style={{ padding: '8px 12px' }}>
                  {allQuestionsAnswered ? (
                    <span style={riskLevelStyle(getRiskLevel(calculateACEScore(form)))}>
                      {getRiskLevel(calculateACEScore(form))}
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, color: '#A0AEC0' }}>Complete all questions to calculate</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Clinical Action */}
          {allQuestionsAnswered && (() => {
            const previewScore = calculateACEScore(form)
            const previewRisk = getRiskLevel(previewScore)
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
                  Clinical Action Preview — {previewRisk} {previewRisk !== 'No ACEs' ? `(Score: ${previewScore}/10)` : ''}
                </h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                  {previewConfig.actions.map((a, i) => (
                    <li key={i} style={{ marginBottom: 4, color: '#2D3748' }}>{a}</li>
                  ))}
                </ul>
                {previewScore >= 4 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#E53E3E', fontWeight: 600 }}>
                    Note: Individuals with 4+ ACEs are 7x more likely to develop alcohol use disorder and 4.5x more likely to develop depression.
                  </div>
                )}
              </div>
            )
          })()}

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleSubmit}
              disabled={!allQuestionsAnswered}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: !allQuestionsAnswered ? '#CBD5E0' : '#2B6CB0',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: !allQuestionsAnswered ? 'not-allowed' : 'pointer',
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
