import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNotif } from '../../App'
import { saveVisitation, getVisitations } from '../../utils/store'
import styles from './Family.module.css'

export default function FamilyDashboard() {
  const { user } = useAuth()
  const showNotif = useNotif()
  const [visitDate, setVisitDate] = useState('')
  const [visitTime, setVisitTime] = useState('')
  const [visitors, setVisitors] = useState('')
  const [notes, setNotes] = useState('')

  const visits = getVisitations(user?.patientId || 'P001')

  // Mock patient progress
  const patient = {
    name: 'Chidi Okonkwo',
    day: 23,
    phase: 'Intensive Treatment',
    overallProgress: 'Positive',
    lastCheckin: { date: '2026-05-07', mood: 4, cravings: 2 },
  }

  const updates = [
    { date: '2026-05-07', title: 'Weekly Progress Update', text: 'Chidi is engaging well in group therapy. Mood has been stable this week. He has completed 5 of 12 individual therapy sessions and is making progress on trigger identification.' },
    { date: '2026-05-01', title: 'Phase Transition Update', text: 'Chidi has successfully completed the Detox & Stabilisation phase and has transitioned into Intensive Treatment. Medical team reports all vitals stable.' },
    { date: '2026-04-20', title: 'Initial Assessment Complete', text: 'Comprehensive psychosocial assessment has been completed. Chidi\'s treatment plan has been finalised and shared with the care team.' },
  ]

  const familyResources = [
    { title: 'Understanding Addiction as a Family', desc: 'A guide for families supporting a loved one in recovery.' },
    { title: 'Setting Healthy Boundaries', desc: 'How to support without enabling, with practical strategies.' },
    { title: 'Preparing for Re-entry', desc: 'What to expect and how to prepare for your loved one\'s return home.' },
    { title: 'Family Therapy: What to Expect', desc: 'How family sessions work and how to make the most of them.' },
  ]

  function handleVisitRequest() {
    if (!visitDate || !visitTime) { showNotif('Required', 'Please select a date and time.'); return }
    saveVisitation(user.patientId || 'P001', {
      date: visitDate, time: visitTime, visitors, notes,
      status: 'pending', requestedBy: user.name,
    })
    showNotif('Visit requested', 'Your visitation request has been submitted. You\'ll receive confirmation within 24 hours.', 'ok')
    setVisitDate(''); setVisitTime(''); setVisitors(''); setNotes('')
  }

  return (
    <>
      <div className="ph"><div className="container">
        <div className="ph__badge"><span className="badge">Family Portal</span></div>
        <h1>Family Dashboard</h1>
        <p>Welcome, {user?.name}, {user?.relationship} of {patient.name}</p>
      </div></div>

      <section className="section">
        <div className="container">
          {/* Patient status card */}
          <div className={styles.statusCard}>
            <div className={styles.statusLeft}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: 4 }}>{patient.name}'s Progress</h3>
              <p style={{ fontSize: '.88rem', color: 'var(--g700)' }}>Day {patient.day} of 90 · {patient.phase}</p>
              <div className="pbar" style={{ marginTop: 12, maxWidth: 300 }}>
                <div className="pfill" style={{ width: `${(patient.day / 90) * 100}%` }} />
              </div>
            </div>
            <div className={styles.statusRight}>
              <div className={styles.statusMeta}>
                <span>Overall: <strong style={{ color: '#1A7A4A' }}>{patient.overallProgress}</strong></span>
                <span>Last check-in mood: <strong>{patient.lastCheckin.mood}/5</strong></span>
              </div>
            </div>
          </div>

          <div className={styles.familyGrid}>
            {/* Progress updates */}
            <div>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', marginBottom: 18 }}>Progress Updates</h3>
              <div className={styles.updatesList}>
                {updates.map((u, i) => (
                  <div key={i} className="card" style={{ marginBottom: 14 }}>
                    <div className={styles.updateDate}>{new Date(u.date).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                    <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 6 }}>{u.title}</h4>
                    <p style={{ fontSize: '.86rem' }}>{u.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Visitation request */}
              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 14 }}>Request a Visit</h4>
                <p style={{ fontSize: '.82rem', color: 'var(--g700)', marginBottom: 14 }}>Visitation days: Sunday, 12:00 PM – 6:00 PM (max 6 hours). Once per week. Visitors must remain in designated areas. Requests must be made in advance.</p>
                <div className="fg"><label className="flabel">Preferred Date *</label>
                  <input className="fi" type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} />
                </div>
                <div className="fg"><label className="flabel">Preferred Time *</label>
                  <select className="fi" value={visitTime} onChange={e => setVisitTime(e.target.value)}>
                    <option value="">Select...</option>
                    <option>12:00 PM</option><option>1:00 PM</option><option>2:00 PM</option><option>3:00 PM</option><option>4:00 PM</option>
                  </select>
                </div>
                <div className="fg"><label className="flabel">Visitors (names)</label>
                  <input className="fi" value={visitors} onChange={e => setVisitors(e.target.value)} placeholder="Names of all visitors" />
                </div>
                <div className="fg"><label className="flabel">Notes</label>
                  <textarea className="fi" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any special requests..." />
                </div>
                <button className="btn btn--primary btn--full btn--sm" onClick={handleVisitRequest}>Submit Visit Request</button>

                {visits.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div className={styles.visitTitle}>Previous Requests</div>
                    {visits.slice(-3).reverse().map((v, i) => (
                      <div key={i} className={styles.visitItem}>
                        <span>{v.date}</span>
                        <span className={`badge ${v.status === 'approved' ? 'badge--gold' : 'badge--blue'}`}>{v.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resources */}
              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 14 }}>Family Resources</h4>
                <div className={styles.resourceList}>
                  {familyResources.map(r => (
                    <div key={r.title} className={styles.resourceItem}>
                      <div className={styles.resourceTitle}>{r.title}</div>
                      <div className={styles.resourceDesc}>{r.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 10 }}>Need to speak to someone?</h4>
                <p style={{ fontSize: '.84rem', color: 'var(--g700)', marginBottom: 10 }}>The family liaison team is available Monday–Saturday, 9am–5pm.</p>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  <a href="tel:09011277600" style={{ color: 'var(--blue)' }}>09011277600</a>
                </div>
                <div style={{ fontSize: '.82rem' }}>
                  <a href="mailto:e.abutu@freedomfoundationng.org" style={{ color: 'var(--blue)' }}>e.abutu@freedomfoundationng.org</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
