import React, { useState, useEffect, useCallback } from 'react'
import {
  isSupabaseReady,
  getPatients,
  getTherapySessions,
  getTherapySessionsByPatient,
  addTherapySession,
  getProgress,
  getAllProgress,
  upsertProgress,
} from '../../utils/supabase'
import { activeBriefs } from '../../utils/patients'
import { requireFields } from '../../utils/formGuard'

/*
  Outpatient Engagement Pathway — Treatment Protocol Section 4.5
  For pre-contemplative and contemplative clients not yet ready for
  residential treatment. Tracks MI sessions, stage-of-change
  progression, and conversion to residential pathway.
  Initials only (HIPAA). All fields are selects — zero free text.

  Live data:
  - Session log  -> `therapy_sessions` (type 'outpatient'); the outpatient
    session type is stored in `modality`, assessor in `therapist_code`,
    outcome in `status`, stage-at-session in `data.stageAtSession`.
  - Per-client engagement state -> `progress_records` (domain
    'outpatient_client'), one JSONB document per patient.
*/

const DOMAIN = 'outpatient_client'

const STAGES = ['Precontemplation', 'Contemplation', 'Preparation', 'Action']

const SESSION_TYPES = [
  'MI Session',
  'Psychoeducation',
  'Family Counselling',
  'Harm Reduction',
  'Spiritual Engagement',
  'URICA Reassessment',
]

const OUTCOME_OPTIONS = [
  'Engaged',
  'Resistant',
  'Progressing',
  'Ready for Residential',
  'Did Not Attend',
]

const STATUS_OPTIONS = ['Active', 'Graduated to Residential', 'Disengaged', 'Referred Out']

const STAFF_OPTIONS = [
  { value: 'AI', label: 'AI — Clinical Lead' },
  { value: 'FA', label: 'FA — Nurse' },
  { value: 'PK', label: 'PK — Chaplain' },
  { value: 'SN', label: 'SN — Social Worker' },
  { value: 'MO', label: 'MO — Support Staff' },
  { value: 'TA', label: 'TA — Counsellor' },
  { value: 'HM', label: 'HM — Nurse' },
]

const STAGE_COLORS = {
  Precontemplation: { color: '#E53E3E', bg: '#FFF5F5', border: '#FED7D7' },
  Contemplation: { color: '#D69E2E', bg: '#FFFFF0', border: '#FEFCBF' },
  Preparation: { color: '#2B6CB0', bg: '#EBF8FF', border: '#BEE3F8' },
  Action: { color: '#38A169', bg: '#F0FFF4', border: '#C6F6D5' },
}

const STATUS_COLORS = {
  Active: { color: '#2B6CB0', bg: '#EBF8FF', border: '#BEE3F8' },
  'Graduated to Residential': { color: '#38A169', bg: '#F0FFF4', border: '#C6F6D5' },
  Disengaged: { color: '#A0AEC0', bg: '#F7FAFC', border: '#E2E8F0' },
  'Referred Out': { color: '#805AD5', bg: '#FAF5FF', border: '#E9D8FD' },
}

// Default engagement state for a client with no progress_records document yet.
const defaultState = () => ({
  currentStage: 'Precontemplation',
  status: 'Active',
  referredBy: '',
  nextSession: '',
  nextReassessment: '',
})

// therapy_sessions row -> the shape the session-log JSX reads.
const mapSession = (row) => ({
  id: row.id,
  date: row.session_date || '',
  type: row.modality || '',
  assessor: row.therapist_code || '',
  outcome: row.status || '',
  stageAtSession: row.data?.stageAtSession || '',
})

// Oldest-first, so the timeline reads forward and the table's reverse() shows newest first.
const sortSessions = (rows) =>
  (rows || []).map(mapSession).sort((a, b) => String(a.date).localeCompare(String(b.date)))

const stageBadge = (stage) => {
  const cfg = STAGE_COLORS[stage] || STAGE_COLORS.Precontemplation
  return {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
    color: cfg.color,
    background: cfg.bg,
    border: `1px solid ${cfg.border}`,
  }
}

const statusBadge = (status) => {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.Active
  return {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
    color: cfg.color,
    background: cfg.bg,
    border: `1px solid ${cfg.border}`,
  }
}

