import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Outpatient Engagement Pathway — Treatment Protocol Section 4.5
  For pre-contemplative and contemplative clients not yet ready for
  residential treatment. Tracks MI sessions, stage-of-change
  progression, and conversion to residential pathway.
  Initials only (HIPAA). All fields are selects — zero free text.
*/

const OUTPATIENT_CLIENTS = [
  { id: 'OC001', initials: 'DA', stage: 'Precontemplation', referredBy: 'Family', startDate: '2026-02-10' },
  { id: 'OC002', initials: 'EB', stage: 'Contemplation', referredBy: 'Self', startDate: '2026-03-01' },
  { id: 'OC003', initials: 'FC', stage: 'Precontemplation', referredBy: 'NDLEA', startDate: '2026-03-15' },
  { id: 'OC004', initials: 'GD', stage: 'Contemplation', referredBy: 'Church', startDate: '2026-01-20' },
]

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

const INITIAL_SESSION_LOGS = {
  DA: [
    { id: 1, date: '2026-02-12', type: 'MI Session', assessor: 'TA', outcome: 'Resistant', stageAtSession: 'Precontemplation' },
    { id: 2, date: '2026-02-19', type: 'MI Session', assessor: 'TA', outcome: 'Resistant', stageAtSession: 'Precontemplation' },
    { id: 3, date: '2026-02-26', type: 'Psychoeducation', assessor: 'AI', outcome: 'Engaged', stageAtSession: 'Precontemplation' },
    { id: 4, date: '2026-03-05', type: 'MI Session', assessor: 'TA', outcome: 'Engaged', stageAtSession: 'Precontemplation' },
    { id: 5, date: '2026-03-12', type: 'MI Session', assessor: 'TA', outcome: 'Engaged', stageAtSession: 'Precontemplation' },
    { id: 6, date: '2026-03-19', type: 'Family Counselling', assessor: 'SN', outcome: 'Engaged', stageAtSession: 'Precontemplation' },
    { id: 7, date: '2026-03-26', type: 'MI Session', assessor: 'TA', outcome: 'Engaged', stageAtSession: 'Precontemplation' },
    { id: 8, date: '2026-04-02', type: 'MI Session', assessor: 'TA', outcome: 'Engaged', stageAtSession: 'Precontemplation' },
    { id: 9, date: '2026-04-02', type: 'URICA Reassessment', assessor: 'AI', outcome: 'Engaged', stageAtSession: 'Precontemplation' },
    { id: 10, date: '2026-04-02', type: 'Harm Reduction', assessor: 'FA', outcome: 'Engaged', stageAtSession: 'Precontemplation' },
  ],
  EB: [
    { id: 11, date: '2026-03-04', type: 'MI Session', assessor: 'TA', outcome: 'Engaged', stageAtSession: 'Contemplation' },
    { id: 12, date: '2026-03-11', type: 'MI Session', assessor: 'TA', outcome: 'Progressing', stageAtSession: 'Contemplation' },
    { id: 13, date: '2026-03-18', type: 'Psychoeducation', assessor: 'AI', outcome: 'Progressing', stageAtSession: 'Contemplation' },
    { id: 14, date: '2026-03-25', type: 'MI Session', assessor: 'TA', outcome: 'Progressing', stageAtSession: 'Contemplation' },
    { id: 15, date: '2026-04-01', type: 'MI Session', assessor: 'TA', outcome: 'Ready for Residential', stageAtSession: 'Preparation' },
    { id: 16, date: '2026-04-01', type: 'URICA Reassessment', assessor: 'AI', outcome: 'Ready for Residential', stageAtSession: 'Preparation' },
  ],
  FC: [
    { id: 17, date: '2026-03-18', type: 'MI Session', assessor: 'TA', outcome: 'Resistant', stageAtSession: 'Precontemplation' },
    { id: 18, date: '2026-03-25', type: 'MI Session', assessor: 'TA', outcome: 'Resistant', stageAtSession: 'Precontemplation' },
    { id: 19, date: '2026-03-25', type: 'Harm Reduction', assessor: 'FA', outcome: 'Engaged', stageAtSession: 'Precontemplation' },
  ],
  GD: [
    { id: 20, date: '2026-01-22', type: 'MI Session', assessor: 'TA', outcome: 'Engaged', stageAtSession: 'Contemplation' },
    { id: 21, date: '2026-01-29', type: 'MI Session', assessor: 'TA', outcome: 'Engaged', stageAtSession: 'Contemplation' },
    { id: 22, date: '2026-02-05', type: 'Spiritual Engagement', assessor: 'PK', outcome: 'Engaged', stageAtSession: 'Contemplation' },
    { id: 23, date: '2026-02-05', type: 'MI Session', assessor: 'TA', outcome: 'Progressing', stageAtSession: 'Contemplation' },
    { id: 24, date: '2026-02-12', type: 'MI Session', assessor: 'TA', outcome: 'Progressing', stageAtSession: 'Contemplation' },
    { id: 25, date: '2026-02-19', type: 'URICA Reassessment', assessor: 'AI', outcome: 'Progressing', stageAtSession: 'Contemplation' },
    { id: 26, date: '2026-02-19', type: 'MI Session', assessor: 'TA', outcome: 'Progressing', stageAtSession: 'Contemplation' },
    { id: 27, date: '2026-02-26', type: 'MI Session', assessor: 'TA', outcome: 'Progressing', stageAtSession: 'Preparation' },
    { id: 28, date: '2026-03-05', type: 'Family Counselling', assessor: 'SN', outcome: 'Engaged', stageAtSession: 'Preparation' },
    { id: 29, date: '2026-03-05', type: 'MI Session', assessor: 'TA', outcome: 'Progressing', stageAtSession: 'Preparation' },
    { id: 30, date: '2026-03-12', type: 'MI Session', assessor: 'TA', outcome: 'Progressing', stageAtSession: 'Preparation' },
    { id: 31, date: '2026-03-19', type: 'MI Session', assessor: 'TA', outcome: 'Progressing', stageAtSession: 'Action' },
    { id: 32, date: '2026-03-19', type: 'URICA Reassessment', assessor: 'AI', outcome: 'Ready for Residential', stageAtSession: 'Action' },
    { id: 33, date: '2026-03-26', type: 'MI Session', assessor: 'TA', outcome: 'Ready for Residential', stageAtSession: 'Action' },
    { id: 34, date: '2026-04-02', type: 'MI Session', assessor: 'TA', outcome: 'Ready for Residential', stageAtSession: 'Action' },
  ],
}

