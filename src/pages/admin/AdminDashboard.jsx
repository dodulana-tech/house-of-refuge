import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getApplications } from '../../utils/store'
import { fmt } from '../../utils/paystack'
import styles from './Admin.module.css'

const MOCK_PATIENTS = [
  { id: 'P001', name: 'Chidi Okonkwo', day: 23, phase: 'Therapeutic Foundation', mood: 4, cravings: 2, substance: 'Alcohol', insight: 'contemplation', pathway: 'A', status: 'admitted' },
  { id: 'P002', name: 'Adaeze Nnamdi', day: 45, phase: 'Deepening & Skills', mood: 3, cravings: 3, substance: 'Tramadol', insight: 'preparation', pathway: 'A', status: 'admitted' },
  { id: 'P003', name: 'Kunle Adeyemi', day: 74, phase: 'Reintegration', mood: 5, cravings: 1, substance: 'Cannabis', insight: 'action', pathway: 'B', status: 'admitted' },
  { id: 'P004', name: 'Ibrahim Musa', day: 8, phase: 'Medical Stabilization', mood: 2, cravings: 4, substance: 'Heroin', insight: 'precontemplation', pathway: 'A', status: 'admitted' },
]

const MOCK_APPS = [
  { id: 'APP001', name: 'Tunde Bakare', substance: 'Cocaine', insight: 'contemplation', familySupport: 'strong', pathway: 'A', depositPaid: true, date: '2026-05-05', status: 'pre-screening' },
  { id: 'APP002', name: 'Grace Obi', substance: 'Alcohol', insight: 'preparation', familySupport: 'moderate', pathway: 'A', depositPaid: true, date: '2026-05-03', status: 'clinical-assessment' },
  { id: 'APP003', name: 'Ahmed Yusuf', substance: 'Multiple', insight: 'denial', familySupport: 'weak', pathway: 'B', depositPaid: false, date: '2026-05-01', status: 'outpatient-pathway' },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('overview')

  const insightColors = { denial: '#E53E3E', precontemplation: '#DD6B20', contemplation: '#D69E2E', preparation: '#38A169', action: '#2B6CB0' }
  const moodColors = ['', '#E53E3E', '#DD6B20', '#D69E2E', '#38A169', '#2B6CB0']

  const storedApps = getApplications()

  return (
    <>
      <div className="ph"><div className="container">
        <div className="ph__badge"><span className="badge">Staff Portal</span></div>
        <h1>Admin Dashboard</h1>
        <p>Welcome, {user?.name} · {user?.title}</p>
      </div></div>

      <section className="section">
        <div className="container">
          {/* Tabs */}
          <div className={styles.tabs} role="tablist">
            {[['overview', 'Overview'], ['patients', 'Current Patients'], ['applications', 'Applications'], ['finance', 'Finance']].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} aria-controls={`tabpanel-${k}`} id={`tab-${k}`} className={`${styles.tab} ${tab === k ? styles.tabActive : ''}`} onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </div>

          {/* Overview */}
          {tab === 'overview' && <div role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview">
            <div className={styles.statsRow}>
              {[
                { n: '4', l: 'Current Patients', c: 'var(--blue)' },
                { n: '20', l: 'Beds Available', c: '#1A7A4A' },
                { n: '3', l: 'Pending Applications', c: '#DD6B20' },
                { n: fmt(3595000), l: 'Revenue This Month', c: 'var(--gold)' },
              ].map(s => (
                <div key={s.l} className={`card ${styles.statCard}`}>
                  <div className={styles.statN} style={{ color: s.c }}>{s.n}</div>
                  <div className={styles.statL}>{s.l}</div>
                </div>
              ))}
            </div>

            <div className={styles.adminGrid}>
              {/* Patient overview */}
              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 16 }}>Patient Overview</h4>
                <div className={styles.patientList}>
                  {MOCK_PATIENTS.map(p => (
                    <div key={p.id} className={styles.patientRow}>
                      <div className={styles.patientName}>
                        <div className={styles.patientAvatar}>{p.name.split(' ').map(n => n[0]).join('')}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{p.name}</div>
                          <div style={{ fontSize: '.75rem', color: 'var(--g500)' }}>Day {p.day} · {p.phase} · {p.substance}</div>
                        </div>
                      </div>
                      <div className={styles.patientMeta}>
                        <span style={{ color: moodColors[p.mood] }}>Mood {p.mood}/5</span>
                        <span style={{ color: p.cravings >= 4 ? '#E53E3E' : 'var(--g500)' }}>Cravings {p.cravings}/5</span>
                        <span className={styles.insightBadge} style={{ background: insightColors[p.insight] + '15', color: insightColors[p.insight] }}>{p.insight}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent applications */}
              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 16 }}>Recent Applications</h4>
                <div className={styles.appList}>
                  {[...MOCK_APPS, ...storedApps.slice(0, 3)].map((app, i) => (
                    <div key={app.id || i} className={styles.appItem}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{app.name || `${app.fn} ${app.ln}`}</div>
                        <div style={{ fontSize: '.75rem', color: 'var(--g500)' }}>
                          {app.substance} · Insight: {app.insight || app.insightLevel || 'N/A'} · Family: {app.familySupport || app.familyAwareness || 'N/A'}
                        </div>
                      </div>
                      <div className={styles.appRight}>
                        <span className={`badge ${app.depositPaid ? 'badge--gold' : 'badge--blue'}`}>
                          {app.depositPaid ? 'Deposit Paid' : 'No Deposit'}
                        </span>
                        <span className={styles.appStatus}>{app.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>}

          {/* Patients tab */}
          {tab === 'patients' && (
            <div className={styles.patientCards} role="tabpanel" id="tabpanel-patients" aria-labelledby="tab-patients">
              {MOCK_PATIENTS.map(p => (
                <div key={p.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div className={styles.patientAvatarLg}>{p.name.split(' ').map(n => n[0]).join('')}</div>
                    <div>
                      <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem' }}>{p.name}</h4>
                      <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>ID: {p.id}</div>
                    </div>
                  </div>
                  <div className={styles.patientDetail}>
                    <div><span>Day</span><span>{p.day}/90</span></div>
                    <div><span>Phase</span><span>{p.phase}</span></div>
                    <div><span>Substance</span><span>{p.substance}</span></div>
                    <div><span>Mood</span><span style={{ color: moodColors[p.mood] }}>{p.mood}/5</span></div>
                    <div><span>Cravings</span><span style={{ color: p.cravings >= 4 ? '#E53E3E' : 'var(--g500)' }}>{p.cravings}/5</span></div>
                    <div><span>Insight</span><span style={{ color: insightColors[p.insight] }}>{p.insight}</span></div>
                  </div>
                  <div className="pbar" style={{ marginTop: 10 }}><div className="pfill" style={{ width: `${(p.day / 90) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}

          {/* Applications tab */}
          {tab === 'applications' && (
            <div role="tabpanel" id="tabpanel-applications" aria-labelledby="tab-applications">
              <div className={styles.appHeader}>
                <h3 style={{ fontSize: '1.3rem' }}>Application Pipeline</h3>
                <div className={styles.appCounts}>
                  <span className="badge badge--blue">{MOCK_APPS.filter(a => a.status === 'submitted').length + storedApps.length} New</span>
                  <span className="badge badge--gold">{MOCK_APPS.filter(a => a.status === 'interview').length} Interview</span>
                </div>
              </div>
              <div className={styles.appPipeline}>
                {[...MOCK_APPS, ...storedApps.slice(0, 5)].map((app, i) => (
                  <div key={app.id || i} className="card" style={{ marginBottom: 12 }}>
                    <div className={styles.appCardRow}>
                      <div>
                        <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 2 }}>{app.name || `${app.fn} ${app.ln}`}</h4>
                        <div style={{ fontSize: '.8rem', color: 'var(--g500)' }}>Applied: {app.date || new Date(app.submittedAt).toLocaleDateString()}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className={`badge ${app.status === 'submitted' ? 'badge--blue' : 'badge--gold'}`}>{app.status}</span>
                        {app.depositPaid && <span className="badge badge--gold">₦1M Paid</span>}
                      </div>
                    </div>
                    <div className={styles.appMeta}>
                      <span>Substance: {app.substance}</span>
                      <span>Insight: <strong style={{ color: insightColors[app.insight || app.insightLevel] }}>{app.insight || app.insightLevel || 'N/A'}</strong></span>
                      <span>Family: {app.familySupport || app.familyAwareness || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Finance tab */}
          {tab === 'finance' && (
            <div className={styles.financeGrid} role="tabpanel" id="tabpanel-finance" aria-labelledby="tab-finance">
              <div className="card" style={{ textAlign: 'center' }}>
                <div className={styles.finLabel}>Deposits Received</div>
                <div className={styles.finAmount} style={{ color: '#1A7A4A' }}>{fmt(3000000)}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>3 applications with deposit</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div className={styles.finLabel}>Treatment Fees (MTD)</div>
                <div className={styles.finAmount}>{fmt(1700000)}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>2 payments received</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div className={styles.finLabel}>Donations (MTD)</div>
                <div className={styles.finAmount} style={{ color: 'var(--gold)' }}>{fmt(875000)}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>12 donors</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div className={styles.finLabel}>Sponsorship (MTD)</div>
                <div className={styles.finAmount} style={{ color: 'var(--blue)' }}>{fmt(920000)}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>6 items sponsored</div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
