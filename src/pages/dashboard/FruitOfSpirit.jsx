import React, { useState, useEffect } from 'react'
import { getPatients, getProgress, upsertProgress } from '../../utils/supabase'
import { activeBriefs } from '../../utils/patients'

/*
  Fruit of the Spirit Assessment — Galatians 5:22-23
  Treatment Protocol Section 10.5.
  Ties to Graduation Criterion #5: Spiritual Formation.
  Initials only (HIPAA). All fields are selects — pastoral notes is the only textarea (staff clinical notes).
  Persisted per-patient as a JSONB doc in progress_records (domain 'fruit_of_spirit'),
  shape: { history: [ { id, date, assessor, <9 fruit ratings>, notes } ] }.
*/

const DOMAIN = 'fruit_of_spirit'

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
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [patientAssessments, setPatientAssessments] = useState([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const emptyForm = () => {
    const f = { assessor: '', notes: '' }
    FRUITS.forEach((fr) => { f[fr.id] = '' })
    return f
  }
  const [form, setForm] = useState(emptyForm())

  // Load active patients for the selector.
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoadingPatients(true)
      const { data, error } = await getPatients()
      if (!alive) return
      if (error) console.error('Failed to load patients', error)
      const briefs = activeBriefs(data)
      setPatients(briefs)
      setSelectedPatient((prev) => prev || (briefs[0]?.id || ''))
      setLoadingPatients(false)
    })()
    return () => { alive = false }
  }, [])

  // Load persisted assessment history for the selected patient.
  useEffect(() => {
    if (!selectedPatient) { setPatientAssessments([]); return }
    let alive = true
    ;(async () => {
      setLoadingHistory(true)
      const { data, error } = await getProgress(selectedPatient, DOMAIN)
      if (!alive) return
      if (error) console.error('Failed to load assessments', error)
      setPatientAssessments(data?.data?.history || [])
      setLoadingHistory(false)
    })()
    return () => { alive = false }
  }, [selectedPatient])

  const selectedBrief = patients.find((p) => p.id === selectedPatient)
  const selectedInitials = selectedBrief?.initials || '—'

  const latestAssessment = patientAssessments.length > 0 ? patientAssessments[patientAssessments.length - 1] : null
  const latestTotal = latestAssessment ? calcTotal(latestAssessment) : null
  const latestOverall = latestTotal !== null ? getOverallAssessment(latestTotal) : null

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const resetForm = () => setForm(emptyForm())

  const formComplete = form.assessor && FRUITS.every((f) => form[f.id] !== '')

  const handleSubmit = async () => {
    if (!formComplete || saving || !selectedPatient) return
    const parsed = { ...form }
    FRUITS.forEach((f) => { parsed[f.id] = Number(parsed[f.id]) })
    const newAssessment = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      ...parsed,
    }
    const newHistory = [...patientAssessments, newAssessment]
    setSaving(true)
    const { error } = await upsertProgress(selectedPatient, DOMAIN, { history: newHistory }, 'PK')
    setSaving(false)
    if (error) {
      alert('Failed to save assessment: ' + (error.message || 'unknown error'))
      return
    }
    // Reflect the saved history.
    const { data } = await getProgress(selectedPatient, DOMAIN)
    setPatientAssessments(data?.data?.history || newHistory)
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
            disabled={loadingPatients || patients.length === 0}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E0',
              fontSize: 14,
              fontWeight: 600,
              background: '#fff',
            }}
          >
            {loadingPatients && <option value="">Loading…</option>}
            {!loadingPatients && patients.length === 0 && <option value="">No active patients</option>}
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.initials}</option>
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
            Current Assessment — {selectedInitials}
          </h2>
          {!loadingHistory && latestAssessment && (
            <span style={overallStyle(latestAssessment)}>
              {latestOverall.label} ({latestTotal}/27)
            </span>
          )}
        </div>

        {loadingHistory && (
          <p style={{ color: '#A0AEC0', fontSize: 14 }}>Loading assessments…</p>
        )}

        {!loadingHistory && latestAssessment && (
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

        {!loadingHistory && !latestAssessment && (
          <p style={{ color: '#A0AEC0', fontSize: 14 }}>Not yet assessed. Complete initial assessment.</p>
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
            disabled={!selectedPatient}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: !selectedPatient ? '#CBD5E0' : '#2B6CB0',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: !selectedPatient ? 'not-allowed' : 'pointer',
            }}
          >
            {showForm ? 'Cancel' : 'New Assessment'}
          </button>
        </div>

        {loadingHistory && (
          <p style={{ color: '#A0AEC0', fontSize: 14 }}>Loading assessments…</p>
        )}

        {!loadingHistory && patientAssessments.length === 0 && !showForm && (
          <p style={{ color: '#A0AEC0', fontSize: 14 }}>No assessments recorded yet.</p>
        )}

        {!loadingHistory && patientAssessments.length > 0 && (
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
            New Fruit of the Spirit Assessment — {selectedInitials}
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
              disabled={!formComplete || saving}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: (!formComplete || saving) ? '#CBD5E0' : '#2B6CB0',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: (!formComplete || saving) ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Submit Assessment'}
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
