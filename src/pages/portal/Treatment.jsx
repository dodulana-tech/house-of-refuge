import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import styles from './Portal.module.css'

const TREATMENT_PLAN = {
  phases: [
    {
      name: 'Phase 1: Medical Stabilization',
      weeks: 'Weeks 1–2',
      status: 'completed',
      goals: [
        { text: 'Complete medical detoxification safely', done: true },
        { text: 'Stabilise vital signs (CIWA-Ar / COWS monitoring)', done: true },
        { text: 'Complete all 9 pre-admission medical tests', done: true },
        { text: 'Nutritional stabilization and recovery', done: true },
        { text: 'Full orientation and house rules briefing', done: true },
        { text: 'Begin spiritual engagement (voluntary)', done: true },
      ],
      therapies: ['Medical detox under doctor supervision', '24/7 nursing monitoring', 'Nutritional support', 'Reduced therapeutic demand — rest priority'],
    },
    {
      name: 'Phase 2: Therapeutic Foundation',
      weeks: 'Weeks 3–6',
      status: 'current',
      goals: [
        { text: 'Complete 4 individual CBT sessions (1/week)', done: false, progress: '2/4' },
        { text: 'Attend all group CBT / Relapse Prevention (3x/week)', done: false, progress: '6/12' },
        { text: 'Engage in psychoeducation groups (2x/week)', done: false, progress: '4/8' },
        { text: 'Begin life skills curriculum modules (3x/week)', done: false, progress: '3/12' },
        { text: 'Daily spiritual formation classes (Mon–Fri)', done: false, progress: 'Ongoing' },
        { text: 'Week 4 treatment plan review (MDT)', done: false },
      ],
      therapies: ['Group CBT / Relapse Prevention (3x/week, 90 min)', 'Psychoeducation (2x/week)', 'Individual CBT (weekly 1:1, 60 min)', 'Life Skills Groups (3x/week)', 'Spiritual Formation Class (5x/week)', 'Evening Bible Study & Discipleship (daily)', 'Peer Recovery Circle (daily, informal)'],
    },
    {
      name: 'Phase 3: Deepening & Skills Building',
      weeks: 'Weeks 7–10',
      status: 'upcoming',
      goals: [
        { text: 'Advanced trauma processing and family systems work', done: false },
        { text: 'Vocational assessment and skills training', done: false },
        { text: 'Personal Relapse Prevention Plan (PRPP) development', done: false },
        { text: 'Family therapy sessions (Pathway A, min 2)', done: false },
        { text: 'Community group work and reintegration orientation (Pathway B)', done: false },
        { text: 'Week 8 treatment plan review (MDT)', done: false },
        { text: 'Evangelism and community engagement begins', done: false },
      ],
      therapies: ['Trauma Processing Therapy', 'Family Systems Therapy', 'Relationship & Family Group (Friday)', 'Vocational Skills / Creative Therapies', 'PRPP development and practice', 'Relaxation & Stress Management (Friday PM)', 'Street evangelism teams (post-detox)'],
    },
    {
      name: 'Phase 4: Reintegration & Graduation',
      weeks: 'Weeks 11–12',
      status: 'upcoming',
      goals: [
        { text: 'Pre-discharge assessment completed', done: false },
        { text: 'Family reintegration meeting (Pathway A) or community placement confirmed (B)', done: false },
        { text: 'Personal Relapse Prevention Plan finalized and practiced', done: false },
        { text: 'Aftercare plan confirmed — church placement, support group, follow-up schedule', done: false },
        { text: 'Alumni Program enrollment', done: false },
        { text: 'Graduation ceremony', done: false },
      ],
      therapies: ['Transition Group (Discharge Readiness)', 'Final family/community meeting', 'Aftercare planning', 'Church placement and Life Center connection', 'Graduation ceremony preparation'],
    },
  ],
  team: [
    { name: 'Program Director', role: 'Qualified Medical Doctor — Clinical & Operational Leader', sessions: 'Admission decisions, MDT chair, weekly doctor review' },
    { name: 'Head of Clinical Services', role: 'Clinical Lead / Head Counselor', sessions: 'Group CBT 3x/week, individual sessions, treatment plan reviews' },
    { name: 'Head Nurse', role: 'Nursing Services Lead (3 rotating shift nurses)', sessions: 'Daily nursing checks, medication administration, detox monitoring' },
    { name: 'Chaplain', role: 'Spiritual Formation Lead', sessions: 'Bible School 5x/week, Sunday Chapel, evening devotions, pastoral counseling' },
    { name: 'Social Worker', role: 'Psychosocial Assessment & Reintegration', sessions: 'Pathway B case management, family engagement, aftercare follow-up' },
    { name: 'House Master', role: 'Residential Community Manager (lives on-site)', sessions: 'Daily schedule, boot camp, behavioral management, pass requests' },
    { name: 'Clinical Psychologist', role: 'Assessment & Therapy Support', sessions: 'Cognitive screening, advanced therapy, MDT contributions' },
    { name: 'Admin Coordinator', role: 'Financial Records & Facility Management', sessions: 'Invoicing, requisitions, domestic staff oversight' },
  ],
  weeklySchedule: [
    { day: 'Monday', items: ['Community Meeting', 'Bible School', 'Group CBT', 'Life Skills', 'Vocational Skills', 'Individual Counseling', 'Evening Chapel'] },
    { day: 'Tuesday', items: ['Community Meeting', 'Bible School', 'Psychoeducation Group', 'Life Skills', 'Creative Therapies', 'Sports/Gym', 'Evening Devotion'] },
    { day: 'Wednesday', items: ['Community Meeting', 'Bible School', 'Group CBT', 'Small Group (Process)', 'Cooking/Nutrition Skills', 'Individual Counseling', 'Evening Chapel'] },
    { day: 'Thursday', items: ['Community Meeting', 'Bible School', 'Relapse Prevention Group', 'Care Planning Group', 'Creative Writing', 'Sports/Gym', 'Evening Devotion'] },
    { day: 'Friday', items: ['Community Meeting', 'Bible School', 'Group CBT', 'Relationship & Family Group', 'Relaxation Group', 'Recreation', 'Evening Chapel'] },
    { day: 'Saturday', items: ['Morning Prayer', 'Community Meeting', 'Work & Chores', 'Personal Time', 'Visitation (Sunday preferred)', 'Movie/Fellowship Night', 'Evening Prayer'] },
    { day: 'Sunday', items: ['Morning Prayer', 'Chapel Service (9:00–11:30 AM)', 'Lunch', 'Family Visits (12:00–6:00 PM)', 'Personal Time', 'Evening Devotion', 'Peer Recovery Circle'] },
  ],
  graduationCriteria: [
    { criterion: 'Minimum Residency', standard: '12-week programme completed (extendable to 6 months where clinically indicated)' },
    { criterion: 'Clinical Stability', standard: 'No active withdrawal, stable vitals, no psychiatric symptoms, sustained abstinence' },
    { criterion: 'Insight & Commitment', standard: 'Clear insight into addiction, genuine articulated commitment to sustained sobriety' },
    { criterion: 'Christian Growth', standard: 'Authentic spiritual formation — faithful participation, evidence of internal values transformation' },
    { criterion: 'Relapse Prevention Plan', standard: 'Written PRPP completed, 5+ coping strategies, identified recovery support network' },
    { criterion: 'Reintegration Readiness', standard: 'Confirmed safe post-discharge placement, family/community meeting completed, aftercare finalized' },
  ],
}

