import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Family Therapy Tracker — tracks family therapy as a clinical intervention
  per SOP 2.6.1. Pathway A: minimum 2 family sessions + 1 pre-discharge meeting.
  Pathway B: community group work with social worker and church/NGO partners.
  Initials only (HIPAA). All fields selects/checkboxes — zero free text.
*/

const PATIENTS = [
  { id: 'P001', initials: 'CO', pathway: 'A' },
  { id: 'P002', initials: 'AN', pathway: 'A' },
  { id: 'P003', initials: 'KA', pathway: 'B' },
  { id: 'P004', initials: 'IM', pathway: 'A' },
]

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

const COMMUNITY_ENGAGEMENT_STATUSES = ['Not Started', 'In Progress', 'Active', 'Completed', 'Declined']
const HOUSING_REFERRAL_STATUSES = ['Not Required', 'Pending', 'Referral Made', 'Accepted', 'Waitlisted', 'Placed']

const INITIAL_DATA = {
  CO: {
    pathway: 'A',
    pfspInitials: 'AO',
    pfspRelationship: 'Mother',
    sessions: [
      {
        id: 1,
        label: 'Session 1',
        date: '2026-03-25',
        status: 'Completed',
        facilitator: 'AI',
        focusArea: 'Initial assessment & expectations',
      },
      {
        id: 2,
        label: 'Session 2',
        date: '2026-04-08',
        status: 'Scheduled',
        facilitator: 'AI',
        focusArea: 'Communication & boundaries',
      },
      {
        id: 3,
        label: 'Pre-Discharge Meeting',
        date: '',
        status: '',
        facilitator: '',
        focusArea: '',
      },
    ],
    graduationMeetingCompleted: 'No',
  },
  AN: {
    pathway: 'A',
    pfspInitials: 'TO',
    pfspRelationship: 'Father',
    sessions: [
      {
        id: 1,
        label: 'Session 1',
        date: '2026-03-10',
        status: 'Completed',
        facilitator: 'TA',
        focusArea: 'Initial assessment & expectations',
      },
      {
        id: 2,
        label: 'Session 2',
        date: '2026-03-24',
        status: 'Completed',
        facilitator: 'TA',
        focusArea: 'Enabling behaviour education',
      },
      {
        id: 3,
        label: 'Pre-Discharge Meeting',
        date: '2026-04-10',
        status: 'Scheduled',
        facilitator: 'AI',
        focusArea: 'Discharge planning & aftercare',
      },
    ],
    graduationMeetingCompleted: 'No',
  },
  KA: {
    pathway: 'B',
    pfspInitials: 'N/A',
    pfspRelationship: 'N/A',
    sessions: [
      {
        id: 1,
        label: 'Session 1',
        date: '',
        status: '',
        facilitator: '',
        focusArea: '',
      },
      {
        id: 2,
        label: 'Session 2',
        date: '',
        status: '',
        facilitator: '',
        focusArea: '',
      },
      {
        id: 3,
        label: 'Pre-Discharge Meeting',
        date: '',
        status: '',
        facilitator: '',
        focusArea: '',
      },
    ],
    communityWork: {
      socialWorkerSessions: '3',
      socialWorkerStatus: 'Active',
      churchPartner: 'Redeemed Christian Church',
      churchEngagement: 'Active',
      ngoPartner: 'Drug Free Nigeria',
      ngoEngagement: 'In Progress',
      housingReferral: 'Referral Made',
    },
    graduationMeetingCompleted: 'No',
  },
  IM: {
    pathway: 'A',
    pfspInitials: 'BI',
    pfspRelationship: 'Wife',
    sessions: [
      {
        id: 1,
        label: 'Session 1',
        date: '',
        status: '',
        facilitator: '',
        focusArea: '',
      },
      {
        id: 2,
        label: 'Session 2',
        date: '',
        status: '',
        facilitator: '',
        focusArea: '',
      },
      {
        id: 3,
        label: 'Pre-Discharge Meeting',
        date: '',
        status: '',
        facilitator: '',
        focusArea: '',
      },
    ],
    graduationMeetingCompleted: 'No',
  },
}

const SOCIAL_WORKER_SESSION_OPTIONS = ['0', '1', '2', '3', '4', '5', '6', '7', '8']

