import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Patient Detail — tabbed view for a single patient record.
  Staff see demographics, treatment plan, check-ins, clinical notes,
  behavioral log, and pass history. Initials only — no full names (HIPAA).
*/

const PHASES = {
  stabilization: { label: 'Stabilization', color: '#E53E3E', weeks: '1-2' },
  foundation: { label: 'Foundation', color: '#DD6B20', weeks: '3-6' },
  deepening: { label: 'Deepening', color: '#D69E2E', weeks: '7-10' },
  reintegration: { label: 'Reintegration', color: '#1A7A4A', weeks: '11-12' },
}

const PATIENT = {
  id: 'P001', initials: 'CO', gender: 'M', age: 32, dob: '1994-03-15',
  admitted: '2026-04-15', pathway: 'A', substance: 'Alcohol',
  coSubstances: 'Cannabis', duration: '5-10 years', phase: 'foundation',
  day: 23, totalDays: 84, insight: 'contemplation', bed: 'A1',
  counselor: 'AI', status: 'admitted',
}

const VITALS = {
  bp: '128/82', pulse: 76, temp: '36.6C', weight: '78kg', bmi: 24.8,
  lastChecked: '2026-05-07 06:30',
}

const RISK_FLAGS = [
  { flag: 'Dual substance use', severity: 'moderate', color: '#DD6B20' },
  { flag: 'History of relapse (2x)', severity: 'moderate', color: '#DD6B20' },
  { flag: 'Family conflict — limited support', severity: 'high', color: '#E53E3E' },
]

const COLUMBIA_PHASES = [
  {
    name: 'Phase 1 — Stabilization', weeks: 'Week 1-2', color: '#E53E3E',
    goals: [
      { text: 'Medical detox assessment complete', done: true },
      { text: 'Baseline vitals established', done: true },
      { text: 'Orientation to programme rules', done: true },
      { text: 'Initial psychosocial assessment', done: true },
      { text: 'Spiritual readiness conversation', done: true },
    ],
  },
  {
    name: 'Phase 2 — Foundation', weeks: 'Week 3-6', color: '#DD6B20',
    goals: [
      { text: 'Individual CBT sessions (2x/week)', done: true },
      { text: 'Group therapy engagement', done: true },
      { text: 'Identify core triggers and coping strategies', done: false },
      { text: 'Life skills module: anger management', done: false },
      { text: 'Family psychoeducation session scheduled', done: false },
      { text: 'Pastoral care: faith journey mapping', done: false },
    ],
  },
  {
    name: 'Phase 3 — Deepening', weeks: 'Week 7-10', color: '#D69E2E',
    goals: [
      { text: 'Trauma processing (EMDR/narrative)', done: false },
      { text: 'Relapse prevention plan drafted', done: false },
      { text: 'Vocational assessment complete', done: false },
      { text: 'Supervised community outing', done: false },
      { text: 'Forgiveness and reconciliation work', done: false },
    ],
  },
  {
    name: 'Phase 4 — Reintegration', weeks: 'Week 11-12', color: '#1A7A4A',
    goals: [
      { text: 'Aftercare plan finalized', done: false },
      { text: 'Family reintegration meeting', done: false },
      { text: 'Support group connection established', done: false },
      { text: 'Exit interview and testimonial', done: false },
      { text: 'Discharge summary completed', done: false },
    ],
  },
]

const MDT_REVIEWS = [
  { week: 4, date: '2026-05-13', status: 'upcoming', notes: 'First MDT review — assess Foundation phase progress' },
  { week: 8, date: '2026-06-10', status: 'pending', notes: 'Mid-programme review — readiness for Deepening phase' },
  { week: 11, date: '2026-07-01', status: 'pending', notes: 'Pre-discharge assessment — aftercare readiness' },
]

