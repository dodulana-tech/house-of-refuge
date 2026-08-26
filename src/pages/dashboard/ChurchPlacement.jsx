import React, { useEffect, useMemo, useState } from 'react'
import { isSupabaseReady, getPatients, getProgress, getAllProgress, upsertProgress } from '../../utils/supabase'
import { activeBriefs } from '../../utils/patients'
import { requireFields } from '../../utils/formGuard'

/*
  Church Placement Pipeline — Treatment Protocol Section 10.6.
  Every graduating client must be connected to a local church.
  5-step pipeline tracking. Ties to Graduation Criterion #6.
  Initials only (HIPAA). Persisted per-patient as JSONB in
  progress_records under domain 'church_placement'.
*/

const PIPELINE_STEPS = [
  { id: 1, label: 'Church Identified', description: 'By Week 8' },
  { id: 2, label: 'Pastor Contacted and Briefed', description: 'Initial outreach' },
  { id: 3, label: 'First Visit Completed', description: 'Client attended service' },
  { id: 4, label: 'Integration Plan Established', description: 'Small group, serving role' },
  { id: 5, label: 'Handover to Church Pastoral Team', description: 'Full transition' },
]

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Complete']

const CHURCH_OPTIONS = [
  'Life Centre Lekki',
  'Life Centre VI',
  'Life Centre Ikeja',
  'Daystar Christian Centre',
  'RCCG City of David',
  'RCCG House of Praise',
  'Other',
]

const STATUS_COLORS = {
  'Not Started': { color: '#718096', bg: '#EDF2F7', border: '#CBD5E0' },
  'In Progress': { color: '#D69E2E', bg: '#FFFFF0', border: '#FEFCBF' },
  'Complete': { color: '#38A169', bg: '#F0FFF4', border: '#C6F6D5' },
}

function emptyPlacement() {
  return {
    church: '',
    steps: { 1: 'Not Started', 2: 'Not Started', 3: 'Not Started', 4: 'Not Started', 5: 'Not Started' },
  }
}

// Normalise a stored JSONB doc into the shape the UI expects.
function normalizePlacement(doc) {
  const base = emptyPlacement()
  if (!doc) return base
  return {
    church: doc.church || '',
    steps: { ...base.steps, ...(doc.steps || {}) },
  }
}

function calcCompletion(steps) {
  const complete = Object.values(steps).filter((s) => s === 'Complete').length
  return Math.round((complete / 5) * 100)
}

function isGraduationReady(steps) {
  return Object.values(steps).every((s) => s === 'Complete')
}

