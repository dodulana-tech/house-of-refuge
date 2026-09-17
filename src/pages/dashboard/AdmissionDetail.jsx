import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../utils/paystack'
import { buildDepositEmail, DEFAULT_DEPOSIT_AMOUNT as DEPOSIT_AMOUNT_NAIRA } from '../../data/depositEmailTemplate'
import {
  sendDepositRequestEmail, getApplicationById, isSupabaseReady,
  applyApplicationTransition, logApplicationContact, getApplicationContacts, getApplicationEvents,
} from '../../utils/supabase'
import { createFACaseFromApplication, getFAByApplicationId } from '../../utils/financialAssistance'
import {
  STAGES, GATES, FUNDING_ROUTES, CLOSURE_REASONS, CONTACT_METHODS, CONTACT_OUTCOMES,
  stageIndex, stageLabel, dispositionLabel, dispositionColor, fundingLabel, fundingColor,
  closureLabel, nextGate, nextAction, gateFor, gateState, resolveGate, advanceStage, parkApplication,
  isFundingConfirmed,
  closeApplication, reopenApplication, setFundingRoute, daysInStage, isOverdue,
} from '../../utils/admissionsPipeline'

/*
  Admission Detail: the single application identified by the :id route param.

  The review runs on four gates, asked in order, each with a mutually exclusive
  and collectively exhaustive answer set. Answering one writes the stage, the
  disposition, the funding route and the closure reason together, so a file can
  never end a review in an undefined state. The model lives in
  utils/admissionsPipeline.js; this file only renders it and saves the result.
*/

const PIPELINE_STEPS = STAGES

function initialsOf(first, last) {
  return (((first || '').charAt(0)) + ((last || '').charAt(0))).toUpperCase() || '—'
}

function exclusionSummary(r) {
  const flags = []
  if (r.active_psychosis === 'yes') flags.push('active psychosis')
  if (r.antipsychotic_need === 'yes') flags.push('antipsychotic requirement')
  if (r.severe_cognitive === 'yes') flags.push('severe cognitive impairment')
  if (r.legal_detention === 'yes') flags.push('legal detention')
  return flags.length
    ? `Flags requiring review: ${flags.join(', ')}`
    : 'Cleared — no exclusion flags reported'
}

// Map a Supabase `applications` row into the shape this view renders.
function mapApplication(r) {
  return {
    id: r.id,
    initials: initialsOf(r.first_name, r.last_name),
    applicantName: [r.first_name, r.last_name].filter(Boolean).join(' ') || '—',
    applicantEmail: r.email || '',
    applicantPhone: r.phone || '',
    pathway: r.pathway || 'A',
    substance: [r.substance, r.substance_other].filter(Boolean).join(' / ') || '—',
    substanceDuration: r.duration || '—',
    frequency: r.frequency || '—',
    route: r.route_of_use || '—',
    insight: r.insight_level || '',
    status: r.status || 'submitted',
    depositPaid: !!r.deposit_paid,
    depositRequestSentAt: r.deposit_request_sent_at || null,
    depositAmount: Math.round((r.deposit_amount ?? 100000000) / 100), // kobo → naira
    dateApplied: r.created_at,
    mentalHealth: r.mental_health || 'Not reported',
    suicideRisk: r.suicide_history ? `History: ${r.suicide_history}` : 'No history reported',
    exclusionScreening: exclusionSummary(r),
    stageOfChange: r.insight_level || 'Not assessed',
    motivation: r.motivation_source || 'Not reported',
    voluntary: (r.seeking_voluntarily || '').toLowerCase() !== 'no',
    treatmentGoals: r.treatment_goals || 'Not specified',
    twelveWeekCommitment: r.willingness_confirm === 'yes',
    familyAwareness: r.family_awareness || 'Not reported',
    pfspDetails: [r.pfsp_name, r.pfsp_relationship].filter(Boolean).join(' — ') || 'Not provided',
    household: r.household_type || 'Not reported',
    enablers: r.enablers_present || 'Not reported',
    aftercareHousing: r.housing_aftercare || 'Not reported',
    // The four axes. Everything the review panel decides from.
    stage: r.stage || 'submitted',
    disposition: r.disposition || 'active-us',
    fundingRoute: r.funding_route || 'undetermined',
    funding_route: r.funding_route || 'undetermined',
    gate_contact: r.gate_contact || null,
    gate_willingness: r.gate_willingness || null,
    gate_clinical_fit: r.gate_clinical_fit || null,
    closureReason: r.closure_reason || null,
    closureNote: r.closure_note || null,
    parkedUntil: r.parked_until || null,
    stage_entered_at: r.stage_entered_at || r.updated_at || r.created_at,
    parked_until: r.parked_until || null,
    contactAttempts: r.contact_attempts || 0,
    faApplicationId: r.fa_application_id || null,
    fa_application_id: r.fa_application_id || null,
    financialStability: r.financial_stability || 'Not reported',
  }
}

const insightColors = {
  denial: '#E53E3E',
  precontemplation: '#DD6B20',
  contemplation: '#D69E2E',
  preparation: '#38A169',
  action: '#2B6CB0',
}