const CHECKINS = [
  { date: '2026-05-07', mood: 4, cravings: 2, sleep: 'Good (7h)', anxiety: 'Low', triggers: 'None today', gratitude: 'Morning devotion was peaceful' },
  { date: '2026-05-06', mood: 3, cravings: 3, sleep: 'Fair (5h)', anxiety: 'Moderate', triggers: 'Phone call from family', gratitude: 'Supportive group session' },
  { date: '2026-05-05', mood: 4, cravings: 1, sleep: 'Good (7h)', anxiety: 'Low', triggers: 'None', gratitude: 'Made progress in counseling' },
  { date: '2026-05-04', mood: 3, cravings: 2, sleep: 'Fair (6h)', anxiety: 'Low', triggers: 'Weekend boredom', gratitude: 'Football match with residents' },
  { date: '2026-05-03', mood: 2, cravings: 4, sleep: 'Poor (4h)', anxiety: 'High', triggers: 'Dream about drinking', gratitude: 'Staff support after nightmare' },
  { date: '2026-05-02', mood: 4, cravings: 1, sleep: 'Good (8h)', anxiety: 'Low', triggers: 'None', gratitude: 'Bible study insight' },
  { date: '2026-05-01', mood: 3, cravings: 2, sleep: 'Fair (6h)', anxiety: 'Moderate', triggers: 'Argument with peer', gratitude: 'Resolved conflict peacefully' },
]

const CLINICAL_NOTES = [
  { id: 1, date: '2026-05-07', author: 'AI', type: 'Individual CBT', subjective: 'Patient reports improved mood, less preoccupation with alcohol cravings. Acknowledges triggers around family contact.', objective: 'Engaged, good eye contact, affect congruent.', assessment: 'Progressing in contemplation stage. Beginning to identify cognitive distortions.', plan: 'Continue CBT 2x/week. Introduce thought record homework.' },
  { id: 2, date: '2026-05-05', author: 'FA', type: 'Group Therapy', subjective: 'Participated actively in group. Shared about family conflict as trigger.', objective: 'Appropriate peer interaction. Offered support to newer resident.', assessment: 'Developing group cohesion. Showing empathy and leadership qualities.', plan: 'Encourage peer mentoring role. Continue group 3x/week.' },
  { id: 3, date: '2026-05-04', author: 'HM', type: 'Nursing', subjective: 'Complains of mild headache this morning. No other complaints.', objective: 'BP 128/82, Pulse 76, Temp 36.6C. Weight stable at 78kg.', assessment: 'Vitals within normal range. Headache likely tension-related.', plan: 'Paracetamol 500mg given. Monitor. Next vitals check tomorrow 0630.' },
  { id: 4, date: '2026-05-03', author: 'PK', type: 'Pastoral', subjective: 'Expressed interest in deeper spiritual engagement. Struggling with guilt about past actions.', objective: 'Attended morning devotion and evening Bible study. Receptive to spiritual counsel.', assessment: 'Spiritual growth emerging. Guilt processing needed alongside clinical work.', plan: 'Begin forgiveness workbook. Connect with chaplain for weekly sessions.' },
  { id: 5, date: '2026-05-01', author: 'SN', type: 'Social Work', subjective: 'Concerned about family dynamics post-discharge. Mother supportive, siblings distant.', objective: 'Family mapping completed. Identified 2 supportive contacts, 3 high-risk contacts.', assessment: 'Family reintegration will need structured approach. Community support limited.', plan: 'Schedule family psychoeducation call. Explore alumni network connections.' },
]

const BEHAVIORAL_LOG = [
  { id: 1, date: '2026-04-29', tier: 1, type: 'Dormitory cleanliness', response: 'Written reflection exercise assigned', status: 'resolved', reportedBy: 'HM' },
  { id: 2, date: '2026-04-20', tier: 1, type: 'Late to morning devotion', response: 'Verbal warning documented', status: 'resolved', reportedBy: 'PK' },
]

