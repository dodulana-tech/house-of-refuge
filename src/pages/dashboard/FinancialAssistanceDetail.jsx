import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotif } from '../../App'
import {
  FA_STATUSES,
  PASTORAL_STATUSES,
  getFAById,
  updateFAStatus,
  updatePastoralInterview,
  getFADocumentUrl,
  INCOME_BANDS,
} from '../../utils/financialAssistance'

export default function FinancialAssistanceDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const notify = useNotif()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [decisionStatus, setDecisionStatus] = useState('')
  const [decisionNotes, setDecisionNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [working, setWorking] = useState(false)

  const [ptStatus, setPtStatus] = useState('')
  const [ptScheduledAt, setPtScheduledAt] = useState('')
  const [ptCompletedAt, setPtCompletedAt] = useState('')
  const [ptNotes, setPtNotes] = useState('')
  const [ptWorking, setPtWorking] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await getFAById(id)
    setLoading(false)
    if (error) { setError(error.message || String(error)); return }
    if (!data) { setError('Application not found.'); return }
    setApp(data)
    setInternalNotes(data.internal_notes || '')
    setDecisionNotes(data.decision_notes || '')
    setPtStatus(data.pastoral_interview_status || 'pending')
    setPtScheduledAt(data.pastoral_interview_scheduled_at ? data.pastoral_interview_scheduled_at.slice(0, 16) : '')
    setPtCompletedAt(data.pastoral_interview_completed_at ? data.pastoral_interview_completed_at.slice(0, 16) : '')
    setPtNotes(data.pastoral_interview_notes || '')
  }

  const savePastoral = async () => {
    setPtWorking(true)
    const payload = {
      status: ptStatus,
      scheduled_at: ptScheduledAt ? new Date(ptScheduledAt).toISOString() : null,
      completed_at: ptCompletedAt ? new Date(ptCompletedAt).toISOString() : null,
      notes: ptNotes,
    }
    const { error } = await updatePastoralInterview(id, payload)
    setPtWorking(false)
    if (error) { notify?.('Pastoral update failed', error.message || String(error), 'error'); return }
    notify?.('Pastoral interview updated', `Status: ${PASTORAL_STATUSES.find(s => s.key === ptStatus)?.label || ptStatus}`, 'success')
    load()
  }

  useEffect(() => { load() }, [id])

  const openDoc = async (path) => {
    const url = await getFADocumentUrl(path)
    if (url) window.open(url, '_blank', 'noopener')
    else notify?.('Cannot open', 'Document URL could not be generated.', 'error')
  }

  const applyAction = async () => {
    if (!decisionStatus) return
    if (['approved', 'declined'].includes(decisionStatus) && !decisionNotes.trim()) {
      if (!confirm('No decision notes entered. Continue without notes?')) return
    }
    setWorking(true)
    const { error } = await updateFAStatus(id, {
      status: decisionStatus,
      decision_notes: decisionNotes,
      internal_notes: internalNotes,
      decision_by: user?.id,
    })
    setWorking(false)
    if (error) { notify?.('Update failed', error.message || String(error), 'error'); return }
    notify?.('Status updated', `Application set to ${FA_STATUSES.find(s => s.key === decisionStatus).label}.`, 'success')
    setDecisionStatus('')
    load()
  }

  const incomeLabel = (band) => INCOME_BANDS.find(b => b.value === band)?.label || band || '—'
  const fmt = (iso) => iso ? new Date(iso).toLocaleString('en-GB') : '—'

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>
  if (error || !app) return (
    <div style={{ padding: 40 }}>
      <p style={{ color: '#8B2A2A' }}>{error || 'Not found.'}</p>
      <Link to="/dashboard/financial-assistance" className="btn btn--secondary btn--sm">Back to list</Link>
    </div>
  )

  const statusInfo = FA_STATUSES.find(s => s.key === app.status) || FA_STATUSES[0]

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <Link to="/dashboard/financial-assistance" className="btn btn--secondary btn--sm">← Back</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700 }}>Financial Assistance · Application</div>
          <h1 style={{ fontSize: '1.5rem', margin: '4px 0 0' }}>
            <code style={{ color: 'var(--blue)', fontSize: '1.3rem' }}>{app.reference_code}</code>
            <span style={{ marginLeft: 14, fontSize: '.86rem', fontWeight: 500, color: 'var(--g700)' }}>{app.applicant_name}</span>
          </h1>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 16,
          background: `${statusInfo.color}1A`, color: statusInfo.color, fontWeight: 600, fontSize: '.82rem',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusInfo.color }} />
          {statusInfo.label}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>

        {/* LEFT — application details */}
        <div>
          <Section title="Applicant">
            <KV k="Name" v={app.applicant_name} />
            <KV k="Phone" v={app.applicant_phone} />
            <KV k="Email" v={app.applicant_email} />
            <KV k="Relationship to patient" v={app.applicant_relationship} />
          </Section>

          <Section title="Patient">
            <KV k="Name" v={app.patient_name} />
            <KV k="Age" v={app.patient_age || '—'} />
            <KV k="Gender" v={app.patient_gender || '—'} />
            <KV k="Substance" v={app.patient_substance} />
            <KV k="Duration of use" v={app.patient_substance_duration || '—'} />
            <KV k="Prior treatment" v={app.patient_prior_treatment || '—'} />
            <KV k="Willingness" v={app.patient_willingness} />
          </Section>

          <Section title="Financial context">
            <KV k="Household size" v={app.household_size ?? '—'} />
            <KV k="Dependants" v={app.dependants ?? '—'} />
            <KV k="Income band" v={incomeLabel(app.monthly_income_band)} />
            <KV k="Prior medical bills" v={app.prior_medical_bills_estimate || '—'} />
            <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
              <div style={kvK}>Narrative</div>
              <div style={{ ...kvV, whiteSpace: 'pre-wrap', marginTop: 4 }}>{app.financial_situation_narrative}</div>
            </div>
          </Section>

          <Section title="Pastoral / community referrer">
            <KV k="Name" v={app.pastoral_referrer_name} />
            <KV k="Organisation" v={app.pastoral_referrer_org} />
            <KV k="Phone" v={app.pastoral_referrer_phone} />
            <KV k="Email" v={app.pastoral_referrer_email || '—'} />
            <KV k="Relationship" v={app.pastoral_referrer_relationship || '—'} />
          </Section>

          <Section title={`Supporting documents (${(app.documents || []).length})`}>
            {(app.documents || []).length === 0 ? (
              <div style={{ gridColumn: '1 / -1', color: 'var(--g500)', fontSize: '.88rem' }}>No documents uploaded.</div>
            ) : (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {app.documents.map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid #EDF1F5', borderRadius: 6, background: '#FAFBFC' }}>
                    <div>
                      <div style={{ fontSize: '.92rem', fontWeight: 600 }}>{d.name}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>{(d.size / 1024).toFixed(0)} KB · {d.type}</div>
                    </div>
                    <button className="btn btn--secondary btn--sm" onClick={() => openDoc(d.path)}>View</button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Decision history">
            <KV k="Status" v={statusInfo.label} />
            <KV k="Submitted" v={fmt(app.submitted_at)} />
            <KV k="Last updated" v={fmt(app.updated_at)} />
            <KV k="Decision recorded" v={fmt(app.decision_at)} />
            {app.decision_notes && (
              <div style={{ gridColumn: '1 / -1', marginTop: 6 }}>
                <div style={kvK}>Decision notes</div>
                <div style={{ ...kvV, whiteSpace: 'pre-wrap', marginTop: 4 }}>{app.decision_notes}</div>
              </div>
            )}
            {app.internal_notes && (
              <div style={{ gridColumn: '1 / -1', marginTop: 6 }}>
                <div style={kvK}>Internal notes</div>
                <div style={{ ...kvV, whiteSpace: 'pre-wrap', marginTop: 4 }}>{app.internal_notes}</div>
              </div>
            )}
          </Section>
        </div>

        {/* RIGHT — action panel */}
        <aside style={{ position: 'sticky', top: 20, alignSelf: 'flex-start' }}>
          <div style={{ background: '#fff', border: '1px solid #E5E9EE', borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700, marginBottom: 10 }}>Foundation review action</div>
            <h3 style={{ fontSize: '1rem', margin: '0 0 14px' }}>Update this application</h3>

            <label style={lbl}>New status</label>
            <select value={decisionStatus} onChange={e => setDecisionStatus(e.target.value)} style={inp}>
              <option value="">Select…</option>
              <option value="under_review">Mark Under Review</option>
              <option value="more_info_needed">Request More Info</option>
              <option value="approved">Approve</option>
              <option value="declined">Decline</option>
              <option value="withdrawn">Mark Withdrawn</option>
            </select>

            <label style={lbl}>Decision notes <span style={{ color: 'var(--g500)', fontWeight: 400 }}>(shared with applicant)</span></label>
            <textarea rows={4} value={decisionNotes} onChange={e => setDecisionNotes(e.target.value)} style={inp} placeholder="e.g. Approved on financial grounds. Clinical assessment to follow." />

            <label style={lbl}>Internal notes <span style={{ color: 'var(--g500)', fontWeight: 400 }}>(not shown to applicant)</span></label>
            <textarea rows={3} value={internalNotes} onChange={e => setInternalNotes(e.target.value)} style={inp} placeholder="Foundation committee remarks…" />

            <button className="btn btn--primary btn--full" disabled={!decisionStatus || working} onClick={applyAction} style={{ marginTop: 6 }}>
              {working ? 'Saving…' : 'Apply update'}
            </button>
            <p style={{ fontSize: '.78rem', color: 'var(--g500)', margin: '12px 0 0', lineHeight: 1.5 }}>
              Approving creates a soft handoff to the clinical admissions team. Declining will email the applicant with the decision notes.
            </p>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E5E9EE', borderLeft: '3px solid #C08A30', borderRadius: 8, padding: 20, marginTop: 14 }}>
            <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700, marginBottom: 6 }}>Pastoral interview · Mandatory</div>
            <h3 style={{ fontSize: '1rem', margin: '0 0 4px' }}>Pastor Tony Rapu</h3>
            <p style={{ fontSize: '.78rem', color: 'var(--g700)', margin: '0 0 14px', lineHeight: 1.5 }}>Patient + family · After psychiatrist clearance · Booked by admissions</p>

            {(() => {
              const ps = PASTORAL_STATUSES.find(s => s.key === (app.pastoral_interview_status || 'pending')) || PASTORAL_STATUSES[0]
              return (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 12, background: `${ps.color}1A`, color: ps.color, fontWeight: 600, fontSize: '.78rem', marginBottom: 12 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: ps.color }} />
                  Current: {ps.label}
                </div>
              )
            })()}

            <label style={lbl}>Status</label>
            <select value={ptStatus} onChange={e => setPtStatus(e.target.value)} style={inp}>
              {PASTORAL_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>

            <label style={lbl}>Scheduled date &amp; time</label>
            <input type="datetime-local" value={ptScheduledAt} onChange={e => setPtScheduledAt(e.target.value)} style={inp} />

            {ptStatus === 'completed' && (
              <>
                <label style={lbl}>Completed at</label>
                <input type="datetime-local" value={ptCompletedAt} onChange={e => setPtCompletedAt(e.target.value)} style={inp} />
              </>
            )}

            <label style={lbl}>Notes <span style={{ color: 'var(--g500)', fontWeight: 400 }}>(internal)</span></label>
            <textarea rows={3} value={ptNotes} onChange={e => setPtNotes(e.target.value)} style={inp} placeholder="e.g. Scheduled for Tuesday 11am at Freedom House. Family confirmed attendance." />

            <button className="btn btn--gold btn--full" disabled={ptWorking} onClick={savePastoral} style={{ marginTop: 8 }}>
              {ptWorking ? 'Saving…' : 'Save pastoral interview'}
            </button>
            <p style={{ fontSize: '.75rem', color: 'var(--g500)', margin: '10px 0 0', lineHeight: 1.5 }}>
              Admission cannot be scheduled until pastoral interview is <strong>Completed</strong>.
            </p>
          </div>

          <div style={{ background: '#FFF8EC', border: '1px solid rgba(192,138,48,.25)', borderRadius: 8, padding: 16, marginTop: 14 }}>
            <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700, marginBottom: 6 }}>Quick contact</div>
            <div style={{ fontSize: '.88rem', color: 'var(--charcoal)', lineHeight: 1.6 }}>
              <div><strong>{app.applicant_phone}</strong></div>
              <div><a href={`mailto:${app.applicant_email}`}>{app.applicant_email}</a></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section style={{ background: 'white', border: '1px solid #E5E9EE', borderRadius: 8, padding: '18px 22px', marginBottom: 14 }}>
      <h3 style={{ fontSize: '.95rem', margin: '0 0 12px', color: 'var(--charcoal)', fontWeight: 700 }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>{children}</div>
    </section>
  )
}
function KV({ k, v }) {
  return (
    <div>
      <div style={kvK}>{k}</div>
      <div style={kvV}>{v ?? '—'}</div>
    </div>
  )
}
const kvK = { fontSize: '.72rem', letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--g500)', fontWeight: 700 }
const kvV = { fontSize: '.92rem', color: 'var(--charcoal)' }
const lbl = { display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--charcoal)', margin: '12px 0 5px' }
const inp = { width: '100%', padding: '8px 10px', border: '1px solid #DDE3EA', borderRadius: 5, fontSize: '.88rem', fontFamily: 'inherit' }
