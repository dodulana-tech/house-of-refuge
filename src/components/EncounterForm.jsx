import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  ENCOUNTER_TYPES, ATTENDANCE, RISK_FLAGS, ESCALATING_RISK,
  createEncounter, updateEncounterDraft, signEncounter, deleteEncounterDraft,
} from '../utils/outpatientClinical'

/*
  Composer for one outpatient consult note.

  Two-step on purpose: save a draft while the client is still in the room, sign
  it once. Signing locks the clinical content at the database (an edit after
  that raises 42501), completes the booking, opens a safeguarding concern for
  moderate-or-above risk, and arms the recall if a follow-up date is set. So the
  sign button warns about exactly what it is about to trigger.
*/

const TYPE_PROMPTS = {
  consultation: {
    subjective: 'Presenting concern in the client’s own words, history, substance use pattern, previous treatment.',
    objective: 'Mental state examination, vitals, observed presentation, collateral from family.',
    assessment: 'Working diagnosis, severity, comorbidity, readiness to change.',
    plan: 'Medication, referrals, review interval, what the client agreed to.',
  },
  therapy: {
    subjective: 'What the client brought to the session; mood and craving since last contact.',
    objective: 'Engagement, affect, technique used (CBT, MI), homework reviewed.',
    assessment: 'Progress against therapeutic goals; barriers.',
    plan: 'Focus for next session, homework set, review interval.',
  },
  assessment: {
    subjective: 'History taken, informant, presenting difficulties.',
    objective: 'Instruments administered and raw scores (ASI, ASSIST, URICA).',
    assessment: 'Interpretation, level-of-care recommendation.',
    plan: 'Recommended pathway, what was explained to the family.',
  },
}
const DEFAULT_PROMPTS = {
  subjective: 'What the client reported.',
  objective: 'What you observed or measured.',
  assessment: 'Your clinical impression.',
  plan: 'What happens next, and by when.',
}

