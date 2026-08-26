import React, { useState, useEffect, useCallback } from 'react'
import { getPatients, getAssessments, addAssessment, isSupabaseReady } from '../../utils/supabase'
import { activeBriefs } from '../../utils/patients'
import { requireFields } from '../../utils/formGuard'

/*
  URICA — University of Rhode Island Change Assessment (Simplified 12-item)
  Readiness-to-change instrument per Treatment Protocol Section 5.1. Live
  `assessments` table (type 'urica'). Required at admission and bi-weekly.
  Initials only (HIPAA). All fields are selects — zero free text.
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

const LIKERT_OPTIONS = [
  { value: '', label: '-- Select --' },
  { value: '1', label: '1 — Strongly Disagree' },
  { value: '2', label: '2 — Disagree' },
  { value: '3', label: '3 — Undecided' },
  { value: '4', label: '4 — Agree' },
  { value: '5', label: '5 — Strongly Agree' },
]

const URICA_ITEMS = [
  // Precontemplation (items 1-3)
  { id: 1, subscale: 'PC', label: 'As far as I\'m concerned, I don\'t have any problems that need changing' },
  { id: 2, subscale: 'PC', label: 'I\'m not the problem one. It doesn\'t make much sense for me to be here' },
  { id: 3, subscale: 'PC', label: 'All this talk about psychology is boring. Why can\'t people just forget about their problems?' },
  // Contemplation (items 4-6)
  { id: 4, subscale: 'C', label: 'I think I might be ready for some self-improvement' },
  { id: 5, subscale: 'C', label: 'I have a problem and I really think I should work on it' },
  { id: 6, subscale: 'C', label: 'I\'ve been thinking that I might want to change something about myself' },
  // Action (items 7-9)
  { id: 7, subscale: 'A', label: 'I am doing something about the problems that had been bothering me' },
  { id: 8, subscale: 'A', label: 'Anyone can talk about changing; I\'m actually doing something about it' },
  { id: 9, subscale: 'A', label: 'I am really working hard to change' },
  // Maintenance (items 10-12)
  { id: 10, subscale: 'M', label: 'I may need a boost right now to help me maintain the changes I\'ve already made' },
  { id: 11, subscale: 'M', label: 'I\'m here to prevent myself from having a relapse of my problem' },
  { id: 12, subscale: 'M', label: 'It worries me that I might slip back on a problem I have already changed' },
]

const SUBSCALE_LABELS = {
  PC: 'Precontemplation',
  C: 'Contemplation',
  A: 'Action',
  M: 'Maintenance',
}

const SUBSCALE_COLORS = {
  PC: '#E53E3E',
  C: '#D69E2E',
  A: '#38A169',
  M: '#2B6CB0',
}

const STAGES = [
  { key: 'Precontemplation', color: '#E53E3E', bg: '#FFF5F5', border: '#FED7D7' },
  { key: 'Contemplation', color: '#D69E2E', bg: '#FFFFF0', border: '#FEFCBF' },
  { key: 'Preparation', color: '#DD6B20', bg: '#FFFAF0', border: '#FEEBC8' },
  { key: 'Action', color: '#38A169', bg: '#F0FFF4', border: '#C6F6D5' },
  { key: 'Maintenance', color: '#2B6CB0', bg: '#EBF8FF', border: '#BEE3F8' },
]

const CLINICAL_ACTIONS = {
  Precontemplation: {
    color: '#E53E3E',
    bg: '#FFF5F5',
    border: '#FED7D7',
    actions: [
      'Enrol in Outpatient Engagement Pathway',
      'Weekly MI sessions',
      'Do NOT confront',
      'Reassess in 2-4 weeks',
    ],
  },
  Contemplation: {
    color: '#D69E2E',
    bg: '#FFFFF0',
    border: '#FEFCBF',
    actions: [
      'Admitted with enhanced motivational support',
      'MI techniques in all sessions',
      'Build discrepancy',
      'Reassess bi-weekly',
    ],
  },
  Preparation: {
    color: '#DD6B20',
    bg: '#FFFAF0',
    border: '#FEEBC8',
    actions: [
      'Ready for residential admission',
      'Begin treatment planning',
      'Support action steps',
    ],
  },
  Action: {
    color: '#38A169',
    bg: '#F0FFF4',
    border: '#C6F6D5',
    actions: [
      'Full programme engagement',
      'CBT + group therapy',
      'Monitor engagement',
      'Reinforce progress',
    ],
  },
  Maintenance: {
    color: '#2B6CB0',
    bg: '#EBF8FF',
    border: '#BEE3F8',
    actions: [
      'Focus on relapse prevention',
      'PRPP development',
      'Discharge planning',
      'Alumni preparation',
    ],
  },
}

function calculateSubscales(responses) {
  const subs = { PC: 0, C: 0, A: 0, M: 0 }
  URICA_ITEMS.forEach((item) => {
    subs[item.subscale] += Number(responses[`q${item.id}`] || 0)
  })
  return {
    PC: Math.round((subs.PC / 3) * 100) / 100,
    C: Math.round((subs.C / 3) * 100) / 100,
    A: Math.round((subs.A / 3) * 100) / 100,
    M: Math.round((subs.M / 3) * 100) / 100,
  }
}

function calculateReadiness(subscales) {
  return Math.round(((subscales.C + subscales.A + subscales.M) - subscales.PC) * 100) / 100
}

function determineStage(subscales, readiness) {
  const { PC, C, A, M } = subscales
  const highest = Math.max(PC, C, A, M)

  // Maintenance: M highest, readiness > 12, A also high
  if (M === highest && readiness > 12 && A >= C) return 'Maintenance'
  // Action: A highest, readiness > 12
  if (A === highest && readiness > 12) return 'Action'
  // Preparation: C and A roughly equal, readiness 11-12
  if (Math.abs(C - A) <= 0.5 && readiness >= 11 && readiness <= 12) return 'Preparation'
  // Contemplation: C highest or readiness 8-11
  if (C === highest || (readiness >= 8 && readiness < 11)) return 'Contemplation'
  // Precontemplation: PC highest, readiness < 8
  if (PC === highest && readiness < 8) return 'Precontemplation'

  // Fallback based on readiness
  if (readiness < 8) return 'Precontemplation'
  if (readiness < 11) return 'Contemplation'
  if (readiness <= 12) return 'Preparation'
  return 'Action'
}

function getStageConfig(stage) {
  return STAGES.find((s) => s.key === stage) || STAGES[0]
}

const stageBadgeStyle = (stage) => {
  const config = getStageConfig(stage)
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

// Map an `assessments` row (type 'urica') to the page's assessment shape.
function rowToAssessment(r) {
  const resp = r.responses || {}
  const obj = { id: r.id, date: (r.created_at || '').slice(0, 10), assessor: r.assessed_by_code || '', stage: r.level || 'Contemplation' }
  for (let i = 1; i <= 12; i++) obj[`q${i}`] = resp[`q${i}`] ?? ''
  obj.pcMean = resp.pcMean ?? 0
  obj.cMean = resp.cMean ?? 0
  obj.aMean = resp.aMean ?? 0
  obj.mMean = resp.mMean ?? 0
  obj.readiness = resp.readiness ?? r.score ?? 0
  return obj
}

export default function URICAAssessment() {
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [assessments, setAssessments] = useState({}) // patient_id -> ascending[]
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    assessor: '',
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: '',
    q7: '', q8: '', q9: '', q10: '', q11: '', q12: '',
  })

  const loadAssessments = useCallback(async (patientId) => {
    if (!patientId || !isSupabaseReady()) return []
    const { data: rows } = await getAssessments(patientId, 'urica')
    // getAssessments returns descending; page expects ascending (latest last)
    return (rows || []).map(rowToAssessment).reverse()
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!isSupabaseReady()) return
      const { data: rows } = await getPatients()
      const briefs = activeBriefs(rows)
      setPatients(briefs)
      const first = briefs[0]?.id || ''
      setSelectedPatient(first)
      if (first) setAssessments({ [first]: await loadAssessments(first) })
    })()
  }, [loadAssessments])

  const onSelectPatient = async (id) => {
    setSelectedPatient(id)
    setShowForm(false)
    if (!assessments[id]) {
      const a = await loadAssessments(id)
      setAssessments(prev => ({ ...prev, [id]: a }))
    }
  }

  const selectedInitials = patients.find(p => p.id === selectedPatient)?.initials || ''
  const patientAssessments = assessments[selectedPatient] || []
  const latestAssessment = patientAssessments.length > 0 ? patientAssessments[patientAssessments.length - 1] : null
  const previousAssessment = patientAssessments.length > 1 ? patientAssessments[patientAssessments.length - 2] : null
  const currentStage = latestAssessment ? latestAssessment.stage : 'Not assessed'
  const actionConfig = CLINICAL_ACTIONS[currentStage]

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const resetForm = () => {
    setForm({
      assessor: '',
      q1: '', q2: '', q3: '', q4: '', q5: '', q6: '',
      q7: '', q8: '', q9: '', q10: '', q11: '', q12: '',
    })
  }

  const allItemsComplete = URICA_ITEMS.every((item) => form[`q${item.id}`] !== '')

  const formSubscales = allItemsComplete ? calculateSubscales(form) : null
  const formReadiness = formSubscales ? calculateReadiness(formSubscales) : null
  const formStage = formSubscales ? determineStage(formSubscales, formReadiness) : null

  const handleSubmit = async () => {
    if (!requireFields([
      [selectedPatient, 'Patient'],
      [form.assessor, 'Assessor'],
      [allItemsComplete, 'A response to every item'],
    ])) return

    const subscales = calculateSubscales(form)
    const readiness = calculateReadiness(subscales)
    const stage = determineStage(subscales, readiness)

    const responses = {}
    for (let i = 1; i <= 12; i++) responses[`q${i}`] = form[`q${i}`]
    responses.pcMean = subscales.PC
    responses.cMean = subscales.C
    responses.aMean = subscales.A
    responses.mMean = subscales.M
    responses.readiness = readiness

    setSaving(true)
    const { error } = await addAssessment({
      patient_id: selectedPatient,
      type: 'urica',
      score: Math.round(readiness),
      level: stage,
      responses,
      assessed_by_code: form.assessor,
    })
    setSaving(false)
    if (error) { alert(`Could not save assessment: ${error.message}`); return }
    const a = await loadAssessments(selectedPatient)
    setAssessments(prev => ({ ...prev, [selectedPatient]: a }))
    setShowForm(false)
    resetForm()
  }

  const readinessTrend = latestAssessment && previousAssessment
    ? Math.round((latestAssessment.readiness - previousAssessment.readiness) * 100) / 100
    : null

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            URICA Assessment
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            University of Rhode Island Change Assessment — Readiness to Change (Treatment Protocol 5.1)
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

      {/* Current Stage Card */}
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
            Current Stage — {selectedInitials}
          </h2>
          <span style={currentStage !== 'Not assessed' ? stageBadgeStyle(currentStage) : { fontSize: 13, color: '#A0AEC0', fontWeight: 600 }}>
            {currentStage}
          </span>
        </div>

        {latestAssessment && (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#4A5568' }}>
            <span><strong>Last Assessed:</strong> {latestAssessment.date}</span>
            <span><strong>Assessor:</strong> {latestAssessment.assessor}</span>
            <span><strong>Readiness Score:</strong> {latestAssessment.readiness}</span>
            <span><strong>PC:</strong> {latestAssessment.pcMean}</span>
            <span><strong>C:</strong> {latestAssessment.cMean}</span>
            <span><strong>A:</strong> {latestAssessment.aMean}</span>
            <span><strong>M:</strong> {latestAssessment.mMean}</span>
            {readinessTrend !== null && (
              <span>
                <strong>Trend:</strong>{' '}
                <span style={{ color: readinessTrend > 0 ? '#38A169' : readinessTrend < 0 ? '#E53E3E' : '#718096', fontWeight: 700 }}>
                  {readinessTrend > 0 ? '+' : ''}{readinessTrend}
                </span>
              </span>
            )}
          </div>
        )}

        {!latestAssessment && (
          <p style={{ color: '#A0AEC0', fontSize: 14 }}>No assessment on file. Complete initial URICA screening.</p>
        )}
      </div>

      {/* Stage Progression Pipeline */}
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
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2D3748', margin: '0 0 16px' }}>
          Stage Progression
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {STAGES.map((s, i) => {
            const isCurrent = currentStage === s.key
            return (
              <React.Fragment key={s.key}>
                <div
                  style={{
                    flex: 1,
                    padding: '12px 8px',
                    textAlign: 'center',
                    borderRadius: i === 0 ? '10px 0 0 10px' : i === STAGES.length - 1 ? '0 10px 10px 0' : 0,
                    background: isCurrent ? s.color : '#F7FAFC',
                    color: isCurrent ? '#fff' : '#A0AEC0',
                    fontWeight: isCurrent ? 700 : 500,
                    fontSize: 13,
                    border: isCurrent ? `2px solid ${s.color}` : '1px solid #E2E8F0',
                    position: 'relative',
                    transition: 'all 0.2s',
                  }}
                >
                  {s.key}
                </div>
              </React.Fragment>
            )
          })}
        </div>
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
            Clinical Action Required — {currentStage}
          </h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {actionConfig.actions.map((action, i) => (
              <li
                key={i}
                style={{
                  fontSize: 14,
                  color: '#2D3748',
                  marginBottom: 6,
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
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#E53E3E', fontWeight: 600 }}>PC</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#D69E2E', fontWeight: 600 }}>C</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#38A169', fontWeight: 600 }}>A</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#2B6CB0', fontWeight: 600 }}>M</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Readiness</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Stage</th>
                </tr>
              </thead>
              <tbody>
                {[...patientAssessments].reverse().map((a, idx) => {
                  const reversedIdx = patientAssessments.length - 1 - idx
                  const prev = reversedIdx > 0 ? patientAssessments[reversedIdx - 1] : null
                  const trend = prev ? Math.round((a.readiness - prev.readiness) * 100) / 100 : null
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                      <td style={{ padding: '8px 10px' }}>{a.date}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{a.assessor}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{a.pcMean}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{a.cMean}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{a.aMean}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{a.mMean}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {a.readiness}
                        {trend !== null && (
                          <span style={{
                            marginLeft: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            color: trend > 0 ? '#38A169' : trend < 0 ? '#E53E3E' : '#718096',
                          }}>
                            ({trend > 0 ? '+' : ''}{trend})
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={stageBadgeStyle(a.stage)}>{a.stage}</span>
                      </td>
                    </tr>
                  )
                })}
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
            New URICA Assessment — {selectedInitials}
          </h2>
          <p style={{ fontSize: 13, color: '#718096', margin: '0 0 20px' }}>
            University of Rhode Island Change Assessment (12-item). Rate each statement on a 5-point scale.
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

          {/* URICA Items grouped by subscale */}
          {['PC', 'C', 'A', 'M'].map((subscale) => (
            <div key={subscale} style={{ marginBottom: 24 }}>
              <h3 style={{
                fontSize: 16,
                fontWeight: 700,
                color: SUBSCALE_COLORS[subscale],
                margin: '0 0 16px',
                borderBottom: `2px solid ${SUBSCALE_COLORS[subscale]}`,
                paddingBottom: 8,
              }}>
                {SUBSCALE_LABELS[subscale]}
              </h3>
              {URICA_ITEMS.filter((item) => item.subscale === subscale).map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: 16,
                    marginBottom: 12,
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    background: form[`q${item.id}`] ? '#FAFAFA' : '#fff',
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
                        background: SUBSCALE_COLORS[subscale],
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {item.id}
                    </span>
                    <div style={{ fontSize: 14, color: '#2D3748', lineHeight: 1.5, fontWeight: 500 }}>
                      {item.label}
                    </div>
                  </div>

                  <div style={{ marginLeft: 40 }}>
                    <select
                      value={form[`q${item.id}`]}
                      onChange={(e) => updateForm(`q${item.id}`, e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E0',
                        fontSize: 14,
                        width: 240,
                        background: '#fff',
                      }}
                    >
                      {LIKERT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Auto-calculated scores */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2D3748', margin: '0 0 16px', borderBottom: '2px solid #E2E8F0', paddingBottom: 8 }}>
              Scoring (auto-calculated)
            </h3>

            {allItemsComplete && formSubscales ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
                {/* Subscale scores */}
                {['PC', 'C', 'A', 'M'].map((sub) => (
                  <div key={sub} style={{ padding: 12, borderRadius: 8, border: `1px solid ${SUBSCALE_COLORS[sub]}`, background: '#FAFAFA' }}>
                    <div style={{ fontSize: 12, color: '#718096', fontWeight: 600, marginBottom: 4 }}>{SUBSCALE_LABELS[sub]} Mean</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: SUBSCALE_COLORS[sub] }}>{formSubscales[sub]}</div>
                  </div>
                ))}

                {/* Readiness score */}
                <div style={{ padding: 12, borderRadius: 8, border: '1px solid #2D3748', background: '#FAFAFA' }}>
                  <div style={{ fontSize: 12, color: '#718096', fontWeight: 600, marginBottom: 4 }}>Readiness Score</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#2D3748' }}>{formReadiness}</div>
                  <div style={{ fontSize: 11, color: '#718096' }}>(C + A + M) - PC</div>
                </div>

                {/* Stage preview */}
                <div style={{ padding: 12, borderRadius: 8, border: '1px solid #2D3748', background: '#FAFAFA' }}>
                  <div style={{ fontSize: 12, color: '#718096', fontWeight: 600, marginBottom: 4 }}>Stage</div>
                  <span style={stageBadgeStyle(formStage)}>{formStage}</span>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: '#A0AEC0' }}>Complete all 12 items to calculate scores</span>
            )}
          </div>

          {/* Preview Clinical Action */}
          {allItemsComplete && formStage && (() => {
            const previewConfig = CLINICAL_ACTIONS[formStage]
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
                  Clinical Action Preview — {formStage}
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
              disabled={saving}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: (!form.assessor || !allItemsComplete) ? '#CBD5E0' : '#2B6CB0',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: (!form.assessor || !allItemsComplete) ? 'not-allowed' : 'pointer',
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