const INITIAL_CLIENT_STATE = {
  DA: { currentStage: 'Precontemplation', status: 'Active', nextSession: '2026-04-09', nextReassessment: '2026-04-16' },
  EB: { currentStage: 'Preparation', status: 'Active', nextSession: '2026-04-08', nextReassessment: '2026-04-15' },
  FC: { currentStage: 'Precontemplation', status: 'Active', nextSession: '2026-04-01', nextReassessment: '2026-04-08' },
  GD: { currentStage: 'Action', status: 'Graduated to Residential', nextSession: '', nextReassessment: '' },
}

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
  const { user } = useAuth()
  const [selectedClient, setSelectedClient] = useState(null)
  const [sessionLogs, setSessionLogs] = useState(INITIAL_SESSION_LOGS)
  const [clientState, setClientState] = useState(INITIAL_CLIENT_STATE)
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

  // Summary calculations
  const activeClients = OUTPATIENT_CLIENTS.filter((c) => clientState[c.initials]?.status === 'Active').length
  const graduatedClients = OUTPATIENT_CLIENTS.filter((c) => clientState[c.initials]?.status === 'Graduated to Residential')
  const conversionRate = OUTPATIENT_CLIENTS.length > 0
    ? Math.round((graduatedClients.length / OUTPATIENT_CLIENTS.length) * 100)
    : 0
  const avgSessionsToConversion = graduatedClients.length > 0
    ? Math.round(
        graduatedClients.reduce((sum, c) => {
          const logs = sessionLogs[c.initials] || []
          return sum + logs.filter((l) => l.type === 'MI Session').length
        }, 0) / graduatedClients.length
      )
    : 0

  const handleAddSession = () => {
    if (!form.date || !form.type || !form.assessor || !form.outcome) return

    const initials = selectedClient
    const logs = sessionLogs[initials] || []
    const newSession = {
      id: Date.now(),
      date: form.date,
      type: form.type,
      assessor: form.assessor,
      outcome: form.outcome,
      stageAtSession: clientState[initials].currentStage,
    }

    setSessionLogs((prev) => ({
      ...prev,
      [initials]: [...(prev[initials] || []), newSession],
    }))

    setShowForm(false)
    resetForm()
  }

  const handleConvertToResidential = (initials) => {
    setClientState((prev) => ({
      ...prev,
      [initials]: {
        ...prev[initials],
        status: 'Graduated to Residential',
        nextSession: '',
        nextReassessment: '',
      },
    }))
  }

  const handleStageChange = (initials, newStage) => {
    setClientState((prev) => ({
      ...prev,
      [initials]: { ...prev[initials], currentStage: newStage },
    }))
  }

  const clientLogs = selectedClient ? (sessionLogs[selectedClient] || []) : []
  const clientInfo = selectedClient ? OUTPATIENT_CLIENTS.find((c) => c.initials === selectedClient) : null
  const clientStatus = selectedClient ? clientState[selectedClient] : null
  const miSessionCount = clientLogs.filter((l) => l.type === 'MI Session').length
  const canConvert = clientStatus && (clientStatus.currentStage === 'Preparation' || clientStatus.currentStage === 'Action') && clientStatus.status === 'Active'

  // Build stage progression timeline from session logs
  const stageProgression = selectedClient ? (() => {
    const logs = sessionLogs[selectedClient] || []
    const progression = []
    let lastStage = null
    for (const log of logs) {
      if (log.stageAtSession !== lastStage) {
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

      {/* Summary Cards */}
      {!selectedClient && (
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
                  {OUTPATIENT_CLIENTS.map((c) => {
                    const state = clientState[c.initials]
                    const logs = sessionLogs[c.initials] || []
                    const miCount = logs.filter((l) => l.type === 'MI Session').length
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                        <td style={{ padding: '8px 10px', color: '#718096' }}>{c.id}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#2D3748' }}>{c.initials}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={stageBadge(state.currentStage)}>{state.currentStage}</span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>{c.referredBy}</td>
                        <td style={{ padding: '8px 10px' }}>{c.startDate}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{miCount}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={statusBadge(state.status)}>{state.status}</span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>{state.nextSession || '--'}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <button
                            onClick={() => setSelectedClient(c.initials)}
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
                Client {clientInfo.initials} — {clientInfo.id}
              </h2>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={stageBadge(clientStatus.currentStage)}>{clientStatus.currentStage}</span>
                <span style={statusBadge(clientStatus.status)}>{clientStatus.status}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#4A5568' }}>
              <span><strong>Referred By:</strong> {clientInfo.referredBy}</span>
              <span><strong>Start Date:</strong> {clientInfo.startDate}</span>
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
                  disabled={!form.date || !form.type || !form.assessor || !form.outcome}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: (!form.date || !form.type || !form.assessor || !form.outcome) ? '#CBD5E0' : '#2B6CB0',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: (!form.date || !form.type || !form.assessor || !form.outcome) ? 'not-allowed' : 'pointer',
                  }}
                >
                  Save Session
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
                  style={{
                    padding: '10px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#38A169',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Convert to Residential
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
