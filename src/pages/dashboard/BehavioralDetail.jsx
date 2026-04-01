import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'

const tierConfig = {
  1: { label: 'Tier 1 — Minor', color: '#D69E2E', bg: 'rgba(214,158,46,.1)' },
  2: { label: 'Tier 2 — Major', color: '#DD6B20', bg: 'rgba(221,107,32,.1)' },
  3: { label: 'Tier 3 — Motivational', color: '#E53E3E', bg: 'rgba(229,62,62,.1)' },
}

const incidents = [
  {
    id: 1, patient: 'IM', tier: 1, type: 'Lateness to sessions', date: '2026-04-01',
    description: 'Client arrived 25 minutes late to morning group therapy session. This is the second instance this week. Client stated he overslept due to staying up late reading. House Mother confirmed client was in bed past lights-out.',
    response: 'Verbal warning documented', respondedBy: 'House Mother (HM)', outcome: 'Client acknowledged the issue and committed to setting an alarm. Warning logged in file.',
    status: 'resolved', reportedBy: 'HM',
    followUps: [
      { text: 'Monitor punctuality for the next 7 days', done: true },
      { text: 'Follow up with client on sleep routine', done: false },
      { text: 'Review with counselor at next session', done: false },
      { text: 'Check if pattern emerges — escalate to Tier 2 if needed', done: false },
    ],
    history: [
      { date: '2026-03-28', tier: 1, type: 'Lateness to sessions', response: 'Verbal reminder given' },
      { date: '2026-03-15', tier: 1, type: 'Not following instructions', response: 'Verbal warning documented' },
    ],
  },
  {
    id: 2, patient: 'CO', tier: 1, type: 'Dormitory cleanliness', date: '2026-03-29',
    description: 'Dormitory inspection found bed unmade, personal items scattered, and food wrappers hidden under mattress. Client was on morning chore duty but left area incomplete. Co-residents confirmed client rushed through duties.',
    response: 'Written reflection exercise assigned', respondedBy: 'House Mother (HM)', outcome: 'Client completed a written reflection on responsibility and stewardship. Extra cleaning duty assigned for 3 days.',
    status: 'resolved', reportedBy: 'HM',
    followUps: [
      { text: 'Verify completion of reflection exercise', done: true },
      { text: 'Inspect dormitory daily for 5 days', done: true },
      { text: 'Discuss at next group session as a teaching moment', done: false },
    ],
    history: [
      { date: '2026-03-10', tier: 1, type: 'Poor personal hygiene', response: 'Verbal warning' },
      { date: '2026-02-20', tier: 1, type: 'Dormitory cleanliness', response: 'Verbal reminder' },
      { date: '2026-02-05', tier: 1, type: 'Laziness on duties', response: 'Written reflection' },
    ],
  },
  {
    id: 3, patient: 'AN', tier: 2, type: 'Persistent negative attitude', date: '2026-03-25',
    description: 'Client has displayed a pattern of negativity in group therapy over the past two weeks — refusing to participate, making dismissive comments about other clients\' progress, and openly questioning the programme. Counselor attempted redirection multiple times without lasting improvement.',
    response: 'Formal reprimand, loss of phone privileges', respondedBy: 'Counselor Lead (CL)', outcome: 'Phone privileges suspended for 2 weeks. Client required to attend additional one-on-one counselling sessions. Programme Director notified.',
    status: 'monitoring', reportedBy: 'CL',
    followUps: [
      { text: 'Schedule extra one-on-one counselling (2x this week)', done: true },
      { text: 'Pastoral care visit to explore underlying spiritual struggles', done: false },
      { text: 'Review phone privilege restoration at 2-week mark', done: false },
      { text: 'Assess whether Tier 3 motivational discipline is warranted', done: false },
    ],
    history: [
      { date: '2026-03-18', tier: 1, type: 'Persistent negative attitude', response: 'Verbal warning documented' },
      { date: '2026-03-10', tier: 1, type: 'Not following instructions', response: 'Written reflection exercise' },
    ],
  },
]

