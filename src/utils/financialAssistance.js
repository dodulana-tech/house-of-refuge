import { supabase } from './supabase'

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

export async function submitFinancialAssistance(payload) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('financial_assistance_applications')
    .insert(payload)
    .select()
    .single()
  return { data, error }
}

export async function getFAByReference(referenceCode) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('financial_assistance_applications')
    .select('*')
    .eq('reference_code', referenceCode)
    .maybeSingle()
  return { data, error }
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

export async function updateFAStatus(id, { status, decision_notes, internal_notes, decision_by }) {
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
  return { data, error }
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
  return { data, error }
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
