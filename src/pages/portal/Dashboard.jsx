import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './Portal.module.css'

const RECOVERY_PHASES = [
  { key: 'stabilization', label: 'Medical Stabilization', weeks: '1–2', days: 14 },
  { key: 'foundation', label: 'Therapeutic Foundation', weeks: '3–6', days: 28 },
  { key: 'deepening', label: 'Deepening & Skills', weeks: '7–10', days: 28 },
  { key: 'reintegration', label: 'Reintegration & Graduation', weeks: '11–12', days: 14 },
]

export default function Dashboard() {
  const { user } = useAuth()
  const nav = useNavigate()

  const dayInProgramme = 23
  const totalDays = 84
  const currentPhase = dayInProgramme <= 14 ? 0 : dayInProgramme <= 42 ? 1 : dayInProgramme <= 70 ? 2 : 3
  const phaseDayStart = [0, 14, 42, 70]
  const phaseProgress = ((dayInProgramme - phaseDayStart[currentPhase]) / RECOVERY_PHASES[currentPhase].days) * 100

  const recentCheckins = [
    { date: '2026-05-07', mood: 4, cravings: 2, sleep: 'Good', note: 'Bible school was powerful today.' },
    { date: '2026-05-06', mood: 3, cravings: 3, sleep: 'Fair', note: 'Struggled in group therapy but learned a lot.' },
    { date: '2026-05-05', mood: 4, cravings: 1, sleep: 'Good', note: 'Morning prayer breakthrough.' },
  ]

  const schedule = [
    { time: '5:30 AM', event: 'Wake-up Call & Personal Hygiene', type: 'activity' },
    { time: '6:00 AM', event: 'Morning Exercise / Boot Camp (45 min)', type: 'activity' },
    { time: '7:00 AM', event: 'Morning Prayer & Devotions', type: 'spiritual' },
    { time: '8:00 AM', event: 'Breakfast', type: 'meal' },
    { time: '8:30 AM', event: 'Morning Community Meeting', type: 'therapy' },
    { time: '9:00 AM', event: 'Bible School / Spiritual Formation (2 hrs)', type: 'spiritual' },
    { time: '11:00 AM', event: 'Group Therapy: CBT / Relapse Prevention', type: 'therapy' },
    { time: '12:30 PM', event: 'Lunch', type: 'meal' },
    { time: '1:30 PM', event: 'Life Skills Training Group', type: 'therapy' },
    { time: '2:30 PM', event: 'Vocational Skills / Creative Therapies', type: 'activity' },
    { time: '3:30 PM', event: 'Individual Counseling (scheduled)', type: 'therapy' },
    { time: '4:00 PM', event: 'Sports / Gym / Recreation', type: 'activity' },
    { time: '5:00 PM', event: 'Personal Time: prayer, Bible study', type: 'spiritual' },
    { time: '6:00 PM', event: 'Dinner', type: 'meal' },
    { time: '7:00 PM', event: 'Evening Chapel / Discipleship Group', type: 'spiritual' },
    { time: '8:30 PM', event: 'Wrap-Up Meeting & Accountability', type: 'therapy' },
    { time: '10:30 PM', event: 'Medication Round (if applicable)', type: 'medical' },
    { time: '11:00 PM', event: 'Lights Out', type: 'activity' },
  ]

  const moodColors = ['', '#E53E3E', '#DD6B20', '#D69E2E', '#38A169', '#2B6CB0']

  return (
    <>
      <Helmet>
        <title>My Dashboard | House of Refuge</title>
        <meta name="description" content="View your recovery progress, daily schedule, and quick actions in the House of Refuge patient portal." />
      </Helmet>
      <div className="ph"><div className="container">
        <div className="ph__badge"><span className="badge">Patient Portal</span></div>
        <h1>Welcome, {user?.name?.split(' ')[0]}</h1>
        <p>Day {dayInProgramme} of your 12-week journey · {RECOVERY_PHASES[currentPhase].label}</p>
      </div></div>

      <section className="section">
        <div className="container">
          <div className={styles.progressCard}>
            <div className={styles.progressHeader}>
              <h3 style={{ fontSize: '1.3rem' }}>Recovery Progress</h3>
              <div className={styles.dayBadge}>Day {dayInProgramme} / {totalDays}</div>
            </div>
            <div className={styles.phases}>
              {RECOVERY_PHASES.map((phase, i) => (
                <div key={phase.key} className={`${styles.phase} ${i === currentPhase ? styles.phaseCurrent : ''} ${i < currentPhase ? styles.phaseDone : ''}`}>
                  <div className={styles.phaseBar}>
                    <div className={styles.phaseFill} style={{ width: i < currentPhase ? '100%' : i === currentPhase ? `${phaseProgress}%` : '0%' }} />
                  </div>
                  <div className={styles.phaseLabel}>{phase.label}</div>
                  <div className={styles.phaseDays}>Weeks {phase.weeks}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.dashGrid}>
            <div className="card">
              <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 16 }}>Today's Schedule</h4>
              <div className={styles.schedule}>
                {schedule.map((item, i) => (
                  <div key={i} className={styles.schedItem}>
                    <div className={styles.schedTime}>{item.time}</div>
                    <div className={styles.schedEvent}>
                      <div className={`${styles.schedDot} ${styles[`sched_${item.type}`]}`} />
                      {item.event}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: '.72rem', color: 'var(--g500)' }}>
                Medical checks at 6 AM, 12 PM, 6 PM, 10:30 PM daily
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 14 }}>Quick Actions</h4>
                <div className={styles.actions}>
                  <button className="btn btn--primary btn--sm btn--full" onClick={() => nav('/portal/checkin')}>Daily Check-in</button>
                  <button className="btn btn--secondary btn--sm btn--full" onClick={() => nav('/portal/treatment')}>Treatment Plan</button>
                  <button className="btn btn--secondary btn--sm btn--full" onClick={() => nav('/portal/meals')}>Order Meals</button>
                  <button className="btn btn--secondary btn--sm btn--full" onClick={() => nav('/portal/payments')}>Payment History</button>
                </div>
              </div>

              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 14 }}>Recent Check-ins</h4>
                <div className={styles.checkinList}>
                  {recentCheckins.map((c, i) => (
                    <div key={i} className={styles.checkinItem}>
                      <div className={styles.checkinDate}>{new Date(c.date).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                      <div className={styles.checkinMeta}>
                        <span style={{ color: moodColors[c.mood] }}>Mood: {c.mood}/5</span>
                        <span>Cravings: {c.cravings}/5</span>
                      </div>
                      {c.note && <div className={styles.checkinNote}>{c.note}</div>}
                    </div>
                  ))}
                </div>
                <Link to="/portal/checkin" className={styles.viewAll}>View all check-ins</Link>
              </div>

              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 10 }}>Core Values: FREE</h4>
                <div style={{ fontSize: '.78rem', color: 'var(--g700)', lineHeight: 1.7 }}>
                  <strong>F</strong>reedom · <strong>R</strong>esponsibility · <strong>E</strong>xemplary Leadership · <strong>E</strong>mpathy
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