export default function BehavioralDetail() {
  const { id } = useParams()
  const incident = incidents[parseInt(id)]

  const [followUps, setFollowUps] = useState(incident ? incident.followUps.map(f => ({ ...f })) : [])
  const [escalationNotes, setEscalationNotes] = useState('')

  if (!incident) {
    return (
      <div style={{ padding: 24 }}>
        <Link to="/dashboard/behavioral" style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: '.88rem', fontWeight: 600 }}>
          &larr; Back to Behavioral Management
        </Link>
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--fd)', color: 'var(--g500)' }}>Incident record not found</h2>
        </div>
      </div>
    )
  }

  const cfg = tierConfig[incident.tier]

  const toggleFollowUp = (idx) => {
    setFollowUps(prev => prev.map((f, i) => i === idx ? { ...f, done: !f.done } : f))
  }

  return (
    <div>
      <Link to="/dashboard/behavioral" style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: '.88rem', fontWeight: 600 }}>
        &larr; Back to Behavioral Management
      </Link>

      {/* Header */}
      <div style={{ marginTop: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Incident Report — {incident.patient}</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>3-Tier Behavioral Management System</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: '.72rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
          <span style={{
            padding: '4px 12px', borderRadius: 12, fontSize: '.72rem', fontWeight: 700,
            background: incident.status === 'resolved' ? 'rgba(26,122,74,.1)' : 'rgba(221,107,32,.1)',
            color: incident.status === 'resolved' ? '#1A7A4A' : '#DD6B20',
          }}>
            {incident.status}
          </span>
        </div>
      </div>

      {/* Incident Details */}
      <div className="card" style={{ padding: 18, marginBottom: 16, borderLeft: `4px solid ${cfg.color}` }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Incident Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, fontSize: '.84rem', marginBottom: 14 }}>
          {[
            ['Patient', incident.patient],
            ['Date', incident.date],
            ['Tier', cfg.label],
            ['Offense Type', incident.type],
            ['Reported By', incident.reportedBy],
            ['Status', incident.status],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', marginBottom: 2 }}>{label}</div>
              <div style={{ color: 'var(--g700)' }}>{value}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', marginBottom: 4 }}>Full Description</div>
          <div style={{ fontSize: '.84rem', color: 'var(--g600)', lineHeight: 1.6 }}>{incident.description}</div>
        </div>
      </div>

      {/* Response & Action */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Response &amp; Action</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '.84rem' }}>
          {[
            ['Response Taken', incident.response],
            ['Responded By', incident.respondedBy],
            ['Outcome', incident.outcome],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', marginBottom: 2 }}>{label}</div>
              <div style={{ color: 'var(--g700)', lineHeight: 1.5 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up Actions & Escalation Notes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Follow-up Actions */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Follow-up Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {followUps.map((f, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: '.84rem' }}>
                <input type="checkbox" checked={f.done} onChange={() => toggleFollowUp(i)}
                  style={{ marginTop: 3 }} />
                <span style={{ color: f.done ? 'var(--g400)' : 'var(--g700)', textDecoration: f.done ? 'line-through' : 'none' }}>
                  {f.text}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Escalation Notes */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Escalation Notes</h3>
          <textarea
            value={escalationNotes}
            onChange={e => setEscalationNotes(e.target.value)}
            rows={6}
            placeholder="Add escalation notes, observations, or rationale for tier adjustment..."
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem', resize: 'vertical' }}
          />
          <button
            onClick={() => { if (escalationNotes.trim()) alert('Escalation notes saved.') }}
            style={{ marginTop: 8, padding: '6px 16px', borderRadius: 6, border: 'none', background: 'var(--blue)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.78rem' }}>
            Save Notes
          </button>
        </div>
      </div>

      {/* Patient Incident History */}
      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Patient Incident History — {incident.patient}</h3>
        {incident.history.length === 0 ? (
          <div style={{ fontSize: '.84rem', color: 'var(--g400)' }}>No previous incidents on record.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {incident.history.map((h, i) => {
              const hcfg = tierConfig[h.tier]
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderTop: i > 0 ? '1px solid var(--g100)' : 'none',
                  fontSize: '.82rem', flexWrap: 'wrap', gap: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--g400)', minWidth: 80 }}>{h.date}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: '.66rem', fontWeight: 700, background: hcfg.bg, color: hcfg.color }}>
                      {hcfg.label}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--g700)' }}>{h.type}</span>
                  </div>
                  <span style={{ color: 'var(--g500)', fontSize: '.78rem' }}>{h.response}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
