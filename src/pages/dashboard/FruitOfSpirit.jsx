import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Fruit of the Spirit Assessment — Galatians 5:22-23
  Treatment Protocol Section 10.5.
  Ties to Graduation Criterion #5: Spiritual Formation.
  Initials only (HIPAA). All fields are selects — pastoral notes is the only textarea (staff clinical notes).
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

const FRUITS = [
  { id: 'love', label: 'Love' },
  { id: 'joy', label: 'Joy' },
  { id: 'peace', label: 'Peace' },
  { id: 'patience', label: 'Patience' },
  { id: 'kindness', label: 'Kindness' },
  { id: 'goodness', label: 'Goodness' },
  { id: 'faithfulness', label: 'Faithfulness' },
  { id: 'gentleness', label: 'Gentleness' },
  { id: 'selfControl', label: 'Self-Control' },
]

const LEVELS = [
  { value: 0, label: 'Not Evident' },
  { value: 1, label: 'Emerging' },
  { value: 2, label: 'Growing' },
  { value: 3, label: 'Consistently Demonstrated' },
]

const LEVEL_COLORS = {
  0: '#CBD5E0',
  1: '#D69E2E',
  2: '#38A169',
  3: '#2B6CB0',
}

function getOverallAssessment(total) {
  if (total >= 24) return { label: 'Consistently Demonstrated — Graduation Criterion #5 Support', color: '#2B6CB0', bg: '#EBF8FF', border: '#BEE3F8' }
  if (total >= 18) return { label: 'Growing Maturity', color: '#38A169', bg: '#F0FFF4', border: '#C6F6D5' }
  if (total >= 10) return { label: 'Developing Character', color: '#D69E2E', bg: '#FFFFF0', border: '#FEFCBF' }
  return { label: 'Early Formation', color: '#718096', bg: '#F7FAFC', border: '#E2E8F0' }
}

function calcTotal(assessment) {
  return FRUITS.reduce((sum, f) => sum + (assessment[f.id] || 0), 0)
}

const INITIAL_ASSESSMENTS = {
  CO: [
    {
      id: 1,
      date: '2026-03-01',
      assessor: 'PK',
      love: 2, joy: 1, peace: 2, patience: 1, kindness: 2, goodness: 2, faithfulness: 1, gentleness: 2, selfControl: 1,
      notes: 'Growing awareness of love and peace. Patience and self-control need continued pastoral support.',
    },
    {
      id: 2,
      date: '2026-03-22',
      assessor: 'PK',
      love: 3, joy: 2, peace: 2, patience: 2, kindness: 3, goodness: 2, faithfulness: 2, gentleness: 2, selfControl: 2,
      notes: 'Marked growth in love and kindness. Consistently reaching out to peers. Joy emerging more naturally.',
    },
  ],
  AN: [
    {
      id: 3,
      date: '2026-03-10',
      assessor: 'PK',
      love: 2, joy: 1, peace: 1, patience: 2, kindness: 2, goodness: 2, faithfulness: 1, gentleness: 2, selfControl: 1,
      notes: 'Developing character evident. Patience and kindness strong. Peace and joy areas for continued growth.',
    },
  ],
  KA: [
    {
      id: 4,
      date: '2026-02-15',
      assessor: 'PK',
      love: 1, joy: 1, peace: 1, patience: 1, kindness: 1, goodness: 1, faithfulness: 0, gentleness: 1, selfControl: 0,
      notes: 'Early formation stage. Beginning to engage with spiritual concepts. Needs consistent encouragement.',
    },
  ],
  IM: [
    {
      id: 5,
      date: '2026-02-28',
      assessor: 'PK',
      love: 2, joy: 1, peace: 2, patience: 2, kindness: 2, goodness: 2, faithfulness: 1, gentleness: 2, selfControl: 1,
      notes: 'Good foundation forming. Peace and patience growing. Faithfulness and self-control areas to develop.',
    },
    {
      id: 6,
      date: '2026-03-20',
      assessor: 'PK',
      love: 3, joy: 2, peace: 3, patience: 2, kindness: 3, goodness: 2, faithfulness: 2, gentleness: 3, selfControl: 2,
      notes: 'Strong growth across all fruits. Love, peace, kindness, and gentleness consistently demonstrated. Approaching maturity.',
    },
  ],
}

const overallStyle = (assessment) => {
  const total = calcTotal(assessment)
  const oa = getOverallAssessment(total)
  return {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
    color: oa.color,
    background: oa.bg,
    border: `1px solid ${oa.border}`,
  }
}

