import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useNotif } from '../../App'
import EncounterForm from '../../components/EncounterForm'
import {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  fmtNaira,
  getBookingById,
  updateBooking,
} from '../../utils/outpatient'
import {
  ATTENDANCE, ENCOUNTER_TYPES, RISK_FLAGS, colorOf, labelOf,
  getEncountersByBooking, linkBookingToClient,
} from '../../utils/outpatientClinical'

export default function OutpatientBookingDetail() {
  const { id } = useParams()
  const notify = useNotif()
  const [b, setB] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [converted, setConverted] = useState(false)
  const [creditApplied, setCreditApplied] = useState(false)

  // Clinical record for this appointment.
  const [encounters, setEncounters] = useState([])
  const [composing, setComposing] = useState(null)   // {draft?} or {}
  const [linking, setLinking] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await getBookingById(id)
    if (error) { setLoading(false); setError(error.message || String(error)); return }
    if (!data) { setLoading(false); setError('Booking not found.'); return }
    setB(data)
    setStatus(data.status)
    setPaymentStatus(data.payment_status)
    setAmountPaid(data.amount_paid_ngn || '')
    setPaymentRef(data.payment_reference || '')
    setConverted(!!data.converted_to_inpatient)
    setCreditApplied(!!data.inpatient_deposit_credit_applied)
    const { data: enc } = await getEncountersByBooking(id)
    setEncounters(enc || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const save = async () => {
    setWorking(true)
    const patch = {
      status,
      payment_status: paymentStatus,
      amount_paid_ngn: amountPaid ? parseInt(amountPaid, 10) : null,
      payment_reference: paymentRef || null,
      converted_to_inpatient: converted,
      inpatient_deposit_credit_applied: creditApplied,
    }
    const { error } = await updateBooking(id, patch)
    setWorking(false)
    if (error) { notify?.('Save failed', error.message || String(error), 'error'); return }
    notify?.('Booking updated', `Ref ${b.reference_code}`, 'success')
    load()
  }

  /*
    A booking is a commercial record; the clinical record hangs off the client.
    Resolving the client is server-side (name+phone, then name+email, create only
    if both miss) so two staff checking in the same family can't fork one person
    into two records.
  */
  const startClinicalRecord = async () => {
    setLinking(true)
    const { data, error } = await linkBookingToClient(id)
    setLinking(false)
    if (error) { notify?.('Could not open the clinical record', error.message || String(error), 'error'); return }
    const { data: fresh } = await getBookingById(id)
    if (fresh) setB(fresh)
    notify?.('Clinical record ready', 'This appointment is linked to a client record.', 'success')
    setComposing({})
    return data
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
  const hasLegacyNotes = b.clinical_notes || b.outcome_summary
  const draft = encounters.find(e => !e.signed_at)

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
        {b.client_id && (
          <Link to={`/dashboard/outpatient/clients/${b.client_id}`} className="btn btn--secondary btn--sm">
            Client record →
          </Link>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 20 }}>
        <div style={{ minWidth: 0 }}>
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

          {/* ── Clinical record ─────────────────────────── */}
          <section style={secStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '.95rem', margin: 0, fontWeight: 700 }}>Clinical record</h3>
              {!composing && (
                b.client_id
                  ? <button className="btn btn--primary btn--sm" onClick={() => setComposing(draft ? { draft } : {})}>
                      {draft ? 'Continue draft note' : encounters.length ? 'Add another note' : 'Record consult note'}
                    </button>
                  : <button className="btn btn--primary btn--sm" disabled={linking} onClick={startClinicalRecord}>
                      {linking ? 'Opening…' : 'Start clinical record'}
                    </button>
              )}
            </div>

            {!b.client_id && !composing && (
              <p style={{ fontSize: '.85rem', color: 'var(--g500)', lineHeight: 1.6, margin: 0 }}>
                This appointment is not yet linked to a client record. Starting one finds this person in the
                outpatient register, or creates them, so repeat visits build a single continuous history.
              </p>
            )}

            {composing && b.client_id && (
              <div style={{ marginTop: 4 }}>
                <EncounterForm
                  clientId={b.client_id}
                  booking={b}
                  draft={composing.draft}
                  onDone={(row, mode) => {
                    setComposing(null)
                    notify?.(
                      mode === 'signed' ? 'Note signed' : 'Draft saved',
                      mode === 'signed'
                        ? 'The note is locked and the booking has been updated.'
                        : 'Not yet signed. Sign it to file it on the record.',
                      'success',
                    )
                    load()
                  }}
                  onCancel={() => { setComposing(null); load() }}
                />
              </div>
            )}

            {!composing && encounters.map(e => (
              <div key={e.id} style={{ borderTop: '1px solid #EEF1F5', paddingTop: 12, marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <strong style={{ fontSize: '.9rem' }}>{labelOf(ENCOUNTER_TYPES, e.encounter_type)}</strong>
                  {!e.signed_at && <Tag text="Draft — not signed" color="#C08A30" />}
                  {e.attendance !== 'attended' && <Tag text={labelOf(ATTENDANCE, e.attendance)} color={colorOf(ATTENDANCE, e.attendance)} />}
                  {e.risk_flag !== 'none' && <Tag text={`Risk: ${labelOf(RISK_FLAGS, e.risk_flag)}`} color={colorOf(RISK_FLAGS, e.risk_flag)} />}
                  <span style={{ fontSize: '.78rem', color: 'var(--g500)' }}>
                    {new Date(e.encounter_date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                    {e.signed_by_name ? ` · ${e.signed_by_name}` : ''}
                  </span>
                </div>
                <Block k="Presenting complaint" v={e.presenting_complaint} />
                <Block k="S — Subjective" v={e.subjective} />
                <Block k="O — Objective" v={e.objective} />
                <Block k="A — Assessment" v={e.assessment} />
                <Block k="P — Plan" v={e.plan} />
                <Block k="Working diagnosis" v={e.diagnosis} />
                <Block k="Medication" v={e.medications} />
                {e.risk_flag !== 'none' && <Block k="Risk" v={e.risk_notes} />}
                {e.follow_up_required && (
                  <Block k="Follow-up" v={`Due ${e.follow_up_at || '—'}${e.follow_up_notes ? ` — ${e.follow_up_notes}` : ''}`} />
                )}
                {e.signed_at && (
                  <div style={{ fontSize: '.75rem', color: 'var(--g500)', marginTop: 6 }}>
                    Signed {new Date(e.signed_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}. Corrections go in an addendum on the client record.
                  </div>
                )}
              </div>
            ))}

            {!composing && b.client_id && encounters.length === 0 && (
              <p style={{ fontSize: '.85rem', color: 'var(--g500)', margin: 0 }}>
                No note recorded for this appointment yet.
              </p>
            )}
          </section>

          {/* Pre-2026-08-24 free-text notes, kept visible so nothing written before the migration is lost. */}
          {hasLegacyNotes && (
            <Sec title="Earlier notes (legacy field)">
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
              <div style={{ gridColumn: '1 / -1', marginTop: 8, fontSize: '.78rem', color: 'var(--g500)' }}>
                Written before outpatient notes were structured. Read-only; new documentation goes in the clinical record above.
              </div>
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

            <p style={{ fontSize: '.76rem', color: 'var(--g500)', lineHeight: 1.55, margin: '10px 0 0' }}>
              Clinical documentation lives in the clinical record, not here. Signing a note sets the status to completed
              automatically (or no-show, if the client did not attend).
            </p>
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

const secStyle = { background: 'white', border: '1px solid #E5E9EE', borderRadius: 8, padding: '18px 22px', marginBottom: 14 }

function Sec({ title, children }) {
  return (
    <section style={secStyle}>
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
function Block({ k, v }) {
  if (!v) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={kvK}>{k}</div>
      <div style={{ ...kvV, whiteSpace: 'pre-wrap', marginTop: 3, lineHeight: 1.55 }}>{v}</div>
    </div>
  )
}
function Tag({ text, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '.7rem', fontWeight: 700,
      color, background: color + '18', border: `1px solid ${color}33`,
    }}>{text}</span>
  )
}
const kvK = { fontSize: '.72rem', letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--g500)', fontWeight: 700 }
const kvV = { fontSize: '.92rem', color: 'var(--charcoal)' }
const lbl = { display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--charcoal)', margin: '12px 0 5px' }
const inp = { width: '100%', padding: '8px 10px', border: '1px solid #DDE3EA', borderRadius: 5, fontSize: '.88rem', fontFamily: 'inherit' }