export default function OutpatientPathway() {
  const [clients, setClients] = useState([]) // [{ id, initials, full_name, startDate }]
  const [selectedClient, setSelectedClient] = useState(null) // patient_id
  const [sessionLogs, setSessionLogs] = useState({}) // patient_id -> mapped session array
  const [clientState, setClientState] = useState({}) // patient_id -> engagement state doc
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    date: '',
    type: '',
    assessor: '',
    outcome: '',
  })

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const resetForm = () => {
    setForm({ date: '', type: '', assessor: '', outcome: '' })
  }

  const stateFor = useCallback(
    (id) => clientState[id] || defaultState(),
    [clientState]
  )

  // Initial load: patients (client selector), all engagement docs, all outpatient sessions.
  useEffect(() => {
    ;(async () => {
      if (!isSupabaseReady()) { setLoading(false); return }
      const [{ data: rows }, { data: progressRows }, { data: sessionRows }] = await Promise.all([
        getPatients(),
        getAllProgress(DOMAIN),
        getTherapySessions('outpatient'),
      ])
      const startById = {}
      for (const r of rows || []) {
        startById[r.id] = r.admitted_at ? String(r.admitted_at).slice(0, 10) : ''
      }
      const briefs = activeBriefs(rows).map((b) => ({ ...b, startDate: startById[b.id] || '' }))
      setClients(briefs)

      const stateMap = {}
      for (const row of progressRows || []) {
        if (row?.data) stateMap[row.patient_id] = { ...defaultState(), ...row.data }
      }
      setClientState(stateMap)

      const logMap = {}
      for (const row of sessionRows || []) {
        ;(logMap[row.patient_id] ||= []).push(row)
      }
      for (const id of Object.keys(logMap)) logMap[id] = sortSessions(logMap[id])
      setSessionLogs(logMap)

      setLoading(false)
    })()
  }, [])

  // On select: refresh this client's sessions + engagement doc from the server.
  const handleSelectClient = async (id) => {
    setSelectedClient(id)
    setShowForm(false)
    resetForm()
    if (!isSupabaseReady()) return
    const [{ data: sessionRows }, { data: progressRow }] = await Promise.all([
      getTherapySessionsByPatient(id, 'outpatient'),
      getProgress(id, DOMAIN),
    ])
    setSessionLogs((prev) => ({ ...prev, [id]: sortSessions(sessionRows) }))
    setClientState((prev) => ({
      ...prev,
      [id]: progressRow?.data ? { ...defaultState(), ...progressRow.data } : (prev[id] || defaultState()),
    }))
  }

  // Persist an engagement-state document, updating local state on success.
  const persistState = async (id, nextState) => {
    setClientState((prev) => ({ ...prev, [id]: nextState }))
    setSaving(true)
    const { error } = await upsertProgress(id, DOMAIN, nextState, 'TA')
    setSaving(false)
    if (error) alert(`Could not save client state: ${error.message}`)
  }

  // Summary calculations
  const activeClients = clients.filter((c) => stateFor(c.id).status === 'Active').length
  const graduatedClients = clients.filter((c) => stateFor(c.id).status === 'Graduated to Residential')
  const conversionRate = clients.length > 0
    ? Math.round((graduatedClients.length / clients.length) * 100)
    : 0
  const avgSessionsToConversion = graduatedClients.length > 0
    ? Math.round(
        graduatedClients.reduce((sum, c) => {
          const logs = sessionLogs[c.id] || []
          return sum + logs.filter((l) => l.type === 'MI Session').length
        }, 0) / graduatedClients.length
      )
    : 0

  const handleAddSession = async () => {
    if (!requireFields([
      [form.date, 'Date'],
      [form.type, 'Contact type'],
      [form.assessor, 'Assessor'],
      [form.outcome, 'Outcome'],
    ])) return
    const id = selectedClient
    setSaving(true)
    const { error } = await addTherapySession({
      patient_id: id,
      type: 'outpatient',
      session_date: form.date,
      session_time: null,
      therapist_code: form.assessor,
      modality: form.type,
      status: form.outcome,
      data: { stageAtSession: stateFor(id).currentStage },
    })
    if (error) {
      setSaving(false)
      alert(`Could not log session: ${error.message}`)
      return
    }
    const { data: sessionRows } = await getTherapySessionsByPatient(id, 'outpatient')
    setSessionLogs((prev) => ({ ...prev, [id]: sortSessions(sessionRows) }))
    setSaving(false)
    setShowForm(false)
    resetForm()
  }

  const handleConvertToResidential = (id) => {
    persistState(id, {
      ...stateFor(id),
      status: 'Graduated to Residential',
      nextSession: '',
      nextReassessment: '',
    })
  }

  const handleStageChange = (id, newStage) => {
    persistState(id, { ...stateFor(id), currentStage: newStage })
  }

  const clientLogs = selectedClient ? (sessionLogs[selectedClient] || []) : []
  const clientInfo = selectedClient ? clients.find((c) => c.id === selectedClient) : null
  const clientStatus = selectedClient ? stateFor(selectedClient) : null
  const miSessionCount = clientLogs.filter((l) => l.type === 'MI Session').length
  const canConvert = clientStatus && (clientStatus.currentStage === 'Preparation' || clientStatus.currentStage === 'Action') && clientStatus.status === 'Active'

  // Build stage progression timeline from session logs
  const stageProgression = selectedClient ? (() => {
    const logs = sessionLogs[selectedClient] || []
    const progression = []
    let lastStage = null
    for (const log of logs) {
      if (log.stageAtSession && log.stageAtSession !== lastStage) {
        progression.push({ date: log.date, stage: log.stageAtSession })
        lastStage = log.stageAtSession
      }
    }
    return progression
  })() : []

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            Outpatient Engagement Pathway
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            Treatment Protocol Section 4.5 — Pre-contemplative and contemplative clients
          </p>
        </div>
        {selectedClient && (
          <button
            onClick={() => { setSelectedClient(null); setShowForm(false); resetForm() }}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: '1px solid #CBD5E0',
              background: '#fff',
              color: '#4A5568',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Back to All Clients
          </button>
        )}
      </div>

      {/* Loading / empty states */}
      {!selectedClient && loading && (
        <div className="card" style={{ padding: 20, borderRadius: 12, border: '1px solid #E2E8F0', background: '#fff', color: '#718096', fontSize: 14 }}>
          Loading outpatient clients…
        </div>
      )}
      {!selectedClient && !loading && clients.length === 0 && (
        <div className="card" style={{ padding: 20, borderRadius: 12, border: '1px solid #E2E8F0', background: '#fff', color: '#A0AEC0', fontSize: 14 }}>
          No active outpatient clients.
        </div>
      )}

      {/* Summary Cards */}
      {!selectedClient && !loading && clients.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div
              className="card"
              style={{
                padding: 20,
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                background: '#fff',
              }}
            >
              <div style={{ fontSize: 13, color: '#718096', fontWeight: 600, marginBottom: 6 }}>Total Active Outpatient Clients</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#2B6CB0' }}>{activeClients}</div>
            </div>
            <div
              className="card"
              style={{
                padding: 20,
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                background: '#fff',
              }}
            >
              <div style={{ fontSize: 13, color: '#718096', fontWeight: 600, marginBottom: 6 }}>Avg MI Sessions to Conversion</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#38A169' }}>{avgSessionsToConversion || '--'}</div>
            </div>
            <div
              className="card"
              style={{
                padding: 20,
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                background: '#fff',
              }}
            >
              <div style={{ fontSize: 13, color: '#718096', fontWeight: 600, marginBottom: 6 }}>Conversion Rate to Residential</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#805AD5' }}>{conversionRate}%</div>
            </div>
          </div>

          {/* Client Table */}
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
              Outpatient Clients
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>ID</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Initials</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Stage of Change</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Referred By</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Start Date</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>MI Sessions</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Next Session</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => {
                    const state = stateFor(c.id)
                    const logs = sessionLogs[c.id] || []
                    const miCount = logs.filter((l) => l.type === 'MI Session').length
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                        <td style={{ padding: '8px 10px', color: '#718096' }}>{String(c.id).slice(0, 8)}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#2D3748' }}>{c.initials}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={stageBadge(state.currentStage)}>{state.currentStage}</span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>{state.referredBy || '--'}</td>
                        <td style={{ padding: '8px 10px' }}>{c.startDate || '--'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{miCount}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={statusBadge(state.status)}>{state.status}</span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>{state.nextSession || '--'}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <button
                            onClick={() => handleSelectClient(c.id)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: 8,
                              border: 'none',
                              background: '#2B6CB0',
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Client Detail View */}
      {selectedClient && clientInfo && clientStatus && (
        <>
          {/* Client Header */}
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
                Client {clientInfo.initials} — {String(clientInfo.id).slice(0, 8)}
              </h2>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={stageBadge(clientStatus.currentStage)}>{clientStatus.currentStage}</span>
                <span style={statusBadge(clientStatus.status)}>{clientStatus.status}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#4A5568' }}>
              <span><strong>Referred By:</strong> {clientStatus.referredBy || '--'}</span>
              <span><strong>Start Date:</strong> {clientInfo.startDate || '--'}</span>
              <span><strong>MI Sessions:</strong> {miSessionCount}</span>
              <span><strong>Total Sessions:</strong> {clientLogs.length}</span>
              <span><strong>Next Session:</strong> {clientStatus.nextSession || '--'}</span>
              <span><strong>Next Reassessment:</strong> {clientStatus.nextReassessment || '--'}</span>
            </div>
          </div>

          {/* Stage Progression Timeline */}
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
              Stage Progression Timeline
            </h2>
            {stageProgression.length === 0 && (
              <p style={{ color: '#A0AEC0', fontSize: 14 }}>No stage progression data.</p>
            )}
            {stageProgression.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
                {stageProgression.map((entry, i) => {
                  const cfg = STAGE_COLORS[entry.stage] || STAGE_COLORS.Precontemplation
                  return (
                    <React.Fragment key={i}>
                      {i > 0 && (
                        <div style={{ width: 40, height: 2, background: '#CBD5E0', flexShrink: 0 }} />
                      )}
                      <div
                        style={{
                          padding: '10px 16px',
                          borderRadius: 10,
                          background: cfg.bg,
                          border: `2px solid ${cfg.border}`,
                          textAlign: 'center',
                          minWidth: 140,
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700, color: cfg.color, marginBottom: 4 }}>
                          {entry.stage}
                        </div>
                        <div style={{ fontSize: 12, color: '#718096' }}>{entry.date}</div>
                      </div>
                    </React.Fragment>
                  )
                })}
              </div>
            )}

            {/* Stage Change Control */}
            {clientStatus.status === 'Active' && (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>Update Stage:</label>
                <select
                  value={clientStatus.currentStage}
                  onChange={(e) => handleStageChange(selectedClient, e.target.value)}
                  disabled={saving}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E0',
                    fontSize: 14,
                    fontWeight: 600,
                    background: '#fff',
                  }}
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Session Log Table */}
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
                Session Log
              </h2>
              {clientStatus.status === 'Active' && (
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
                  {showForm ? 'Cancel' : 'Add Session'}
                </button>
              )}
            </div>

            {clientLogs.length === 0 && !showForm && (
              <p style={{ color: '#A0AEC0', fontSize: 14 }}>No sessions recorded.</p>
            )}

            {clientLogs.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Session Type</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Assessor</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Outcome</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Stage at Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...clientLogs].reverse().map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                        <td style={{ padding: '8px 10px' }}>{s.date}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{s.type}</td>
                        <td style={{ padding: '8px 10px' }}>{s.assessor}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span
                            style={{
                              fontWeight: 600,
                              color: s.outcome === 'Ready for Residential' ? '#38A169'
                                : s.outcome === 'Resistant' ? '#E53E3E'
                                : s.outcome === 'Did Not Attend' ? '#A0AEC0'
                                : s.outcome === 'Progressing' ? '#2B6CB0'
                                : '#4A5568',
                            }}
                          >
                            {s.outcome}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={stageBadge(s.stageAtSession)}>{s.stageAtSession}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add Session Form */}
          {showForm && (
            <div
              className="card"
              style={{
                padding: 24,
                marginBottom: 20,
                borderRadius: 12,
                border: '2px solid #2B6CB0',
                background: '#fff',
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: '0 0 8px' }}>
                Add Session — {selectedClient}
              </h2>
              <p style={{ fontSize: 13, color: '#718096', margin: '0 0 20px' }}>
                Record a new outpatient engagement session.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                {/* Date */}
                <div>
                  <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => updateForm('date', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E0',
                      fontSize: 14,
                      width: '100%',
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Session Type */}
                <div>
                  <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                    Session Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => updateForm('type', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E0',
                      fontSize: 14,
                      width: '100%',
                      background: '#fff',
                    }}
                  >
                    <option value="">-- Select Type --</option>
                    {SESSION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Assessor */}
                <div>
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
                      width: '100%',
                      background: '#fff',
                    }}
                  >
                    <option value="">-- Select Assessor --</option>
                    {STAFF_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Outcome */}
                <div>
                  <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                    Outcome
                  </label>
                  <select
                    value={form.outcome}
                    onChange={(e) => updateForm('outcome', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E0',
                      fontSize: 14,
                      width: '100%',
                      background: '#fff',
                    }}
                  >
                    <option value="">-- Select Outcome --</option>
                    {OUTCOME_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleAddSession}
                  disabled={saving}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: (saving || !form.date || !form.type || !form.assessor || !form.outcome) ? '#CBD5E0' : '#2B6CB0',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: (saving || !form.date || !form.type || !form.assessor || !form.outcome) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving…' : 'Save Session'}
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

          {/* Convert to Residential Button */}
          {canConvert && (
            <div
              className="card"
              style={{
                padding: 20,
                borderRadius: 12,
                border: '2px solid #38A169',
                background: '#F0FFF4',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#38A169', margin: '0 0 4px' }}>
                    Client Ready for Residential Pathway
                  </h3>
                  <p style={{ fontSize: 13, color: '#4A5568', margin: 0 }}>
                    {clientInfo.initials} has reached the {clientStatus.currentStage} stage of change after {miSessionCount} MI sessions.
                  </p>
                </div>
                <button
                  onClick={() => handleConvertToResidential(selectedClient)}
                  disabled={saving}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: saving ? '#9AE6B4' : '#38A169',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {saving ? 'Saving…' : 'Convert to Residential'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
