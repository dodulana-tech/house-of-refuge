import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getServiceBySlug, fmtNaira, SERVICE_CATEGORIES } from '../utils/outpatient'

export default function OutpatientService() {
  const { slug } = useParams()
  const nav = useNavigate()
  const [svc, setSvc] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    ;(async () => {
      const { data } = await getServiceBySlug(slug)
      if (live) { setSvc(data); setLoading(false) }
    })()
    return () => { live = false }
  }, [slug])

  if (loading) return <div style={{ padding: '120px 24px', textAlign: 'center' }}>Loading…</div>
  if (!svc) return (
    <div style={{ padding: '120px 24px', textAlign: 'center' }}>
      <h1>Service not found</h1>
      <p style={{ marginTop: 12 }}><Link to="/outpatient">Back to outpatient services</Link></p>
    </div>
  )

  const cat = SERVICE_CATEGORIES.find(c => c.key === svc.category)

  return (
    <>
      <Helmet>
        <title>{svc.name} | House of Refuge — Outpatient</title>
        <meta name="description" content={svc.short_description || svc.name} />
      </Helmet>

      <div className="ph">
        <div className="container">
          <div className="ph__badge"><span className="badge">{cat?.label || svc.category}</span></div>
          <h1>{svc.name}</h1>
          <p>{svc.short_description}</p>
        </div>
      </div>

      <section className="section">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40, alignItems: 'start' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>About this service</h2>
            <p style={{ fontSize: '1rem', lineHeight: 1.75, color: 'var(--charcoal)', marginBottom: 18 }}>
              {svc.long_description || svc.short_description}
            </p>

            {svc.conversion_eligible && (
              <div className="card" style={{ background: 'rgba(26,122,74,.06)', border: '1px solid rgba(26,122,74,.2)', borderLeft: '3px solid #1A7A4A', padding: '18px 22px', marginBottom: 20 }}>
                <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: '#1A7A4A', fontWeight: 700, marginBottom: 6 }}>Inpatient credit</div>
                <p style={{ fontSize: '.95rem', lineHeight: 1.65, margin: 0 }}>
                  If your family proceeds to residential admission within <strong>{svc.conversion_window_days} days</strong> of this service, the fee is <strong>credited in full</strong> against the NGN 1,000,000 inpatient deposit.
                </p>
              </div>
            )}

            <h3 style={{ fontSize: '1.05rem', marginTop: 24, marginBottom: 10 }}>What to expect</h3>
            <ul style={{ paddingLeft: 22, lineHeight: 1.8, color: 'var(--charcoal)' }}>
              <li>Booking and payment confirmed online in advance (or by invoice on request).</li>
              <li>Pre-appointment intake form sent by email.</li>
              <li>Session held at the HOR clinic in Lekki, with a written clinical summary after.</li>
              <li>Clear next steps if further care is recommended — clinical, therapeutic, or residential.</li>
              <li>All clinical information held in strict confidence.</li>
            </ul>

            <h3 style={{ fontSize: '1.05rem', marginTop: 24, marginBottom: 10 }}>Cancellation &amp; rescheduling</h3>
            <p style={{ fontSize: '.95rem', color: 'var(--g700)', lineHeight: 1.65 }}>
              Reschedule or cancel up to 24 hours before your appointment for a full refund or free reschedule. Cancellations within 24 hours and no-shows are non-refundable but may be rescheduled at 50% credit.
            </p>
          </div>

          <aside style={{ position: 'sticky', top: 100, alignSelf: 'start' }}>
            <div className="card" style={{ padding: '24px 26px' }}>
              <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700, marginBottom: 6 }}>Fee</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--charcoal)', letterSpacing: '-.02em' }}>
                {fmtNaira(svc.price_ngn)}
              </div>
              <div style={{ fontSize: '.82rem', color: 'var(--g700)', marginTop: 4 }}>
                {svc.duration_minutes ? `${svc.duration_minutes} minute session` : 'Package'}
              </div>

              <hr style={{ margin: '18px 0', border: 0, borderTop: '1px solid #EDF1F5' }} />

              <div style={{ fontSize: '.85rem', color: 'var(--charcoal)', lineHeight: 1.65, marginBottom: 18 }}>
                Book online — pay by card or arrange an invoice. Appointment confirmed once payment is received or invoice acknowledged.
              </div>

              <button className="btn btn--primary btn--full" onClick={() => nav(`/outpatient/${svc.slug}/book`)}>
                Book this service
              </button>
              <a className="btn btn--secondary btn--full" href="tel:+2349112777600" style={{ marginTop: 8 }}>Call 0911 277 7600</a>

              <p style={{ fontSize: '.78rem', color: 'var(--g500)', marginTop: 14, lineHeight: 1.55 }}>
                Need to talk first? Our team can help you decide which service is the best fit for your loved one.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <p style={{ textAlign: 'center', color: 'var(--g700)' }}>
            Looking for another service? <Link to="/outpatient">Back to the full catalog</Link>
          </p>
        </div>
      </section>
    </>
  )
}