function blankForm(booking) {
  const now = new Date()
  const tzNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  return {
    encounter_date: booking?.scheduled_at
      ? new Date(new Date(booking.scheduled_at).getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      : tzNow,
    encounter_type: 'consultation',
    attendance: 'attended',
    duration_minutes: booking?.duration_minutes || booking?.outpatient_services?.duration_minutes || '',
    presenting_complaint: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    diagnosis: '',
    medications: '',
    risk_flag: 'none',
    risk_notes: '',
    follow_up_required: false,
    follow_up_at: '',
    follow_up_notes: '',
  }
}

export default function EncounterForm({
  clientId,
  booking = null,
  draft = null,          // an existing unsigned encounter to continue
  amends = null,         // a signed encounter this addendum corrects
  onDone,
  onCancel,
}) {
  const { user } = useAuth()
  const [f, setF] = useState(() => {
    if (draft) {
      return {
        ...blankForm(booking),
        ...draft,
        encounter_date: draft.encounter_date
          ? new Date(new Date(draft.encounter_date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
          : blankForm(booking).encounter_date,
        follow_up_at: draft.follow_up_at || '',
        duration_minutes: draft.duration_minutes || '',
      }
    }
    const base = blankForm(booking)
    return amends ? { ...base, encounter_type: 'addendum' } : base
  })
  const [id, setId] = useState(draft?.id || null)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))
  const prompts = TYPE_PROMPTS[f.encounter_type] || DEFAULT_PROMPTS
  const attended = f.attendance === 'attended' || f.attendance === 'telehealth'
  const willEscalate = ESCALATING_RISK.includes(f.risk_flag)

  const payload = () => ({
    client_id: clientId,
    booking_id: booking?.id || draft?.booking_id || null,
    service_id: booking?.service_id || draft?.service_id || null,
    practitioner_id: booking?.practitioner_id || draft?.practitioner_id || null,
    amends_encounter_id: amends?.id || draft?.amends_encounter_id || null,
    author_id: user?.id || null,
    author_code: user?.name || user?.full_name || user?.email || null,
    encounter_date: new Date(f.encounter_date).toISOString(),
    encounter_type: f.encounter_type,
    attendance: f.attendance,
    duration_minutes: f.duration_minutes ? parseInt(f.duration_minutes, 10) : null,
    presenting_complaint: f.presenting_complaint || null,
    subjective: f.subjective || null,
    objective: f.objective || null,
    assessment: f.assessment || null,
    plan: f.plan || null,
    diagnosis: f.diagnosis || null,
    medications: f.medications || null,
    risk_flag: f.risk_flag,
    risk_notes: f.risk_notes || null,
    follow_up_required: !!f.follow_up_required,
    follow_up_at: f.follow_up_required && f.follow_up_at ? f.follow_up_at : null,
    follow_up_notes: f.follow_up_notes || null,
  })

  const validate = () => {
    if (!clientId) return 'No client is linked to this booking yet.'
    if (attended && !f.subjective?.trim() && !f.objective?.trim()) {
      return 'Record at least what the client reported or what you observed.'
    }
    if (f.follow_up_required && !f.follow_up_at) return 'Set a follow-up date, or untick follow-up.'
    if (willEscalate && !f.risk_notes?.trim()) {
      return 'A moderate or higher risk flag needs risk notes: what the concern is and what you did about it.'
    }
    return ''
  }

  const saveDraft = async () => {
    const v = validate()
    if (v) { setErr(v); return null }
    setErr(''); setBusy('draft')
    const res = id ? await updateEncounterDraft(id, payload()) : await createEncounter(payload())
    setBusy('')
    if (res.error) { setErr(res.error.message || String(res.error)); return null }
    setId(res.data.id)
    return res.data
  }

  const handleSaveDraft = async () => {
    const row = await saveDraft()
    if (row) onDone?.(row, 'draft')
  }

  const handleSign = async () => {
    const row = await saveDraft()
    if (!row) return
    setBusy('sign')
    const { data, error } = await signEncounter(row.id, {
      signedBy: user?.id || null,
      signedByName: user?.name || user?.full_name || user?.email || 'Unknown clinician',
    })
    setBusy('')
    if (error) { setErr(error.message || String(error)); return }
    onDone?.(data, 'signed')
  }

  const handleDiscard = async () => {
    if (!id) { onCancel?.(); return }
    if (!confirm('Discard this draft note?')) return
    const { error } = await deleteEncounterDraft(id)
    if (error) { setErr(error.message || String(error)); return }
    onCancel?.()
  }

  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: 4 }}>
        {amends ? 'Addendum to a signed note' : id ? 'Continue draft note' : 'New consult note'}
      </h3>
      <p style={{ fontSize: '.82rem', color: 'var(--g500)', marginBottom: 16 }}>
        {amends
          ? 'The original note stays as written. This addendum is filed alongside it.'
          : 'Save as a draft while you work. Signing locks the note permanently.'}
      </p>

      {amends && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: 'rgba(26,95,173,.06)', borderLeft: '3px solid var(--blue)', fontSize: '.82rem', color: 'var(--charcoal)' }}>
          Amending the note of {new Date(amends.encounter_date).toLocaleDateString('en-GB', { dateStyle: 'medium' })} signed by {amends.signed_by_name || '—'}.
        </div>
      )}

      <div className="frow">
        <div className="fg">
          <label className="flabel">Date &amp; time *</label>
          <input className="fi" type="datetime-local" value={f.encounter_date} onChange={e => set('encounter_date', e.target.value)} />
        </div>
        <div className="fg">
          <label className="flabel">Type *</label>
          <select className="fi" value={f.encounter_type} onChange={e => set('encounter_type', e.target.value)}>
            {ENCOUNTER_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="frow">
        <div className="fg">
          <label className="flabel">Attendance *</label>
          <select className="fi" value={f.attendance} onChange={e => set('attendance', e.target.value)}>
            {ATTENDANCE.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </div>
        <div className="fg">
          <label className="flabel">Duration (minutes)</label>
          <input className="fi" type="number" value={f.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} placeholder="e.g. 60" />
        </div>
      </div>

      {!attended && (
        <div style={{ padding: '10px 14px', borderRadius: 8, margin: '4px 0 14px', background: 'rgba(139,42,42,.06)', borderLeft: '3px solid #8B2A2A', fontSize: '.82rem', color: '#8B2A2A' }}>
          Signing this will mark the booking as {f.attendance === 'cancelled' ? 'cancelled' : 'a no-show'}. Record any contact attempts under Plan.
        </div>
      )}

      {attended && (
        <div className="fg">
          <label className="flabel">Presenting complaint</label>
          <input className="fi" value={f.presenting_complaint} onChange={e => set('presenting_complaint', e.target.value)} placeholder="One line: why they came today." />
        </div>
      )}

      <div className="fg">
        <label className="flabel">S — Subjective{attended ? ' *' : ''}</label>
        <textarea className="fi" rows={3} placeholder={prompts.subjective} value={f.subjective} onChange={e => set('subjective', e.target.value)} />
      </div>
      <div className="fg">
        <label className="flabel">O — Objective</label>
        <textarea className="fi" rows={3} placeholder={prompts.objective} value={f.objective} onChange={e => set('objective', e.target.value)} />
      </div>
      <div className="fg">
        <label className="flabel">A — Assessment</label>
        <textarea className="fi" rows={3} placeholder={prompts.assessment} value={f.assessment} onChange={e => set('assessment', e.target.value)} />
      </div>
      <div className="fg">
        <label className="flabel">P — Plan</label>
        <textarea className="fi" rows={3} placeholder={prompts.plan} value={f.plan} onChange={e => set('plan', e.target.value)} />
      </div>

      <div className="frow">
        <div className="fg">
          <label className="flabel">Working diagnosis</label>
          <input className="fi" value={f.diagnosis} onChange={e => set('diagnosis', e.target.value)} placeholder="e.g. Alcohol use disorder, moderate" />
        </div>
        <div className="fg">
          <label className="flabel">Medication</label>
          <input className="fi" value={f.medications} onChange={e => set('medications', e.target.value)} placeholder="Prescribed, changed, or reviewed" />
        </div>
      </div>

      {/* Risk */}
      <div style={{ border: '1px solid #E5E9EE', borderRadius: 8, padding: '14px 16px', margin: '6px 0 14px' }}>
        <div style={{ fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700, marginBottom: 10 }}>Risk</div>
        <div className="frow">
          <div className="fg">
            <label className="flabel">Risk flag</label>
            <select className="fi" value={f.risk_flag} onChange={e => set('risk_flag', e.target.value)}>
              {RISK_FLAGS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
        </div>
        {f.risk_flag !== 'none' && (
          <div className="fg">
            <label className="flabel">Risk notes{willEscalate ? ' *' : ''}</label>
            <textarea className="fi" rows={2} value={f.risk_notes} onChange={e => set('risk_notes', e.target.value)}
              placeholder="Nature of the concern, safety plan agreed, who was informed." />
          </div>
        )}
        {willEscalate && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(139,42,42,.07)', borderLeft: '3px solid #8B2A2A', fontSize: '.82rem', color: '#8B2A2A' }}>
            Signing will open a safeguarding concern on the Safeguarding dashboard for the DSL to review.
          </div>
        )}
      </div>

      {/* Follow-up */}
      <div style={{ border: '1px solid #E5E9EE', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700, marginBottom: 10 }}>Follow-up</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.88rem', color: 'var(--charcoal)' }}>
          <input type="checkbox" checked={f.follow_up_required} onChange={e => set('follow_up_required', e.target.checked)} />
          <span>This client needs a follow-up</span>
        </label>
        {f.follow_up_required && (
          <div style={{ marginTop: 12 }}>
            <div className="frow">
              <div className="fg">
                <label className="flabel">Follow up by *</label>
                <input className="fi" type="date" value={f.follow_up_at} onChange={e => set('follow_up_at', e.target.value)} />
              </div>
            </div>
            <div className="fg">
              <label className="flabel">Follow-up notes</label>
              <input className="fi" value={f.follow_up_notes} onChange={e => set('follow_up_notes', e.target.value)} placeholder="What the follow-up is for." />
            </div>
            <div style={{ fontSize: '.8rem', color: 'var(--g500)' }}>
              Once signed, this appears on the outpatient follow-up list until someone closes it.
            </div>
          </div>
        )}
      </div>

      {err && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: 'rgba(139,42,42,.08)', color: '#8B2A2A', fontSize: '.85rem' }}>
          {err}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn--primary btn--sm" disabled={!!busy} onClick={handleSign}>
          {busy === 'sign' ? 'Signing…' : 'Sign and file note'}
        </button>
        <button className="btn btn--secondary btn--sm" disabled={!!busy} onClick={handleSaveDraft}>
          {busy === 'draft' ? 'Saving…' : 'Save draft'}
        </button>
        <button className="btn btn--secondary btn--sm" disabled={!!busy} onClick={handleDiscard}>
          {id ? 'Discard draft' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}
