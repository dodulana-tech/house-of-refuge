import React, { useState, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Treatment Plan Builder — Columbia Model + SMART Goals + Interventions
  Per SOP Chapter 4: 4-phase model, Columbia Model within 72 hours of admission,
  MDT reviews at Week 4, Week 8, pre-discharge.

  Structure: Problem Statement → SMART Goals → Objectives → Interventions → Progress
  Per patient, per phase. Fully structured — zero free text.
*/

const PATIENTS = [
  { initials: 'CO', day: 23, phase: 'foundation', substance: 'Alcohol', pathway: 'A', counselor: 'AI' },
  { initials: 'AN', day: 45, phase: 'deepening', substance: 'Tramadol', pathway: 'A', counselor: 'FA' },
  { initials: 'KA', day: 74, phase: 'reintegration', substance: 'Cannabis', pathway: 'B', counselor: 'AI' },
  { initials: 'IM', day: 8, phase: 'stabilization', substance: 'Heroin', pathway: 'A', counselor: 'FA' },
]

const PHASE_META = [
  { key: 'stabilization', label: 'Phase 1: Medical Stabilisation', weeks: 'Wk 1–2', color: '#E53E3E' },
  { key: 'foundation', label: 'Phase 2: Therapeutic Foundation', weeks: 'Wk 3–6', color: '#DD6B20' },
  { key: 'deepening', label: 'Phase 3: Deepening & Skills', weeks: 'Wk 7–10', color: '#D69E2E' },
  { key: 'reintegration', label: 'Phase 4: Reintegration', weeks: 'Wk 11–12', color: '#1A7A4A' },
]

// Problem statements — DSM-5 aligned, SUD-specific
const PROBLEM_STATEMENTS = [
  { id: 'sud', label: 'Substance Use Disorder', category: 'Clinical' },
  { id: 'withdrawal', label: 'Withdrawal Management', category: 'Clinical' },
  { id: 'mental_health', label: 'Co-occurring Mental Health Condition', category: 'Clinical' },
  { id: 'relapse_risk', label: 'High Relapse Risk', category: 'Clinical' },
  { id: 'family', label: 'Family/Relationship Dysfunction', category: 'Psychosocial' },
  { id: 'housing', label: 'Unstable Housing / Homelessness', category: 'Psychosocial' },
  { id: 'employment', label: 'Unemployment / Vocational Deficit', category: 'Psychosocial' },
  { id: 'spiritual', label: 'Spiritual Disconnection', category: 'Spiritual' },
  { id: 'legal', label: 'Legal Complications', category: 'Psychosocial' },
  { id: 'trauma', label: 'Unresolved Trauma', category: 'Clinical' },
]

// SMART Goals — grouped by problem area
const SMART_GOALS = {
  sud: [
    'Achieve sustained abstinence for the duration of the 12-week programme',
    'Identify and articulate at least 5 personal relapse triggers',
    'Develop and document a written Personal Relapse Prevention Plan (PRPP)',
    'Demonstrate 5+ active coping strategies during trigger scenarios',
    'Achieve 90%+ attendance in all therapy sessions',
  ],
  withdrawal: [
    'Complete medical detoxification safely under clinical supervision',
    'Achieve stable vital signs within 72 hours (CIWA < 8 or COWS < 5)',
    'Transition from detox to therapeutic programming by end of Week 2',
  ],
  mental_health: [
    'Complete psychiatric screening and receive diagnosis if indicated',
    'Achieve medication compliance at 100% (if prescribed)',
    'Report reduction in anxiety/depression symptoms by mid-programme',
    'Develop emotional regulation skills through CBT techniques',
  ],
  relapse_risk: [
    'Complete trigger mapping across all 5 categories (People, Places, Feelings, Situations, Times)',
    'Practice refusal skills in at least 3 role-play scenarios',
    'Identify and engage a post-discharge accountability partner',
    'Attend all relapse prevention group sessions',
  ],
  family: [
    'Attend minimum 2 family therapy sessions during programme',
    'Establish healthy communication boundaries with family members',
    'Complete pre-discharge family reintegration meeting',
    'Identify and address enabling behaviours within family system',
  ],
  housing: [
    'Confirm safe, stable post-discharge housing by Week 8',
    'Develop a supported housing plan with Social Worker',
    'Identify community resources for housing support',
  ],
  employment: [
    'Complete vocational assessment by Week 8',
    'Participate in CV writing and interview skills training',
    'Identify at least 2 viable employment pathways',
    'Enrol in vocational training programme if appropriate',
  ],
  spiritual: [
    'Attend daily morning prayer and evening chapel consistently',
    'Complete Bible school spiritual formation curriculum',
    'Demonstrate authentic Christian growth (chaplain assessment)',
    'Establish connection with a local church for post-discharge',
  ],
  legal: [
    'Disclose all pending legal matters to Social Worker',
    'Engage with legal referral services (Rights and Humanity)',
    'Develop a plan to address legal obligations post-discharge',
  ],
  trauma: [
    'Complete trauma screening assessment',
    'Engage in trauma-informed individual therapy sessions',
    'Develop grounding and self-regulation techniques',
    'Process key trauma narratives in safe therapeutic setting',
  ],
}

// Interventions — what staff do, mapped to problem areas
const INTERVENTIONS = {
  sud: ['Individual CBT (weekly, 60 min)', 'Group CBT / Relapse Prevention (3x/week)', 'Motivational Interviewing', 'Psychoeducation — addiction neuroscience', 'Urine Drug Screen monitoring'],
  withdrawal: ['CIWA-Ar / COWS monitoring (scheduled rounds)', 'Symptom-triggered medication protocol', 'Nutritional stabilisation', 'Vital signs monitoring (4x daily)', '24/7 nursing supervision'],
  mental_health: ['Psychiatric consultation', 'Medication management (MAR)', 'Individual therapy (CBT/MI)', 'Psychoeducation — mental health', 'Mood and anxiety monitoring'],
  relapse_risk: ['Relapse prevention group (3x/week)', 'Trigger mapping exercise', 'Role-play refusal skills training', 'PRPP development sessions', 'Peer Recovery Circle (daily)'],
  family: ['Family therapy sessions (Pathway A)', 'Family psychoeducation on addiction', 'Communication skills training', 'Pre-discharge family meeting', 'Enabling behaviour assessment'],
  housing: ['Vulnerability & Needs Assessment (VNA)', 'Supported housing referral', 'Community liaison (Social Worker)', 'Church/NGO partner engagement'],
  employment: ['Vocational assessment', 'CV writing workshop', 'Interview skills role-play', 'Digital literacy training', 'Skills training referral'],
  spiritual: ['Daily Bible School (2 hrs, Mon–Fri)', 'Pastoral counseling', 'Sunday Chapel service', 'Discipleship programme', 'Church placement planning'],
  legal: ['Legal referral to Rights and Humanity', 'Court date planning', 'Social Worker legal liaison'],
  trauma: ['Trauma-focused CBT', 'EMDR (if available)', 'Grounding techniques training', 'Art/expressive therapy', 'Safe narrative processing'],
}

const GOAL_STATUS = ['Not Started', 'In Progress', 'Completed', 'Deferred', 'Modified']
const goalStatusColors = { 'Not Started': 'var(--g400)', 'In Progress': '#DD6B20', Completed: '#1A7A4A', Deferred: '#805AD5', Modified: 'var(--blue)' }

const MDT_REVIEWS = [
  { key: 'wk4', label: 'Week 4 Review', purpose: 'Initial treatment plan review — assess engagement, modify goals' },
  { key: 'wk8', label: 'Week 8 Review', purpose: 'Mid-programme review — discharge planning begins, PRPP review' },
  { key: 'predischarge', label: 'Pre-Discharge Review', purpose: 'Final review — graduation criteria, aftercare confirmation' },
]
const MDT_STATUSES = ['Scheduled', 'Completed', 'Overdue', 'Cancelled']
const MDT_OUTCOMES = ['Continue current plan', 'Modify treatment goals', 'Increase session frequency', 'Add family therapy', 'Initiate discharge planning', 'Extend programme to 6 months', 'Refer externally', 'Escalate to Program Director']

const TRIGGER_CATEGORIES = {
  People: ['Former using friends', 'Romantic partner', 'Family members', 'Colleagues', 'Drug dealers', 'Strangers at events'],
  Places: ['Bars/clubs', 'Former neighbourhood', 'Workplace', 'Social gatherings', 'Certain streets/routes', 'Markets'],
  Feelings: ['Anger', 'Loneliness', 'Boredom', 'Anxiety', 'Sadness', 'Shame', 'Excitement', 'Frustration'],
  Situations: ['Financial pressure', 'Arguments', 'Celebrations', 'Payday', 'Lack of structure', 'Sleep problems', 'Physical pain'],
  Times: ['Evenings', 'Weekends', 'Holidays', 'After work', 'Early morning', 'Paydays', 'Anniversaries'],
}

const COPING_STRATEGIES = [
  'Deep breathing exercises', 'Call sponsor/accountability partner', 'Attend NA/AA meeting',
  'Physical exercise', 'Prayer and meditation on Scripture', 'Journaling',
  'Contact crisis helpline (09011277600)', 'Remove self from triggering environment',
  'Grounding techniques (5-4-3-2-1)', 'Engage in hobby or creative activity',
  'Talk to trusted family member', 'Read Bible / devotional material',
]

function initPatientData() {
  const data = {}
  PATIENTS.forEach(p => {
    const problems = p.initials === 'IM' ? ['sud', 'withdrawal'] :
      p.initials === 'CO' ? ['sud', 'relapse_risk', 'family', 'spiritual'] :
      p.initials === 'AN' ? ['sud', 'mental_health', 'relapse_risk', 'employment'] :
      ['sud', 'relapse_risk', 'spiritual', 'employment', 'housing']

    const goalStatuses = {}
    problems.forEach(prob => {
      (SMART_GOALS[prob] || []).forEach((_, gi) => {
        const key = `${prob}-${gi}`
        // Pre-fill some progress for advanced patients
        if (p.initials === 'KA') goalStatuses[key] = gi < 3 ? 'Completed' : 'In Progress'
        else if (p.initials === 'AN') goalStatuses[key] = gi < 2 ? 'Completed' : gi < 4 ? 'In Progress' : 'Not Started'
        else if (p.initials === 'CO') goalStatuses[key] = gi < 1 ? 'Completed' : gi < 3 ? 'In Progress' : 'Not Started'
        else goalStatuses[key] = 'Not Started'
      })
    })

    data[p.initials] = {
      problems,
      goalStatuses,
      interventions: problems.reduce((acc, prob) => ({ ...acc, [prob]: (INTERVENTIONS[prob] || []).slice(0, 3) }), {}),
      triggers: p.initials === 'KA' ? { People: ['Former using friends'], Feelings: ['Boredom', 'Loneliness'], Situations: ['Lack of structure'] } : {},
      coping: p.initials === 'KA' ? ['Prayer and meditation on Scripture', 'Physical exercise', 'Call sponsor/accountability partner', 'Grounding techniques (5-4-3-2-1)', 'Journaling'] : [],
      mdt: {
        wk4: { date: '2026-05-13', status: p.day > 28 ? 'Completed' : 'Scheduled', outcome: p.day > 28 ? 'Continue current plan' : '' },
        wk8: { date: '2026-06-10', status: p.day > 56 ? 'Completed' : 'Scheduled', outcome: p.day > 56 ? 'Initiate discharge planning' : '' },
        predischarge: { date: p.day > 70 ? '2026-07-01' : '', status: 'Scheduled', outcome: '' },
      },
    }
  })
  return data
}

export default function TreatmentPlanBuilder() {
  const { user } = useAuth()
  const [selectedPatient, setSelectedPatient] = useState('CO')
  const [tab, setTab] = useState('problems')
  const [patientData, setPatientData] = useState(initPatientData)

  const pt = PATIENTS.find(p => p.initials === selectedPatient)
  const pd = patientData[selectedPatient]
  const phaseMeta = PHASE_META.find(p => p.key === pt.phase)

  const updatePD = (field, value) => {
    setPatientData(prev => ({ ...prev, [selectedPatient]: { ...prev[selectedPatient], [field]: value } }))
  }

  // Problem toggles
  const toggleProblem = (probId) => {
    const current = pd.problems
    const updated = current.includes(probId) ? current.filter(p => p !== probId) : [...current, probId]
    updatePD('problems', updated)
  }

  // Goal status
  const setGoalStatus = (key, val) => {
    updatePD('goalStatuses', { ...pd.goalStatuses, [key]: val })
  }

  // Intervention toggles
  const toggleIntervention = (prob, intervention) => {
    const current = pd.interventions[prob] || []
    const updated = current.includes(intervention) ? current.filter(i => i !== intervention) : [...current, intervention]
    updatePD('interventions', { ...pd.interventions, [prob]: updated })
  }

  // Trigger toggles
  const toggleTrigger = (cat, val) => {
    const current = pd.triggers[cat] || []
    const updated = current.includes(val) ? current.filter(v => v !== val) : [...current, val]
    updatePD('triggers', { ...pd.triggers, [cat]: updated })
  }

  // Coping toggles
  const toggleCoping = (val) => {
    const updated = pd.coping.includes(val) ? pd.coping.filter(v => v !== val) : [...pd.coping, val]
    updatePD('coping', updated)
  }

  // MDT updates
  const setMdtField = (reviewKey, field, val) => {
    const updated = { ...pd.mdt, [reviewKey]: { ...pd.mdt[reviewKey], [field]: val } }
    updatePD('mdt', updated)
  }

  // Stats
  const allGoalKeys = pd.problems.flatMap(prob => (SMART_GOALS[prob] || []).map((_, gi) => `${prob}-${gi}`))
  const completedGoals = allGoalKeys.filter(k => pd.goalStatuses[k] === 'Completed').length
  const inProgressGoals = allGoalKeys.filter(k => pd.goalStatuses[k] === 'In Progress').length
  const totalGoals = allGoalKeys.length
  const progressPct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
  const triggerCount = Object.values(pd.triggers).flat().length
  const copingCount = pd.coping.length

  const TABS = [
    { key: 'problems', label: 'Problems & Goals' },
    { key: 'interventions', label: 'Interventions' },
    { key: 'prpp', label: 'PRPP' },
    { key: 'mdt', label: 'MDT Reviews' },
    { key: 'summary', label: 'Summary' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Treatment Plan Builder</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Columbia Model — Problem Statements → SMART Goals → Interventions → PRPP → MDT Review</p>
      </div>

      {/* Patient selector + KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
        <div className="card" style={{ padding: 14 }}>
          <label style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Patient</label>
          <select className="fi" value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}>
            {PATIENTS.map(p => <option key={p.initials} value={p.initials}>{p.initials} — Day {p.day}</option>)}
          </select>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', fontWeight: 700, color: phaseMeta.color }}>{phaseMeta.weeks}</div>
          <div style={{ fontSize: '.68rem', color: 'var(--g500)' }}>{pt.phase}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', fontWeight: 700, color: '#1A7A4A' }}>{completedGoals}/{totalGoals}</div>
          <div style={{ fontSize: '.68rem', color: 'var(--g500)' }}>Goals Complete</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--blue)' }}>{progressPct}%</div>
          <div style={{ fontSize: '.68rem', color: 'var(--g500)' }}>Overall Progress</div>
          <div style={{ height: 4, background: 'var(--g100)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: '#1A7A4A', borderRadius: 2 }} />
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', fontWeight: 700, color: '#DD6B20' }}>{triggerCount}</div>
          <div style={{ fontSize: '.68rem', color: 'var(--g500)' }}>Triggers ID'd</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', fontWeight: 700, color: copingCount >= 5 ? '#1A7A4A' : '#E53E3E' }}>{copingCount}</div>
          <div style={{ fontSize: '.68rem', color: 'var(--g500)' }}>Coping Strategies {copingCount >= 5 ? '✓' : '(need 5+)'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--g100)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 16px', border: 'none', background: 'none', whiteSpace: 'nowrap',
            fontSize: '.86rem', fontWeight: 600, cursor: 'pointer',
            color: tab === t.key ? 'var(--blue)' : 'var(--g500)',
            borderBottom: tab === t.key ? '2px solid var(--blue)' : '2px solid transparent',
            marginBottom: -2,
          }}>{t.label}</button>
        ))}
      </div>

      {/* TAB: Problems & Goals */}
      {tab === 'problems' && (
        <div>
          {/* Problem statement selector */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Active Problem Statements</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {PROBLEM_STATEMENTS.map(prob => {
                const active = pd.problems.includes(prob.id)
                return (
                  <label key={prob.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8,
                    background: active ? 'rgba(26,95,173,.06)' : 'var(--off)',
                    border: `1.5px solid ${active ? 'var(--blue)' : 'var(--g100)'}`,
                    cursor: 'pointer', fontSize: '.84rem', fontWeight: active ? 600 : 400,
                    color: active ? 'var(--blue)' : 'var(--g500)',
                  }}>
                    <input type="checkbox" checked={active} onChange={() => toggleProblem(prob.id)} />
                    {prob.label}
                    <span style={{ marginLeft: 'auto', fontSize: '.64rem', color: 'var(--g400)' }}>{prob.category}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Goals per active problem */}
          {pd.problems.map(probId => {
            const prob = PROBLEM_STATEMENTS.find(p => p.id === probId)
            const goals = SMART_GOALS[probId] || []
            const probCompleted = goals.filter((_, gi) => pd.goalStatuses[`${probId}-${gi}`] === 'Completed').length
            return (
              <div key={probId} className="card" style={{ marginBottom: 12, borderLeft: `3px solid ${probCompleted === goals.length ? '#1A7A4A' : 'var(--blue)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ fontFamily: 'var(--fd)', fontSize: '.95rem' }}>{prob.label}</h4>
                  <span style={{ fontSize: '.72rem', fontWeight: 700, color: probCompleted === goals.length ? '#1A7A4A' : 'var(--g500)' }}>
                    {probCompleted}/{goals.length} complete
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {goals.map((goal, gi) => {
                    const key = `${probId}-${gi}`
                    const status = pd.goalStatuses[key] || 'Not Started'
                    return (
                      <div key={gi} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: gi < goals.length - 1 ? '1px solid var(--g100)' : 'none', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: goalStatusColors[status], flexShrink: 0 }} />
                          <span style={{ fontSize: '.82rem', color: status === 'Completed' ? 'var(--g400)' : 'var(--g700)', textDecoration: status === 'Completed' ? 'line-through' : 'none' }}>{goal}</span>
                        </div>
                        <select value={status} onChange={e => setGoalStatus(key, e.target.value)} style={{
                          padding: '3px 6px', borderRadius: 6, border: '1px solid var(--g200)',
                          fontSize: '.74rem', color: goalStatusColors[status], fontWeight: 600, minWidth: 100, flexShrink: 0,
                        }}>
                          {GOAL_STATUS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TAB: Interventions */}
      {tab === 'interventions' && (
        <div>
          {pd.problems.map(probId => {
            const prob = PROBLEM_STATEMENTS.find(p => p.id === probId)
            const allInterventions = INTERVENTIONS[probId] || []
            const activeInterventions = pd.interventions[probId] || []
            return (
              <div key={probId} className="card" style={{ marginBottom: 12 }}>
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '.95rem', marginBottom: 10 }}>{prob.label}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {allInterventions.map(intervention => {
                    const active = activeInterventions.includes(intervention)
                    return (
                      <label key={intervention} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                        background: active ? 'rgba(26,122,74,.05)' : 'transparent',
                        border: `1px solid ${active ? 'rgba(26,122,74,.2)' : 'var(--g100)'}`,
                        cursor: 'pointer', fontSize: '.82rem', color: active ? '#1A7A4A' : 'var(--g500)',
                      }}>
                        <input type="checkbox" checked={active} onChange={() => toggleIntervention(probId, intervention)} />
                        {intervention}
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TAB: PRPP */}
      {tab === 'prpp' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 4 }}>Personal Relapse Prevention Plan</h3>
            <p style={{ fontSize: '.78rem', color: 'var(--g500)', marginBottom: 16 }}>Identify triggers across 5 categories. Minimum 5 coping strategies required for graduation (SOP 4.4).</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              {Object.entries(TRIGGER_CATEGORIES).map(([cat, options]) => (
                <div key={cat} style={{ padding: 12, background: 'var(--off)', borderRadius: 10, border: '1px solid var(--g100)' }}>
                  <div style={{ fontSize: '.82rem', fontWeight: 700, marginBottom: 8, color: 'var(--charcoal)' }}>
                    {cat} <span style={{ fontWeight: 400, color: 'var(--g400)' }}>({(pd.triggers[cat] || []).length})</span>
                  </div>
                  {options.map(opt => {
                    const checked = (pd.triggers[cat] || []).includes(opt)
                    return (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.78rem', color: checked ? '#E53E3E' : 'var(--g500)', marginBottom: 4, cursor: 'pointer', fontWeight: checked ? 600 : 400 }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleTrigger(cat, opt)} />
                        {opt}
                      </label>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem' }}>Coping Strategies</h3>
              <span style={{ fontSize: '.78rem', fontWeight: 700, color: copingCount >= 5 ? '#1A7A4A' : '#E53E3E' }}>
                {copingCount}/5 minimum {copingCount >= 5 ? '✓' : '— needs more'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
              {COPING_STRATEGIES.map(s => {
                const checked = pd.coping.includes(s)
                return (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.82rem', color: checked ? '#1A7A4A' : 'var(--g500)', cursor: 'pointer', fontWeight: checked ? 600 : 400 }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleCoping(s)} />
                    {s}
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: MDT Reviews */}
      {tab === 'mdt' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MDT_REVIEWS.map(r => (
            <div key={r.key} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1rem' }}>{r.label}</h4>
                  <p style={{ fontSize: '.76rem', color: 'var(--g500)' }}>{r.purpose}</p>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: 14, fontSize: '.72rem', fontWeight: 700,
                  background: pd.mdt[r.key].status === 'Completed' ? 'rgba(26,122,74,.1)' : pd.mdt[r.key].status === 'Overdue' ? 'rgba(229,62,62,.1)' : 'rgba(26,95,173,.08)',
                  color: pd.mdt[r.key].status === 'Completed' ? '#1A7A4A' : pd.mdt[r.key].status === 'Overdue' ? '#E53E3E' : 'var(--blue)',
                }}>{pd.mdt[r.key].status}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                <div className="fg" style={{ marginBottom: 0 }}>
                  <label className="flabel">Date</label>
                  <input type="date" className="fi" value={pd.mdt[r.key].date} onChange={e => setMdtField(r.key, 'date', e.target.value)} />
                </div>
                <div className="fg" style={{ marginBottom: 0 }}>
                  <label className="flabel">Status</label>
                  <select className="fi" value={pd.mdt[r.key].status} onChange={e => setMdtField(r.key, 'status', e.target.value)}>
                    {MDT_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="fg" style={{ marginBottom: 0 }}>
                  <label className="flabel">Outcome / Decision</label>
                  <select className="fi" value={pd.mdt[r.key].outcome || ''} onChange={e => setMdtField(r.key, 'outcome', e.target.value)}>
                    <option value="">Select outcome...</option>
                    {MDT_OUTCOMES.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Summary */}
      {tab === 'summary' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 12 }}>Treatment Plan Summary — {selectedPatient}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: 12, background: 'var(--off)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase' }}>Phase</div>
                <div style={{ fontWeight: 700, color: phaseMeta.color }}>{pt.phase}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--off)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase' }}>Problems</div>
                <div style={{ fontWeight: 700 }}>{pd.problems.length}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--off)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase' }}>Goals</div>
                <div style={{ fontWeight: 700, color: '#1A7A4A' }}>{completedGoals}/{totalGoals} ({progressPct}%)</div>
              </div>
              <div style={{ padding: 12, background: 'var(--off)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase' }}>Triggers</div>
                <div style={{ fontWeight: 700 }}>{triggerCount}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--off)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase' }}>Coping</div>
                <div style={{ fontWeight: 700, color: copingCount >= 5 ? '#1A7A4A' : '#E53E3E' }}>{copingCount} {copingCount >= 5 ? '✓' : '✗'}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--off)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase' }}>Counselor</div>
                <div style={{ fontWeight: 700 }}>{pt.counselor}</div>
              </div>
            </div>

            {/* Problem-by-problem summary */}
            {pd.problems.map(probId => {
              const prob = PROBLEM_STATEMENTS.find(p => p.id === probId)
              const goals = SMART_GOALS[probId] || []
              const completed = goals.filter((_, gi) => pd.goalStatuses[`${probId}-${gi}`] === 'Completed').length
              const activeInts = pd.interventions[probId] || []
              return (
                <div key={probId} style={{ padding: '10px 0', borderBottom: '1px solid var(--g100)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '.86rem', fontWeight: 600 }}>{prob.label}</span>
                    <span style={{ fontSize: '.76rem', color: completed === goals.length ? '#1A7A4A' : 'var(--g500)' }}>{completed}/{goals.length} goals · {activeInts.length} interventions</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Graduation readiness check */}
          <div className="card" style={{ borderLeft: `3px solid ${progressPct >= 80 && copingCount >= 5 ? '#1A7A4A' : '#E53E3E'}` }}>
            <h4 style={{ fontFamily: 'var(--fd)', fontSize: '.95rem', marginBottom: 8 }}>Graduation Readiness (Treatment Plan)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { check: 'Goals 80%+ complete', met: progressPct >= 80 },
                { check: 'PRPP triggers identified', met: triggerCount >= 3 },
                { check: '5+ coping strategies documented', met: copingCount >= 5 },
                { check: 'All MDT reviews completed', met: Object.values(pd.mdt).every(m => m.status === 'Completed') },
                { check: 'Active interventions in place', met: Object.values(pd.interventions).flat().length >= 5 },
              ].map(item => (
                <div key={item.check} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.84rem' }}>
                  <span style={{ color: item.met ? '#1A7A4A' : '#E53E3E', fontWeight: 700 }}>{item.met ? '✓' : '✗'}</span>
                  <span style={{ color: item.met ? 'var(--g700)' : 'var(--g400)' }}>{item.check}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
