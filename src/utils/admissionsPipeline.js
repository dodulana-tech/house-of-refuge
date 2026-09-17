/*
  The admissions review model.

  One `status` column used to carry three independent questions at once: how
  far a file had got, who owed the next action, and how it would be paid for.
  An applicant who was willing, clinically suitable and could not afford the
  deposit had nowhere to sit, so the file stalled with nothing recorded.

  Four independent axes replace it, each mutually exclusive and collectively
  exhaustive over its own question:

    stage           where the file is          (8 ordered values)
    disposition     who owes the next action   (4 values)
    gates           the four review questions  (one column each)
    closure_reason  how the file ended         (10 values, only when closed)

  Every answer below writes all four deterministically, so no review can end
  with a file in an undefined state. Mirrors the CHECK constraints in
  supabase/migrations/20260917_admissions_pipeline_mece.sql. Keep them in step.
*/

// ── Axis 1: stage ───────────────────────────────────────────
export const STAGES = [
  { key: 'submitted',           label: 'Submitted',           hint: 'Arrived. Nobody has called yet.' },
  { key: 'screening-call',      label: 'Screening Call',      hint: 'The Programme Director works the four gates.' },
  { key: 'clinical-assessment', label: 'Clinical Assessment', hint: 'Psychiatrist.' },
  { key: 'pastoral-interview',  label: 'Pastoral Interview',  hint: 'Patient and family, after the psychiatrist.' },
  { key: 'admission-decision',  label: 'Admission Decision',  hint: 'MDT decides.' },
  { key: 'documentation',       label: 'Documentation',       hint: 'Consents signed, funding settled.' },
  { key: 'intake',              label: 'Intake',              hint: 'Date set, arrival planned.' },
  { key: 'admitted',            label: 'Admitted',            hint: 'Became a resident.' },
]

export const STAGE_KEYS = STAGES.map(s => s.key)
export const stageIndex = key => STAGE_KEYS.indexOf(key)
export const stageLabel = key => STAGES.find(s => s.key === key)?.label || key

// ── Axis 2: disposition ─────────────────────────────────────
export const DISPOSITIONS = [
  { key: 'active-us',     label: 'With us',       color: '#1A5FAD', hint: 'The next action is ours.' },
  { key: 'active-family', label: 'With family',   color: '#C08A30', hint: 'The next action is theirs.' },
  { key: 'parked',        label: 'Parked',        color: '#8E5F00', hint: 'On hold, with a review date.' },
  { key: 'closed',        label: 'Closed',        color: '#7A8090', hint: 'No further action.' },
]

export const dispositionLabel = key => DISPOSITIONS.find(d => d.key === key)?.label || key
export const dispositionColor = key => DISPOSITIONS.find(d => d.key === key)?.color || 'var(--g500)'

// ── Axis 3: funding route (gate D, and a standing property) ─
export const FUNDING_ROUTES = [
  { key: 'undetermined',         label: 'Not yet asked',       color: '#7A8090' },
  { key: 'self-funded',          label: 'Self-funded',         color: '#1A7A4A' },
  { key: 'assistance-requested', label: 'Assistance requested', color: '#C08A30' },
  { key: 'assistance-approved',  label: 'Assistance approved',  color: '#1A7A4A' },
  { key: 'assistance-declined',  label: 'Assistance declined',  color: '#8B2A2A' },
  { key: 'third-party',          label: 'Third-party sponsor',  color: '#1A5FAD' },
]

export const fundingLabel = key => FUNDING_ROUTES.find(f => f.key === key)?.label || key
export const fundingColor = key => FUNDING_ROUTES.find(f => f.key === key)?.color || 'var(--g500)'

