import { supabase, applyApplicationTransition } from './supabase'

const BUCKET = 'fa-documents'
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

export const FA_STATUSES = [
  { key: 'submitted',         label: 'Submitted',         color: '#1A5FAD' },
  { key: 'under_review',      label: 'Under review',      color: '#C08A30' },
  { key: 'more_info_needed',  label: 'More info needed',  color: '#8E5F00' },
  { key: 'approved',          label: 'Approved',          color: '#1A7A4A' },
  { key: 'declined',          label: 'Declined',          color: '#8B2A2A' },
  { key: 'withdrawn',         label: 'Withdrawn',         color: '#7A8090' },
]

export const PASTORAL_STATUSES = [
  { key: 'pending',       label: 'Pending',       color: '#7A8090' },
  { key: 'scheduled',     label: 'Scheduled',     color: '#1A5FAD' },
  { key: 'completed',     label: 'Completed',     color: '#1A7A4A' },
  { key: 'rescheduling',  label: 'Rescheduling',  color: '#C08A30' },
  { key: 'declined',      label: 'Declined by PT', color: '#8B2A2A' },
  { key: 'not_required',  label: 'Not required',  color: '#7A8090' },
]

export const INCOME_BANDS = [
  { value: 'under_100k',  label: 'Under NGN 100,000 / month' },
  { value: '100k_300k',   label: 'NGN 100,000 – 300,000 / month' },
  { value: '300k_500k',   label: 'NGN 300,000 – 500,000 / month' },
  { value: '500k_1m',     label: 'NGN 500,000 – 1,000,000 / month' },
  { value: '1m_plus',     label: 'Above NGN 1,000,000 / month' },
  { value: 'unemployed',  label: 'Unemployed / no fixed income' },
]

export function validateDocument(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: `Unsupported file type. Allowed: PDF, JPG, PNG.` }
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, error: `File exceeds 10MB. (${(file.size / 1024 / 1024).toFixed(1)}MB)` }
  }
  return { ok: true }
}

