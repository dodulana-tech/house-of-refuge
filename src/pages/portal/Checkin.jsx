import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotif } from '../../App'
import { saveCheckin, getCheckins } from '../../utils/store'
import styles from './Portal.module.css'

const MOOD_LABELS = ['', 'Very Low', 'Low', 'Okay', 'Good', 'Great']
const MOOD_COLORS = ['', '#E53E3E', '#DD6B20', '#D69E2E', '#38A169', '#2B6CB0']

export default function Checkin() {
  const { user } = useAuth()
  const showNotif = useNotif()
  const nav = useNavigate()
  const [mood, setMood] = useState(0)
  const [cravings, setCravings] = useState(0)
  const [sleep, setSleep] = useState('')
  const [energy, setEnergy] = useState('')
  const [appetite, setAppetite] = useState('')
  const [anxiety, setAnxiety] = useState(0)
  const [gratitude, setGratitude] = useState('')
  const [triggers, setTriggers] = useState('')
  const [copingUsed, setCopingUsed] = useState('')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const history = getCheckins(user?.id)

  function handleSubmit() {
    if (!mood) { showNotif('Required', 'Please rate your mood.'); return }
    if (!cravings && cravings !== 0) { showNotif('Required', 'Please rate your cravings.'); return }

    saveCheckin(user.id, {
      mood, cravings, sleep, energy, appetite, anxiety,
      gratitude, triggers, copingUsed, notes,
    })
    setSubmitted(true)
    showNotif('Check-in saved', 'Your daily check-in has been recorded. Keep going!', 'ok')
  }

  if (submitted) {
    return (
      <>
        <Helmet>
          <title>Daily Check-in | House of Refuge</title>
          <meta name="description" content="Complete your daily wellness check-in to help your care team track your recovery progress." />
        </Helmet>
        <div className="ph"><div className="container">
          <div className="ph__badge"><span className="badge">Patient Portal</span></div>
          <h1>Check-in Complete</h1>
          <p>Your daily wellness check has been recorded</p>
        </div></div>
        <section className="section">
          <div className="container" style={{ textAlign: 'center', maxWidth: 500 }}>
            <div className="card" style={{ padding: 40 }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>
                {mood >= 4 ? '🌟' : mood === 3 ? '👍' : '💪'}
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Thank you for checking in</h3>
              <p style={{ marginBottom: 24 }}>Consistent self-awareness is a powerful tool in your recovery journey. Your care team reviews these daily.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn--primary btn--sm" onClick={() => nav('/portal')}>Back to Dashboard</button>
                <button className="btn btn--secondary btn--sm" onClick={() => { setSubmitted(false); setMood(0); setCravings(0) }}>New Check-in</button>
              </div>
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>Daily Check-in | House of Refuge</title>
        <meta name="description" content="Complete your daily wellness check-in to help your care team track your recovery progress." />
      </Helmet>
      <div className="ph"><div className="container">
        <div className="ph__badge"><span className="badge">Patient Portal</span></div>
        <h1>Daily Check-in</h1>
        <p>{new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div></div>

      <section className="section">
        <div className="container">
          <div className={styles.checkinGrid}>
            <div className="card">
              <h3 style={{ fontSize: '1.5rem', marginBottom: 4 }}>How are you today?</h3>
              <p style={{ fontSize: '.82rem', color: 'var(--g500)', marginBottom: 24 }}>Honest self-reflection helps your care team support you better</p>

              {/* Mood */}
              <div className={styles.sliderSection}>
                <label className="flabel">Mood *</label>
                <div className={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} className={`${styles.ratingBtn} ${mood === n ? styles.ratingActive : ''}`}
                      style={mood === n ? { background: MOOD_COLORS[n], borderColor: MOOD_COLORS[n], color: 'white' } : {}}
                      onClick={() => setMood(n)}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className={styles.ratingLabels}><span>Very Low</span><span>Great</span></div>
              </div>

              {/* Cravings */}
              <div className={styles.sliderSection}>
                <label className="flabel">Cravings Intensity *</label>
                <div className={styles.ratingRow}>
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <button key={n} className={`${styles.ratingBtn} ${cravings === n ? styles.ratingActive : ''}`}
                      style={cravings === n ? { background: n <= 1 ? '#38A169' : n <= 3 ? '#D69E2E' : '#E53E3E', borderColor: n <= 1 ? '#38A169' : n <= 3 ? '#D69E2E' : '#E53E3E', color: 'white' } : {}}
                      onClick={() => setCravings(n)}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className={styles.ratingLabels}><span>None</span><span>Intense</span></div>
              </div>

              {/* Anxiety */}
              <div className={styles.sliderSection}>
                <label className="flabel">Anxiety Level</label>
                <div className={styles.ratingRow}>
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <button key={n} className={`${styles.ratingBtn} ${anxiety === n ? styles.ratingActive : ''}`}
                      onClick={() => setAnxiety(n)}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className={styles.ratingLabels}><span>Calm</span><span>Severe</span></div>
              </div>

              <div className="frow">
                <div className="fg"><label className="flabel">Sleep Quality</label>
                  <select className="fi" value={sleep} onChange={e => setSleep(e.target.value)}>
                    <option value="">Select...</option>
                    {['Excellent', 'Good', 'Fair', 'Poor', 'Did not sleep'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="flabel">Energy Level</label>
                  <select className="fi" value={energy} onChange={e => setEnergy(e.target.value)}>
                    <option value="">Select...</option>
                    {['High', 'Normal', 'Low', 'Exhausted'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="fg"><label className="flabel">Appetite</label>
                <select className="fi" value={appetite} onChange={e => setAppetite(e.target.value)}>
                  <option value="">Select...</option>
                  {['Normal', 'Increased', 'Decreased', 'No appetite'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="fg"><label className="flabel">Any triggers today?</label>
                <textarea className="fi" value={triggers} onChange={e => setTriggers(e.target.value)} rows={2} placeholder="People, places, feelings, memories that triggered cravings..." />
              </div>

              <div className="fg"><label className="flabel">Coping strategies used</label>
                <textarea className="fi" value={copingUsed} onChange={e => setCopingUsed(e.target.value)} rows={2} placeholder="Prayer, deep breathing, talked to counsellor, exercise..." />
              </div>

              <div className="fg"><label className="flabel">What are you grateful for today?</label>
                <textarea className="fi" value={gratitude} onChange={e => setGratitude(e.target.value)} rows={2} placeholder="Even small things count..." />
              </div>

              <div className="fg"><label className="flabel">Additional notes</label>
                <textarea className="fi" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Anything else you want to share with your care team..." />
              </div>

              <button className="btn btn--primary btn--full" onClick={handleSubmit}>Submit Check-in</button>
            </div>

            {/* History sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 14 }}>Why check in daily?</h4>
                <div className={styles.whyList}>
                  {[
                    'Builds self-awareness, the foundation of recovery',
                    'Helps your care team spot patterns early',
                    'Tracks your progress over weeks and months',
                    'Provides data for treatment plan adjustments',
                    'Creates a personal recovery journal',
                  ].map(t => <div key={t} className={styles.whyItem}>{t}</div>)}
                </div>
              </div>

              {history.length > 0 && (
                <div className="card">
                  <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 14 }}>Recent History</h4>
                  <div className={styles.checkinList}>
                    {history.slice(-5).reverse().map((c, i) => (
                      <div key={i} className={styles.checkinItem}>
                        <div className={styles.checkinDate}>{new Date(c.date).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        <div className={styles.checkinMeta}>
                          <span style={{ color: MOOD_COLORS[c.mood] }}>Mood: {c.mood}/5</span>
                          <span>Cravings: {c.cravings}/5</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