// ── Axis 4: closure reason ──────────────────────────────────
/*
  Exhaustive by construction, and mutually exclusive on crisp tests:
  'unreachable' means never reached at all; 'withdrawn' means reached at least
  once and then stopped; 'unfunded' means willing and clinically suitable with
  every funding route exhausted. 'other' carries a required note, which is what
  keeps the set honest rather than forcing real cases into a near-enough bucket.
*/
export const CLOSURE_REASONS = [
  { key: 'admitted',          label: 'Admitted',              outcome: 'success', color: '#1A7A4A' },
  { key: 'routed-outpatient', label: 'Routed to outpatient',  outcome: 'success', color: '#1A7A4A' },
  { key: 'referred-out',      label: 'Referred to another provider', outcome: 'other', color: '#1A5FAD' },
  { key: 'declined-by-hor',   label: 'Declined by House of Refuge',  outcome: 'declined', color: '#8B2A2A' },
  { key: 'not-willing',       label: 'Failed the willingness gateway', outcome: 'declined', color: '#8B2A2A' },
  { key: 'unfunded',          label: 'No funding route succeeded',   outcome: 'lost', color: '#8E5F00' },
  { key: 'withdrawn',         label: 'Withdrew',              outcome: 'lost', color: '#7A8090' },
  { key: 'unreachable',       label: 'Unreachable',           outcome: 'lost', color: '#7A8090' },
  { key: 'duplicate',         label: 'Duplicate file',        outcome: 'admin', color: '#7A8090' },
  { key: 'other',             label: 'Other (note required)', outcome: 'other', color: '#7A8090' },
]

export const closureLabel = key => CLOSURE_REASONS.find(c => c.key === key)?.label || key
export const closureColor = key => CLOSURE_REASONS.find(c => c.key === key)?.color || 'var(--g500)'

// ── The four gates ──────────────────────────────────────────
/*
  Asked in order. The review ends the moment one fails, which is why funding
  sits last: there is no point discussing money with someone who is not willing
  or not clinically suitable. `needs` names a field the answer cannot be saved
  without, so a file can never be parked with no review date or closed under
  'other' with no explanation.
*/
export const GATES = [
  {
    key: 'contact',
    label: 'A. Contact',
    question: 'Did we reach them?',
    answers: [
      { key: 'reached',    label: 'Reached',          hint: 'Move on to willingness.' },
      { key: 'no-answer',  label: 'No answer',        hint: 'Logs an attempt. Try again.' },
      { key: 'unreachable', label: 'Unreachable',     hint: 'Attempts exhausted. Closes the file.' },
    ],
  },
  {
    key: 'willingness',
    label: 'B. Willingness',
    question: 'Are they here voluntarily?',
    answers: [
      { key: 'voluntary',  label: 'Voluntary',        hint: 'Move on to clinical fit.' },
      { key: 'ambivalent', label: 'Ambivalent',       hint: 'Parks for motivational follow-up.', needs: ['parked_until'] },
      { key: 'coerced',    label: 'Coerced',          hint: 'Fails the gateway. Closes the file.' },
    ],
  },
  {
    key: 'clinical-fit',
    label: 'C. Clinical fit',
    question: 'Is residential treatment the right level of care?',
    answers: [
      { key: 'residential',  label: 'Residential',    hint: 'Move on to funding.' },
      { key: 'outpatient',   label: 'Outpatient',     hint: 'Routes to the outpatient pathway.' },
      { key: 'out-of-scope', label: 'Out of scope',   hint: 'Exclusion criteria. Refers out.' },
    ],
  },
  {
    key: 'funding',
    label: 'D. Funding',
    question: 'How will this be paid for?',
    answers: [
      { key: 'self-funded',      label: 'Family can fund',     hint: 'Send the deposit request. The assessment follows the payment.' },
      { key: 'needs-assistance', label: 'Needs assistance',    hint: 'Opens a Freedom Foundation case. The assessment waits on its decision.' },
      { key: 'third-party',      label: 'Third-party sponsor', hint: 'The sponsor confirms by paying the deposit.' },
      { key: 'undecided',        label: 'Undecided',           hint: 'Parks until the family comes back.', needs: ['parked_until'] },
    ],
  },
]

/*
  Funding is confirmed by money, not by intent. The deposit covers the
  assessment itself, so an unpaid file cannot be assessed: a family who says
  they will pay, a sponsor who has promised, and an assistance case still with
  the committee are all unconfirmed. Approved assistance is the exception,
  because the Foundation carries the cost directly.
*/
export function isFundingConfirmed(app) {
  return !!app.deposit_paid || app.funding_route === 'assistance-approved'
}

