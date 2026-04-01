import React from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Home.module.css'

export default function Home() {
  const nav = useNavigate()

  return (
    <>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <svg className={styles.archBg} viewBox="0 0 520 520" fill="none" aria-hidden="true">
          <path d="M20 500L20 260L260 20L500 260L500 500" stroke="#1A5FAD" strokeWidth="3" fill="none"/>
          <path d="M60 500L60 278L260 60L460 278L460 500" stroke="#1A5FAD" strokeWidth="1.5" fill="none"/>
          <path d="M100 500L100 296L260 100L420 296L420 500" stroke="#1A5FAD" strokeWidth="1" fill="none"/>
        </svg>
        <svg className={styles.archBg2} viewBox="0 0 380 380" fill="none" aria-hidden="true">
          <path d="M10 370L10 190L190 10L370 190L370 370" stroke="#C08A30" strokeWidth="2" fill="none"/>
        </svg>
        <div className={styles.line} />

        <div className={styles.heroContent}>
          <div className={styles.left}>
            <div className={`${styles.eyebrow} fu`}>A Freedom Foundation Initiative</div>
            <h1 className={`${styles.title} fu fu1`}>Restoring Lives,<br /><em>Rebuilding Futures</em></h1>
            <p className={`${styles.sub} fu fu2`}>
              A 24-bed residential drug rehabilitation centre rooted in faith, clinical excellence, and community — serving Lagos and beyond.
            </p>
            <div className={`${styles.acts} fu fu3`}>
              <button className="btn btn--primary" onClick={() => nav('/donate')}>Donate Now</button>
              <button className="btn btn--secondary" onClick={() => nav('/apply')}>Apply for Admission</button>
            </div>
          </div>
          <div className={`${styles.right} fu fu4`}>
            <div className={styles.launchCard}>
              <span className={styles.dot} />
              <div>
                <div className={styles.launchLbl}>Opening Soon</div>
                <div className={styles.launchTxt}>Launching April 15, 2026 · Lekki, Lagos</div>
              </div>
            </div>
            <div className={styles.statsGrid}>
              {[
                { n: '24',  l: 'Residential Beds'  },
                { n: '12+', l: 'Clinical Staff'     },
                { n: '90',  l: 'Day Programme'      },
                { n: '₦0',  l: 'Cost to Indigent'   },
              ].map(s => (
                <div key={s.l} className={styles.stat}>
                  <div className={styles.statN}>{s.n}</div>
                  <div className={styles.statL}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="section">
        <div className="container">
          <div className={styles.mGrid}>
            <div className={styles.mVis}>
              <blockquote className={styles.quote}>"...setting the captives free — one life at a time."</blockquote>
              <cite className={styles.cite}>— House of Refuge Vision Statement</cite>
              <div className={styles.mDivider} />
              <div className={styles.mOrgs}>
                <div className={styles.mOrgLbl}>An initiative of</div>
                <div className={styles.mOrgName}>Freedom Foundation Nigeria</div>
                <div className={styles.mOrgSub}>Managed by ConsultForAfrica.com</div>
              </div>
            </div>
            <div>
              <div className="sh__lbl">Our Mission</div>
              <h2>Healing the whole person — body, mind &amp; soul</h2>
              <div className="dv" />
              <p style={{ fontSize: '1.02rem', lineHeight: 1.8, marginBottom: 18 }}>
                House of Refuge is a 24-bed inpatient drug rehabilitation centre launching in Lekki, Lagos. We combine evidence-based clinical care with faith-based recovery support to help individuals overcome addiction and reintegrate into society.
              </p>
              <div className={styles.pillars}>
                {[
                  { icon: '🏥', t: 'Clinical Care',       d: 'Medically supervised detox, MDT assessments, and 24/7 nursing support throughout every stage of recovery.' },
                  { icon: '🧠', t: 'Counselling',          d: 'Individual therapy, group sessions, family reintegration support, and life skills training.' },
                  { icon: '✝️', t: 'Faith & Community',    d: 'Biblically grounded recovery, spiritual discipleship, and long-term aftercare support.' },
                ].map(p => (
                  <div key={p.t} className={styles.pillar}>
                    <div className={styles.pillarIcon}>{p.icon}</div>
                    <p className={styles.pillarTxt}><strong>{p.t}</strong> — {p.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="section section--alt">
        <div className="container">
          <div className="sh">
            <div className="sh__lbl">The Journey</div>
            <h2>How recovery works at House of Refuge</h2>
            <p>A structured, compassionate pathway from crisis to full restoration</p>
          </div>
          <div className={styles.steps}>
            {[
              { n:'1', t:'Assessment & Admission',       d:'A thorough clinical and psychosocial assessment shapes your personalised care plan. Family involvement is welcomed from day one.' },
              { n:'2', t:'Detox & Treatment',             d:'Medically supervised withdrawal followed by a structured 90-day programme of therapy, nutrition, physical wellness, and spiritual care.' },
              { n:'3', t:'Reintegration & Aftercare',    d:'Discharge planning, vocational training, and ongoing community support to ensure lasting recovery and a meaningful new chapter.' },
            ].map(s => (
              <div key={s.n} className={`${styles.step} card`}>
                <div className={styles.stepN}>{s.n}</div>
                <h3 className={styles.stepT}>{s.t}</h3>
                <p className={styles.stepD}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Equipment drive ── */}
      <section className="section">
        <div className="container">
          <div className="sh">
            <div className="sh__lbl">Equipment Drive</div>
            <h2>32 items needed before launch day</h2>
            <p>From patient monitors to laptops to counselling furniture — every item sponsored creates a better recovery environment.</p>
          </div>
          <div className={styles.eqGrid}>
            <div className="card" style={{ textAlign:'center' }}>
              <div className={styles.bigN} style={{ color:'var(--blue)' }}>₦17.4M</div>
              <div className={styles.bigL}>Total equipment needed</div>
              <div className="pbar"><div className="pfill" style={{ width:'8%' }} /></div>
              <div className={styles.bigSub}>8% funded so far</div>
            </div>
            <div className="card" style={{ textAlign:'center' }}>
              <div className={styles.bigN} style={{ color:'var(--gold)' }}>32</div>
              <div className={styles.bigL}>Items on sponsorship list</div>
              <div style={{ marginTop:10, fontSize:'.8rem', color:'var(--g700)' }}>Medical · Facility · Therapeutic</div>
            </div>
            <div className="card" style={{ textAlign:'center' }}>
              <div className={styles.bigN} style={{ color:'#1A7A4A' }}>15 Apr</div>
              <div className={styles.bigL}>Target launch date, 2026</div>
              <div style={{ marginTop:10, fontSize:'.8rem', color:'var(--g700)' }}>Pre-launch workstreams active</div>
            </div>
          </div>
          <div style={{ textAlign:'center', marginTop:28 }}>
            <button className="btn btn--primary" onClick={() => nav('/sponsor')}>View Full Sponsorship List</button>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta">
        <div className="container">
          <h2>Be part of something that changes everything</h2>
          <p>Every donation, every prayer, every referral brings a life back from the brink.</p>
          <div className="cta__acts">
            <button className="btn btn--white"         onClick={() => nav('/donate')}>Make a Donation</button>
            <button className="btn btn--outline-white" onClick={() => nav('/sponsor')}>Sponsor Equipment</button>
          </div>
        </div>
      </section>
    </>
  )
}
