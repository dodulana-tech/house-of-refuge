import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Treatment Plan Builder — Columbia Model (SOP Chapter 4)
  4 phases with specific goals, MDT review tracking, PRPP section.
  HIPAA: initials only.
*/

const PATIENTS = [
  { initials: 'CO', phase: 2, updatedBy: 'AI', updatedDate: '2026-03-28' },
  { initials: 'AN', phase: 2, updatedBy: 'AI', updatedDate: '2026-03-27' },
  { initials: 'KA', phase: 3, updatedBy: 'AI', updatedDate: '2026-03-25' },
  { initials: 'IM', phase: 1, updatedBy: 'AI', updatedDate: '2026-03-30' },
]

const PHASES = [
  {
    name: 'Phase 1: Medical Stabilisation (Wk 1–2)',
    goals: [
      'Complete medical assessment and baseline vitals',
      'Initiate detox protocol (CIWA/COWS monitoring)',
      'Establish medication regimen',
      'Orientate to programme rules and daily schedule',
      'Build initial therapeutic alliance with key worker',
    ],
  },
  {
    name: 'Phase 2: Therapeutic Foundation (Wk 3–6)',
    goals: [
      'Complete comprehensive psychosocial assessment',
      'Develop personalised treatment plan with patient input',
      'Begin individual CBT sessions (weekly)',
      'Engage in group therapy programme',
      'Identify primary relapse triggers via PRPP',
      'Commence spiritual formation programme',
      'Establish family communication plan',
    ],
  },
  {
    name: 'Phase 3: Deepening & Skills Building (Wk 7–10)',
    goals: [
      'Complete relapse prevention plan',
      'Develop 5+ active coping strategies',
      'Participate in life skills training modules',
      'Engage in vocational assessment',
      'Attend family therapy sessions',
      'Demonstrate consistent programme attendance (>90%)',
      'Complete mid-programme self-assessment',
    ],
  },
  {
    name: 'Phase 4: Reintegration Preparation (Wk 11–12)',
    goals: [
      'Finalise aftercare plan with support network details',
      'Complete discharge readiness assessment',
      'Establish community support connections',
      'Conduct family reintegration planning session',
      'Graduate from spiritual formation programme',
      'Complete exit interview and programme evaluation',
    ],
  },
]

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed', 'Deferred']
const statusColors = { 'Not Started': 'var(--g400)', 'In Progress': '#DD6B20', Completed: '#1A7A4A', Deferred: '#805AD5' }

const MDT_REVIEWS = [
  { label: 'Week 4 Review', key: 'wk4' },
  { label: 'Week 8 Review', key: 'wk8' },
  { label: 'Pre-Discharge Review', key: 'predischarge' },
]
const MDT_STATUSES = ['Scheduled', 'Completed', 'Overdue']

const TRIGGER_CATEGORIES = {
  People: ['Former using friends', 'Romantic partner', 'Family members', 'Colleagues', 'Drug dealers', 'Strangers at events'],
  Places: ['Bars/clubs', 'Former neighbourhood', 'Workplace', 'Social gatherings', 'Certain streets/routes', 'Markets'],
  Feelings: ['Anger', 'Loneliness', 'Boredom', 'Anxiety', 'Sadness', 'Shame', 'Excitement', 'Frustration'],
  Situations: ['Financial pressure', 'Arguments', 'Celebrations', 'Payday', 'Lack of structure', 'Sleep problems', 'Physical pain'],
  Times: ['Evenings', 'Weekends', 'Holidays', 'After work', 'Early morning', 'Paydays', 'Anniversaries'],
}

const COPING_STRATEGIES = [
  'Deep breathing exercises', 'Call sponsor or accountability partner', 'Attend NA/AA meeting',
  'Physical exercise', 'Prayer and meditation', 'Journaling', 'Distraction activities',
  'Contact crisis helpline', 'Remove self from triggering environment', 'Practice grounding techniques',
  'Engage in hobby or creative activity', 'Talk to trusted family member',
]

function initGoalStatuses() {
  const s = {}
  PHASES.forEach((phase, pi) => {
    phase.goals.forEach((_, gi) => { s[`${pi}-${gi}`] = 'Not Started' })
  })
  return s
}

function initMdtDates() {
  return { wk4: { date: '2026-04-28', status: 'Scheduled' }, wk8: { date: '2026-05-26', status: 'Scheduled' }, predischarge: { date: '', status: 'Scheduled' } }
}