export default function ChurchPlacement() {
  const ready = isSupabaseReady()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [briefs, setBriefs] = useState([])
  const [selectedPatient, setSelectedPatient] = useState('') // patient_id (uuid)

  const [placement, setPlacement] = useState(emptyPlacement())
  const [placementLoading, setPlacementLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [allProgress, setAllProgress] = useState([]) // rows from getAllProgress

  const initialsById = useMemo(() => {
    const m = {}
    briefs.forEach((b) => { m[b.id] = b.initials })
    return m
  }, [briefs])

  const selectedInitials = initialsById[selectedPatient] || ''

  // Load active patients + all-patients summary on mount.
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!ready) { setLoading(false); return }
      setLoading(true)
      const [{ data: patients, error: pErr }, { data: progressRows, error: aErr }] = await Promise.all([
        getPatients(),
        getAllProgress('church_placement'),
      ])
      if (cancelled) return
      if (pErr) { setError(pErr.message || 'Failed to load patients'); setLoading(false); return }
      const active = activeBriefs(patients)
      setBriefs(active)
      setAllProgress(aErr ? [] : (progressRows || []))
      if (active.length > 0) setSelectedPatient((prev) => prev || active[0].id)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [ready])

  // Load the selected patient's placement doc.
  useEffect(() => {
    let cancelled = false
    async function loadOne() {
      if (!ready || !selectedPatient) { setPlacement(emptyPlacement()); return }
      setPlacementLoading(true)
      const { data, error: gErr } = await getProgress(selectedPatient, 'church_placement')
      if (cancelled) return
      if (gErr) setError(gErr.message || 'Failed to load placement')
      setPlacement(normalizePlacement(data?.data))
      setPlacementLoading(false)
    }
    loadOne()
    return () => { cancelled = true }
  }, [ready, selectedPatient])

  const completion = calcCompletion(placement.steps)
  const graduationReady = isGraduationReady(placement.steps)

  const updateStepStatus = (stepId, status) => {
    setPlacement((prev) => ({ ...prev, steps: { ...prev.steps, [stepId]: status } }))
  }
  const updateChurch = (church) => {
    setPlacement((prev) => ({ ...prev, church }))
  }

  const handleSave = async () => {
    if (!requireFields([[selectedPatient, 'Patient']])) return
    setSaving(true)
    const { error: sErr } = await upsertProgress(selectedPatient, 'church_placement', placement, 'PK')
    setSaving(false)
    if (sErr) { alert(sErr.message || 'Failed to save church placement'); return }
    // Reflect the saved doc in the all-patients summary.
    setAllProgress((prev) => {
      const rest = prev.filter((r) => r.patient_id !== selectedPatient)
      return [...rest, { patient_id: selectedPatient, domain: 'church_placement', data: placement }]
    })
  }

  // Build the all-patients summary: active patients + their stored placement
  // (overlaid with unsaved edits for the currently-selected patient).
  const summaryByPatient = useMemo(() => {
    const m = {}
    allProgress.forEach((r) => { m[r.patient_id] = normalizePlacement(r.data) })
    if (selectedPatient) m[selectedPatient] = placement
    return m
  }, [allProgress, selectedPatient, placement])

  // ── Guard / loading / empty states ──────────────────────────
  if (!ready) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>Church Placement Pipeline</h1>
        <p style={{ color: '#718096', fontSize: 14, marginTop: 12 }}>
          Live data is unavailable — Supabase is not configured for this environment.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>Church Placement Pipeline</h1>
        <p style={{ color: '#718096', fontSize: 14, marginTop: 12 }}>Loading residents…</p>
      </div>
    )
  }

  if (error && briefs.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>Church Placement Pipeline</h1>
        <p style={{ color: '#C53030', fontSize: 14, marginTop: 12 }}>{error}</p>
      </div>
    )
  }

  if (briefs.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>Church Placement Pipeline</h1>
        <p style={{ color: '#718096', fontSize: 14, marginTop: 12 }}>No active residents to place at this time.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            Church Placement Pipeline
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            Treatment Protocol Section 10.6 — Graduation Criterion #6
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
            {briefs.map((p) => (
              <option key={p.id} value={p.id}>{p.initials}</option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={saving || placementLoading}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              background: saving || placementLoading ? '#A0AEC0' : '#2B6CB0',
              cursor: saving || placementLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Graduation Ready Banner */}
      {graduationReady && !placementLoading && (
        <div
          style={{
            padding: 16,
            marginBottom: 20,
            borderRadius: 12,
            background: '#F0FFF4',
            color: '#22543D',
            fontWeight: 700,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            border: '2px solid #38A169',
          }}
        >
          <span style={{ fontSize: 20, color: '#38A169' }}>&#10003;</span>
          <span>Church Placement Complete — Supports Graduation Criterion #6</span>
        </div>
      )}

      {/* Pipeline Stepper Visualization */}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: 0 }}>
            Pipeline Progress — {selectedInitials}
          </h2>
          <span style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 700,
            color: completion === 100 ? '#38A169' : completion > 0 ? '#D69E2E' : '#718096',
            background: completion === 100 ? '#F0FFF4' : completion > 0 ? '#FFFFF0' : '#F7FAFC',
            border: `1px solid ${completion === 100 ? '#C6F6D5' : completion > 0 ? '#FEFCBF' : '#E2E8F0'}`,
          }}>
            {completion}% Complete
          </span>
        </div>

        {placementLoading ? (
          <p style={{ color: '#718096', fontSize: 14, margin: 0 }}>Loading placement…</p>
        ) : (
        /* Horizontal Stepper */
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', padding: '0 10px' }}>
          {/* Connecting line */}
          <div style={{
            position: 'absolute',
            top: 18,
            left: 40,
            right: 40,
            height: 3,
            background: '#E2E8F0',
            zIndex: 0,
          }} />
          <div style={{
            position: 'absolute',
            top: 18,
            left: 40,
            width: `${Math.max(0, (Object.values(placement.steps).filter((s) => s === 'Complete').length - 1) / 4 * (100 - 16))}%`,
            height: 3,
            background: '#38A169',
            zIndex: 1,
            transition: 'width 0.3s ease',
          }} />

          {PIPELINE_STEPS.map((step) => {
            const status = placement.steps[step.id]
            const sc = STATUS_COLORS[status]
            const circleColor = status === 'Complete' ? '#38A169' : status === 'In Progress' ? '#D69E2E' : '#CBD5E0'
            const circleBg = status === 'Complete' ? '#38A169' : status === 'In Progress' ? '#D69E2E' : '#CBD5E0'
            const textColor = status === 'Complete' ? '#fff' : status === 'In Progress' ? '#fff' : '#718096'
            return (
              <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 2, position: 'relative' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: circleBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                    color: textColor,
                    border: `3px solid ${circleColor}`,
                    marginBottom: 8,
                  }}
                >
                  {status === 'Complete' ? '✓' : step.id}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2D3748', textAlign: 'center', lineHeight: 1.3, maxWidth: 120 }}>
                  {step.label}
                </span>
                <span style={{ fontSize: 11, color: '#718096', textAlign: 'center', marginTop: 2, maxWidth: 120 }}>
                  {step.description}
                </span>
                <span style={{
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color: sc.color,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: sc.bg,
                  border: `1px solid ${sc.border}`,
                }}>
                  {status}
                </span>
              </div>
            )
          })}
        </div>
        )}
      </div>

      {/* Church Details Card */}
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
          Church Details — {selectedInitials}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
              Church Name
            </label>
            <select
              value={placement.church}
              onChange={(e) => updateChurch(e.target.value)}
              disabled={placementLoading}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E0',
                fontSize: 14,
                width: '100%',
                background: '#fff',
              }}
            >
              <option value="">-- Select Church --</option>
              {CHURCH_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
              Pipeline Completion
            </label>
            <div style={{ padding: '8px 12px', fontSize: 14, color: '#2D3748' }}>
              <div style={{ height: 20, background: '#EDF2F7', borderRadius: 6, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{
                  width: `${completion}%`,
                  height: '100%',
                  background: completion === 100 ? '#38A169' : '#2B6CB0',
                  borderRadius: 6,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <span style={{ fontSize: 12, color: '#718096' }}>{completion}% — {Object.values(placement.steps).filter((s) => s === 'Complete').length}/5 steps complete</span>
            </div>
          </div>
        </div>

        {/* Update Step Statuses */}
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2D3748', margin: '0 0 16px', borderBottom: '2px solid #E2E8F0', paddingBottom: 8 }}>
          Update Pipeline Steps
        </h3>
        {PIPELINE_STEPS.map((step) => {
          const status = placement.steps[step.id]
          const sc = STATUS_COLORS[status]
          return (
            <div
              key={step.id}
              style={{
                padding: 16,
                marginBottom: 12,
                borderRadius: 10,
                border: '1px solid #E2E8F0',
                background: status === 'Complete' ? '#F0FFF4' : '#FAFAFA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: status === 'Complete' ? '#38A169' : status === 'In Progress' ? '#D69E2E' : '#CBD5E0',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {status === 'Complete' ? '✓' : step.id}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#2D3748' }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#718096' }}>
                    {step.description}
                  </div>
                </div>
              </div>
              <select
                value={status}
                onChange={(e) => updateStepStatus(step.id, e.target.value)}
                disabled={placementLoading}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `1px solid ${sc.border}`,
                  fontSize: 14,
                  width: '100%', maxWidth: 160,
                  background: sc.bg,
                  color: sc.color,
                  fontWeight: 600,
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      {/* Summary Table — All Patients */}
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
          All Patients — Pipeline Summary
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Patient</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Church</th>
                {PIPELINE_STEPS.map((s) => (
                  <th key={s.id} style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Step {s.id}</th>
                ))}
                <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Completion</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Graduation</th>
              </tr>
            </thead>
            <tbody>
              {briefs.map((p) => {
                const pl = summaryByPatient[p.id] || emptyPlacement()
                const comp = calcCompletion(pl.steps)
                const rdy = isGraduationReady(pl.steps)
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #EDF2F7',
                      background: p.id === selectedPatient ? '#EBF8FF' : 'transparent',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedPatient(p.id)}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{p.initials}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12 }}>{pl.church || '—'}</td>
                    {PIPELINE_STEPS.map((s) => {
                      const st = pl.steps[s.id]
                      const sc = STATUS_COLORS[st]
                      return (
                        <td key={s.id} style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: sc.color,
                          }} title={st} />
                        </td>
                      )
                    })}
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>{comp}%</td>
                    <td style={{ padding: '8px 10px' }}>
                      {rdy ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#38A169',
                          background: '#F0FFF4',
                          border: '1px solid #C6F6D5',
                          whiteSpace: 'nowrap',
                        }}>
                          Ready
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#D69E2E',
                          background: '#FFFFF0',
                          border: '1px solid #FEFCBF',
                          whiteSpace: 'nowrap',
                        }}>
                          In Progress
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