export async function uploadFADocument(file, applicantEmail) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const safeEmail = applicantEmail.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const ts = Date.now()
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_')
  const path = `${safeEmail}/${ts}_${safeName}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) return { error }
  return {
    data: {
      name: file.name,
      path: data.path,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
    },
  }
}

export async function getFADocumentUrl(path) {
  if (!supabase) return null
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600)
  if (error) return null
  return data?.signedUrl
}

// Matches the FA-XXXXXX shape the trg_gen_fa_ref trigger produces. The trigger
// only fills the code in when the client sends none, so supplying our own is
// what lets us skip the read-back below and still show the applicant their
// reference.
function newReferenceCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000
  return `FA-${String(n).padStart(6, '0')}`
}

/*
  No .select() read-back, for the same reason as submitApplication: this table
  has anon INSERT but no anon SELECT since the 2026-07-25 hotfix, and asking
  for the row back turns the insert into INSERT ... RETURNING, which RLS
  rejects with 42501 and rolls back. Every financial assistance application
  submitted since that date was lost this way.

  Retries on 23505 in case the generated code collides with an existing one.
*/
export async function submitFinancialAssistance(payload) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  for (let attempt = 0; attempt < 3; attempt++) {
    const reference_code = newReferenceCode()
    const { error } = await supabase
      .from('financial_assistance_applications')
      .insert({ ...payload, reference_code })
    if (!error) return { data: { reference_code }, error: null }
    if (error.code !== '23505') return { error }
  }
  return { error: { message: 'Could not allocate a reference code. Please try again.' } }
}

export async function getFAByReference(referenceCode) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  // Reads via a SECURITY DEFINER function that returns only non-sensitive
  // status columns. The table itself is NOT anon-readable (would expose the
  // applicant's PII, financials, and staff notes). See SECURITY_HOTFIX_2026-07-25.sql.
  const { data, error } = await supabase
    .rpc('fa_status_by_reference', { p_ref: referenceCode })
  const row = Array.isArray(data) ? data[0] : data
  return { data: row || null, error }
}

export async function listFinancialAssistance({ search, statuses, sort = 'submitted_at.desc' } = {}) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  let q = supabase.from('financial_assistance_applications').select('*')
  if (statuses && statuses.length) q = q.in('status', statuses)
  if (search && search.trim()) {
    const s = `%${search.trim()}%`
    q = q.or(
      `reference_code.ilike.${s},applicant_name.ilike.${s},applicant_email.ilike.${s},patient_name.ilike.${s},applicant_phone.ilike.${s}`
    )
  }
  const [col, dir] = sort.split('.')
  q = q.order(col, { ascending: dir === 'asc' })
  const { data, error } = await q
  return { data, error }
}

export async function getFAById(id) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('financial_assistance_applications')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return { data, error }
}

export async function updateFAStatus(id, { status, decision_notes, internal_notes, decision_by }, actor = {}) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const patch = { status }
  if (decision_notes !== undefined) patch.decision_notes = decision_notes
  if (internal_notes !== undefined) patch.internal_notes = internal_notes
  if (['approved', 'declined'].includes(status)) {
    patch.decision_at = new Date().toISOString()
    if (decision_by) patch.decision_by = decision_by
  }
  const { data, error } = await supabase
    .from('financial_assistance_applications')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) return { data, error }

  const { error: syncError } = await syncApplicationFunding(data, actor)
  return { data, error: null, syncError }
}

/*
  A decision here has to reach the admission file. Without this the committee
  approves a sponsored place and the admissions worklist still shows the family
  as "assistance requested" indefinitely, which is the same stall this whole
  model exists to remove. Declining sets 'assistance-declined' rather than
  closing the file: the family may still find a third-party sponsor, and only a
  person should decide that there is no route left.
*/
export async function syncApplicationFunding(faRow, actor = {}) {
  if (!supabase) return { error: null }
  if (!faRow?.application_id) return { error: null }

  const route = faRow.status === 'approved' ? 'assistance-approved'
    : faRow.status === 'declined' ? 'assistance-declined'
    : null
  if (!route) return { error: null }

  const { data: app, error: readError } = await supabase
    .from('applications')
    .select('id, stage, disposition, funding_route')
    .eq('id', faRow.application_id)
    .maybeSingle()
  if (readError || !app) return { error: readError }
  if (app.funding_route === route) return { error: null }

  const { error } = await applyApplicationTransition(app.id, {
    patch: { funding_route: route, disposition: 'active-us' },
    event: {
      gate: 'funding',
      answer: route,
      from_stage: app.stage, to_stage: app.stage,
      from_disposition: app.disposition, to_disposition: 'active-us',
      from_funding_route: app.funding_route, to_funding_route: route,
      reason: `Freedom Foundation ${faRow.status} case ${faRow.reference_code}`,
      note: faRow.decision_notes || null,
    },
  }, actor)
  return { error }
}

export async function updatePastoralInterview(id, { status, scheduled_at, completed_at, notes }) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const patch = {}
  if (status !== undefined) patch.pastoral_interview_status = status
  if (scheduled_at !== undefined) patch.pastoral_interview_scheduled_at = scheduled_at
  if (notes !== undefined) patch.pastoral_interview_notes = notes
  if (status === 'completed') {
    patch.pastoral_interview_completed_at = completed_at || new Date().toISOString()
  } else if (completed_at !== undefined) {
    patch.pastoral_interview_completed_at = completed_at
  }
  const { data, error } = await supabase
    .from('financial_assistance_applications')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function bulkUpdateFAStatus(ids, status, decision_by) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const patch = { status }
  if (['approved', 'declined'].includes(status)) {
    patch.decision_at = new Date().toISOString()
    if (decision_by) patch.decision_by = decision_by
  }
  const { data, error } = await supabase
    .from('financial_assistance_applications')
    .update(patch)
    .in('id', ids)
    .select()
  if (error) return { data, error }

  // Carry each decision through to its admission file, same as the single update.
  for (const row of data || []) await syncApplicationFunding(row, { id: decision_by })
  return { data, error: null }
}

export function exportFinancialAssistanceCSV(rows) {
  const cols = [
    'reference_code', 'status', 'submitted_at', 'updated_at',
    'applicant_name', 'applicant_phone', 'applicant_email', 'applicant_relationship',
    'patient_name', 'patient_age', 'patient_gender', 'patient_substance', 'patient_willingness',
    'household_size', 'monthly_income_band', 'dependants',
    'pastoral_referrer_name', 'pastoral_referrer_org', 'pastoral_referrer_phone',
    'decision_notes', 'decision_at',
  ]
  const esc = v => {
    if (v === null || v === undefined) return ''
    const s = String(v).replace(/"/g, '""')
    return /[",\n]/.test(s) ? `"${s}"` : s
  }
  const lines = [cols.join(',')]
  for (const r of rows) lines.push(cols.map(c => esc(r[c])).join(','))
  return lines.join('\n')
}

export function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Staff-opened assistance cases ───────────────────────────
/*
  The Programme Director learns on the screening call that a family cannot pay.
  Until now the only way into this table was the public form, which the family
  had to find and fill in themselves, and nothing linked a case back to the
  admission it belonged to. So "they say they have no money" was a fact that
  had nowhere to go, and the file stopped.

  This opens the case from the application, prefilled from what the family
  already told us, and links both rows so neither queue loses sight of the
  other. Staff-only: `fa_staff_full` is what permits the insert and read-back.
*/
function ageFromDob(dob) {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const diff = Date.now() - d.getTime()
  const age = Math.floor(diff / (365.25 * 24 * 3600 * 1000))
  return age > 0 && age < 130 ? age : null
}

export async function createFACaseFromApplication(app, actor = {}) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }

  const patientName = [app.first_name, app.last_name].filter(Boolean).join(' ').trim() || 'Unnamed applicant'
  // The family contact who would actually handle the money, falling back to
  // the applicant themselves when no next of kin was given.
  const applicantName = app.pfsp_name || app.nok_name || patientName
  const applicantPhone = app.pfsp_phone || app.nok_phone || app.phone || ''
  const applicantEmail = app.nok_email || app.email || ''

  if (!applicantPhone || !applicantEmail) {
    return { error: { message: 'This application has no contact phone or email to open an assistance case with. Add one first.' } }
  }

  const openedBy = actor.full_name || actor.name || actor.email || 'House of Refuge admissions'

  const payload = {
    // reference_code is left to trg_gen_fa_ref, which retries on collision.
    application_id: app.id,
    applicant_name: applicantName,
    applicant_phone: applicantPhone,
    applicant_email: applicantEmail,
    applicant_relationship: app.pfsp_relationship || app.nok_relationship || null,
    patient_name: patientName,
    patient_age: ageFromDob(app.date_of_birth),
    patient_gender: app.gender || null,
    patient_substance: [app.substance, app.substance_other].filter(Boolean).join(' / ') || null,
    patient_substance_duration: app.duration || null,
    patient_prior_treatment: app.prev_treatment || null,
    patient_willingness: app.willingness_confirm || null,
    financial_situation_narrative:
      `Opened from admission application ${app.id} by ${openedBy} during the screening call. ` +
      `The family reported they are unable to meet the deposit. ` +
      `Financial stability reported on the application: ${app.financial_stability || 'not recorded'}.`,
    internal_notes: `Staff-opened case. Source: admissions screening call. Opened by ${openedBy}.`,
    status: 'submitted',
  }

  const { data, error } = await supabase
    .from('financial_assistance_applications')
    .insert(payload)
    .select()
    .single()
  if (error) return { error }

  // Link the admission back to the case. A failure here leaves an orphaned
  // case rather than losing it, so report it instead of rolling back.
  const { error: linkError } = await supabase
    .from('applications')
    .update({ fa_application_id: data.id })
    .eq('id', app.id)

  return { data, error: null, linkError }
}

export async function getFAByApplicationId(applicationId) {
  if (!supabase) return { data: null, error: null }
  const { data, error } = await supabase
    .from('financial_assistance_applications')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle()
  return { data, error }
}
