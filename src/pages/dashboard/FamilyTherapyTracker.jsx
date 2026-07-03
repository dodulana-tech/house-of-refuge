import React, { useState, useEffect } from 'react'
import {
  isSupabaseReady,
  getPatients,
  getTherapySessionsByPatient,
  addTherapySession,
  getProgress,
  upsertProgress,
} from '../../utils/supabase'
import { activeBriefs } from '../../utils/patients'

/*
  Family Therapy Tracker — tracks family therapy as a clinical intervention
  per SOP 2.6.1. Pathway A: minimum 2 family sessions + 1 pre-discharge meeting.
  Pathway B: community group work with social worker and church/NGO partners.
  Initials only (HIPAA). All fields selects/checkboxes — zero free text.

  Two live stores:
    (a) family SESSIONS  -> therapy_sessions (type 'family')
    (b) per-patient CONFIG/state (pathway, PFSP, community work, engagement,
        psychoeducation, graduation) -> progress_records (domain 'family_therapy'),
        a single JSONB doc per patient.
*/

const DOMAIN = 'family_therapy'

const SESSION_STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'Family No-Show', 'Rescheduled']

const FACILITATORS = [
  { value: 'AI', label: 'AI' },
  { value: 'FA', label: 'FA' },
  { value: 'TA', label: 'TA' },
  { value: 'MO', label: 'MO' },
]

const FOCUS_AREAS = [
  'Initial assessment & expectations',
  'Communication & boundaries',
  'Enabling behaviour education',
  'Relapse prevention role',
  'Discharge planning & aftercare',
  'Family reconciliation',
  'Children & family impact',
]

const PFSP_RELATIONSHIPS = ['Mother', 'Father', 'Wife', 'Husband', 'Sibling', 'Son', 'Daughter', 'Guardian', 'Friend', 'Other', 'N/A']

const PSYCHOEDUCATION_TOPICS = [
  'Understanding addiction as a disease',
  'Recognizing enabling behaviour',
  'Healthy communication strategies',
  'Relapse warning signs',
  'Building a supportive home environment',
  'Self-care for family members',
  'Boundaries and codependency',
  'Community support resources',
]

const COMMUNITY_ENGAGEMENT_STATUSES = ['Not Started', 'In Progress', 'Active', 'Completed', 'Declined']
const HOUSING_REFERRAL_STATUSES = ['Not Required', 'Pending', 'Referral Made', 'Accepted', 'Waitlisted', 'Placed']

const SOCIAL_WORKER_SESSION_OPTIONS = ['0', '1', '2', '3', '4', '5', '6', '7', '8']

// Default per-patient family-therapy config used when no progress doc exists yet.
function emptyConfig() {
  return {
    pathway: 'A',
    pfspInitials: '',
    pfspRelationship: '',
    communityWork: {
      socialWorkerSessions: '0',
      socialWorkerStatus: 'Not Started',
      churchPartner: '',
      churchEngagement: 'Not Started',
      ngoPartner: '',
      ngoEngagement: 'Not Started',
      housingReferral: 'Not Required',
    },
    graduationMeetingCompleted: 'No',
    psychoeducation: {},
  }
}

// Merge a stored config doc over the defaults (community work merged deep).
function mergeConfig(stored) {
  const base = emptyConfig()
  if (!stored) return base
  return {
    ...base,
    ...stored,
    communityWork: { ...base.communityWork, ...(stored.communityWork || {}) },
    psychoeducation: { ...(stored.psychoeducation || {}) },
  }
}

// Map a therapy_sessions row to the shape the sessions table reads.
function mapSession(row) {
  return {
    id: row.id,
    date: row.session_date || '',
    time: row.session_time || '',
    status: row.status || '',
    facilitator: row.therapist_code || '',
    focusArea: row.modality || row.data?.focusArea || '',
  }
}

function emptyLogForm() {
  return { date: '', time: '', status: '', facilitator: '', focusArea: '' }
}

