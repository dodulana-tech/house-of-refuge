import React, { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useNotif } from '../../App'
import {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  fmtNaira,
  getBookingById,
  updateBooking,
} from '../../utils/outpatient'

export default function OutpatientBookingDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const notify = useNotif()
  const [b, setB] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [outcome, setOutcome] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [converted, setConverted] = useState(false)
  const [creditApplied, setCreditApplied] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await getBookingById(id)
    setLoading(false)
    if (error) { setError(error.message || String(error)); return }
    if (!data) { setError('Booking not found.'); return }
    setB(data)
    setStatus(data.status)
    setPaymentStatus(data.payment_status)
    setAmountPaid(data.amount_paid_ngn || '')
    setPaymentRef(data.payment_reference || '')
    setOutcome(data.outcome_summary || '')
    setClinicalNotes(data.clinical_notes || '')
    setConverted(!!data.converted_to_inpatient)
    setCreditApplied(!!data.inpatient_deposit_credit_applied)
  }

  useEffect(() => { load() }, [id])

  const save = async () => {
    setWorking(true)
    const patch = {
      status,
      payment_status: paymentStatus,
      amount_paid_ngn: amountPaid ? parseInt(amountPaid, 10) : null,
      payment_reference: paymentRef || null,
      outcome_summary: outcome || null,
      clinical_notes: clinicalNotes || null,
      converted_to_inpatient: converted,
      inpatient_deposit_credit_applied: creditApplied,
    }
    const { error } = await updateBooking(id, patch)
    setWorking(false)
    if (error) { notify?.('Save failed', error.message || String(error), 'error'); return }
    notify?.('Booking updated', `Ref ${b.reference_code}`, 'success')
    load()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>
  if (error || !b) return (
    <div style={{ padding: 40 }}>
      <p style={{ color: '#8B2A2A' }}>{error || 'Not found.'}</p>
      <Link to="/dashboard/outpatient/bookings" className="btn btn--secondary btn--sm">Back</Link>
    </div>
  )

  const svc = b.outpatient_services
  const prac = b.outpatient_practitioners

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <Link to="/dashboard/outpatient/bookings" className="btn btn--secondary btn--sm">← Back</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700 }}>Outpatient · Booking</div>
          <h1 style={{ fontSize: '1.5rem', margin: '4px 0 0' }}>
            <code style={{ color: 'var(--blue)', fontSize: '1.3rem' }}>{b.reference_code}</code>
            <span style={{ marginLeft: 14, fontSize: '.86rem', fontWeight: 500, color: 'var(--g700)' }}>{b.patient_name}</span>
          </h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        <div>
          <Sec title="Service">
            <KV k="Name" v={svc?.name} />
            <KV k="Category" v={svc?.category} />
            <KV k="Duration" v={b.duration_minutes ? `${b.duration_minutes} min` : '—'} />
            <KV k="Fee" v={fmtNaira(svc?.price_ngn)} />
          </Sec>

          <Sec title="Appointment">
            <KV k="Date &amp; time" v={new Date(b.scheduled_at).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })} />
            <KV k="Practitioner" v={prac?.full_name || 'Next available'} />
            <KV k="Reference" v={b.reference_code} />
          </Sec>

          <Sec title="Patient">
            <KV k="Name" v={b.patient_name} />
            <KV k="Age" v={b.patient_age || '—'} />
            <KV k="Phone" v={b.patient_phone} />
            <KV k="Email" v={b.patient_email || '—'} />
          </Sec>

          <Sec title="Booker">
            <KV k="Name" v={b.booker_name} />
            <KV k="Relationship" v={b.booker_relationship || '—'} />
            <KV k="Phone" v={b.booker_phone} />
            <KV k="Email" v={b.booker_email} />
            {b.notes_from_booker && (
              <div style={{ gridColumn: '1 / -1', marginTop: 6 }}>
                <div style={kvK}>Notes from booker</div>
                <div style={{ ...kvV, whiteSpace: 'pre-wrap', marginTop: 4 }}>{b.notes_from_booker}</div>
              </div>
            )}
          </Sec>

          {(b.clinical_notes || b.outcome_summary) && (
            <Sec title="Clinical record">
              {b.outcome_summary && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={kvK}>Outcome</div>
                  <div style={{ ...kvV, whiteSpace: 'pre-wrap', marginTop: 4 }}>{b.outcome_summary}</div>
                </div>
              )}
              {b.clinical_notes && (
                <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                  <div style={kvK}>Clinical notes</div>
                  <div style={{ ...kvV, whiteSpace: 'pre-wrap', marginTop: 4 }}>{b.clinical_notes}</div>
                </div>
              )}
            </Sec>
          )}
        </div>

        <aside style={{ position: 'sticky', top: 20, alignSelf: 'start' }}>
          <div style={{ background: '#fff', border: '1px solid #E5E9EE', borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700, marginBottom: 10 }}>Manage booking</div>

            <label style={lbl}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
              {BOOKING_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>

            <label style={lbl}>Payment status</label>
            <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} style={inp}>
              {PAYMENT_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>

            <label style={lbl}>Amount paid (NGN)</label>
            <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} style={inp} placeholder="e.g. 150000" />

            <label style={lbl}>Payment reference</label>
            <input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} style={inp} placeholder="Paystack ref or bank transfer ref" />

            <label style={lbl}>Outcome summary <span style={{ color: 'var(--g500)', fontWeight: 400 }}>(short)</span></label>
            <textarea rows={3} value={outcome} onChange={e => setOutcome(e.target.value)} style={inp} placeholder="e.g. Diagnosis confirmed. Recommended residential admission." />

            <label style={lbl}>Clinical notes <span style={{ color: 'var(--g500)', fontWeight: 400 }}>(internal)</span></label>
            <textarea rows={4} value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)} style={inp} />

            {svc?.conversion_eligible && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(26,122,74,.06)', border: '1px solid rgba(26,122,74,.2)', borderRadius: 6 }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '.85rem', lineHeight: 1.5, color: 'var(--charcoal)' }}>
                  <input type="checkbox" checked={converted} onChange={e => setConverted(e.target.checked)} style={{ marginTop: 3 }} />
                  <span>Family <strong>converted to inpatient</strong></span>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '.85rem', lineHeight: 1.5, color: 'var(--charcoal)', marginTop: 8 }}>
                  <input type="checkbox" checked={creditApplied} onChange={e => setCreditApplied(e.target.checked)} style={{ marginTop: 3 }} />
                  <span><strong>{fmtNaira(svc.price_ngn)}</strong> credited to inpatient deposit</span>
                </label>
              </div>
            )}

            <button className="btn btn--primary btn--full" disabled={working} onClick={save} style={{ marginTop: 12 }}>
              {working ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          <div style={{ background: '#FFF8EC', border: '1px solid rgba(192,138,48,.25)', borderRadius: 8, padding: 16, marginTop: 14 }}>
            <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700, marginBottom: 6 }}>Quick contact</div>
            <div style={{ fontSize: '.88rem', color: 'var(--charcoal)', lineHeight: 1.6 }}>
              <div><strong>{b.booker_phone}</strong></div>
              <div><a href={`mailto:${b.booker_email}`}>{b.booker_email}</a></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Sec({ title, children }) {
  return (
    <section style={{ background: 'white', border: '1px solid #E5E9EE', borderRadius: 8, padding: '18px 22px', marginBottom: 14 }}>
      <h3 style={{ fontSize: '.95rem', margin: '0 0 12px', fontWeight: 700 }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>{children}</div>
    </section>
  )
}
function KV({ k, v }) {
  return (
    <div>
      <div style={kvK} dangerouslySetInnerHTML={{ __html: k }} />
      <div style={kvV}>{v ?? '—'}</div>
    </div>
  )
}
const kvK = { fontSize: '.72rem', letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--g500)', fontWeight: 700 }
const kvV = { fontSize: '.92rem', color: 'var(--charcoal)' }
const lbl = { display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--charcoal)', margin: '12px 0 5px' }
const inp = { width: '100%', padding: '8px 10px', border: '1px solid #DDE3EA', borderRadius: 5, fontSize: '.88rem', fontFamily: 'inherit' }
