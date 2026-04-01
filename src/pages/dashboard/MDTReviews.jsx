import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  MDT Reviews — Multi-Disciplinary Team Governance (SOP Chapter 4)
  Weekly MDT meeting management with per-patient review cards.
  HIPAA: initials only.
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

const PATIENTS = [
  { initials: 'CO', phase: 2 },
  { initials: 'AN', phase: 2 },
  { initials: 'KA', phase: 3 },
  { initials: 'IM', phase: 1 },
]

const PAST_MINUTES = [
  { date: '2026-03-24', patientsReviewed: ['CO', 'AN', 'KA', 'IM'], decisions: ['Continue current plan for CO', 'Increase session frequency for AN', 'Initiate discharge planning for KA', 'Medication review for IM'] },
  { date: '2026-03-17', patientsReviewed: ['CO', 'AN', 'KA'], decisions: ['Modify treatment goals for CO', 'Add family therapy for AN', 'Continue current plan for KA'] },
  { date: '2026-03-10', patientsReviewed: ['CO', 'KA', 'IM'], decisions: ['Continue current plan for CO', 'Continue current plan for KA', 'Escalate to Program Director for IM'] },
]

const phaseColors = { 1: '#E53E3E', 2: '#DD6B20', 3: '#D69E2E', 4: '#1A7A4A' }
const phaseLabels = { 1: 'Medical Stabilisation', 2: 'Therapeutic Foundation', 3: 'Deepening & Skills', 4: 'Reintegration' }

export default function MDTReviews() {
  const { user } = useAuth()
  const [tab, setTab] = useState('upcoming')
  const [meetingDate, setMeetingDate] = useState('2026-04-07')
  const [meetingTime, setMeetingTime] = useState('09:00')
  const [attendees, setAttendees] = useState(['Program Director', 'Clinical Lead', 'Head Nurse'])
  const [patientReviews, setPatientReviews] = useState(
    PATIENTS.reduce((acc, p) => ({
      ...acc,
      [p.initials]: { concerns: [], decisions: [], nextReviewDate: '' }
    }), {})
  )

  const toggleAttendee = (role) => {
    setAttendees(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])
  }

  const handleConcern = (initials, val) => {
    setPatientReviews(prev => {
      const current = prev[initials].concerns
      return { ...prev, [initials]: { ...prev[initials], concerns: current.includes(val) ? current.filter(v => v !== val) : [...current, val] } }
    })
  }

  const handleDecision = (initials, val) => {
    setPatientReviews(prev => ({
      ...prev, [initials]: { ...prev[initials], decisions: prev[initials].decisions.includes(val) ? prev[initials].decisions.filter(v => v !== val) : [...prev[initials].decisions, val] }
    }))
  }

  const handleNextReview = (initials, val) => {
    setPatientReviews(prev => ({ ...prev, [initials]: { ...prev[initials], nextReviewDate: val } }))
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
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: '#DD6B20' }}>{PATIENTS.length}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Patients to Review</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--gold)' }}>{PAST_MINUTES.length}</div>
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
          {PATIENTS.map(pt => {
            const review = patientReviews[pt.initials]
            return (
              <div key={pt.initials} className="card">
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
                        <input type="checkbox" checked={review.concerns.includes(c)} onChange={() => handleConcern(pt.initials, c)} style={{ width: 13, height: 13 }} />
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
                        <input type="checkbox" checked={review.decisions.includes(d)} onChange={() => handleDecision(pt.initials, d)} style={{ width: 13, height: 13 }} />
                        {d}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g600)', display: 'block', marginBottom: 4 }}>Next Review Date</label>
                  <input type="date" value={review.nextReviewDate} onChange={e => handleNextReview(pt.initials, e.target.value)}
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
          {PAST_MINUTES.map((m, i) => (
            <div key={i} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '.95rem' }}>MDT Meeting — {m.date}</h4>
                <span style={{ fontSize: '.72rem', color: 'var(--g500)' }}>{m.patientsReviewed.length} patients reviewed</span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: '.76rem', color: 'var(--g500)', marginRight: 8 }}>Patients:</span>
                {m.patientsReviewed.map(p => (
                  <span key={p} style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, background: 'var(--g100)', fontSize: '.76rem', fontWeight: 600, marginRight: 4 }}>{p}</span>
                ))}
              </div>
              <div>
                <span style={{ fontSize: '.76rem', color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Key Decisions:</span>
                {m.decisions.map((d, di) => (
                  <div key={di} style={{ fontSize: '.8rem', color: 'var(--g700)', padding: '3px 0', borderBottom: di < m.decisions.length - 1 ? '1px solid var(--g100)' : 'none' }}>
                    {d}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