function calculateEngagementScore(sessions) {
  const required = 3
  const completed = sessions.filter((s) => s.status === 'Completed').length
  return Math.min(100, Math.round((completed / required) * 100))
}

const statusBadge = (status) => {
  const colors = {
    Completed: { bg: '#F0FFF4', color: '#38A169', border: '#C6F6D5' },
    Scheduled: { bg: '#EBF8FF', color: '#2B6CB0', border: '#BEE3F8' },
    Cancelled: { bg: '#FFF5F5', color: '#E53E3E', border: '#FED7D7' },
    'Family No-Show': { bg: '#FFFFF0', color: '#D69E2E', border: '#FEFCBF' },
    Rescheduled: { bg: '#FAF5FF', color: '#805AD5', border: '#E9D8FD' },
  }
  const c = colors[status] || { bg: '#EDF2F7', color: '#718096', border: '#E2E8F0' }
  return {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    color: c.color,
    background: c.bg,
    border: `1px solid ${c.border}`,
  }
}

export default function FamilyTherapyTracker() {
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [loadingPatients, setLoadingPatients] = useState(true)

  const [sessions, setSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  const [config, setConfig] = useState(emptyConfig())
  const [loadingConfig, setLoadingConfig] = useState(false)

  const [saving, setSaving] = useState(false)
  const [logging, setLogging] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [logForm, setLogForm] = useState(emptyLogForm())

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

  // Load live family sessions + the per-patient config doc on selection.
  useEffect(() => {
    if (!selectedPatient) { setSessions([]); setConfig(emptyConfig()); return }
    let alive = true
    setShowLog(false)
    setLogForm(emptyLogForm())
    ;(async () => {
      setLoadingSessions(true)
      setLoadingConfig(true)
      const [sessRes, progRes] = await Promise.all([
        getTherapySessionsByPatient(selectedPatient, 'family'),
        getProgress(selectedPatient, DOMAIN),
      ])
      if (!alive) return
      if (sessRes.error) console.error('Failed to load family sessions', sessRes.error)
      if (progRes.error) console.error('Failed to load family config', progRes.error)
      setSessions((sessRes.data || []).map(mapSession))
      setConfig(mergeConfig(progRes.data?.data))
      setLoadingSessions(false)
      setLoadingConfig(false)
    })()
    return () => { alive = false }
  }, [selectedPatient])

  const selectedBrief = patients.find((p) => p.id === selectedPatient)
  const selectedInitials = selectedBrief?.initials || '—'

  const isPathwayA = config.pathway === 'A'
  const engagementScore = calculateEngagementScore(sessions)
  const completedCount = sessions.filter((s) => s.status === 'Completed').length
  const preDischargeCompleted = sessions.some(
    (s) => s.status === 'Completed' && /discharge/i.test(s.focusArea),
  )
  const allSessionsCompleted = sessions.length > 0 && sessions.every((s) => s.status === 'Completed')

  const updateConfig = (field, value) => setConfig((prev) => ({ ...prev, [field]: value }))
  const updateCommunityWork = (field, value) =>
    setConfig((prev) => ({ ...prev, communityWork: { ...prev.communityWork, [field]: value } }))
  const updateGraduation = (value) => updateConfig('graduationMeetingCompleted', value)
  const togglePsychoeducation = (topic, checked) =>
    setConfig((prev) => ({ ...prev, psychoeducation: { ...prev.psychoeducation, [topic]: checked } }))

  const updateLogForm = (field, value) => setLogForm((prev) => ({ ...prev, [field]: value }))
  const logComplete = logForm.date && logForm.status && logForm.facilitator && logForm.focusArea

  const handleLogSession = async () => {
    if (!logComplete || logging || !selectedPatient) return
    setLogging(true)
    const { error } = await addTherapySession({
      patient_id: selectedPatient,
      type: 'family',
      session_date: logForm.date || null,
      session_time: logForm.time || null,
      therapist_code: logForm.facilitator || null,
      modality: logForm.focusArea || null,
      status: logForm.status,
      attendees: [],
      data: { focusArea: logForm.focusArea },
    })
    if (error) {
      setLogging(false)
      alert('Failed to log session: ' + (error.message || 'unknown error'))
      return
    }
    const { data } = await getTherapySessionsByPatient(selectedPatient, 'family')
    setSessions((data || []).map(mapSession))
    setLogging(false)
    setShowLog(false)
    setLogForm(emptyLogForm())
  }

  const handleSaveConfig = async () => {
    if (saving || !selectedPatient) return
    setSaving(true)
    const { error } = await upsertProgress(selectedPatient, DOMAIN, config, 'TA')
    setSaving(false)
    if (error) {
      alert('Failed to save configuration: ' + (error.message || 'unknown error'))
    }
  }

  const inputStyle = {
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid #CBD5E0',
    fontSize: 13,
    background: '#fff',
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            Family Therapy Tracker
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            SOP 2.6.1 — Family intervention tracking and compliance
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>Patient:</label>
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
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

      {!isSupabaseReady() && (
        <div
          style={{
            padding: '10px 14px',
            marginBottom: 16,
            borderRadius: 8,
            background: '#FFFFF0',
            border: '1px solid #FEFCBF',
            color: '#975A16',
            fontSize: 13,
          }}
        >
          Supabase is not configured — data cannot be loaded or saved.
        </div>
      )}

      {!selectedPatient && !loadingPatients && (
        <div
          className="card"
          style={{ padding: 20, borderRadius: 12, border: '1px solid #E2E8F0', background: '#fff', color: '#718096', fontSize: 14 }}
        >
          Select a patient to view family therapy tracking.
        </div>
      )}

      {selectedPatient && (
        <>
          {/* Patient Summary Card */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: '0 0 12px' }}>
                  {selectedInitials} — Pathway {config.pathway}
                </h2>
                <div style={{ display: 'flex', gap: 24, fontSize: 14, color: '#4A5568', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>Pathway:</strong>
                    <select
                      value={config.pathway}
                      onChange={(e) => updateConfig('pathway', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="A">A — Family Required</option>
                      <option value="B">B — Community</option>
                    </select>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>PFSP:</strong>
                    <input
                      type="text"
                      value={config.pfspInitials}
                      onChange={(e) => updateConfig('pfspInitials', e.target.value.toUpperCase().slice(0, 3))}
                      placeholder="Initials"
                      style={{ ...inputStyle, width: 70 }}
                    />
                    <select
                      value={config.pfspRelationship}
                      onChange={(e) => updateConfig('pfspRelationship', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">-- Relationship --</option>
                      {PFSP_RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </span>
                </div>
              </div>

              {/* Engagement Score */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      border: `4px solid ${engagementScore >= 100 ? '#38A169' : engagementScore >= 50 ? '#D69E2E' : '#E53E3E'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                    }}
                  >
                    <span style={{ fontSize: 22, fontWeight: 700, color: '#2D3748' }}>{engagementScore}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#718096', marginTop: 4, fontWeight: 600 }}>
                    Family Engagement
                  </div>
                </div>
                <button
                  onClick={handleSaveConfig}
                  disabled={saving || loadingConfig}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: saving || loadingConfig ? '#CBD5E0' : '#2B6CB0',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: saving || loadingConfig ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* Family Therapy Sessions (live) */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2D3748', margin: '0 0 4px' }}>
                  {isPathwayA ? 'Family Therapy Sessions' : 'Family Sessions (Optional for Pathway B)'}
                </h3>
                <p style={{ fontSize: 13, color: '#718096', margin: 0 }}>
                  {isPathwayA
                    ? 'Minimum 2 family therapy sessions + 1 pre-discharge family reintegration meeting required'
                    : 'Family sessions are not required for Pathway B but may be scheduled if family is available.'}
                </p>
              </div>
              <button
                onClick={() => { setShowLog(!showLog); setLogForm(emptyLogForm()) }}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: showLog ? '#EDF2F7' : '#2B6CB0',
                  color: showLog ? '#4A5568' : '#fff',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {showLog ? 'Cancel' : 'Log Family Session'}
              </button>
            </div>

            {/* Log form */}
            {showLog && (
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  borderRadius: 10,
                  border: '1px solid #BEE3F8',
                  background: '#F7FAFC',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  alignItems: 'flex-end',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 4 }}>Date</label>
                  <input type="date" value={logForm.date} onChange={(e) => updateLogForm('date', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 4 }}>Time</label>
                  <input type="time" value={logForm.time} onChange={(e) => updateLogForm('time', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 4 }}>Status</label>
                  <select value={logForm.status} onChange={(e) => updateLogForm('status', e.target.value)} style={{ ...inputStyle, minWidth: 130 }}>
                    <option value="">-- Select --</option>
                    {SESSION_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 4 }}>Facilitator</label>
                  <select value={logForm.facilitator} onChange={(e) => updateLogForm('facilitator', e.target.value)} style={inputStyle}>
                    <option value="">-- Select --</option>
                    {FACILITATORS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 4 }}>Focus Area</label>
                  <select value={logForm.focusArea} onChange={(e) => updateLogForm('focusArea', e.target.value)} style={{ ...inputStyle, minWidth: 220 }}>
                    <option value="">-- Select Focus Area --</option>
                    {FOCUS_AREAS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleLogSession}
                  disabled={!logComplete || logging}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: !logComplete || logging ? '#CBD5E0' : '#38A169',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: !logComplete || logging ? 'not-allowed' : 'pointer',
                  }}
                >
                  {logging ? 'Saving…' : 'Save Session'}
                </button>
              </div>
            )}

            {/* Sessions list */}
            <div style={{ overflowX: 'auto', marginTop: 16 }}>
              {loadingSessions && (
                <p style={{ color: '#A0AEC0', fontSize: 14, margin: 0 }}>Loading sessions…</p>
              )}
              {!loadingSessions && sessions.length === 0 && (
                <p style={{ color: '#A0AEC0', fontSize: 14, margin: 0 }}>No family sessions recorded yet.</p>
              )}
              {!loadingSessions && sessions.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#4A5568', fontWeight: 600, whiteSpace: 'nowrap' }}>Date</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Time</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Facilitator</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Focus Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#2D3748', whiteSpace: 'nowrap' }}>
                          {session.date || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#4A5568' }}>{session.time || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {session.status
                            ? <span style={statusBadge(session.status)}>{session.status}</span>
                            : <span style={{ color: '#A0AEC0' }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#4A5568' }}>{session.facilitator || '—'}</td>
                        <td style={{ padding: '10px 12px', color: '#4A5568' }}>{session.focusArea || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Pathway B: Community Group Work */}
          {!isPathwayA && (
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
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2D3748', margin: '0 0 4px' }}>
                Community Group Work (Pathway B)
              </h3>
              <p style={{ fontSize: 13, color: '#718096', margin: '0 0 16px' }}>
                Social Worker sessions, church/NGO partner engagement, and supported housing referral
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Social Worker Sessions */}
                <div style={{ padding: 16, borderRadius: 10, border: '1px solid #E2E8F0', background: '#F7FAFC' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#2D3748', margin: '0 0 12px' }}>
                    Social Worker Sessions
                  </h4>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontWeight: 600, fontSize: 13, color: '#4A5568', display: 'block', marginBottom: 4 }}>
                      Sessions Completed
                    </label>
                    <select
                      value={config.communityWork.socialWorkerSessions}
                      onChange={(e) => updateCommunityWork('socialWorkerSessions', e.target.value)}
                      style={{ ...inputStyle, width: '100%' }}
                    >
                      {SOCIAL_WORKER_SESSION_OPTIONS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontWeight: 600, fontSize: 13, color: '#4A5568', display: 'block', marginBottom: 4 }}>
                      Status
                    </label>
                    <select
                      value={config.communityWork.socialWorkerStatus}
                      onChange={(e) => updateCommunityWork('socialWorkerStatus', e.target.value)}
                      style={{ ...inputStyle, width: '100%' }}
                    >
                      {COMMUNITY_ENGAGEMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Church/NGO Partner */}
                <div style={{ padding: 16, borderRadius: 10, border: '1px solid #E2E8F0', background: '#F7FAFC' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#2D3748', margin: '0 0 12px' }}>
                    Church / NGO Partner Engagement
                  </h4>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontWeight: 600, fontSize: 13, color: '#4A5568', display: 'block', marginBottom: 4 }}>
                      Church Partner Engagement
                    </label>
                    <select
                      value={config.communityWork.churchEngagement}
                      onChange={(e) => updateCommunityWork('churchEngagement', e.target.value)}
                      style={{ ...inputStyle, width: '100%' }}
                    >
                      {COMMUNITY_ENGAGEMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontWeight: 600, fontSize: 13, color: '#4A5568', display: 'block', marginBottom: 4 }}>
                      NGO Partner Engagement
                    </label>
                    <select
                      value={config.communityWork.ngoEngagement}
                      onChange={(e) => updateCommunityWork('ngoEngagement', e.target.value)}
                      style={{ ...inputStyle, width: '100%' }}
                    >
                      {COMMUNITY_ENGAGEMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Supported Housing Referral */}
                <div style={{ padding: 16, borderRadius: 10, border: '1px solid #E2E8F0', background: '#F7FAFC' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#2D3748', margin: '0 0 12px' }}>
                    Supported Housing Referral
                  </h4>
                  <div>
                    <label style={{ fontWeight: 600, fontSize: 13, color: '#4A5568', display: 'block', marginBottom: 4 }}>
                      Referral Status
                    </label>
                    <select
                      value={config.communityWork.housingReferral}
                      onChange={(e) => updateCommunityWork('housingReferral', e.target.value)}
                      style={{ ...inputStyle, width: '100%' }}
                    >
                      {HOUSING_REFERRAL_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Psychoeducation Checklist */}
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
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2D3748', margin: '0 0 12px' }}>
              Family Psychoeducation Topics
            </h3>
            <p style={{ fontSize: 13, color: '#718096', margin: '0 0 12px' }}>
              Required topics covered during family sessions (SOP 2.6.1)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {PSYCHOEDUCATION_TOPICS.map((topic) => (
                <label
                  key={topic}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#4A5568',
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: '#F7FAFC',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!config.psychoeducation[topic]}
                    onChange={(e) => togglePsychoeducation(topic, e.target.checked)}
                    style={{ accentColor: '#2B6CB0' }}
                  />
                  {topic}
                </label>
              ))}
            </div>
          </div>

          {/* Graduation Criteria */}
          <div
            className="card"
            style={{
              padding: 20,
              borderRadius: 12,
              border: `2px solid ${allSessionsCompleted && preDischargeCompleted ? '#C6F6D5' : '#FEFCBF'}`,
              background: allSessionsCompleted && preDischargeCompleted ? '#F0FFF4' : '#FFFFF0',
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2D3748', margin: '0 0 12px' }}>
              Graduation Criteria Check
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#fff',
                    background: completedCount >= 2 ? '#38A169' : '#E53E3E',
                  }}
                >
                  {completedCount >= 2 ? '✓' : '✗'}
                </span>
                <span style={{ color: '#2D3748' }}>
                  Minimum 2 family therapy sessions completed ({completedCount}/2)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#fff',
                    background: preDischargeCompleted ? '#38A169' : '#E53E3E',
                  }}
                >
                  {preDischargeCompleted ? '✓' : '✗'}
                </span>
                <span style={{ color: '#2D3748' }}>Pre-discharge family reintegration meeting completed</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, marginTop: 4 }}>
                <label style={{ fontWeight: 600, color: '#4A5568' }}>Family reintegration meeting completed:</label>
                <select
                  value={config.graduationMeetingCompleted}
                  onChange={(e) => updateGraduation(e.target.value)}
                  style={inputStyle}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