const PASSES = [
  { id: 1, type: 'Day Pass', date: '2026-05-03', time: '10:00-16:00', destination: 'Family visit', status: 'completed', returnedOnTime: true, notes: 'Returned in good spirits. No concerns.' },
  { id: 2, type: 'Day Pass', date: '2026-05-10', time: '10:00-16:00', destination: 'Church service', status: 'approved', returnedOnTime: null, notes: 'Accompanied by family member.' },
]

const tierConfig = {
  1: { label: 'Tier 1 — Minor', color: '#D69E2E', bg: 'rgba(214,158,46,.1)' },
  2: { label: 'Tier 2 — Major', color: '#DD6B20', bg: 'rgba(221,107,32,.1)' },
  3: { label: 'Tier 3 — Motivational', color: '#E53E3E', bg: 'rgba(229,62,62,.1)' },
}

const moodColors = ['', '#E53E3E', '#DD6B20', '#D69E2E', '#38A169', '#2B6CB0']

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'treatment', label: 'Treatment Plan' },
  { key: 'checkins', label: 'Check-ins' },
  { key: 'notes', label: 'Clinical Notes' },
  { key: 'behavioral', label: 'Behavioral' },
  { key: 'passes', label: 'Passes' },
]

export default function PatientDetail() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  const p = PATIENT
  const phase = PHASES[p.phase]
  const progress = Math.round((p.day / p.totalDays) * 100)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--blue), var(--blue-dk))',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', fontWeight: 700, flexShrink: 0,
          }}>
            {p.initials}
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 2 }}>{p.initials}</h1>
            <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
              {p.gender}, {p.age}y · ID: {p.id} · Bed {p.bed} · Pathway {p.pathway} · Day {p.day}/{p.totalDays}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ padding: '5px 14px', borderRadius: 14, fontSize: '.78rem', fontWeight: 700, background: phase.color + '15', color: phase.color }}>
            {phase.label} (Wk {phase.weeks})
          </span>
          <span style={{ padding: '5px 14px', borderRadius: 14, fontSize: '.78rem', fontWeight: 700, background: 'rgba(26,122,74,.1)', color: '#1A7A4A' }}>
            {p.status}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', color: 'var(--g500)', marginBottom: 6 }}>
          <span>Programme Progress</span>
          <span>{progress}% complete — Day {p.day} of {p.totalDays}</span>
        </div>
        <div className="pbar"><div className="pfill" style={{ width: `${progress}%`, background: phase.color }} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.68rem', color: 'var(--g500)', marginTop: 4 }}>
          {Object.entries(PHASES).map(([key, ph]) => (
            <span key={key} style={{ color: key === p.phase ? ph.color : undefined, fontWeight: key === p.phase ? 700 : 400 }}>
              {ph.label}
            </span>
          ))}
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap', borderBottom: '2px solid var(--g200)', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px', fontSize: '.84rem', fontWeight: 600,
              border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === tab.key ? 'var(--blue)' : 'var(--g500)',
              borderBottom: activeTab === tab.key ? '2px solid var(--blue)' : '2px solid transparent',
              marginBottom: '-2px', transition: 'all .2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'treatment' && <TreatmentTab />}
      {activeTab === 'checkins' && <CheckinsTab />}
      {activeTab === 'notes' && <NotesTab />}
      {activeTab === 'behavioral' && <BehavioralTab />}
      {activeTab === 'passes' && <PassesTab />}
    </div>
  )
}