export const gateFor = key => GATES.find(g => g.key === key)
const GATE_COLUMN = {
  contact: 'gate_contact',
  willingness: 'gate_willingness',
  'clinical-fit': 'gate_clinical_fit',
  funding: 'funding_route',
}

/*
  Which gate is outstanding. Drives what the review panel offers next, so the
  Programme Director is never presented with the funding question for a file
  that has not cleared willingness.
*/
export function nextGate(app) {
  if (app.disposition === 'closed') return null
  if (app.gate_contact !== 'reached') return 'contact'
  if (!app.gate_willingness || app.gate_willingness === 'ambivalent') return 'willingness'
  if (app.gate_willingness !== 'voluntary') return null
  if (!app.gate_clinical_fit) return 'clinical-fit'
  if (app.gate_clinical_fit !== 'residential') return null
  if (!app.funding_route || app.funding_route === 'undetermined') return 'funding'
  return null
}

/*
  The whole transition table. Returns the column patch to write, the audit row
  to record, and whether the answer opens a Freedom Foundation case. Pure: it
  reads the current row and the answer, and touches nothing else.
*/
export function resolveGate(app, gateKey, answerKey, extra = {}) {
  const gate = gateFor(gateKey)
  const answer = gate?.answers.find(a => a.key === answerKey)
  if (!gate || !answer) return { error: `Unknown answer ${gateKey}/${answerKey}` }

  for (const field of answer.needs || []) {
    if (!extra[field]) return { error: `${field.replace(/_/g, ' ')} is required for "${answer.label}".` }
  }

  const patch = {}
  let opensFACase = false

  // Reaching someone is what starts the screening call.
  if (gateKey === 'contact' && answerKey === 'reached') {
    patch.gate_contact = 'reached'
    patch.disposition = 'active-us'
    if (app.stage === 'submitted') patch.stage = 'screening-call'
  } else if (gateKey === 'contact' && answerKey === 'no-answer') {
    patch.gate_contact = 'no-answer'
    patch.disposition = 'active-us'
    if (app.stage === 'submitted') patch.stage = 'screening-call'
  } else if (gateKey === 'contact' && answerKey === 'unreachable') {
    patch.gate_contact = 'unreachable'
    patch.disposition = 'closed'
    patch.closure_reason = 'unreachable'
  }

  else if (gateKey === 'willingness' && answerKey === 'voluntary') {
    patch.gate_willingness = 'voluntary'
    patch.disposition = 'active-us'
  } else if (gateKey === 'willingness' && answerKey === 'ambivalent') {
    patch.gate_willingness = 'ambivalent'
    patch.disposition = 'parked'
    patch.parked_until = extra.parked_until
  } else if (gateKey === 'willingness' && answerKey === 'coerced') {
    patch.gate_willingness = 'coerced'
    patch.disposition = 'closed'
    patch.closure_reason = 'not-willing'
  }

  else if (gateKey === 'clinical-fit' && answerKey === 'residential') {
    patch.gate_clinical_fit = 'residential'
    patch.disposition = 'active-us'
  } else if (gateKey === 'clinical-fit' && answerKey === 'outpatient') {
    patch.gate_clinical_fit = 'outpatient'
    patch.disposition = 'closed'
    patch.closure_reason = 'routed-outpatient'
  } else if (gateKey === 'clinical-fit' && answerKey === 'out-of-scope') {
    patch.gate_clinical_fit = 'out-of-scope'
    patch.disposition = 'closed'
    patch.closure_reason = 'referred-out'
  }

  /*
    Funding gates the clinical track. The deposit pays for the assessment, so
    answering this question settles who is expected to pay and hands the file
    to them; it never advances the stage. The file moves to the psychiatrist
    once the money is actually confirmed, which is what advanceStage checks.

    What the split still buys is that a family who cannot pay is now a file
    with an assistance case open and an owner, rather than a file that stops
    with nothing written down.
  */
  else if (gateKey === 'funding') {
    if (answerKey === 'self-funded') {
      patch.funding_route = 'self-funded'
      patch.disposition = 'active-family'   // they owe us the deposit
    } else if (answerKey === 'needs-assistance') {
      patch.funding_route = 'assistance-requested'
      patch.disposition = 'active-us'       // we owe them the assistance case
      // Only if there is not already a case, so a reopened file cannot spawn a second.
      opensFACase = !app.fa_application_id
    } else if (answerKey === 'third-party') {
      patch.funding_route = 'third-party'
      patch.disposition = 'active-family'   // the sponsor owes us the deposit
    } else if (answerKey === 'undecided') {
      patch.funding_route = 'undetermined'
      patch.disposition = 'parked'
      patch.parked_until = extra.parked_until
    }
  }

  // Clearing a park means clearing its review date.
  if (patch.disposition && patch.disposition !== 'parked') patch.parked_until = null

  const event = {
    gate: gateKey,
    answer: answerKey,
    from_stage: app.stage,
    to_stage: patch.stage || app.stage,
    from_disposition: app.disposition,
    to_disposition: patch.disposition || app.disposition,
    from_funding_route: app.funding_route,
    to_funding_route: patch.funding_route || app.funding_route,
    reason: `${gate.label}: ${answer.label}`,
    note: extra.note || null,
  }

  return { patch, event, opensFACase, column: GATE_COLUMN[gateKey] }
}

