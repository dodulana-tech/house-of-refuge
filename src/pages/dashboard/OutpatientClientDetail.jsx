import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EncounterForm from '../../components/EncounterForm'
import Pill from '../../components/Pill'
import { BOOKING_STATUSES, fmtNaira } from '../../utils/outpatient'
import {
  ATTENDANCE, CLIENT_STATUSES, ENCOUNTER_TYPES, FOLLOW_UP_STATUSES,
  RISK_FLAGS, RISK_STATUSES, colorOf, labelOf, initialsFrom, isOverdue,
  getClientById, getClientBookings, getEncountersByClient, updateClient,
  linkClientToPatient,
} from '../../utils/outpatientClinical'
import { getPatients } from '../../utils/supabase'

/*
  One outpatient client: their record, every booking they have made, and the
  chronological clinical history. This is the page that did not exist, which is
  why outpatient consults could not be documented.
*/

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—'
const fmtDateTime = d => d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function OutpatientClientDetail() {
  const { id } = useParams()
  const [client, setClient] = useState(null)
  const [bookings, setBookings] = useState([])
  const [encounters, setEncounters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [composing, setComposing] = useState(null)   // {booking?, draft?, amends?}
  const [expanded, setExpanded] = useState(null)
  const [editingDetails, setEditingDetails] = useState(false)
  const [details, setDetails] = useState({})
  const [patients, setPatients] = useState([])
  const [linkingPatient, setLinkingPatient] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [c, b, e, pts] = await Promise.all([
      getClientById(id), getClientBookings(id), getEncountersByClient(id), getPatients(),
    ])
    setLoading(false)
    setPatients(pts.data || [])
    if (c.error) { setError(c.error.message || String(c.error)); return }
    if (!c.data) { setError('Client not found.'); return }
    setClient(c.data)
    setDetails(c.data)
    setBookings(b.data || [])
    setEncounters(e.data || [])
  }, [id])

  useEffect(() => { load() }, [load])

  const signed = useMemo(() => encounters.filter(e => e.signed_at), [encounters])
  const drafts = useMemo(() => encounters.filter(e => !e.signed_at), [encounters])
  const openRisk = useMemo(
    () => signed.filter(e => ['open', 'escalated'].includes(e.risk_status)), [signed])
  const openFollowUps = useMemo(
    () => signed.filter(e => e.follow_up_required && ['pending', 'booked'].includes(e.follow_up_status)), [signed])

  // Bookings with no note yet are the work queue for this client.
  const undocumented = useMemo(() => {
    const withNote = new Set(encounters.map(e => e.booking_id).filter(Boolean))
    return bookings.filter(b =>
      !withNote.has(b.id) && !['cancelled', 'pending_payment'].includes(b.status))
  }, [bookings, encounters])

  const saveDetails = async () => {
    const patch = {
      full_name: details.full_name, date_of_birth: details.date_of_birth || null,
      age: details.age ? parseInt(details.age, 10) : null, gender: details.gender || null,
      phone: details.phone || null, email: details.email || null, address: details.address || null,
      next_of_kin_name: details.next_of_kin_name || null,
      next_of_kin_phone: details.next_of_kin_phone || null,
      next_of_kin_relationship: details.next_of_kin_relationship || null,
      primary_concern: details.primary_concern || null,
      primary_substance: details.primary_substance || null,
      referral_source: details.referral_source || null,
      status: details.status, notes: details.notes || null,
    }
    const { error } = await updateClient(id, patch)
    if (error) { alert(`Could not save: ${error.message}`); return }
    setEditingDetails(false)
    load()
  }

  /*
    Admission does not end the outpatient record, it links it. The assessing
    clinician needs the outpatient notes on the patient screen, and the
    conversion is the only thing that puts them there.
  */
  const linkPatient = async (patientId) => {
    setLinkingPatient(true)
    const { error } = await linkClientToPatient(id, patientId || null)
    setLinkingPatient(false)
    if (error) { alert(`Could not link: ${error.message}`); return }
    load()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--g500)' }}>Loading client record…</div>
  if (error || !client) return (
    <div style={{ padding: 40 }}>
      <p style={{ color: '#8B2A2A' }}>{error || 'Not found.'}</p>
      <Link to="/dashboard/outpatient/clients" className="btn btn--secondary btn--sm">Back to clients</Link>
    </div>
  )

  const d = details
  const set = (k, v) => setDetails(p => ({ ...p, [k]: v }))

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <Link to="/dashboard/outpatient/clients" className="btn btn--secondary btn--sm">← Clients</Link>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700 }}>
            Outpatient · Client record
          </div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.7rem', margin: '4px 0 2px' }}>{client.full_name}</h1>
          <div style={{ fontSize: '.85rem', color: 'var(--g500)' }}>
            <code style={{ color: 'var(--blue)' }}>{client.client_code}</code>
            {' · '}{signed.length} documented session{signed.length === 1 ? '' : 's'}
            {' · '}first seen {fmtDate(client.first_seen_at)}
            {' · '}last seen {fmtDate(client.last_seen_at)}
          </div>
        </div>
        <Pill text={labelOf(CLIENT_STATUSES, client.status)} color={colorOf(CLIENT_STATUSES, client.status)} />
      </div>

      {/* Alert strip */}
      {(openRisk.length > 0 || undocumented.length > 0 || drafts.length > 0 || openFollowUps.length > 0) && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          {openRisk.length > 0 && <Alert color="#8B2A2A" text={`${openRisk.length} open risk concern${openRisk.length === 1 ? '' : 's'}`} />}
          {undocumented.length > 0 && <Alert color="#C08A30" text={`${undocumented.length} appointment${undocumented.length === 1 ? '' : 's'} with no note`} />}
          {drafts.length > 0 && <Alert color="#1A5FAD" text={`${drafts.length} unsigned draft${drafts.length === 1 ? '' : 's'}`} />}
          {openFollowUps.length > 0 && <Alert color="#1A7A4A" text={`${openFollowUps.length} follow-up${openFollowUps.length === 1 ? '' : 's'} owed`} />}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 20, alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          {/* Composer */}
          {composing && (
            <div style={{ marginBottom: 20 }}>
              <EncounterForm
                clientId={id}
                booking={composing.booking}
                draft={composing.draft}
                amends={composing.amends}
                onDone={(row, mode) => {
                  setComposing(null)
                  if (mode === 'signed') setExpanded(row.id)
                  load()
                }}
                onCancel={() => { setComposing(null); load() }}
              />
            </div>
          )}

          {/* Appointments still needing a note */}
          {!composing && undocumented.length > 0 && (
            <div className="card" style={{ padding: '18px 20px', marginBottom: 18, borderLeft: '3px solid #C08A30' }}>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 4 }}>Awaiting documentation</h3>
              <p style={{ fontSize: '.82rem', color: 'var(--g500)', marginBottom: 12 }}>
                These appointments have no clinical note yet.
              </p>
              {undocumented.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #EEF1F5', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: '.9rem', fontWeight: 600, color: 'var(--charcoal)' }}>{b.outpatient_services?.name || 'Service'}</div>
                    <div style={{ fontSize: '.8rem', color: 'var(--g500)' }}>
                      {fmtDateTime(b.scheduled_at)} · {b.outpatient_practitioners?.full_name || 'Next available'} · <code>{b.reference_code}</code>
                    </div>
                  </div>
                  <button className="btn btn--primary btn--sm" onClick={() => setComposing({ booking: b })}>Record note</button>
                </div>
              ))}
            </div>
          )}

          {/* Clinical history */}
          <div className="card" style={{ padding: '18px 20px', marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', margin: 0 }}>Clinical history</h3>
              {!composing && (
                <button className="btn btn--secondary btn--sm" onClick={() => setComposing({})}>
                  Note without a booking
                </button>
              )}
            </div>

            {encounters.length === 0 ? (
              <div style={{ fontSize: '.86rem', color: 'var(--g500)', padding: '10px 0' }}>
                No sessions documented yet.
              </div>
            ) : encounters.map(e => (
              <EncounterCard
                key={e.id}
                e={e}
                expanded={expanded === e.id}
                onToggle={() => setExpanded(expanded === e.id ? null : e.id)}
                onContinueDraft={() => setComposing({ draft: e })}
                onAddendum={() => setComposing({ amends: e })}
              />
            ))}
          </div>

          {/* Booking history */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 12 }}>Booking history</h3>
            {bookings.length === 0 ? (
              <div style={{ fontSize: '.86rem', color: 'var(--g500)' }}>No bookings.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--g500)', fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      <th style={th}>Date</th><th style={th}>Service</th><th style={th}>Status</th><th style={th}>Paid</th><th style={th}>Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id} style={{ borderTop: '1px solid #EEF1F5' }}>
                        <td style={td}>{fmtDateTime(b.scheduled_at)}</td>
                        <td style={td}>{b.outpatient_services?.name || '—'}</td>
                        <td style={td}>
                          <Pill small text={labelOf(BOOKING_STATUSES, b.status)} color={colorOf(BOOKING_STATUSES, b.status)} />
                        </td>
                        <td style={td}>{fmtNaira(b.amount_paid_ngn)}</td>
                        <td style={td}>
                          <Link to={`/dashboard/outpatient/bookings/${b.id}`}><code>{b.reference_code}</code></Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: the client record itself */}
        <aside style={{ position: 'sticky', top: 20 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700 }}>Client details</div>
              <button className="btn btn--secondary btn--sm" onClick={() => { setEditingDetails(!editingDetails); setDetails(client) }}>
                {editingDetails ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editingDetails ? (
              <>
                <Field label="Full name"><input className="fi" value={d.full_name || ''} onChange={e => set('full_name', e.target.value)} /></Field>
                <Field label="Status">
                  <select className="fi" value={d.status || 'active'} onChange={e => set('status', e.target.value)}>
                    {CLIENT_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Date of birth"><input className="fi" type="date" value={d.date_of_birth || ''} onChange={e => set('date_of_birth', e.target.value)} /></Field>
                <Field label="Age"><input className="fi" type="number" value={d.age || ''} onChange={e => set('age', e.target.value)} /></Field>
                <Field label="Gender"><input className="fi" value={d.gender || ''} onChange={e => set('gender', e.target.value)} /></Field>
                <Field label="Phone"><input className="fi" value={d.phone || ''} onChange={e => set('phone', e.target.value)} /></Field>
                <Field label="Email"><input className="fi" value={d.email || ''} onChange={e => set('email', e.target.value)} /></Field>
                <Field label="Address"><textarea className="fi" rows={2} value={d.address || ''} onChange={e => set('address', e.target.value)} /></Field>
                <Field label="Next of kin"><input className="fi" value={d.next_of_kin_name || ''} onChange={e => set('next_of_kin_name', e.target.value)} /></Field>
                <Field label="Next of kin phone"><input className="fi" value={d.next_of_kin_phone || ''} onChange={e => set('next_of_kin_phone', e.target.value)} /></Field>
                <Field label="Relationship"><input className="fi" value={d.next_of_kin_relationship || ''} onChange={e => set('next_of_kin_relationship', e.target.value)} /></Field>
                <Field label="Primary concern"><input className="fi" value={d.primary_concern || ''} onChange={e => set('primary_concern', e.target.value)} /></Field>
                <Field label="Primary substance"><input className="fi" value={d.primary_substance || ''} onChange={e => set('primary_substance', e.target.value)} /></Field>
                <Field label="Referral source"><input className="fi" value={d.referral_source || ''} onChange={e => set('referral_source', e.target.value)} /></Field>
                <Field label="Record notes"><textarea className="fi" rows={3} value={d.notes || ''} onChange={e => set('notes', e.target.value)} /></Field>
                <button className="btn btn--primary btn--full btn--sm" onClick={saveDetails} style={{ marginTop: 8 }}>Save details</button>
              </>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <KV k="Phone" v={client.phone} />
                <KV k="Email" v={client.email} />
                <KV k="Age" v={client.age || (client.date_of_birth ? fmtDate(client.date_of_birth) : null)} />
                <KV k="Gender" v={client.gender} />
                <KV k="Address" v={client.address} />
                <KV k="Next of kin" v={client.next_of_kin_name && `${client.next_of_kin_name}${client.next_of_kin_relationship ? ` (${client.next_of_kin_relationship})` : ''}${client.next_of_kin_phone ? ` · ${client.next_of_kin_phone}` : ''}`} />
                <KV k="Primary concern" v={client.primary_concern} />
                <KV k="Primary substance" v={client.primary_substance} />
                <KV k="Referral source" v={client.referral_source} />
                {client.notes && <KV k="Record notes" v={client.notes} />}
                <div style={{ borderTop: '1px solid #EEF1F5', paddingTop: 10 }}>
                  <div style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--g500)', fontWeight: 700, marginBottom: 5 }}>
                    Inpatient record
                  </div>
                  {client.patients?.id ? (
                    <div>
                      <Link to={`/dashboard/patients/${client.patients.id}`} style={{ fontSize: '.87rem', fontWeight: 600 }}>
                        {client.patients.full_name}
                      </Link>
                      <div style={{ fontSize: '.78rem', color: 'var(--g500)', marginTop: 2 }}>
                        Admitted. The outpatient history above shows on their patient record.
                      </div>
                      <button className="btn btn--secondary btn--sm" disabled={linkingPatient}
                        onClick={() => { if (confirm('Unlink this client from the inpatient record?')) linkPatient(null) }}
                        style={{ marginTop: 8 }}>
                        Unlink
                      </button>
                    </div>
                  ) : (
                    <div>
                      <select className="fi" defaultValue="" disabled={linkingPatient}
                        onChange={e => { if (e.target.value) linkPatient(e.target.value) }}>
                        <option value="">Not admitted — link on admission…</option>
                        {patients.map(pt => (
                          <option key={pt.id} value={pt.id}>{pt.full_name}{pt.status ? ` (${pt.status})` : ''}</option>
                        ))}
                      </select>
                      <div style={{ fontSize: '.78rem', color: 'var(--g500)', marginTop: 5 }}>
                        Linking carries this outpatient history onto their patient record.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {client.phone && (
            <div className="card" style={{ padding: 16, marginTop: 14, background: '#FFF8EC', border: '1px solid rgba(192,138,48,.25)' }}>
              <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700, marginBottom: 6 }}>Quick contact</div>
              <div style={{ fontSize: '.88rem', lineHeight: 1.6 }}>
                <div><a href={`tel:${client.phone.replace(/\s/g, '')}`}><strong>{client.phone}</strong></a></div>
                {client.email && <div><a href={`mailto:${client.email}`}>{client.email}</a></div>}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function EncounterCard({ e, expanded, onToggle, onContinueDraft, onAddendum }) {
  const isDraft = !e.signed_at
  const riskColor = colorOf(RISK_FLAGS, e.risk_flag)
  const showRisk = e.risk_flag !== 'none'

  return (
    <div style={{ borderTop: '1px solid #EEF1F5', padding: '12px 0' }}>
      <div onClick={onToggle} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8, flexShrink: 0,
          background: isDraft ? '#EEF1F5' : 'rgba(26,95,173,.09)',
          color: isDraft ? 'var(--g500)' : 'var(--blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '.75rem',
        }}>
          {initialsFrom(e.signed_by_name || e.author_code)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '.9rem', color: 'var(--charcoal)' }}>{labelOf(ENCOUNTER_TYPES, e.encounter_type)}</strong>
            {isDraft && <Pill small text="Draft — not signed" color="#C08A30" />}
            {e.attendance !== 'attended' && <Pill small text={labelOf(ATTENDANCE, e.attendance)} color={colorOf(ATTENDANCE, e.attendance)} />}
            {showRisk && <Pill small text={`Risk: ${labelOf(RISK_FLAGS, e.risk_flag)}`} color={riskColor} />}
            {e.risk_status === 'open' && <Pill small text="Safeguarding open" color="#8B2A2A" />}
            {e.follow_up_required && ['pending', 'booked'].includes(e.follow_up_status) && (
              <Pill small
                text={`Follow-up ${isOverdue(e.follow_up_at) ? 'overdue' : 'due'} ${fmtDate(e.follow_up_at)}`}
                color={isOverdue(e.follow_up_at) ? '#8B2A2A' : '#1A7A4A'} />
            )}
          </div>
          <div style={{ fontSize: '.79rem', color: 'var(--g500)', marginTop: 2 }}>
            {fmtDateTime(e.encounter_date)}
            {e.outpatient_practitioners?.full_name ? ` · ${e.outpatient_practitioners.full_name}` : ''}
            {e.signed_by_name ? ` · signed by ${e.signed_by_name}` : ''}
            {e.outpatient_services?.name ? ` · ${e.outpatient_services.name}` : ''}
          </div>
          {!expanded && (e.presenting_complaint || e.subjective) && (
            <div style={{ fontSize: '.84rem', color: 'var(--g700)', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.presenting_complaint || e.subjective}
            </div>
          )}
        </div>
        <div style={{ fontSize: '.75rem', color: 'var(--g500)' }}>{expanded ? '▲' : '▼'}</div>
      </div>

      {expanded && (
        <div style={{ paddingLeft: 52, marginTop: 10 }}>
          {e.amends_encounter_id && (
            <div style={{ fontSize: '.8rem', color: 'var(--blue)', marginBottom: 8 }}>Addendum to an earlier note.</div>
          )}
          <SOAP k="Presenting complaint" v={e.presenting_complaint} />
          <SOAP k="S — Subjective" v={e.subjective} />
          <SOAP k="O — Objective" v={e.objective} />
          <SOAP k="A — Assessment" v={e.assessment} />
          <SOAP k="P — Plan" v={e.plan} />
          <SOAP k="Working diagnosis" v={e.diagnosis} />
          <SOAP k="Medication" v={e.medications} />
          {showRisk && <SOAP k={`Risk (${labelOf(RISK_FLAGS, e.risk_flag)})`} v={e.risk_notes} />}
          {e.risk_status !== 'none' && (
            <SOAP k="Safeguarding" v={`${labelOf(RISK_STATUSES, e.risk_status)}${e.risk_outcome ? ` — ${e.risk_outcome}` : ''}`} />
          )}
          {e.follow_up_required && (
            <SOAP k="Follow-up" v={`${labelOf(FOLLOW_UP_STATUSES, e.follow_up_status)} · due ${fmtDate(e.follow_up_at)}${e.follow_up_notes ? ` — ${e.follow_up_notes}` : ''}`} />
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {isDraft
              ? <button className="btn btn--primary btn--sm" onClick={onContinueDraft}>Continue and sign</button>
              : <button className="btn btn--secondary btn--sm" onClick={onAddendum}>Add addendum</button>}
            {e.booking_id && (
              <Link className="btn btn--secondary btn--sm" to={`/dashboard/outpatient/bookings/${e.booking_id}`}>Open booking</Link>
            )}
          </div>
          {!isDraft && (
            <div style={{ fontSize: '.76rem', color: 'var(--g500)', marginTop: 8 }}>
              Signed {fmtDateTime(e.signed_at)}. Signed notes cannot be edited; corrections are filed as an addendum.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SOAP({ k, v }) {
  if (!v) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--g500)', fontWeight: 700 }}>{k}</div>
      <div style={{ fontSize: '.87rem', color: 'var(--charcoal)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{v}</div>
    </div>
  )
}

function Field({ label, children }) {
  return <div className="fg"><label className="flabel">{label}</label>{children}</div>
}

function KV({ k, v }) {
  if (!v) return null
  return (
    <div>
      <div style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--g500)', fontWeight: 700 }}>{k}</div>
      <div style={{ fontSize: '.87rem', color: 'var(--charcoal)', whiteSpace: 'pre-wrap' }}>{v}</div>
    </div>
  )
}

function Alert({ color, text }) {
  return (
    <div style={{
      padding: '8px 14px', borderRadius: 8, fontSize: '.83rem', fontWeight: 600,
      color, background: color + '10', borderLeft: `3px solid ${color}`,
    }}>{text}</div>
  )
}

const th = { padding: '8px 10px', fontWeight: 700 }
const td = { padding: '9px 10px', color: 'var(--charcoal)' }