export default function FruitOfSpirit() {
  const { user } = useAuth()
  const [selectedPatient, setSelectedPatient] = useState('CO')
  const [assessments, setAssessments] = useState(INITIAL_ASSESSMENTS)
  const [showForm, setShowForm] = useState(false)
  const emptyForm = () => {
    const f = { assessor: '', notes: '' }
    FRUITS.forEach((fr) => { f[fr.id] = '' })
    return f
  }
  const [form, setForm] = useState(emptyForm())

  const patientAssessments = assessments[selectedPatient] || []
  const latestAssessment = patientAssessments.length > 0 ? patientAssessments[patientAssessments.length - 1] : null
  const latestTotal = latestAssessment ? calcTotal(latestAssessment) : null
  const latestOverall = latestTotal !== null ? getOverallAssessment(latestTotal) : null

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const resetForm = () => setForm(emptyForm())

  const formComplete = form.assessor && FRUITS.every((f) => form[f.id] !== '')

  const handleSubmit = () => {
    if (!formComplete) return
    const parsed = { ...form }
    FRUITS.forEach((f) => { parsed[f.id] = Number(parsed[f.id]) })
    const newAssessment = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      ...parsed,
    }
    setAssessments((prev) => ({
      ...prev,
      [selectedPatient]: [...(prev[selectedPatient] || []), newAssessment],
    }))
    setShowForm(false)
    resetForm()
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            Fruit of the Spirit Assessment
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            Galatians 5:22-23 — Treatment Protocol Section 10.5 — Graduation Criterion #5
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

      {/* Current Assessment Card */}
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
            Current Assessment — {selectedPatient}
          </h2>
          {latestAssessment && (
            <span style={overallStyle(latestAssessment)}>
              {latestOverall.label} ({latestTotal}/27)
            </span>
          )}
        </div>

        {latestAssessment && (
          <div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#4A5568', marginBottom: 16 }}>
              <span><strong>Last Assessed:</strong> {latestAssessment.date}</span>
              <span><strong>Assessor:</strong> {latestAssessment.assessor}</span>
              <span><strong>Total Score:</strong> {latestTotal}/27</span>
            </div>

            {/* Visual: 9 fruits as vertical list with colored bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FRUITS.map((f) => {
                const value = latestAssessment[f.id]
                const levelLabel = LEVELS.find((l) => l.value === value)?.label || 'N/A'
                const barWidth = value === 0 ? 4 : (value / 3) * 100
                const barColor = LEVEL_COLORS[value]
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 100, fontSize: 13, fontWeight: 600, color: '#2D3748', flexShrink: 0 }}>
                      {f.label}
                    </span>
                    <div style={{ flex: 1, height: 22, background: '#EDF2F7', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                      <div
                        style={{
                          width: `${barWidth}%`,
                          height: '100%',
                          background: barColor,
                          borderRadius: 6,
                          transition: 'width 0.3s ease',
                          minWidth: value === 0 ? 4 : undefined,
                        }}
                      />
                    </div>
                    <span style={{ width: 180, fontSize: 12, color: barColor, fontWeight: 600, flexShrink: 0, textAlign: 'right' }}>
                      {levelLabel}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!latestAssessment && (
          <p style={{ color: '#A0AEC0', fontSize: 14 }}>No assessment on file. Complete initial assessment.</p>
        )}
      </div>

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

        {patientAssessments.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Assessor</th>
                  {FRUITS.map((f) => (
                    <th key={f.id} style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>{f.label}</th>
                  ))}
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Total</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Overall</th>
                </tr>
              </thead>
              <tbody>
                {[...patientAssessments].reverse().map((a) => {
                  const total = calcTotal(a)
                  const oa = getOverallAssessment(total)
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                      <td style={{ padding: '8px 10px' }}>{a.date}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{a.assessor}</td>
                      {FRUITS.map((f) => (
                        <td
                          key={f.id}
                          style={{
                            padding: '8px 10px',
                            textAlign: 'center',
                            color: LEVEL_COLORS[a[f.id]],
                            fontWeight: 600,
                          }}
                        >
                          {a[f.id]}
                        </td>
                      ))}
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>{total}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          color: oa.color,
                          background: oa.bg,
                          border: `1px solid ${oa.border}`,
                          whiteSpace: 'nowrap',
                        }}>
                          {oa.label.split(' — ')[0]}
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
            New Fruit of the Spirit Assessment — {selectedPatient}
          </h2>
          <p style={{ fontSize: 13, color: '#718096', margin: '0 0 20px' }}>
            Assess each fruit on a 4-level scale. Galatians 5:22-23.
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

          {/* 9 Fruit Selects */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2D3748', margin: '0 0 16px', borderBottom: '2px solid #E2E8F0', paddingBottom: 8 }}>
              Fruit Assessment (Galatians 5:22-23)
            </h3>
            {FRUITS.map((f, idx) => (
              <div
                key={f.id}
                style={{
                  padding: 16,
                  marginBottom: 12,
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  background: '#FAFAFA',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#2B6CB0',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#2D3748' }}>
                    {f.label}
                  </span>
                </div>

                <div style={{ marginLeft: 40 }}>
                  <select
                    value={form[f.id]}
                    onChange={(e) => updateForm(f.id, e.target.value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E0',
                      fontSize: 14,
                      width: '100%', maxWidth: 280,
                      background: '#fff',
                    }}
                  >
                    <option value="">-- Select Level --</option>
                    {LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Pastoral Notes */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
              Chaplain Pastoral Observations
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateForm('notes', e.target.value)}
              rows={4}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E0',
                fontSize: 14,
                width: '100%',
                background: '#fff',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              placeholder="Pastoral observations and notes on spiritual formation..."
            />
          </div>

          {/* Auto-calculated Overall */}
          {formComplete && (() => {
            const total = FRUITS.reduce((sum, f) => sum + Number(form[f.id]), 0)
            const oa = getOverallAssessment(total)
            return (
              <div
                style={{
                  padding: 16,
                  marginBottom: 20,
                  borderRadius: 10,
                  background: oa.bg,
                  border: `1px solid ${oa.border}`,
                }}
              >
                <h4 style={{ fontSize: 14, fontWeight: 700, color: oa.color, margin: '0 0 4px' }}>
                  Overall Assessment: {oa.label}
                </h4>
                <span style={{ fontSize: 13, color: '#4A5568' }}>
                  Total Score: {total}/27
                </span>
              </div>
            )
          })()}

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleSubmit}
              disabled={!formComplete}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: !formComplete ? '#CBD5E0' : '#2B6CB0',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: !formComplete ? 'not-allowed' : 'pointer',
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