function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Build a self-contained, print-ready HTML document for one application.
// Rendered into a new window and sent to the browser print dialog (Save as PDF).
function buildApplicationHtml(app) {
  const statusLabel = stageLabel(app.stage)
  const depositLine = app.depositPaid
    ? `${fmt(app.depositAmount)} paid`
    : app.depositRequestSentAt
      ? `Request sent ${new Date(app.depositRequestSentAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : 'Not yet requested'
  const applied = app.dateApplied
    ? new Date(app.dateApplied).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'
  const generated = new Date().toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const row = (k, v) => `<tr><td class="k">${escapeHtml(k)}</td><td class="v">${escapeHtml(v)}</td></tr>`
  const section = (title, rows) => `
    <section>
      <h2>${escapeHtml(title)}</h2>
      <table>${rows}</table>
    </section>`

  return `<!doctype html><html><head><meta charset="utf-8">
    <title>Application ${escapeHtml(app.applicantName)}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #1f2733; margin: 0; padding: 32px 40px; }
      .brand { font-size: 13px; letter-spacing: .18em; text-transform: uppercase; font-weight: 700; color: #1A5FAD; }
      .doc { font-size: 11px; color: #7a8699; margin-top: 2px; }
      h1 { font-size: 22px; margin: 18px 0 2px; }
      .meta { font-size: 12px; color: #55606f; margin-bottom: 4px; }
      .badges { margin: 10px 0 20px; font-size: 11px; }
      .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; background: #eef3fb; color: #1A5FAD; font-weight: 700; margin-right: 6px; }
      section { margin-bottom: 18px; break-inside: avoid; }
      h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: #1A5FAD; border-bottom: 1.5px solid #e3e9f2; padding-bottom: 5px; margin: 0 0 8px; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 4px 0; font-size: 12.5px; vertical-align: top; }
      td.k { color: #7a8699; width: 42%; }
      td.v { color: #1f2733; font-weight: 600; }
      footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e3e9f2; font-size: 10px; color: #9aa4b2; display: flex; justify-content: space-between; }
      @media print { body { padding: 0; } @page { margin: 18mm; } }
    </style></head><body>
    <div class="brand">House of Refuge</div>
    <div class="doc">Admission Application &middot; Confidential</div>
    <h1>${escapeHtml(app.applicantName)}</h1>
    <div class="meta">Application ID: ${escapeHtml(app.id)}</div>
    <div class="meta">${app.applicantEmail ? escapeHtml(app.applicantEmail) + ' &middot; ' : ''}${app.applicantPhone ? escapeHtml(app.applicantPhone) + ' &middot; ' : ''}Applied ${escapeHtml(applied)}</div>
    <div class="badges">
      <span class="badge">${escapeHtml(statusLabel)}</span>
      <span class="badge">${escapeHtml(app.disposition === 'closed' ? `Closed: ${closureLabel(app.closureReason)}` : dispositionLabel(app.disposition))}</span>
      <span class="badge">Pathway ${escapeHtml(app.pathway)}</span>
      <span class="badge">Funding: ${escapeHtml(fundingLabel(app.fundingRoute))}</span>
      <span class="badge">Deposit: ${escapeHtml(depositLine)}</span>
    </div>
    ${section('Clinical Summary', [
      row('Substance', app.substance),
      row('Duration', app.substanceDuration),
      row('Frequency', app.frequency),
      row('Route of use', app.route),
      row('Mental health', app.mentalHealth),
      row('Suicide risk', app.suicideRisk),
      row('Exclusion screening', app.exclusionScreening),
    ].join(''))}
    ${section('Insight & Readiness', [
      row('Stage of change', app.stageOfChange),
      row('Motivation', app.motivation),
      row('Voluntary', app.voluntary ? 'Yes' : 'No'),
      row('Treatment goals', app.treatmentGoals),
      row('12-week commitment', app.twelveWeekCommitment ? 'Confirmed' : 'Not confirmed'),
    ].join(''))}
    ${section('Support & Family', [
      row('Family awareness', app.familyAwareness),
      row('PFSP details', app.pfspDetails),
      row('Household', app.household),
      row('Enablers identified', app.enablers),
      row('Aftercare housing', app.aftercareHousing),
    ].join(''))}
    <footer><span>House of Refuge Rehabilitation Centre</span><span>Generated ${escapeHtml(generated)}</span></footer>
  </body></html>`
}

export default function AdmissionDetail() {
  const { user } = useAuth()
  const { id } = useParams()
  const [app, setApp] = useState(null)
  const [raw, setRaw] = useState(null)           // the untouched row, for opening an FA case
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [contacts, setContacts] = useState([])
  const [events, setEvents] = useState([])
  const [faCase, setFaCase] = useState(null)
  // A transition the reviewer has chosen but not yet confirmed.
  const [pending, setPending] = useState(null)   // { kind, label, resolve, needs }
  const [pendingNote, setPendingNote] = useState('')
  const [pendingDate, setPendingDate] = useState('')
  const [pendingChoice, setPendingChoice] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [callForm, setCallForm] = useState({ method: 'phone', outcome: 'no-answer', notes: '', open: false, saving: false })
  const [depositModal, setDepositModal] = useState(false)
  const [depositForm, setDepositForm] = useState({
    toEmail: '',
    toName: '',
    paymentLink: '',
    reviewerName: '',
    reviewerTitle: 'Admissions Coordinator',
    sending: false,
  })

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setLoadError('')
      if (!isSupabaseReady()) {
        if (active) { setLoadError('not-configured'); setLoading(false) }
        return
      }
      const { data, error } = await getApplicationById(id)
      if (!active) return
      if (error || !data) {
        setLoadError('not-found')
        setLoading(false)
        return
      }
      setApp(mapApplication(data))
      setRaw(data)
      setLoading(false)

      /*
        The call log, the decision trail and any linked assistance case load
        after the application itself. They are supporting detail: a failure to
        read them should not blank the page the reviewer came here for.
      */
      const [{ data: c }, { data: e }] = await Promise.all([
        getApplicationContacts(id),
        getApplicationEvents(id),
      ])
      if (!active) return
      setContacts(c || [])
      setEvents(e || [])
      if (data.fa_application_id || data.funding_route === 'assistance-requested') {
        const { data: fa } = await getFAByApplicationId(id)
        if (active) setFaCase(fa || null)
      }
    }
    load()
    return () => { active = false }
  }, [id])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--g500)' }}>Loading application…</div>
  }
  if (loadError || !app) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--g500)' }}>
        <p style={{ marginBottom: 12 }}>
          {loadError === 'not-configured'
            ? 'Application data is unavailable — the database connection is not configured.'
            : 'Application not found. It may have been removed.'}
        </p>
        <Link to="/dashboard/admissions" className="btn btn--secondary btn--sm">← Back to Admissions Pipeline</Link>
      </div>
    )
  }

  const currentStepIdx = stageIndex(app.stage)
  const outstandingGate = nextGate(app)
  const isClosed = app.disposition === 'closed'
  // Why the file cannot move on, if it cannot. Funding is the hard one.
  const advanceBlock = isClosed ? null : advanceStage(app).error

  function openDepositEmail() {
    setDepositForm({
      toEmail: app.applicantEmail || '',
      toName: app.applicantName || app.initials || '',
      paymentLink: '',
      reviewerName: user?.full_name || user?.email || 'House of Refuge Admissions',
      reviewerTitle: 'Admissions Coordinator',
      sending: false,
    })
    setDepositModal(true)
  }

  const depositPreview = buildDepositEmail({
    patientName: depositForm.toName,
    applicationId: app.id,
    pathway: app.pathway,
    reviewerName: depositForm.reviewerName,
    reviewerTitle: depositForm.reviewerTitle,
    paymentLink: depositForm.paymentLink,
    amount: DEPOSIT_AMOUNT_NAIRA,
  })

  async function sendDepositEmail() {
    if (!depositForm.toEmail.includes('@')) { alert('Enter a valid recipient email address.'); return }
    setDepositForm(p => ({ ...p, sending: true, error: '' }))
    try {
      if (isSupabaseReady()) {
        const { data, error } = await sendDepositRequestEmail({
          applicationId: app.id,
          recipientEmail: depositForm.toEmail,
          recipientName: depositForm.toName,
          pathway: app.pathway,
          paymentLink: depositForm.paymentLink,
          reviewerName: depositForm.reviewerName,
          reviewerTitle: depositForm.reviewerTitle,
          amountNaira: DEPOSIT_AMOUNT_NAIRA,
        })
        if (error) throw new Error(error.message || 'Failed to send email')
        const sentAt = data?.sentAt || new Date().toISOString()
        setApp(prev => ({ ...prev, depositRequestSentAt: sentAt }))
      } else {
        // Local-only fallback for dev without Supabase configured.
        await new Promise(r => setTimeout(r, 400))
        setApp(prev => ({ ...prev, depositRequestSentAt: new Date().toISOString() }))
      }
      setDepositForm(p => ({ ...p, sending: false }))
      setDepositModal(false)
    } catch (err) {
      setDepositForm(p => ({ ...p, sending: false, error: err.message || 'Failed to send' }))
    }
  }

  function exportPdf() {
    const w = window.open('', '_blank')
    if (!w) {
      alert('Please allow pop-ups for this site to export the application as PDF.')
      return
    }
    w.document.write(buildApplicationHtml(app))
    w.document.close()
    w.focus()
    // Give the new window a tick to lay out before invoking the print dialog.
    const fire = () => { w.print() }
    if (w.document.readyState === 'complete') setTimeout(fire, 250)
    else w.onload = () => setTimeout(fire, 250)
  }

  // ── Transitions ───────────────────────────────────────────
  /*
    One path for every pipeline move: resolve it against the model, write it,
    then record who decided what and why. Nothing here changes React state
    alone, which is precisely how the previous panel lost every decision on the
    next refresh and discarded the reason the reviewer had selected.
  */
  function resetPending() {
    setPending(null); setPendingNote(''); setPendingDate(''); setPendingChoice('')
  }

  async function openAssistanceCase(row) {
    const { data, error, linkError } = await createFACaseFromApplication(row || raw, user || {})
    if (error) {
      setSaveError(`Decision saved, but the assistance case could not be opened: ${error.message}`)
      return
    }
    setFaCase(data)
    setApp(prev => (prev ? { ...prev, faApplicationId: data.id } : prev))
    if (linkError) setSaveError('Assistance case opened, but the link back to this application did not save.')
  }

  async function commit(resolved) {
    if (resolved?.error) { setSaveError(resolved.error); return }
    if (!isSupabaseReady()) {
      setSaveError('Not saved: the database connection is not configured.')
      return
    }
    setSaving(true); setSaveError('')

    const { data, error, eventError } = await applyApplicationTransition(app.id, resolved, user || {})
    if (error) {
      setSaveError(error.message || 'Could not save this decision.')
      setSaving(false)
      return
    }

    setApp(mapApplication(data))
    setRaw(data)
    setEvents(prev => [{
      ...resolved.event,
      actor_name: user?.full_name || user?.name || user?.email || null,
      created_at: new Date().toISOString(),
    }, ...prev])

    if (resolved.opensFACase) await openAssistanceCase(data)

    setSaving(false)
    resetPending()
    if (eventError) setSaveError('Saved, but the decision trail entry failed to write.')
  }

  // Ask for confirmation, plus whatever the answer cannot be saved without.
  function askGate(gateKey, answerKey) {
    const gate = gateFor(gateKey)
    const answer = gate.answers.find(a => a.key === answerKey)
    setSaveError('')
    setPendingNote(''); setPendingDate(''); setPendingChoice('')
    setPending({
      kind: 'gate', gateKey, answerKey,
      title: `${gate.label}: ${answer.label}`,
      detail: answer.hint,
      needsDate: (answer.needs || []).includes('parked_until'),
    })
  }

  function ask(kind, extra = {}) {
    setSaveError('')
    setPendingNote(''); setPendingDate(''); setPendingChoice('')
    setPending({ kind, ...extra })
  }

  function confirmPending() {
    if (!pending) return
    const note = pendingNote.trim()
    switch (pending.kind) {
      case 'gate':
        return commit(resolveGate(app, pending.gateKey, pending.answerKey, {
          parked_until: pendingDate || null,
          note,
        }))
      case 'advance':
        return commit(advanceStage(app, note || `Advanced to ${stageLabel(PIPELINE_STEPS[currentStepIdx + 1]?.key)}`, note))
      case 'park':
        if (!note) { setSaveError('A reason is required to park a file.'); return }
        return commit(parkApplication(app, pendingDate, note, note))
      case 'close':
        return commit(closeApplication(app, pendingChoice, null, note))
      case 'reopen':
        return commit(reopenApplication(app, note || 'Reopened'))
      case 'funding':
        return commit(setFundingRoute(app, pending.route || pendingChoice, null, note))
      default:
        return undefined
    }
  }

  // A pending transition is only savable once its required extras are present.
  function pendingReady() {
    if (!pending) return false
    if (pending.needsDate && !pendingDate) return false
    if (pending.kind === 'park' && (!pendingDate || !pendingNote.trim())) return false
    if (pending.kind === 'close') {
      if (!pendingChoice) return false
      if (pendingChoice === 'other' && !pendingNote.trim()) return false
    }
    if (pending.kind === 'funding' && !pending.route && !pendingChoice) return false
    return true
  }

  // ── Contact log ───────────────────────────────────────────
  /*
    Separate from the gates on purpose. Three unanswered calls and one refusal
    are different facts, and until now neither was written down anywhere.
  */
  async function saveCall() {
    if (!isSupabaseReady()) { setSaveError('Not saved: the database connection is not configured.'); return }
    setCallForm(p => ({ ...p, saving: true }))
    const { data, error } = await logApplicationContact({
      applicationId: app.id,
      method: callForm.method,
      outcome: callForm.outcome,
      notes: callForm.notes,
    }, user || {})
    if (error) {
      setSaveError(error.message || 'Could not save the call.')
      setCallForm(p => ({ ...p, saving: false }))
      return
    }
    setContacts(prev => [data, ...prev])
    setApp(prev => (prev ? { ...prev, contactAttempts: (prev.contactAttempts || 0) + 1 } : prev))
    setCallForm({ method: 'phone', outcome: 'no-answer', notes: '', open: false, saving: false })
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--blue), var(--blue-dk))',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 700, flexShrink: 0,
          }}>
            {app.initials}
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 2 }}>
              {app.applicantName}
            </h1>
            <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
              {app.applicantPhone && <>📞 <a href={`tel:${app.applicantPhone}`} style={{ color: 'var(--blue)' }}>{app.applicantPhone}</a> &middot; </>}
              {app.applicantEmail && <>✉️ <a href={`mailto:${app.applicantEmail}`} style={{ color: 'var(--blue)' }}>{app.applicantEmail}</a> &middot; </>}
              Applied: {new Date(app.dateApplied).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <button
            className="btn btn--secondary btn--sm"
            style={{ marginLeft: 'auto', flexShrink: 0 }}
            onClick={exportPdf}
            title="Download this application as a PDF"
          >
            ⬇ Export PDF
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <span style={{ padding: '4px 12px', borderRadius: 14, fontSize: '.74rem', fontWeight: 700, background: '#DD6B2015', color: '#DD6B20' }}>
            {stageLabel(app.stage)}
          </span>
          <span style={{ padding: '4px 12px', borderRadius: 14, fontSize: '.74rem', fontWeight: 700, background: dispositionColor(app.disposition) + '18', color: dispositionColor(app.disposition) }}>
            {app.disposition === 'closed'
              ? `Closed: ${closureLabel(app.closureReason)}`
              : dispositionLabel(app.disposition)}
          </span>
          <span style={{ padding: '4px 12px', borderRadius: 14, fontSize: '.74rem', fontWeight: 700, background: fundingColor(app.fundingRoute) + '18', color: fundingColor(app.fundingRoute) }}>
            {fundingLabel(app.fundingRoute)}
          </span>
          <span style={{ padding: '4px 12px', borderRadius: 14, fontSize: '.74rem', fontWeight: 700, background: 'rgba(26,95,173,.08)', color: 'var(--blue)' }}>
            Pathway {app.pathway}
          </span>
          {app.depositPaid ? (
            <span style={{ padding: '4px 12px', borderRadius: 14, fontSize: '.74rem', fontWeight: 700, background: 'rgba(26,122,74,.1)', color: '#1A7A4A' }}>
              Deposit: {fmt(app.depositAmount)} Paid
            </span>
          ) : app.depositRequestSentAt ? (
            <span style={{ padding: '4px 12px', borderRadius: 14, fontSize: '.74rem', fontWeight: 700, background: 'rgba(26,95,173,.1)', color: 'var(--blue)' }}>
              Deposit request sent {new Date(app.depositRequestSentAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
            </span>
          ) : (
            <span style={{ padding: '4px 12px', borderRadius: 14, fontSize: '.74rem', fontWeight: 700, background: 'rgba(160,160,160,.12)', color: 'var(--g500)' }}>
              Deposit: Not yet requested
            </span>
          )}
        </div>
      </div>

      {/* 8-Step Pipeline Progress */}
      <div className="card" style={{ padding: '22px 24px', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 16, color: 'var(--charcoal)' }}>
          Stage
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
          {PIPELINE_STEPS.map((step, i) => {
            const isCompleted = i < currentStepIdx
            const isCurrent = i === currentStepIdx
            const isFuture = i > currentStepIdx
            return (
              <React.Fragment key={step.key}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90, flex: 1 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: isCompleted ? '#1A7A4A' : isCurrent ? 'var(--blue)' : 'var(--g200, #e2e8f0)',
                    color: isCompleted || isCurrent ? 'white' : 'var(--g500)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.75rem', fontWeight: 700, flexShrink: 0,
                    border: isCurrent ? '3px solid rgba(26,95,173,.3)' : 'none',
                    boxSizing: 'border-box',
                  }}>
                    {isCompleted ? '\u2713' : i + 1}
                  </div>
                  <span style={{
                    fontSize: '.68rem', marginTop: 6, textAlign: 'center',
                    color: isCurrent ? 'var(--blue)' : isCompleted ? '#1A7A4A' : 'var(--g500)',
                    fontWeight: isCurrent ? 700 : 400,
                  }}>
                    {step.label}
                  </span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div style={{
                    flex: '0 0 auto', width: 24, height: 2, marginTop: -16,
                    background: i < currentStepIdx ? '#1A7A4A' : 'var(--g200, #e2e8f0)',
                  }} />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Clinical Summary */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14, color: 'var(--charcoal)' }}>
            Clinical Summary
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '.85rem', color: 'var(--g700, #4a5568)' }}>
            <div><span style={{ color: 'var(--g500)' }}>Substance:</span> <strong>{app.substance}</strong></div>
            <div><span style={{ color: 'var(--g500)' }}>Duration:</span> <strong>{app.substanceDuration}</strong></div>
            <div><span style={{ color: 'var(--g500)' }}>Frequency:</span> <strong>{app.frequency}</strong></div>
            <div><span style={{ color: 'var(--g500)' }}>Route:</span> <strong>{app.route}</strong></div>
            <div style={{ borderTop: '1px solid var(--g200, #e2e8f0)', paddingTop: 10 }}>
              <span style={{ color: 'var(--g500)' }}>Mental Health:</span> <strong>{app.mentalHealth}</strong>
            </div>
            <div><span style={{ color: 'var(--g500)' }}>Suicide Risk:</span> <strong>{app.suicideRisk}</strong></div>
            <div><span style={{ color: 'var(--g500)' }}>Exclusion Screening:</span> <strong>{app.exclusionScreening}</strong></div>
          </div>
        </div>

        {/* Insight & Readiness */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14, color: 'var(--charcoal)' }}>
            Insight & Readiness
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '.85rem', color: 'var(--g700, #4a5568)' }}>
            <div>
              <span style={{ color: 'var(--g500)' }}>Stage of Change:</span>{' '}
              <strong style={{ color: insightColors[app.insight] || 'var(--g500)' }}>{app.stageOfChange}</strong>
            </div>
            <div><span style={{ color: 'var(--g500)' }}>Motivation:</span> <strong>{app.motivation}</strong></div>
            <div>
              <span style={{ color: 'var(--g500)' }}>Voluntary:</span>{' '}
              <strong style={{ color: app.voluntary ? '#1A7A4A' : '#E53E3E' }}>{app.voluntary ? 'Yes' : 'No'}</strong>
            </div>
            <div style={{ borderTop: '1px solid var(--g200, #e2e8f0)', paddingTop: 10 }}>
              <span style={{ color: 'var(--g500)' }}>Treatment Goals:</span> <strong>{app.treatmentGoals}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--g500)' }}>12-Week Commitment:</span>{' '}
              <strong style={{ color: app.twelveWeekCommitment ? '#1A7A4A' : '#E53E3E' }}>
                {app.twelveWeekCommitment ? 'Confirmed' : 'Not Confirmed'}
              </strong>
            </div>
          </div>
        </div>

        {/* Support & Family */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14, color: 'var(--charcoal)' }}>
            Support & Family
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '.85rem', color: 'var(--g700, #4a5568)' }}>
            <div><span style={{ color: 'var(--g500)' }}>Family Awareness:</span> <strong>{app.familyAwareness}</strong></div>
            <div><span style={{ color: 'var(--g500)' }}>PFSP Details:</span> <strong>{app.pfspDetails}</strong></div>
            <div><span style={{ color: 'var(--g500)' }}>Household:</span> <strong>{app.household}</strong></div>
            <div style={{ borderTop: '1px solid var(--g200, #e2e8f0)', paddingTop: 10 }}>
              <span style={{ color: 'var(--g500)' }}>Enablers Identified:</span> <strong>{app.enablers}</strong>
            </div>
            <div><span style={{ color: 'var(--g500)' }}>Aftercare Housing:</span> <strong>{app.aftercareHousing}</strong></div>
          </div>
        </div>
      </div>

      {/* Review: the four gates */}
      <div className="card" style={{ padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', color: 'var(--charcoal)', margin: 0 }}>
            Review
          </h2>
          <span style={{ fontSize: '.76rem', color: 'var(--g500)' }}>
            {daysInStage(app)} day{daysInStage(app) === 1 ? '' : 's'} at {stageLabel(app.stage)}
          </span>
        </div>
        <p style={{ fontSize: '.78rem', color: 'var(--g500)', marginBottom: 14, lineHeight: 1.6 }}>
          Four questions, asked in order. The review stops at the first one that fails, which is why
          funding is asked last. Every answer records the stage, who owes the next action and, where
          it applies, how the file closed.
        </p>

        {/* Where each gate stands */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {gateState(app).map(g => (
            <div key={g.key} style={{
              flex: '1 1 150px', minWidth: 140, padding: '9px 12px', borderRadius: 8,
              background: g.answerLabel ? 'rgba(26,95,173,.06)' : 'var(--g100, #f7fafc)',
              border: `1px solid ${g.key === outstandingGate ? 'var(--blue)' : 'transparent'}`,
            }}>
              <div style={{ fontSize: '.68rem', textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--g500)', fontWeight: 700 }}>
                {g.label}
              </div>
              <div style={{ fontSize: '.86rem', fontWeight: 700, marginTop: 3, color: g.answerLabel ? 'var(--charcoal)' : 'var(--g500)' }}>
                {g.answerLabel || (g.key === outstandingGate ? 'Asking now' : 'Not asked')}
              </div>
            </div>
          ))}
        </div>

        {saveError && (
          <div style={{
            background: '#FDECEC', border: '1px solid #F5B5B5', color: '#8B2A2A',
            borderRadius: 8, padding: '9px 13px', fontSize: '.8rem', marginBottom: 12, lineHeight: 1.5,
          }}>
            {saveError}
          </div>
        )}

        {/* The pending decision, and whatever it cannot be saved without */}
        {pending ? (
          <div style={{ padding: 16, background: 'var(--g100, #f7fafc)', borderRadius: 8 }}>
            <p style={{ fontSize: '.88rem', marginBottom: 4, color: 'var(--charcoal)' }}>
              <strong>{pending.title || (pending.kind === 'advance' ? `Advance to ${stageLabel(PIPELINE_STEPS[currentStepIdx + 1]?.key)}` : pending.kind === 'park' ? 'Park this file' : pending.kind === 'close' ? 'Close this file' : pending.kind === 'reopen' ? 'Reopen this file' : 'Change the funding route')}</strong>
            </p>
            {pending.detail && (
              <p style={{ fontSize: '.78rem', color: 'var(--g500)', marginBottom: 12 }}>{pending.detail}</p>
            )}

            {pending.kind === 'close' && (
              <div className="fg" style={{ marginBottom: 12 }}>
                <label className="flabel">How did it end? *</label>
                <select className="fi" value={pendingChoice} onChange={e => setPendingChoice(e.target.value)}>
                  <option value="">Select an outcome...</option>
                  {CLOSURE_REASONS.filter(c => c.key !== 'admitted').map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}

            {pending.kind === 'funding' && !pending.route && (
              <div className="fg" style={{ marginBottom: 12 }}>
                <label className="flabel">Funding route *</label>
                <select className="fi" value={pendingChoice} onChange={e => setPendingChoice(e.target.value)}>
                  <option value="">Select a route...</option>
                  {FUNDING_ROUTES.filter(f => f.key !== 'undetermined').map(f => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>
            )}

            {(pending.needsDate || pending.kind === 'park') && (
              <div className="fg" style={{ marginBottom: 12 }}>
                <label className="flabel">Review on *</label>
                <input className="fi" type="date" value={pendingDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setPendingDate(e.target.value)} />
                <span style={{ fontSize: '.72rem', color: 'var(--g500)', display: 'block', marginTop: 4 }}>
                  A parked file needs a date it comes back. That is what stops it ageing quietly.
                </span>
              </div>
            )}

            <div className="fg" style={{ marginBottom: 12 }}>
              <label className="flabel">
                Note {pending.kind === 'park' || pendingChoice === 'other' ? '*' : '(optional)'}
              </label>
              <textarea className="fi" rows={2} value={pendingNote}
                onChange={e => setPendingNote(e.target.value)}
                placeholder="What was said, and why this decision." />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--primary btn--sm" onClick={confirmPending} disabled={saving || !pendingReady()}>
                {saving ? 'Saving…' : 'Save decision'}
              </button>
              <button className="btn btn--secondary btn--sm" onClick={resetPending} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        ) : isClosed ? (
          <div style={{ padding: 16, background: 'var(--g100, #f7fafc)', borderRadius: 8 }}>
            <p style={{ fontSize: '.88rem', color: 'var(--charcoal)', marginBottom: 4 }}>
              Closed: <strong>{closureLabel(app.closureReason)}</strong>
            </p>
            {app.closureNote && (
              <p style={{ fontSize: '.8rem', color: 'var(--g500)', marginBottom: 12 }}>{app.closureNote}</p>
            )}
            <button className="btn btn--secondary btn--sm" onClick={() => ask('reopen')}>Reopen</button>
          </div>
        ) : outstandingGate ? (
          <div>
            <p style={{ fontSize: '.92rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: 10 }}>
              {gateFor(outstandingGate).question}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {gateFor(outstandingGate).answers.map(a => (
                <button key={a.key} className="btn btn--secondary btn--sm"
                  style={{ textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start', padding: '9px 14px' }}
                  onClick={() => askGate(outstandingGate, a.key)}
                  title={a.hint}>
                  {a.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '.74rem', color: 'var(--g500)', marginTop: 10 }}>
              {gateFor(outstandingGate).answers.map(a => `${a.label}: ${a.hint}`).join('  ·  ')}
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '.85rem', color: 'var(--g500)', marginBottom: 12 }}>
              All four questions are answered.{' '}
              {advanceBlock
                ? advanceBlock
                : `Next: ${nextAction(app) || 'move this file on below'}.`}
            </p>
          </div>
        )}
      </div>

      {/* Funding: the axis that used to have nowhere to go */}
      <div className="card" style={{ padding: '20px 22px', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 6, color: 'var(--charcoal)' }}>
          Funding
        </h2>
        <p style={{ fontSize: '.78rem', color: 'var(--g500)', marginBottom: 14, lineHeight: 1.6 }}>
          The deposit pays for the assessment, so nothing clinical is booked until funding is
          confirmed: the deposit paid, or assistance approved. What this answer settles is who is
          expected to pay and who we are waiting on, so a family who cannot pay is a file with an
          assistance case open and an owner rather than a file that stops.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <span style={{
            padding: '5px 13px', borderRadius: 14, fontSize: '.78rem', fontWeight: 700,
            background: fundingColor(app.fundingRoute) + '18', color: fundingColor(app.fundingRoute),
          }}>
            {fundingLabel(app.fundingRoute)}
          </span>
          {faCase && (
            <Link to={`/dashboard/financial-assistance/${faCase.id}`} style={{ fontSize: '.8rem', color: 'var(--blue)', fontWeight: 600 }}>
              Case {faCase.reference_code} ({faCase.status.replace(/_/g, ' ')}) →
            </Link>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {app.fundingRoute !== 'assistance-requested' && !faCase && (
            <button
              className="btn btn--sm"
              style={{ background: '#C08A3015', color: '#8E5F00', border: '1px solid #C08A3040', fontWeight: 600 }}
              onClick={() => ask('funding', {
                route: 'assistance-requested',
                title: 'Flag as needing financial assistance',
                detail: 'Opens a Freedom Foundation case prefilled from this application, links the two, and keeps the file moving on the clinical track.',
              })}
              disabled={isClosed}
            >
              Needs financial assistance
            </button>
          )}
          <button className="btn btn--secondary btn--sm" onClick={() => ask('funding', { title: 'Change the funding route' })} disabled={isClosed}>
            Change funding route
          </button>
          <button
            className="btn btn--sm"
            style={{ background: app.depositPaid ? 'rgba(160,160,160,.1)' : 'rgba(26,95,173,.08)', color: app.depositPaid ? 'var(--g500)' : 'var(--blue)', border: '1px solid rgba(26,95,173,.25)', fontWeight: 600 }}
            onClick={openDepositEmail}
            disabled={app.depositPaid}
            title={app.depositPaid ? 'Deposit already paid' : 'Send the refundable-deposit request email to the applicant'}
          >
            {app.depositRequestSentAt ? 'Resend Deposit Request Email' : 'Send Deposit Request Email'}
          </button>
        </div>
      </div>

      {/* Stage controls */}
      <div className="card" style={{ padding: '20px 22px', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14, color: 'var(--charcoal)' }}>
          Move this file
        </h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn--primary btn--sm"
            onClick={() => ask('advance')}
            disabled={isClosed || currentStepIdx >= PIPELINE_STEPS.length - 1 || !!outstandingGate || !!advanceBlock}
            title={outstandingGate ? 'Answer the outstanding question first' : advanceBlock || 'Move to the next stage'}
          >
            Advance to {stageLabel(PIPELINE_STEPS[currentStepIdx + 1]?.key) || 'next stage'}
          </button>
          <button
            className="btn btn--sm"
            style={{ background: '#D69E2E15', color: '#8E5F00', border: '1px solid #D69E2E40', fontWeight: 600 }}
            onClick={() => ask('park')}
            disabled={isClosed}
          >
            Park with a review date
          </button>
          <button
            className="btn btn--sm"
            style={{ background: '#E53E3E12', color: '#8B2A2A', border: '1px solid #E53E3E30', fontWeight: 600 }}
            onClick={() => ask('close')}
            disabled={isClosed}
          >
            Close this file
          </button>
        </div>
        {app.disposition === 'parked' && app.parkedUntil && (
          <p style={{ fontSize: '.8rem', color: isOverdue(app) ? '#8B2A2A' : 'var(--g500)', marginTop: 12, fontWeight: isOverdue(app) ? 700 : 400 }}>
            Parked until {new Date(app.parkedUntil).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
            {isOverdue(app) ? '. That date has passed.' : '.'}
          </p>
        )}
      </div>

      {/* Contact log */}
      <div className="card" style={{ padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', color: 'var(--charcoal)', margin: 0 }}>
            Contact log
          </h2>
          <button className="btn btn--secondary btn--sm" onClick={() => setCallForm(p => ({ ...p, open: !p.open }))}>
            {callForm.open ? 'Cancel' : '+ Log a call'}
          </button>
        </div>
        <p style={{ fontSize: '.78rem', color: 'var(--g500)', marginBottom: 14 }}>
          {contacts.length
            ? `${contacts.length} attempt${contacts.length === 1 ? '' : 's'} recorded.`
            : 'No attempts recorded. Three unanswered calls and one refusal are different facts.'}
        </p>

        {callForm.open && (
          <div style={{ padding: 16, background: 'var(--g100, #f7fafc)', borderRadius: 8, marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div className="fg">
                <label className="flabel">How</label>
                <select className="fi" value={callForm.method} onChange={e => setCallForm(p => ({ ...p, method: e.target.value }))}>
                  {CONTACT_METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="flabel">What happened</label>
                <select className="fi" value={callForm.outcome} onChange={e => setCallForm(p => ({ ...p, outcome: e.target.value }))}>
                  {CONTACT_OUTCOMES.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="fg" style={{ marginBottom: 12 }}>
              <label className="flabel">Notes</label>
              <textarea className="fi" rows={2} value={callForm.notes}
                onChange={e => setCallForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="What they said." />
            </div>
            <button className="btn btn--primary btn--sm" onClick={saveCall} disabled={callForm.saving}>
              {callForm.saving ? 'Saving…' : 'Save call'}
            </button>
          </div>
        )}

        {contacts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {contacts.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10, fontSize: '.82rem', borderBottom: '1px solid var(--g100, #eee)', paddingBottom: 9 }}>
                <span style={{ color: 'var(--g500)', minWidth: 96, flexShrink: 0 }}>
                  {new Date(c.occurred_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                </span>
                <span>
                  <strong>{CONTACT_OUTCOMES.find(o => o.key === c.outcome)?.label || c.outcome}</strong>
                  {' '}by {CONTACT_METHODS.find(m => m.key === c.method)?.label.toLowerCase() || c.method}
                  {c.contacted_by_name ? `, ${c.contacted_by_name}` : ''}
                  {c.notes && <span style={{ color: 'var(--g500)', display: 'block', marginTop: 2 }}>{c.notes}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision trail */}
      <div className="card" style={{ padding: '20px 22px' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 6, color: 'var(--charcoal)' }}>
          Decision trail
        </h2>
        <p style={{ fontSize: '.78rem', color: 'var(--g500)', marginBottom: 14 }}>
          Every move, the reason given, and who made it.
        </p>
        {events.length === 0 ? (
          <p style={{ fontSize: '.82rem', color: 'var(--g500)' }}>Nothing recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {events.map((e, i) => (
              <div key={e.id || i} style={{ display: 'flex', gap: 10, fontSize: '.82rem', borderBottom: '1px solid var(--g100, #eee)', paddingBottom: 10 }}>
                <span style={{ color: 'var(--g500)', minWidth: 96, flexShrink: 0 }}>
                  {new Date(e.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                </span>
                <span>
                  <strong>{e.reason}</strong>
                  {e.from_stage !== e.to_stage && (
                    <span style={{ color: 'var(--g500)' }}> · {stageLabel(e.from_stage)} → {stageLabel(e.to_stage)}</span>
                  )}
                  {e.from_disposition !== e.to_disposition && (
                    <span style={{ color: 'var(--g500)' }}> · {dispositionLabel(e.from_disposition)} → {dispositionLabel(e.to_disposition)}</span>
                  )}
                  {e.from_funding_route !== e.to_funding_route && (
                    <span style={{ color: 'var(--g500)' }}> · funding: {fundingLabel(e.to_funding_route)}</span>
                  )}
                  {e.note && <span style={{ color: 'var(--g500)', display: 'block', marginTop: 2 }}>{e.note}</span>}
                  {e.actor_name && <span style={{ color: 'var(--g500)', display: 'block', marginTop: 2 }}>{e.actor_name}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deposit Email Modal */}
      {depositModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(20,28,40,.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, zIndex: 1000,
          }}
          onClick={() => !depositForm.sending && setDepositModal(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 880, maxHeight: '92vh', overflow: 'auto', padding: 0, background: 'white' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--g100, #eee)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', color: 'var(--charcoal)', margin: 0 }}>
                  Send Refundable Deposit Request
                </h2>
                <p style={{ fontSize: '.8rem', color: 'var(--g500)', margin: '4px 0 0 0' }}>
                  Application {app.id} &middot; Pathway {app.pathway} &middot; Deposit {fmt(DEPOSIT_AMOUNT_NAIRA)}
                </p>
              </div>
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => setDepositModal(false)}
                disabled={depositForm.sending}
              >
                Close
              </button>
            </div>

            <div style={{ padding: '18px 24px', display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(0, 1.6fr)', gap: 18 }}>
              {/* Edit panel */}
              <div>
                <div className="fg">
                  <label className="flabel">Recipient name</label>
                  <input className="fi" value={depositForm.toName}
                    onChange={e => setDepositForm(p => ({ ...p, toName: e.target.value }))}
                    placeholder="Applicant name" />
                </div>
                <div className="fg">
                  <label className="flabel">Recipient email *</label>
                  <input className="fi" type="email" value={depositForm.toEmail}
                    onChange={e => setDepositForm(p => ({ ...p, toEmail: e.target.value }))}
                    placeholder="applicant@example.com" />
                </div>
                <div className="fg">
                  <label className="flabel">Payment link (optional)</label>
                  <input className="fi" value={depositForm.paymentLink}
                    onChange={e => setDepositForm(p => ({ ...p, paymentLink: e.target.value }))}
                    placeholder="https://paystack.com/pay/…" />
                  <span style={{ fontSize: '.7rem', color: 'var(--g500)', display: 'block', marginTop: 4 }}>
                    Leave blank if you prefer to follow up by phone with bank-transfer details.
                  </span>
                </div>
                <div className="fg">
                  <label className="flabel">Sender name</label>
                  <input className="fi" value={depositForm.reviewerName}
                    onChange={e => setDepositForm(p => ({ ...p, reviewerName: e.target.value }))} />
                </div>
                <div className="fg">
                  <label className="flabel">Sender title</label>
                  <input className="fi" value={depositForm.reviewerTitle}
                    onChange={e => setDepositForm(p => ({ ...p, reviewerTitle: e.target.value }))} />
                </div>

                <div style={{
                  background: '#FEF7E6', border: '1px solid #F0D77A', borderRadius: 8,
                  padding: '10px 14px', fontSize: '.78rem', color: '#7A5A15', lineHeight: 1.6,
                }}>
                  This template states clearly that the deposit is refundable, that admission is conditional on assessment results, and that assessment costs are billed only with written client consent after selection.
                </div>
              </div>

              {/* Preview */}
              <div>
                <div style={{ fontSize: '.74rem', textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--g500)', marginBottom: 6, fontWeight: 700 }}>
                  Subject
                </div>
                <div style={{ background: 'var(--off, #f7f7f5)', border: '1px solid var(--g100, #eee)', borderRadius: 6, padding: '8px 12px', fontSize: '.85rem', marginBottom: 12 }}>
                  {depositPreview.subject}
                </div>
                <div style={{ fontSize: '.74rem', textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--g500)', marginBottom: 6, fontWeight: 700 }}>
                  Preview
                </div>
                <div style={{ border: '1px solid var(--g100, #eee)', borderRadius: 6, overflow: 'hidden', maxHeight: 480 }}>
                  <iframe
                    title="Deposit email preview"
                    srcDoc={depositPreview.html}
                    style={{ width: '100%', height: 480, border: 'none', display: 'block' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--g100, #eee)', display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
              {depositForm.error && (
                <span style={{ color: '#E53E3E', fontSize: '.8rem', marginRight: 'auto' }}>
                  {depositForm.error}
                </span>
              )}
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => setDepositModal(false)}
                disabled={depositForm.sending}
              >
                Cancel
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={sendDepositEmail}
                disabled={depositForm.sending || !depositForm.toEmail.includes('@')}
              >
                {depositForm.sending ? 'Sending…' : `Send to ${depositForm.toEmail || 'applicant'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
