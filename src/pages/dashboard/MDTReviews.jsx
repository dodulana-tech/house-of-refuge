import React, { useState, useEffect, useCallback } from 'react'
import { getPatients, getMdtReviews, addMdtReview, isSupabaseReady } from '../../utils/supabase'
import { activeBriefs } from '../../utils/patients'

/*
  MDT Reviews — Multi-Disciplinary Team Governance (SOP Chapter 4)
  Weekly MDT meeting management with per-patient review cards.
  Live `mdt_reviews` table (one row per meeting). HIPAA: initials only.
*/

const ATTENDEE_ROLES = [
  'Program Director', 'Clinical Lead', 'Head Nurse', 'Chaplain',
  'Social Worker', 'House Master', 'Psychologist',
]

const CONCERN_OPTIONS = [
  'Withdrawal management', 'Mood instability', 'Craving intensity',
  'Behavioral concerns', 'Family engagement', 'Spiritual progress',
  'Medication review', 'Discharge planning', 'No concerns',
]

const DECISION_OPTIONS = [
  'Continue current plan', 'Modify treatment goals', 'Increase session frequency',
  'Add family therapy', 'Initiate discharge planning', 'Extend programme',
  'Refer externally', 'Escalate to Program Director',
]

const phaseColors = { 1: '#E53E3E', 2: '#DD6B20', 3: '#D69E2E', 4: '#1A7A4A' }
const phaseLabels = { 1: 'Medical Stabilisation', 2: 'Therapeutic Foundation', 3: 'Deepening & Skills', 4: 'Reintegration' }
const PHASE_INDEX = { stabilization: 1, foundation: 2, deepening: 3, reintegration: 4 }

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function MDTReviews() {
  const [patients, setPatients] = useState([]) // [{id, initials, phase}]
  const [meetings, setMeetings] = useState([]) // past/recorded meetings from DB
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('upcoming')
  const [meetingDate, setMeetingDate] = useState(todayISO())
  const [meetingTime, setMeetingTime] = useState('09:00')
  const [attendees, setAttendees] = useState(['Program Director', 'Clinical Lead', 'Head Nurse'])
  const [patientReviews, setPatientReviews] = useState({}) // keyed by patient_id

  const load = useCallback(async () => {
    if (!isSupabaseReady()) return
    const [{ data: rows }, { data: mtgs }] = await Promise.all([getPatients(), getMdtReviews()])
    const active = (rows || []).filter(p => ['admitted', 'on-pass', 'suspended'].includes(p.status))
    const briefs = active.map(r => {
      const b = activeBriefs([r])[0]
      const phaseKey = r.current_phase || 'stabilization'
      return { id: r.id, initials: b?.initials || '—', phase: PHASE_INDEX[phaseKey] || 1 }
    })
    setPatients(briefs)
    setPatientReviews(briefs.reduce((acc, p) => ({ ...acc, [p.id]: { concerns: [], decisions: [], nextReviewDate: '' } }), {}))
    setMeetings((mtgs || []).filter(m => m.status === 'completed'))
  }, [])

  useEffect(() => { load() }, [load])

  const initialsFor = (id) => patients.find(p => p.id === id)?.initials || '—'

  const toggleAttendee = (role) => {
    setAttendees(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])
  }

  const handleConcern = (pid, val) => {
    setPatientReviews(prev => {
      const current = prev[pid].concerns
      return { ...prev, [pid]: { ...prev[pid], concerns: current.includes(val) ? current.filter(v => v !== val) : [...current, val] } }
    })
  }

  const handleDecision = (pid, val) => {
    setPatientReviews(prev => ({
      ...prev, [pid]: { ...prev[pid], decisions: prev[pid].decisions.includes(val) ? prev[pid].decisions.filter(v => v !== val) : [...prev[pid].decisions, val] }
    }))
  }

  const handleNextReview = (pid, val) => {
    setPatientReviews(prev => ({ ...prev, [pid]: { ...prev[pid], nextReviewDate: val } }))
  }

  const handleRecordMeeting = async () => {
    setSaving(true)
    // Store reviews keyed by initials for readable minutes.
    const reviews = {}
    for (const [pid, r] of Object.entries(patientReviews)) {
      if (r.concerns.length || r.decisions.length || r.nextReviewDate) reviews[initialsFor(pid)] = r
    }
    const { error } = await addMdtReview({
      meeting_date: meetingDate,
      meeting_time: meetingTime,
      status: 'completed',
      attendees,
      reviews,
      recorded_by_code: 'PD',
    })
    setSaving(false)
    if (error) { alert(`Could not record meeting: ${error.message}`); return }
    alert('MDT meeting minutes recorded.')
    setPatientReviews(patients.reduce((acc, p) => ({ ...acc, [p.id]: { concerns: [], decisions: [], nextReviewDate: '' } }), {}))
    await load()
    setTab('past')
  }

  const tabs = [
    { key: 'upcoming', label: 'Next Meeting' },
    { key: 'reviews', label: 'Patient Reviews' },
    { key: 'past', label: 'Past Minutes' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>MDT Reviews</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Multi-Disciplinary Team meeting governance and patient review</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--blue)' }}>{meetingDate}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Next MDT Meeting</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: '#1A7A4A' }}>{attendees.length}/{ATTENDEE_ROLES.length}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Confirmed Attendees</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: '#DD6B20' }}>{patients.length}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Patients to Review</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--gold)' }}>{meetings.length}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Past Meetings</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: tab === t.key ? 'var(--charcoal)' : 'var(--g100)', color: tab === t.key ? '#fff' : 'var(--g600)', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Next Meeting Setup */}
      {tab === 'upcoming' && (
        <div className="card">
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 16 }}>Schedule Next MDT Meeting</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: '.78rem', color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Meeting Date</label>
              <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.88rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '.78rem', color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Meeting Time</label>
              <select value={meetingTime} onChange={e => setMeetingTime(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.88rem' }}>
                {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <h4 style={{ fontSize: '.88rem', fontWeight: 600, marginBottom: 10 }}>Attendees</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 4 }}>
            {ATTENDEE_ROLES.map(role => (
              <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.84rem', color: 'var(--g700)', cursor: 'pointer', padding: '4px 0' }}>
                <input type="checkbox" checked={attendees.includes(role)} onChange={() => toggleAttendee(role)} />
                {role}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Per-Patient Review Cards */}
      {tab === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {patients.length === 0 && (
            <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--g500)', fontSize: '.88rem' }}>No active patients to review.</div>
          )}
          {patients.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn--primary btn--sm" disabled={saving} onClick={handleRecordMeeting}>
                {saving ? 'Recording…' : 'Record Meeting Minutes'}
              </button>
            </div>
          )}
          {patients.map(pt => {
            const review = patientReviews[pt.id]
            if (!review) return null
            return (
              <div key={pt.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: phaseColors[pt.phase], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.88rem' }}>{pt.initials}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.92rem' }}>{pt.initials}</div>
                      <div style={{ fontSize: '.72rem', color: phaseColors[pt.phase] }}>{phaseLabels[pt.phase]}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '.72rem', padding: '3px 10px', borderRadius: 12, background: phaseColors[pt.phase] + '18', color: phaseColors[pt.phase], fontWeight: 600 }}>Phase {pt.phase}</span>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g600)', display: 'block', marginBottom: 6 }}>Key Concerns</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {CONCERN_OPTIONS.map(c => (
                      <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.76rem', color: 'var(--g700)', cursor: 'pointer', padding: '3px 8px', borderRadius: 6, background: review.concerns.includes(c) ? '#E8F5E9' : 'var(--g50)' }}>
                        <input type="checkbox" checked={review.concerns.includes(c)} onChange={() => handleConcern(pt.id, c)} style={{ width: 13, height: 13 }} />
                        {c}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g600)', display: 'block', marginBottom: 6 }}>Decisions</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {DECISION_OPTIONS.map(d => (
                      <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.76rem', color: 'var(--g700)', cursor: 'pointer', padding: '3px 8px', borderRadius: 6, background: review.decisions.includes(d) ? '#E3F2FD' : 'var(--g50)' }}>
                        <input type="checkbox" checked={review.decisions.includes(d)} onChange={() => handleDecision(pt.id, d)} style={{ width: 13, height: 13 }} />
                        {d}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g600)', display: 'block', marginBottom: 4 }}>Next Review Date</label>
                  <input type="date" value={review.nextReviewDate} onChange={e => handleNextReview(pt.id, e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Past Minutes */}
      {tab === 'past' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {meetings.length === 0 && (
            <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--g500)', fontSize: '.88rem' }}>No past MDT meetings recorded yet.</div>
          )}
          {meetings.map((m) => {
            const reviews = m.reviews || {}
            const patientsReviewed = Object.keys(reviews)
            const decisions = patientsReviewed.flatMap(init => (reviews[init]?.decisions || []).map(d => `${d} for ${init}`))
            return (
              <div key={m.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ fontFamily: 'var(--fd)', fontSize: '.95rem' }}>MDT Meeting — {m.meeting_date}{m.meeting_time ? ` ${m.meeting_time}` : ''}</h4>
                  <span style={{ fontSize: '.72rem', color: 'var(--g500)' }}>{patientsReviewed.length} patients reviewed</span>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: '.76rem', color: 'var(--g500)', marginRight: 8 }}>Patients:</span>
                  {patientsReviewed.length === 0 && <span style={{ fontSize: '.76rem', color: 'var(--g400)' }}>None recorded</span>}
                  {patientsReviewed.map(p => (
                    <span key={p} style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, background: 'var(--g100)', fontSize: '.76rem', fontWeight: 600, marginRight: 4 }}>{p}</span>
                  ))}
                </div>
                <div>
                  <span style={{ fontSize: '.76rem', color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Key Decisions:</span>
                  {decisions.length === 0 && <span style={{ fontSize: '.8rem', color: 'var(--g400)' }}>—</span>}
                  {decisions.map((d, di) => (
                    <div key={di} style={{ fontSize: '.8rem', color: 'var(--g700)', padding: '3px 0', borderBottom: di < decisions.length - 1 ? '1px solid var(--g100)' : 'none' }}>
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