function calculateEngagementScore(sessions) {
  const required = 3
  const completed = sessions.filter((s) => s.status === 'Completed').length
  return Math.round((completed / required) * 100)
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
  const { user } = useAuth()
  const [data, setData] = useState(INITIAL_DATA)
  const [selectedPatient, setSelectedPatient] = useState('CO')

  const patientInfo = PATIENTS.find((p) => p.initials === selectedPatient)
  const patientData = data[selectedPatient]
  const isPathwayA = patientData.pathway === 'A'
  const engagementScore = calculateEngagementScore(patientData.sessions)

  const updateSession = (sessionIdx, field, value) => {
    setData((prev) => {
      const updated = { ...prev }
      const patientCopy = { ...updated[selectedPatient] }
      const sessionsCopy = [...patientCopy.sessions]
      sessionsCopy[sessionIdx] = { ...sessionsCopy[sessionIdx], [field]: value }
      patientCopy.sessions = sessionsCopy
      updated[selectedPatient] = patientCopy
      return updated
    })
  }

  const updateCommunityWork = (field, value) => {
    setData((prev) => {
      const updated = { ...prev }
      const patientCopy = { ...updated[selectedPatient] }
      patientCopy.communityWork = { ...patientCopy.communityWork, [field]: value }
      updated[selectedPatient] = patientCopy
      return updated
    })
  }

  const updateGraduation = (value) => {
    setData((prev) => ({
      ...prev,
      [selectedPatient]: { ...prev[selectedPatient], graduationMeetingCompleted: value },
    }))
  }

  const preDischargeCompleted = patientData.sessions[2]?.status === 'Completed'
  const allSessionsCompleted = patientData.sessions.every((s) => s.status === 'Completed')

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
              <option key={p.id} value={p.initials}>
                {p.initials} — Pathway {p.pathway}
              </option>
            ))}
          </select>
        </div>
      </div>

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
              {selectedPatient} — Pathway {patientData.pathway}
            </h2>
            <div style={{ display: 'flex', gap: 24, fontSize: 14, color: '#4A5568', flexWrap: 'wrap' }}>
              <span>
                <strong>Pathway:</strong>{' '}
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700,
                    color: isPathwayA ? '#2B6CB0' : '#805AD5',
                    background: isPathwayA ? '#EBF8FF' : '#FAF5FF',
                    border: `1px solid ${isPathwayA ? '#BEE3F8' : '#E9D8FD'}`,
                  }}
                >
                  {isPathwayA ? 'A — Family Required' : 'B — Community'}
                </span>
              </span>
              <span><strong>PFSP:</strong> {patientData.pfspInitials} ({patientData.pfspRelationship})</span>
            </div>
          </div>

          {/* Engagement Score */}
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
        </div>
      </div>

      {/* Pathway A: Session Tracker */}
      {isPathwayA && (
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
            Family Therapy Sessions
          </h3>
          <p style={{ fontSize: 13, color: '#718096', margin: '0 0 16px' }}>
            Minimum 2 family therapy sessions + 1 pre-discharge family reintegration meeting required
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#4A5568', fontWeight: 600, whiteSpace: 'nowrap' }}>Session</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Facilitator</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Focus Area</th>
                </tr>
              </thead>
              <tbody>
                {patientData.sessions.map((session, idx) => (
                  <tr key={session.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#2D3748', whiteSpace: 'nowrap' }}>
                      {session.label}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <input
                        type="date"
                        value={session.date}
                        onChange={(e) => updateSession(idx, 'date', e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E0',
                          fontSize: 13,
                          background: '#fff',
                        }}
                      />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <select
                        value={session.status}
                        onChange={(e) => updateSession(idx, 'status', e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E0',
                          fontSize: 13,
                          background: '#fff',
                          minWidth: 130,
                        }}
                      >
                        <option value="">-- Select --</option>
                        {SESSION_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {session.status && (
                        <span style={{ ...statusBadge(session.status), marginLeft: 8 }}>
                          {session.status}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <select
                        value={session.facilitator}
                        onChange={(e) => updateSession(idx, 'facilitator', e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E0',
                          fontSize: 13,
                          background: '#fff',
                        }}
                      >
                        <option value="">-- Select --</option>
                        {FACILITATORS.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <select
                        value={session.focusArea}
                        onChange={(e) => updateSession(idx, 'focusArea', e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E0',
                          fontSize: 13,
                          background: '#fff',
                          minWidth: 220,
                        }}
                      >
                        <option value="">-- Select Focus Area --</option>
                        {FOCUS_AREAS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pathway B: Community Group Work */}
      {!isPathwayA && patientData.communityWork && (
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
            <div
              style={{
                padding: 16,
                borderRadius: 10,
                border: '1px solid #E2E8F0',
                background: '#F7FAFC',
              }}
            >
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#2D3748', margin: '0 0 12px' }}>
                Social Worker Sessions
              </h4>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: '#4A5568', display: 'block', marginBottom: 4 }}>
                  Sessions Completed
                </label>
                <select
                  value={patientData.communityWork.socialWorkerSessions}
                  onChange={(e) => updateCommunityWork('socialWorkerSessions', e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E0',
                    fontSize: 13,
                    background: '#fff',
                    width: '100%',
                  }}
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
                  value={patientData.communityWork.socialWorkerStatus}
                  onChange={(e) => updateCommunityWork('socialWorkerStatus', e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E0',
                    fontSize: 13,
                    background: '#fff',
                    width: '100%',
                  }}
                >
                  {COMMUNITY_ENGAGEMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Church/NGO Partner */}
            <div
              style={{
                padding: 16,
                borderRadius: 10,
                border: '1px solid #E2E8F0',
                background: '#F7FAFC',
              }}
            >
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#2D3748', margin: '0 0 12px' }}>
                Church / NGO Partner Engagement
              </h4>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: '#4A5568', display: 'block', marginBottom: 4 }}>
                  Church Partner Engagement
                </label>
                <select
                  value={patientData.communityWork.churchEngagement}
                  onChange={(e) => updateCommunityWork('churchEngagement', e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E0',
                    fontSize: 13,
                    background: '#fff',
                    width: '100%',
                  }}
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
                  value={patientData.communityWork.ngoEngagement}
                  onChange={(e) => updateCommunityWork('ngoEngagement', e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E0',
                    fontSize: 13,
                    background: '#fff',
                    width: '100%',
                  }}
                >
                  {COMMUNITY_ENGAGEMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Supported Housing Referral */}
            <div
              style={{
                padding: 16,
                borderRadius: 10,
                border: '1px solid #E2E8F0',
                background: '#F7FAFC',
              }}
            >
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#2D3748', margin: '0 0 12px' }}>
                Supported Housing Referral
              </h4>
              <div>
                <label style={{ fontWeight: 600, fontSize: 13, color: '#4A5568', display: 'block', marginBottom: 4 }}>
                  Referral Status
                </label>
                <select
                  value={patientData.communityWork.housingReferral}
                  onChange={(e) => updateCommunityWork('housingReferral', e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E0',
                    fontSize: 13,
                    background: '#fff',
                    width: '100%',
                  }}
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

      {/* Pathway B: Family Sessions (still available but not required) */}
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
            Family Sessions (Optional for Pathway B)
          </h3>
          <p style={{ fontSize: 13, color: '#718096', margin: '0 0 16px' }}>
            Family sessions are not required for Pathway B but may be scheduled if family is available.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Session</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Facilitator</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Focus Area</th>
                </tr>
              </thead>
              <tbody>
                {patientData.sessions.map((session, idx) => (
                  <tr key={session.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#2D3748' }}>{session.label}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <input
                        type="date"
                        value={session.date}
                        onChange={(e) => updateSession(idx, 'date', e.target.value)}
                        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E0', fontSize: 13, background: '#fff' }}
                      />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <select
                        value={session.status}
                        onChange={(e) => updateSession(idx, 'status', e.target.value)}
                        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E0', fontSize: 13, background: '#fff', minWidth: 130 }}
                      >
                        <option value="">-- Select --</option>
                        {SESSION_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <select
                        value={session.facilitator}
                        onChange={(e) => updateSession(idx, 'facilitator', e.target.value)}
                        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E0', fontSize: 13, background: '#fff' }}
                      >
                        <option value="">-- Select --</option>
                        {FACILITATORS.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <select
                        value={session.focusArea}
                        onChange={(e) => updateSession(idx, 'focusArea', e.target.value)}
                        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E0', fontSize: 13, background: '#fff', minWidth: 220 }}
                      >
                        <option value="">-- Select Focus Area --</option>
                        {FOCUS_AREAS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          {[
            'Understanding addiction as a disease',
            'Recognizing enabling behaviour',
            'Healthy communication strategies',
            'Relapse warning signs',
            'Building a supportive home environment',
            'Self-care for family members',
            'Boundaries and codependency',
            'Community support resources',
          ].map((topic) => (
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
              <input type="checkbox" style={{ accentColor: '#2B6CB0' }} />
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
                background: patientData.sessions.filter((s) => s.status === 'Completed').length >= 2 ? '#38A169' : '#E53E3E',
              }}
            >
              {patientData.sessions.filter((s) => s.status === 'Completed').length >= 2 ? '\u2713' : '\u2717'}
            </span>
            <span style={{ color: '#2D3748' }}>
              Minimum 2 family therapy sessions completed ({patientData.sessions.filter((s) => s.status === 'Completed').length}/2)
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
              {preDischargeCompleted ? '\u2713' : '\u2717'}
            </span>
            <span style={{ color: '#2D3748' }}>Pre-discharge family reintegration meeting completed</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, marginTop: 4 }}>
            <label style={{ fontWeight: 600, color: '#4A5568' }}>Family reintegration meeting completed:</label>
            <select
              value={patientData.graduationMeetingCompleted}
              onChange={(e) => updateGraduation(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #CBD5E0',
                fontSize: 13,
                background: '#fff',
              }}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