// ── Transitions outside the gates ───────────────────────────
export function advanceStage(app, reason, note) {
  const i = stageIndex(app.stage)
  if (i < 0 || i >= STAGE_KEYS.length - 1) return { error: 'Already at the final stage.' }
  const to = STAGE_KEYS[i + 1]
  /*
    The one hard gate on the clinical track. Assessment capacity is not spent
    on an unfunded file: the deposit is what pays for the assessment, and
    approved assistance is the Foundation paying it instead.
  */
  if (to === 'clinical-assessment' && !isFundingConfirmed(app)) {
    return {
      error: app.funding_route === 'assistance-requested'
        ? 'The assistance case has not been decided yet. The assessment cannot be booked until it is approved.'
        : app.funding_route === 'undetermined'
          ? 'Funding has not been settled. Answer the funding question before booking the assessment.'
          : 'The deposit has not been paid. The assessment cannot be booked until it is.',
    }
  }
  const patch = { stage: to, disposition: 'active-us', parked_until: null }
  // Reaching the last stage ends the admissions file: they are a resident now.
  if (to === 'admitted') {
    patch.disposition = 'closed'
    patch.closure_reason = 'admitted'
  }
  return {
    patch,
    event: {
      gate: null, answer: null,
      from_stage: app.stage, to_stage: to,
      from_disposition: app.disposition, to_disposition: patch.disposition,
      from_funding_route: app.funding_route, to_funding_route: app.funding_route,
      reason: reason || `Advanced to ${stageLabel(to)}`,
      note: note || null,
    },
  }
}

export function parkApplication(app, parkedUntil, reason, note) {
  if (!parkedUntil) return { error: 'A review date is required to park a file.' }
  if (!reason) return { error: 'A reason is required.' }
  return {
    patch: { disposition: 'parked', parked_until: parkedUntil, closure_reason: null },
    event: {
      gate: null, answer: null,
      from_stage: app.stage, to_stage: app.stage,
      from_disposition: app.disposition, to_disposition: 'parked',
      from_funding_route: app.funding_route, to_funding_route: app.funding_route,
      reason, note: note || null,
    },
  }
}

export function closeApplication(app, closureReason, reason, note) {
  if (!closureReason) return { error: 'A closure reason is required.' }
  if (closureReason === 'other' && !(note || '').trim()) {
    return { error: 'Closing under "Other" requires a note.' }
  }
  return {
    patch: {
      disposition: 'closed',
      closure_reason: closureReason,
      closure_note: note || null,
      parked_until: null,
    },
    event: {
      gate: null, answer: null,
      from_stage: app.stage, to_stage: app.stage,
      from_disposition: app.disposition, to_disposition: 'closed',
      from_funding_route: app.funding_route, to_funding_route: app.funding_route,
      reason: reason || closureLabel(closureReason),
      note: note || null,
    },
  }
}