/* ─── Overview Tab ─── */
function OverviewTab() {
  const p = PATIENT
  const phase = PHASES[p.phase]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
      {/* Demographics */}
      <div className="card" style={{ padding: '18px 22px' }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14, color: 'var(--charcoal)' }}>Demographics</h3>
        {[
          ['Initials', p.initials],
          ['Gender', p.gender === 'M' ? 'Male' : 'Female'],
          ['Age', `${p.age} years`],
          ['DOB', p.dob],
          ['Admitted', p.admitted],
          ['Bed', p.bed],
          ['Pathway', `Pathway ${p.pathway}`],
          ['Phase', `${phase.label} (Week ${phase.weeks})`],
          ['Day', `${p.day} of ${p.totalDays}`],
          ['Counselor', p.counselor],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--g100)' }}>
            <span style={{ fontSize: '.82rem', color: 'var(--g500)', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: '.82rem', color: 'var(--charcoal)', fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Substance Profile */}
      <div className="card" style={{ padding: '18px 22px' }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14, color: 'var(--charcoal)' }}>Substance Profile</h3>
        {[
          ['Primary Substance', p.substance],
          ['Co-Substances', p.coSubstances],
          ['Duration of Use', p.duration],
          ['Stage of Change', p.insight],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--g100)' }}>
            <span style={{ fontSize: '.82rem', color: 'var(--g500)', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: '.82rem', color: 'var(--charcoal)', fontWeight: 600, textTransform: 'capitalize' }}>{value}</span>
          </div>
        ))}

        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginTop: 20, marginBottom: 14, color: 'var(--charcoal)' }}>Vitals Summary</h3>
        {[
          ['Blood Pressure', VITALS.bp],
          ['Pulse', `${VITALS.pulse} bpm`],
          ['Temperature', VITALS.temp],
          ['Weight', VITALS.weight],
          ['BMI', VITALS.bmi],
          ['Last Checked', VITALS.lastChecked],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--g100)' }}>
            <span style={{ fontSize: '.82rem', color: 'var(--g500)', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: '.82rem', color: 'var(--charcoal)', fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Risk Flags */}
      <div className="card" style={{ padding: '18px 22px' }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14, color: 'var(--charcoal)' }}>Risk Flags</h3>
        {RISK_FLAGS.map((rf, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--g100)' }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: rf.color, flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '.84rem', fontWeight: 600, color: 'var(--charcoal)' }}>{rf.flag}</div>
              <div style={{ fontSize: '.72rem', color: rf.color, fontWeight: 700, textTransform: 'uppercase' }}>{rf.severity}</div>
            </div>
          </div>
        ))}

        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginTop: 20, marginBottom: 14, color: 'var(--charcoal)' }}>Latest Check-in</h3>
        {(() => {
          const latest = CHECKINS[0]
          return (
            <div>
              {[
                ['Date', latest.date],
                ['Mood', `${latest.mood}/5`],
                ['Cravings', `${latest.cravings}/5`],
                ['Sleep', latest.sleep],
                ['Anxiety', latest.anxiety],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--g100)' }}>
                  <span style={{ fontSize: '.82rem', color: 'var(--g500)', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: '.82rem', color: 'var(--charcoal)', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

/* ─── Treatment Plan Tab ─── */
function TreatmentTab() {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', marginBottom: 6 }}>Columbia Model — 4-Phase Treatment Plan</h2>
      <p style={{ fontSize: '.84rem', color: 'var(--g500)', marginBottom: 20 }}>12-week structured rehabilitation with MDT oversight</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {COLUMBIA_PHASES.map((ph, i) => {
          const doneCount = ph.goals.filter(g => g.done).length
          const totalCount = ph.goals.length
          return (
            <div key={i} className="card" style={{ padding: '18px 22px', borderLeft: `4px solid ${ph.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', color: ph.color }}>{ph.name}</h3>
                  <span style={{ fontSize: '.76rem', color: 'var(--g500)' }}>{ph.weeks}</span>
                </div>
                <span style={{ fontSize: '.78rem', fontWeight: 700, color: doneCount === totalCount ? '#1A7A4A' : 'var(--g500)' }}>
                  {doneCount}/{totalCount} goals complete
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ph.goals.map((goal, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: goal.done ? '#1A7A4A' : 'var(--g100)',
                      color: goal.done ? 'white' : 'transparent', fontSize: '.72rem', fontWeight: 700,
                    }}>
                      {goal.done ? '\u2713' : ''}
                    </span>
                    <span style={{ fontSize: '.84rem', color: goal.done ? 'var(--g500)' : 'var(--charcoal)', textDecoration: goal.done ? 'line-through' : 'none' }}>
                      {goal.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* MDT Reviews */}
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', marginTop: 28, marginBottom: 14 }}>MDT Review Schedule</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MDT_REVIEWS.map((review, i) => (
          <div key={i} className="card" style={{ padding: '14px 20px', borderLeft: `4px solid ${review.status === 'upcoming' ? 'var(--blue)' : 'var(--g300)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--charcoal)' }}>Week {review.week} Review</div>
                <div style={{ fontSize: '.78rem', color: 'var(--g500)', marginTop: 2 }}>{review.notes}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--charcoal)' }}>{review.date}</div>
                <span style={{
                  padding: '3px 10px', borderRadius: 10, fontSize: '.68rem', fontWeight: 700,
                  background: review.status === 'upcoming' ? 'rgba(43,108,203,.1)' : 'var(--g100)',
                  color: review.status === 'upcoming' ? 'var(--blue)' : 'var(--g500)',
                }}>
                  {review.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Check-ins Tab ─── */
function CheckinsTab() {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', marginBottom: 6 }}>Daily Check-ins</h2>
      <p style={{ fontSize: '.84rem', color: 'var(--g500)', marginBottom: 20 }}>Last 7 days of self-reported wellbeing data</p>

      {/* Trend mini-chart */}
      <div className="card" style={{ padding: '18px 22px', marginBottom: 20 }}>
        <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', marginBottom: 10 }}>7-Day Mood & Cravings Trend</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80, marginBottom: 6 }}>
          {[...CHECKINS].reverse().map((c, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', justifyContent: 'center' }}>
                <div style={{ width: 10, height: c.mood * 14, background: moodColors[c.mood], borderRadius: '3px 3px 0 0', opacity: 0.8 }} title={`Mood: ${c.mood}`} />
                <div style={{ width: 10, height: c.cravings * 14, background: c.cravings >= 4 ? '#E53E3E' : '#DD6B20', borderRadius: '3px 3px 0 0', opacity: 0.5 }} title={`Cravings: ${c.cravings}`} />
              </div>
              <span style={{ fontSize: '.6rem', color: 'var(--g500)' }}>{c.date.slice(8)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: '.7rem', color: 'var(--g500)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#38A169', display: 'inline-block' }} /> Mood</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#DD6B20', opacity: 0.5, display: 'inline-block' }} /> Cravings</span>
        </div>
      </div>

      {/* Daily entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CHECKINS.map((c, i) => (
          <div key={i} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--charcoal)' }}>{c.date}</span>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: '.78rem', fontWeight: 700, color: moodColors[c.mood] }}>Mood {c.mood}/5</span>
                <span style={{ fontSize: '.78rem', fontWeight: 700, color: c.cravings >= 4 ? '#E53E3E' : 'var(--g700)' }}>Cravings {c.cravings}/5</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
              {[
                ['Sleep', c.sleep],
                ['Anxiety', c.anxiety],
                ['Triggers', c.triggers],
                ['Gratitude', c.gratitude],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--charcoal)', marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Clinical Notes Tab ─── */
function NotesTab() {
  const noteTypeColors = {
    'Individual CBT': 'var(--blue)',
    'Group Therapy': '#1A7A4A',
    'Nursing': '#DD6B20',
    'Pastoral': '#8B5CF6',
    'Social Work': '#D69E2E',
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', marginBottom: 6 }}>Clinical Notes</h2>
      <p style={{ fontSize: '.84rem', color: 'var(--g500)', marginBottom: 20 }}>{CLINICAL_NOTES.length} notes in SOAP format</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {CLINICAL_NOTES.map(note => {
          const typeColor = noteTypeColors[note.type] || 'var(--g500)'
          return (
            <div key={note.id} className="card" style={{ padding: '18px 22px', borderLeft: `4px solid ${typeColor}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: '.72rem', fontWeight: 700, background: typeColor + '18', color: typeColor }}>
                    {note.type}
                  </span>
                </div>
                <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>
                  {note.date} · Author: {note.author}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {[
                  ['S — Subjective', note.subjective],
                  ['O — Objective', note.objective],
                  ['A — Assessment', note.assessment],
                  ['P — Plan', note.plan],
                ].map(([label, text]) => (
                  <div key={label}>
                    <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: '.84rem', color: 'var(--charcoal)', lineHeight: 1.5 }}>{text}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Behavioral Tab ─── */
function BehavioralTab() {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', marginBottom: 6 }}>Behavioral Incident Log</h2>
      <p style={{ fontSize: '.84rem', color: 'var(--g500)', marginBottom: 20 }}>{BEHAVIORAL_LOG.length} incidents recorded for {PATIENT.initials}</p>

      {BEHAVIORAL_LOG.length === 0 ? (
        <div className="card" style={{ padding: '32px 22px', textAlign: 'center' }}>
          <p style={{ fontSize: '.92rem', color: 'var(--g500)' }}>No behavioral incidents recorded.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BEHAVIORAL_LOG.map(inc => {
            const cfg = tierConfig[inc.tier]
            return (
              <div key={inc.id} className="card" style={{ padding: '16px 20px', borderLeft: `4px solid ${cfg.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--charcoal)' }}>{inc.type}</div>
                    <div style={{ fontSize: '.78rem', color: 'var(--g500)', marginTop: 4 }}>Response: {inc.response}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: '.68rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    <span style={{
                      padding: '3px 8px', borderRadius: 10, fontSize: '.68rem', fontWeight: 700,
                      background: inc.status === 'resolved' ? 'rgba(26,122,74,.1)' : 'rgba(221,107,32,.1)',
                      color: inc.status === 'resolved' ? '#1A7A4A' : '#DD6B20',
                    }}>
                      {inc.status}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '.76rem', color: 'var(--g500)', marginTop: 8 }}>
                  Reported by: {inc.reportedBy} · {inc.date}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Passes Tab ─── */
function PassesTab() {
  const statusColors = {
    completed: { bg: 'rgba(26,122,74,.1)', color: '#1A7A4A' },
    approved: { bg: 'rgba(43,108,203,.1)', color: 'var(--blue)' },
    denied: { bg: 'rgba(229,62,62,.1)', color: '#E53E3E' },
    pending: { bg: 'rgba(214,158,46,.1)', color: '#D69E2E' },
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', marginBottom: 4 }}>Pass History</h2>
          <p style={{ fontSize: '.84rem', color: 'var(--g500)' }}>{PASSES.length} passes on record for {PATIENT.initials}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Current Pass Status</div>
          <span style={{ padding: '4px 12px', borderRadius: 10, fontSize: '.78rem', fontWeight: 700, background: 'rgba(43,108,203,.1)', color: 'var(--blue)' }}>
            Eligible — Foundation phase
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PASSES.map(pass => {
          const sc = statusColors[pass.status] || statusColors.pending
          return (
            <div key={pass.id} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--charcoal)' }}>{pass.type}</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--g700)', marginTop: 2 }}>{pass.destination}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: '.68rem', fontWeight: 700, background: sc.bg, color: sc.color }}>
                    {pass.status}
                  </span>
                  {pass.returnedOnTime !== null && (
                    <span style={{
                      padding: '3px 10px', borderRadius: 10, fontSize: '.68rem', fontWeight: 700,
                      background: pass.returnedOnTime ? 'rgba(26,122,74,.1)' : 'rgba(229,62,62,.1)',
                      color: pass.returnedOnTime ? '#1A7A4A' : '#E53E3E',
                    }}>
                      {pass.returnedOnTime ? 'On time' : 'Late return'}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--g500)', marginTop: 8 }}>
                {pass.date} · {pass.time}
              </div>
              {pass.notes && (
                <div style={{ fontSize: '.82rem', color: 'var(--g700)', marginTop: 6, fontStyle: 'italic' }}>
                  {pass.notes}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
