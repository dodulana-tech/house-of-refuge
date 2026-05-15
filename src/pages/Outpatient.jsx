import React, { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import {
  SERVICE_CATEGORIES,
  fmtNaira,
  listPublicServices,
  listPublicPractitioners,
} from '../utils/outpatient'
import styles from './Outpatient.module.css'

export default function Outpatient() {
  const nav = useNavigate()
  const [services, setServices] = useState([])
  const [practitioners, setPractitioners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    ;(async () => {
      const [s, p] = await Promise.all([
        listPublicServices(),
        listPublicPractitioners(),
      ])
      if (!live) return
      setServices(s.data || [])
      setPractitioners(p.data || [])
      setLoading(false)
    })()
    return () => { live = false }
  }, [])

  const grouped = useMemo(() => {
    const g = {}
    for (const cat of SERVICE_CATEGORIES) g[cat.key] = []
    for (const s of services) {
      if (!g[s.category]) g[s.category] = []
      g[s.category].push(s)
    }
    return g
  }, [services])

  return (
    <>
      <Helmet>
        <title>Outpatient Services | House of Refuge — Lekki, Lagos</title>
        <meta name="description" content="Outpatient mental health and addiction services at House of Refuge — psychiatric consultations, clinical psychology, family therapy, diagnostics, and pre-admission assessments. Lekki, Lagos." />
      </Helmet>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>Outpatient Services</div>
          <h1 className={styles.title}>Clinical care, by appointment.</h1>
          <p className={styles.sub}>
            Specialist consultations, diagnostics, and therapy delivered from our Lekki clinic by an in-house team and a roster of visiting psychiatrists. For families exploring care for the first time, second opinions, or ongoing recovery support — without the commitment of residential admission.
          </p>
          <div className={styles.acts}>
            <a href="#services" className="btn btn--gold">Browse services</a>
            <a className="btn btn--outline-white" href="tel:+2349112777600">Call 0911 277 7600</a>
          </div>
        </div>
      </section>

      <section className="section" id="services">
        <div className="container">
          <div className="sh" style={{ textAlign: 'left', marginBottom: 28 }}>
            <div className="sh__lbl">Services</div>
            <h2 style={{ maxWidth: 720 }}>Book the care you need — without admission.</h2>
            <div className="dv" />
            <p style={{ maxWidth: 720, color: 'var(--g700)', marginTop: 12 }}>
              Every service is delivered to the same clinical standard as our inpatient programme. The <strong>Pre-admission Clinical Assessment</strong> is creditable to the inpatient deposit within 90 days if your family proceeds to residential care.
            </p>
          </div>

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--g500)' }}>Loading services…</div>
          ) : services.length === 0 ? (
            <div className="card" style={{ padding: '40px 32px', textAlign: 'center', background: '#FFF8EC', border: '1px solid rgba(192,138,48,.25)' }}>
              <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700, marginBottom: 10 }}>Launching soon</div>
              <h3 style={{ fontSize: '1.2rem', margin: '0 0 8px', color: 'var(--charcoal)' }}>Our outpatient catalog goes live shortly.</h3>
              <p style={{ fontSize: '.95rem', color: 'var(--g700)', maxWidth: 540, margin: '0 auto 18px', lineHeight: 1.6 }}>
                Psychiatric consultations, clinical psychology, family therapy, diagnostics, and the pre-admission clinical assessment will be bookable from this page once the catalog is published.
              </p>
              <a className="btn btn--primary" href="tel:+2349112777600">Call 0911 277 7600 for current availability</a>
            </div>
          ) : (
            SERVICE_CATEGORIES.map(cat => {
              const list = grouped[cat.key] || []
              if (list.length === 0) return null
              return (
                <div key={cat.key} className={styles.catBlock}>
                  <div className={styles.catHead}>
                    <div className={styles.catBar} style={{ background: cat.color }} />
                    <div>
                      <div className={styles.catLbl}>{cat.label}</div>
                      <div className={styles.catCount}>{list.length} service{list.length === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                  <div className={styles.svcGrid}>
                    {list.map(s => (
                      <Link key={s.id} to={`/outpatient/${s.slug}`} className={styles.svcCard}>
                        <div className={styles.svcName}>{s.name}</div>
                        {s.short_description && <p className={styles.svcDesc}>{s.short_description}</p>}
                        <div className={styles.svcMeta}>
                          {s.duration_minutes && <span>{s.duration_minutes >= 60 ? `${Math.round(s.duration_minutes/60*10)/10}h` : `${s.duration_minutes} min`}</span>}
                          <span className={styles.svcPrice}>{fmtNaira(s.price_ngn)}</span>
                        </div>
                        {s.conversion_eligible && (
                          <div className={styles.svcCredit}>Creditable to inpatient deposit within {s.conversion_window_days} days</div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <div className="sh" style={{ textAlign: 'left', marginBottom: 28 }}>
            <div className="sh__lbl">Clinical team</div>
            <h2 style={{ maxWidth: 720 }}>Visiting psychiatrists and in-house clinicians.</h2>
            <div className="dv" />
          </div>
          {practitioners.length === 0 ? (
            <p style={{ color: 'var(--g700)' }}>Our clinical roster is being finalised. Please call for current availability.</p>
          ) : (
            <div className={styles.pracGrid}>
              {practitioners.map(p => (
                <div key={p.id} className={styles.pracCard}>
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.full_name} className={styles.pracPhoto} />
                  ) : (
                    <div className={styles.pracPhotoPlaceholder} aria-hidden="true">{p.full_name.split(' ').map(n => n[0]).filter(c => /[A-Z]/.test(c)).slice(0, 2).join('')}</div>
                  )}
                  <div className={styles.pracName}>{p.full_name}</div>
                  <div className={styles.pracTitle}>{p.title}</div>
                  <div className={styles.pracRole}>{p.role_type === 'visiting' ? 'Visiting' : 'In-house'}</div>
                  {p.short_bio && <p className={styles.pracBio}>{p.short_bio}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <h2>Need help deciding which service is right?</h2>
          <p>Our admissions team can help triage your enquiry — by phone, in confidence, within one working day.</p>
          <div className="cta__acts">
            <a className="btn btn--white" href="tel:+2349112777600">Call 0911 277 7600</a>
            <button className="btn btn--outline-white" onClick={() => nav('/contact')}>Get in touch</button>
          </div>
        </div>
      </section>
    </>
  )
}
