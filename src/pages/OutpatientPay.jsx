import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useNotif } from '../App'
import { pay, fmt } from '../utils/paystack'
import { getBookingByReference, updateBooking, fmtNaira } from '../utils/outpatient'

export default function OutpatientPay() {
  const { ref } = useParams()
  const nav = useNavigate()
  const notify = useNotif()
  const [b, setB] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    ;(async () => {
      const { data, error: err } = await getBookingByReference(ref)
      if (!live) return
      if (err) setError(err.message || String(err))
      setB(data)
      setLoading(false)
    })()
    return () => { live = false }
  }, [ref])

  const handlePay = () => {
    if (!b) return
    const svc = b.outpatient_services
    if (!svc?.price_ngn) {
      setError('This service has no published price yet. Please call admissions.')
      return
    }
    setPaying(true)
    pay({
      email: b.booker_email,
      amount: svc.price_ngn * 100,
      ref: b.reference_code,
      fields: [
        { display_name: 'Service', variable_name: 'service', value: svc.name },
        { display_name: 'Patient', variable_name: 'patient', value: b.patient_name },
      ],
      onSuccess: async (resp) => {
        const { error: uerr } = await updateBooking(b.id, {
          payment_status: 'paid_online',
          payment_reference: resp.reference,
          amount_paid_ngn: svc.price_ngn,
          status: 'confirmed',
        })
        setPaying(false)
        if (uerr) {
          setError(`Payment received but booking could not be marked confirmed: ${uerr.message || uerr}. Please call admissions and quote ${b.reference_code}.`)
          return
        }
        notify?.('Payment received', `Your appointment is confirmed. Ref ${b.reference_code}.`, 'success')
        nav(`/outpatient/booked/${b.reference_code}`, { replace: true })
      },
      onClose: () => setPaying(false),
      onError: (msg) => { setError(msg); setPaying(false) },
    })
  }

  if (loading) return <div style={{ padding: '120px 24px', textAlign: 'center' }}>Loading booking…</div>
  if (!b) return (
    <div style={{ padding: '120px 24px', textAlign: 'center' }}>
      <h1>Booking not found</h1>
      <p style={{ marginTop: 12 }}><Link to="/outpatient">Back to outpatient services</Link></p>
    </div>
  )

  const svc = b.outpatient_services
  const alreadyPaid = b.payment_status === 'paid_online' || b.payment_status === 'paid_on_arrival'

  return (
    <>
      <Helmet><title>Confirm payment | House of Refuge</title></Helmet>
      <div className="ph">
        <div className="container">
          <div className="ph__badge"><span className="badge">Step 2 of 2 · Payment</span></div>
          <h1>Confirm payment to lock your appointment.</h1>
          <p>Secured by Paystack. The appointment becomes <strong>confirmed</strong> immediately on successful payment.</p>
        </div>
      </div>

      <section className="section">
        <div className="container" style={{ maxWidth: 700 }}>
          {error && (
            <div style={{ background: '#FFF0F0', border: '1px solid rgba(139,42,42,.3)', borderLeft: '3px solid #8B2A2A', color: '#6B2020', padding: '14px 18px', borderRadius: 6, marginBottom: 24, fontSize: '.9rem' }}>
              {error}
            </div>
          )}

          <div className="card" style={{ padding: '28px 32px', marginBottom: 24 }}>
            <div className="sh__lbl">Booking reference</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.02em', color: 'var(--blue)', margin: '6px 0 18px' }}>{b.reference_code}</div>

            <Row k="Service" v={svc?.name} />
            <Row k="Date &amp; time" v={new Date(b.scheduled_at).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })} />
            <Row k="Practitioner" v={b.outpatient_practitioners?.full_name || 'Next available'} />
            <Row k="Patient" v={b.patient_name} />
            <Row k="Booker" v={`${b.booker_name} · ${b.booker_email}`} />

            <div style={{ marginTop: 18, padding: '16px 0', borderTop: '1px solid #EDF1F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '.86rem', color: 'var(--g700)', fontWeight: 600 }}>Total to pay</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-.02em', color: 'var(--charcoal)' }}>
                {fmt(svc?.price_ngn || 0)}
              </div>
            </div>
          </div>

          {alreadyPaid ? (
            <div className="card" style={{ background: 'rgba(26,122,74,.06)', border: '1px solid rgba(26,122,74,.2)', borderLeft: '3px solid #1A7A4A', padding: '20px 24px', marginBottom: 24 }}>
              <strong style={{ color: '#1A7A4A' }}>This booking is already paid.</strong>
              <p style={{ fontSize: '.92rem', color: 'var(--g700)', margin: '6px 0 0', lineHeight: 1.6 }}>If you need an invoice receipt, call 0911 277 7600.</p>
            </div>
          ) : (
            <>
              <button className="btn btn--primary btn--full" disabled={paying || !svc?.price_ngn} onClick={handlePay}>
                {paying ? 'Opening Paystack…' : `Pay ${fmt(svc?.price_ngn || 0)} with Paystack`}
              </button>
              <p style={{ fontSize: '.8rem', color: 'var(--g500)', textAlign: 'center', marginTop: 14, lineHeight: 1.55 }}>
                Secured by Paystack · Bank transfer? Call <a href="tel:09112777600" style={{ color: 'var(--blue)' }}>09112777600</a>
              </p>
            </>
          )}

          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <Link to={`/outpatient/${svc?.slug || ''}`} style={{ fontSize: '.88rem', color: 'var(--g700)' }}>← Back to service</Link>
          </div>
        </div>
      </section>
    </>
  )
}

function Row({ k, v }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, padding: '8px 0' }}>
      <div style={{ fontSize: '.78rem', color: 'var(--g500)', letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 700 }} dangerouslySetInnerHTML={{ __html: k }} />
      <div style={{ fontSize: '.92rem', color: 'var(--charcoal)' }}>{v}</div>
    </div>
  )
}