export function reopenApplication(app, reason) {
  return {
    patch: { disposition: 'active-us', closure_reason: null, closure_note: null, parked_until: null },
    event: {
      gate: null, answer: null,
      from_stage: app.stage, to_stage: app.stage,
      from_disposition: app.disposition, to_disposition: 'active-us',
      from_funding_route: app.funding_route, to_funding_route: app.funding_route,
      reason: reason || 'Reopened', note: null,
    },
  }
}

// Funding can change at any stage: families find a sponsor, or run out of road.
export function setFundingRoute(app, route, reason, note) {
  const patch = { funding_route: route }
  if (route === 'assistance-approved') patch.disposition = 'active-us'
  if (route === 'self-funded' || route === 'third-party') patch.disposition = 'active-family'
  return {
    patch,
    event: {
      gate: 'funding', answer: route,
      from_stage: app.stage, to_stage: app.stage,
      from_disposition: app.disposition, to_disposition: patch.disposition || app.disposition,
      from_funding_route: app.funding_route, to_funding_route: route,
      reason: reason || `Funding route set to ${fundingLabel(route)}`,
      note: note || null,
    },
    opensFACase: route === 'assistance-requested' && !app.fa_application_id,
  }
}

// ── Worklist helpers ────────────────────────────────────────
export function daysInStage(app) {
  const from = app.stage_entered_at || app.updated_at || app.created_at
  if (!from) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 86400000))
}

// A parked file whose review date has passed is not parked, it is forgotten.
export function isOverdue(app) {
  if (app.disposition === 'parked') {
    return !!app.parked_until && new Date(app.parked_until) <= new Date()
  }
  if (app.disposition === 'closed') return false
  return daysInStage(app) > 7
}

export const CONTACT_METHODS = [
  { key: 'phone', label: 'Phone call' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'in-person', label: 'In person' },
]

export const CONTACT_OUTCOMES = [
  { key: 'reached', label: 'Spoke with them' },
  { key: 'no-answer', label: 'No answer' },
  { key: 'left-message', label: 'Left a message' },
  { key: 'call-back-requested', label: 'Asked us to call back' },
  { key: 'wrong-number', label: 'Wrong number' },
]

// Label for whatever answer a gate currently holds. Gate D's answers are
// funding routes, which have their own vocabulary.
export function gateAnswerLabel(gateKey, value) {
  if (!value) return null
  if (gateKey === 'funding') return value === 'undetermined' ? null : fundingLabel(value)
  const answer = gateFor(gateKey)?.answers.find(a => a.key === value)
  return answer?.label || value
}

// The current answer to each gate, in order. Drives the review summary.
export function gateState(app) {
  return [
    { key: 'contact',      label: 'A. Contact',      value: app.gate_contact || null },
    { key: 'willingness',  label: 'B. Willingness',  value: app.gate_willingness || null },
    { key: 'clinical-fit', label: 'C. Clinical fit', value: app.gate_clinical_fit || null },
    { key: 'funding',      label: 'D. Funding',      value: app.funding_route === 'undetermined' ? null : app.funding_route },
  ].map(g => ({ ...g, answerLabel: gateAnswerLabel(g.key, g.value) }))
}

/*
  What this file is actually waiting on, in the words someone would use out
  loud. Covers both the gates and the funding hold that sits behind them, so a
  row in the worklist never reads as blank when it is in fact blocked.
*/
export function nextAction(app) {
  if (app.disposition === 'closed') return null
  const gate = nextGate(app)
  if (gate === 'contact') return 'call them'
  if (gate === 'willingness') return 'confirm willingness'
  if (gate === 'clinical-fit') return 'decide level of care'
  if (gate === 'funding') return 'settle funding'
  if (app.gate_willingness !== 'voluntary' || app.gate_clinical_fit !== 'residential') return null
  if (stageIndex(app.stage) < stageIndex('clinical-assessment') && !isFundingConfirmed(app)) {
    if (app.funding_route === 'assistance-requested') return 'awaiting the assistance decision'
    if (app.funding_route === 'assistance-declined') return 'find another funding route, or close as unfunded'
    return 'awaiting the deposit'
  }
  if (app.stage === 'admitted') return null
  return `move to ${stageLabel(STAGE_KEYS[stageIndex(app.stage) + 1])}`
}
