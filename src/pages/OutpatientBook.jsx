import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useNotif } from '../App'
import {
  getServiceBySlug,
  listPublicPractitioners,
  createBooking,
  fmtNaira,
} from '../utils/outpatient'

const INITIAL = {
  patient_name: '',
  patient_age: '',
  patient_phone: '',
  patient_email: '',
  booker_name: '',
  booker_phone: '',
  booker_email: '',
  booker_relationship: '',
  scheduled_date: '',
  scheduled_time: '',
  practitioner_id: '',
  notes_from_booker: '',
  payment_choice: 'paystack',
  consent_terms: false,
}

export default function OutpatientBook() {
  const { slug } = useParams()
  const nav = useNavigate()
  const notify = useNotif()
  const [svc, setSvc] = useState(null)
  const [practitioners, setPractitioners] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [f, setF] = useState(INITIAL)

  useEffect(() => {
    let live = true
    ;(async () => {
      const [s, p] = await Promise.all([
        getServiceBySlug(slug),
        listPublicPractitioners(),
      ])
      if (!live) return
      setSvc(s.data)
      setPractitioners((p.data || []).filter(pr => {
        if (!s.data?.practitioner_role) return true
        if (s.data.practitioner_role === 'psychiatrist') return /psychiatr/i.test(pr.title || '')
        if (s.data.practitioner_role === 'psychologist') return /psycholog/i.test(pr.title || '')
        if (s.data.practitioner_role === 'counsellor') return /counsell?or|psycholog/i.test(pr.title || '')
        return true
      }))
      setLoading(false)
    })()
    return () => { live = false }
  }, [slug])

  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const validate = () => {
    const req = [
      ['patient_name', 'Patient name'],
      ['patient_phone', 'Patient phone'],
      ['booker_name', 'Your name'],
      ['booker_phone', 'Your phone'],
      ['booker_email', 'Your email'],
      ['scheduled_date', 'Preferred date'],
      ['scheduled_time', 'Preferred time'],
    ]
    for (const [k, label] of req) {
      if (!f[k] || !String(f[k]).trim()) return `${label} is required.`
    }
    if (!/^\S+@\S+\.\S+$/.test(f.booker_email)) return 'Enter a valid email.'
    if (!f.consent_terms) return 'Please accept the cancellation policy to continue.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const v = validate()
    if (v) { setError(v); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setSubmitting(true)

    const scheduled_at = new Date(`${f.scheduled_date}T${f.scheduled_time}:00`).toISOString()
    const payload = {
      service_id: svc.id,
      practitioner_id: f.practitioner_id || null,
      patient_name: f.patient_name.trim(),
      patient_age: f.patient_age ? parseInt(f.patient_age, 10) : null,
      patient_phone: f.patient_phone.trim(),
      patient_email: f.patient_email.trim().toLowerCase() || null,
      booker_name: f.booker_name.trim(),
      booker_phone: f.booker_phone.trim(),
      booker_email: f.booker_email.trim().toLowerCase(),
      booker_relationship: f.booker_relationship.trim() || null,
      scheduled_at,
      duration_minutes: svc.duration_minutes,
      notes_from_booker: f.notes_from_booker.trim() || null,
      status: 'pending_payment',
      payment_status: 'unpaid',
    }

    const { data, error: err } = await createBooking(payload)
    setSubmitting(false)
    if (err) {
      setError(`Booking could not be saved: ${err.message || err}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (f.payment_choice === 'invoice') {
      notify?.('Booking received', `We'll send an invoice to ${f.booker_email} within one working day. Reference: ${data.reference_code}`, 'success')
      nav(`/outpatient/booked/${data.reference_code}`, { replace: true })
    } else {
      notify?.('Booking received', `Reference ${data.reference_code}. Redirecting to payment.`, 'success')
      nav(`/outpatient/pay/${data.reference_code}`, { replace: true })
    }
  }

  if (loading) return <div style={{ padding: '120px 24px', textAlign: 'center' }}>Loading…</div>
  if (!svc) return (
    <div style={{ padding: '120px 24px', textAlign: 'center' }}>
      <h1>Service not found</h1>
      <p style={{ marginTop: 12 }}><Link to="/outpatient">Back to outpatient services</Link></p>
    </div>
  )

  return (
    <>
      <Helmet><title>Book {svc.name} | House of Refuge</title></Helmet>

      <div className="ph">
        <div className="container">
          <div className="ph__badge"><span className="badge">Outpatient booking</span></div>
          <h1>Book — {svc.name}</h1>
          <p>{fmtNaira(svc.price_ngn)}{svc.duration_minutes ? ` · ${svc.duration_minutes} minutes` : ''}</p>
        </div>
      </div>

      <section className="section">
        <div className="container" style={{ maxWidth: 820 }}>
          {error && (
            <div style={{ background: '#FFF0F0', border: '1px solid rgba(139,42,42,.3)', borderLeft: '3px solid #8B2A2A', color: '#6B2020', padding: '14px 18px', borderRadius: 6, marginBottom: 24, fontSize: '.9rem' }}>
              <strong>Please fix:</strong> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            <Card title="Who is this appointment for?" lead="The patient — the person attending the session.">
              <Grid2>
                <Field label="Patient name" required value={f.patient_name} onChange={v => set('patient_name', v)} />
                <Field label="Age" type="number" value={f.patient_age} onChange={v => set('patient_age', v)} />
                <Field label="Patient phone" required value={f.patient_phone} onChange={v => set('patient_phone', v)} placeholder="08012345678" />
                <Field label="Patient email" type="email" value={f.patient_email} onChange={v => set('patient_email', v)} placeholder="optional" />
              </Grid2>
            </Card>

            <Card title="Who is booking?" lead="Your contact details. May be the same as the patient.">
              <Grid2>
                <Field label="Your name" required value={f.booker_name} onChange={v => set('booker_name', v)} />
                <Field label="Your relationship to patient" value={f.booker_relationship} onChange={v => set('booker_relationship', v)} placeholder="Self, parent, spouse, sibling…" />
                <Field label="Your phone" required value={f.booker_phone} onChange={v => set('booker_phone', v)} />
                <Field label="Your email" required type="email" value={f.booker_email} onChange={v => set('booker_email', v)} />
              </Grid2>
            </Card>

            <Card title="Date, time, and practitioner" lead="Pick a preferred slot. Our team will confirm or propose a close alternative once payment is received.">
              <Grid2>
                <Field label="Preferred date" required type="date" value={f.scheduled_date} onChange={v => set('scheduled_date', v)} />
                <Field label="Preferred time" required type="time" value={f.scheduled_time} onChange={v => set('scheduled_time', v)} />
              </Grid2>
              {practitioners.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <label style={lbl}>Preferred practitioner <span style={{ color: 'var(--g500)', fontWeight: 400 }}>(optional — leave blank for next available)</span></label>
                  <select value={f.practitioner_id} onChange={e => set('practitioner_id', e.target.value)} style={inp}>
                    <option value="">Next available</option>
                    {practitioners.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name} — {p.title}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <label style={lbl}>Anything we should know in advance? <span style={{ color: 'var(--g500)', fontWeight: 400 }}>(optional)</span></label>
                <textarea rows={3} value={f.notes_from_booker} onChange={e => set('notes_from_booker', e.target.value)} style={inp} placeholder="Any context that would help us prepare." />
              </div>
            </Card>

            <Card title="Payment" lead="The appointment is confirmed once payment is received (or invoice is settled).">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={radioRow}>
                  <input type="radio" name="pay" value="paystack" checked={f.payment_choice === 'paystack'} onChange={e => set('payment_choice', e.target.value)} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Pay online by card (Paystack)</div>
                    <div style={{ fontSize: '.85rem', color: 'var(--g700)' }}>{fmtNaira(svc.price_ngn)} · Confirmed instantly. Recommended.</div>
                  </div>
                </label>
                <label style={radioRow}>
                  <input type="radio" name="pay" value="invoice" checked={f.payment_choice === 'invoice'} onChange={e => set('payment_choice', e.target.value)} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Request invoice for bank transfer</div>
                    <div style={{ fontSize: '.85rem', color: 'var(--g700)' }}>Our team will email you an invoice within one working day. Appointment is held but not confirmed until paid.</div>
                  </div>
                </label>
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 18, fontSize: '.88rem', lineHeight: 1.6, color: 'var(--charcoal)' }}>
                <input type="checkbox" checked={f.consent_terms} onChange={e => set('consent_terms', e.target.checked)} style={{ marginTop: 4 }} />
                <span>I understand the <strong>cancellation policy</strong>: reschedule or cancel up to 24 hours before for a full refund. Within 24 hours, the fee is non-refundable but may be rescheduled at 50% credit.</span>
              </label>
            </Card>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button type="button" className="btn btn--secondary" onClick={() => nav(`/outpatient/${slug}`)} disabled={submitting}>Back</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Submitting…' : (f.payment_choice === 'paystack' ? 'Continue to payment' : 'Request invoice')}
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  )
}

function Card({ title, lead, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E9EE', borderRadius: 10, padding: '24px 28px', marginBottom: 18 }}>
      <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px' }}>{title}</h3>
      {lead && <p style={{ fontSize: '.88rem', color: 'var(--g700)', margin: '0 0 18px' }}>{lead}</p>}
      {children}
    </div>
  )
}
function Grid2({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div>
}
function Field({ label, required, type = 'text', value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={lbl}>{label}{required && <span style={{ color: 'var(--gold)' }}> *</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inp} />
    </div>
  )
}
const lbl = { fontSize: '.8rem', fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }
const inp = { width: '100%', padding: '10px 12px', border: '1px solid #DDE3EA', borderRadius: 6, fontSize: '.94rem', fontFamily: 'inherit', color: 'var(--charcoal)' }
const radioRow = { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', border: '1px solid #DDE3EA', borderRadius: 6, cursor: 'pointer', fontSize: '.95rem' }