export default function Treatment() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('plan')

  return (
    <>
      <div className="ph"><div className="container">
        <div className="ph__badge"><span className="badge">Patient Portal</span></div>
        <h1>Treatment Plan</h1>
        <p>Your personalised 12-week recovery programme — Evidence-Based, Christ-Centered, Trauma-Informed</p>
      </div></div>

      <section className="section">
        <div className="container">
          <div className={styles.tabs}>
            {[['plan', 'Treatment Plan'], ['schedule', 'Weekly Schedule'], ['team', 'Care Team'], ['graduation', 'Graduation Criteria']].map(([k, l]) => (
              <button key={k} className={`${styles.tab} ${activeTab === k ? styles.tabActive : ''}`} onClick={() => setActiveTab(k)}>
                {l}
              </button>
            ))}
          </div>

          {activeTab === 'plan' && (
            <div className={styles.planGrid}>
              {TREATMENT_PLAN.phases.map((phase, i) => (
                <div key={i} className={`card ${styles.phaseCard} ${phase.status === 'current' ? styles.phaseCardCurrent : ''}`}>
                  <div className={styles.phaseCardHeader}>
                    <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem' }}>{phase.name}</h4>
                    <span className={`badge ${phase.status === 'completed' ? 'badge--gold' : 'badge--blue'}`}>
                      {phase.status === 'completed' ? 'Complete' : phase.status === 'current' ? 'In Progress' : 'Upcoming'}
                    </span>
                  </div>
                  <div className={styles.phaseMeta}>{phase.weeks}</div>

                  <div className={styles.goalsList}>
                    <div className={styles.goalsTitle}>Goals</div>
                    {phase.goals.map((g, j) => (
                      <div key={j} className={`${styles.goalItem} ${g.done ? styles.goalDone : ''}`}>
                        <div className={styles.goalCheck}>{g.done ? '✓' : '○'}</div>
                        <div className={styles.goalText}>
                          {g.text}
                          {g.progress && <span className={styles.goalProgress}>{g.progress}</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.therapiesList}>
                    <div className={styles.goalsTitle}>Therapies & Activities</div>
                    <div className={styles.therapyTags}>
                      {phase.therapies.map(t => <span key={t} className={styles.therapyTag}>{t}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className={styles.scheduleGrid}>
              {TREATMENT_PLAN.weeklySchedule.map(day => (
                <div key={day.day} className="card">
                  <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 10, color: day.day === 'Sunday' ? 'var(--gold)' : 'var(--blue)' }}>{day.day}</h4>
                  <div className={styles.dayItems}>
                    {day.items.map((item, i) => (
                      <div key={i} className={styles.dayItem}>{item}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'team' && (
            <div className={styles.teamGrid}>
              {TREATMENT_PLAN.team.map(member => (
                <div key={member.name} className="card">
                  <div className={styles.teamAvatar}>{member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                  <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 2 }}>{member.name}</h4>
                  <div className={styles.teamRole}>{member.role}</div>
                  <div className={styles.teamSessions}>{member.sessions}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'graduation' && (
            <div>
              <div className="card" style={{ marginBottom: 18 }}>
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 8 }}>Programme Completion — All 6 Criteria Required</h4>
                <p style={{ fontSize: '.88rem', color: 'var(--g700)', lineHeight: 1.7, marginBottom: 18 }}>
                  A resident is eligible for graduation when ALL of the following criteria are demonstrated. The graduation ceremony is a therapeutically significant event — it involves family or community supporters, includes the client's personal testimony, and formally releases them into their next chapter.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {TREATMENT_PLAN.graduationCriteria.map((c, i) => (
                    <div key={i} style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--off)', border: '1px solid var(--g100)' }}>
                      <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--blue)', marginBottom: 4 }}>{i + 1}. {c.criterion}</div>
                      <div style={{ fontSize: '.82rem', color: 'var(--g700)' }}>{c.standard}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: 12 }}>After Graduation — Alumni Programme</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    'Year 1: Weekly contact (months 1–3), bi-weekly (4–6), monthly (7–12). Home visits at 3, 6, 12 months.',
                    'Year 2: Monthly phone contact, bi-monthly visits. Case closure at 24 months if sustained recovery.',
                    'Alumni Support Groups: Regular gatherings for graduates — peer accountability, encouragement, fellowship.',
                    'Mentorship: Stabilized alumni (6+ months post-discharge) trained as recovery mentors.',
                    'Church placement: Connected to a specific local church and Life Center before discharge.',
                  ].map((t, i) => (
                    <div key={i} style={{ fontSize: '.82rem', color: 'var(--g700)', padding: '8px 10px', borderRadius: 6, background: 'var(--off)', borderLeft: '3px solid var(--blue)' }}>{t}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