export default function TreatmentPlanBuilder() {
  const { user } = useAuth()
  const [selectedPatient, setSelectedPatient] = useState('CO')
  const [goalStatuses, setGoalStatuses] = useState(initGoalStatuses)
  const [mdtReviews, setMdtReviews] = useState(initMdtDates)
  const [triggers, setTriggers] = useState({})
  const [copingSelected, setCopingSelected] = useState([])

  const pt = PATIENTS.find(p => p.initials === selectedPatient)

  const handleGoalChange = (key, val) => setGoalStatuses(prev => ({ ...prev, [key]: val }))
  const handleMdtDate = (key, val) => setMdtReviews(prev => ({ ...prev, [key]: { ...prev[key], date: val } }))
  const handleMdtStatus = (key, val) => setMdtReviews(prev => ({ ...prev, [key]: { ...prev[key], status: val } }))

  const handleTrigger = (cat, val) => {
    setTriggers(prev => {
      const arr = prev[cat] || []
      return { ...prev, [cat]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
    })
  }
  const handleCoping = (val) => {
    setCopingSelected(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  const completedCount = Object.values(goalStatuses).filter(s => s === 'Completed').length
  const totalGoals = Object.keys(goalStatuses).length

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Treatment Plan Builder</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Columbia Model — 4-phase goal management with PRPP mapping</p>
      </div>

      {/* Patient selector + KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: 16 }}>
          <label style={{ fontSize: '.72rem', color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Patient</label>
          <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.92rem' }}>
            {PATIENTS.map(p => <option key={p.initials} value={p.initials}>{p.initials}</option>)}
          </select>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--blue)' }}>Phase {pt.phase}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Current Phase</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: '#1A7A4A' }}>{completedCount}/{totalGoals}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Goals Completed</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '.95rem', fontWeight: 700, color: 'var(--g700)' }}>{pt.updatedDate}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Last Updated by {pt.updatedBy}</div>
        </div>
      </div>

      {/* Phase Goal Checklists */}
      {PHASES.map((phase, pi) => (
        <div key={pi} className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12, color: pi < pt.phase ? '#1A7A4A' : pi === pt.phase - 1 ? 'var(--blue)' : 'var(--g400)' }}>
            {phase.name}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {phase.goals.map((goal, gi) => {
              const key = `${pi}-${gi}`
              const status = goalStatuses[key]
              return (
                <div key={gi} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: gi < phase.goals.length - 1 ? '1px solid var(--g100)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[status], flexShrink: 0 }} />
                    <span style={{ fontSize: '.84rem', color: 'var(--g700)' }}>{goal}</span>
                  </div>
                  <select value={status} onChange={e => handleGoalChange(key, e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.78rem', color: statusColors[status], fontWeight: 600, minWidth: 110 }}>
                    {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* MDT Review Dates */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>MDT Review Schedule</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {MDT_REVIEWS.map(r => (
            <div key={r.key} style={{ padding: 12, background: 'var(--g50)', borderRadius: 8 }}>
              <div style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: 8 }}>{r.label}</div>
              <label style={{ fontSize: '.72rem', color: 'var(--g500)', display: 'block', marginBottom: 2 }}>Date</label>
              <input type="date" value={mdtReviews[r.key].date} onChange={e => handleMdtDate(r.key, e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem', marginBottom: 8 }} />
              <label style={{ fontSize: '.72rem', color: 'var(--g500)', display: 'block', marginBottom: 2 }}>Status</label>
              <select value={mdtReviews[r.key].status} onChange={e => handleMdtStatus(r.key, e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }}>
                {MDT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* PRPP Section */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 4 }}>Personal Relapse Prevention Plan (PRPP)</h3>
        <p style={{ fontSize: '.78rem', color: 'var(--g500)', marginBottom: 16 }}>Identify triggers across 5 categories and select coping strategies</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
          {Object.entries(TRIGGER_CATEGORIES).map(([cat, options]) => (
            <div key={cat} style={{ padding: 12, background: 'var(--g50)', borderRadius: 8 }}>
              <div style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: 8 }}>{cat}</div>
              {options.map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.78rem', color: 'var(--g700)', marginBottom: 4, cursor: 'pointer' }}>
                  <input type="checkbox" checked={(triggers[cat] || []).includes(opt)} onChange={() => handleTrigger(cat, opt)} />
                  {opt}
                </label>
              ))}
            </div>
          ))}
        </div>

        <h4 style={{ fontSize: '.88rem', fontWeight: 600, marginBottom: 8 }}>Coping Strategies</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 4 }}>
          {COPING_STRATEGIES.map(s => (
            <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.78rem', color: 'var(--g700)', marginBottom: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={copingSelected.includes(s)} onChange={() => handleCoping(s)} />
              {s}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
