import { supabase } from './supabase'

export const SERVICE_CATEGORIES = [
  { key: 'clinical',   label: 'Clinical consultations',  color: '#1A5FAD' },
  { key: 'therapy',    label: 'Therapy & counselling',   color: '#4F84C0' },
  { key: 'diagnostic', label: 'Diagnostics & screening', color: '#C08A30' },
  { key: 'package',    label: 'Packages',                color: '#1A7A4A' },
  { key: 'aftercare',  label: 'Aftercare & alumni',      color: '#8E5F00' },
]

export const BOOKING_STATUSES = [
  { key: 'pending_payment', label: 'Pending payment',   color: '#C08A30' },
  { key: 'confirmed',       label: 'Confirmed',         color: '#1A5FAD' },
  { key: 'checked_in',      label: 'Checked in',        color: '#4F84C0' },
  { key: 'completed',       label: 'Completed',         color: '#1A7A4A' },
  { key: 'no_show',         label: 'No-show',           color: '#8B2A2A' },
  { key: 'cancelled',       label: 'Cancelled',         color: '#7A8090' },
  { key: 'rescheduled',     label: 'Rescheduled',       color: '#8E5F00' },
]

export const PAYMENT_STATUSES = [
  { key: 'unpaid',              label: 'Unpaid',            color: '#7A8090' },
  { key: 'paid_online',         label: 'Paid (online)',     color: '#1A7A4A' },
  { key: 'paid_on_arrival',     label: 'Paid (on arrival)', color: '#1A5FAD' },
  { key: 'refunded',            label: 'Refunded',          color: '#8B2A2A' },
  { key: 'partially_refunded',  label: 'Partial refund',    color: '#8E5F00' },
]

export function fmtNaira(n) {
  if (n == null) return 'TBD'
  return 'NGN ' + Number(n).toLocaleString('en-NG')
}

// ── Public reads ──────────────────────────────────────────
export async function listPublicServices() {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('outpatient_services')
    .select('*')
    .eq('active', true)
    .eq('public', true)
    .order('display_order', { ascending: true })
  return { data, error }
}

export async function getServiceBySlug(slug) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('outpatient_services')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()
  return { data, error }
}

export async function listPublicPractitioners() {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('outpatient_practitioners')
    .select('*')
    .eq('active', true)
    .eq('public', true)
    .order('display_order', { ascending: true })
  return { data, error }
}

// ── Bookings ──────────────────────────────────────────────
export async function createBooking(payload) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('outpatient_bookings')
    .insert(payload)
    .select()
    .single()
  return { data, error }
}

export async function getBookingByReference(ref) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('outpatient_bookings')
    .select('*, outpatient_services(name, duration_minutes, price_ngn), outpatient_practitioners(full_name, title)')
    .eq('reference_code', ref)
    .maybeSingle()
  return { data, error }
}

// ── Admin reads ───────────────────────────────────────────
export async function listAllServices() {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('outpatient_services')
    .select('*')
    .order('display_order', { ascending: true })
  return { data, error }
}

export async function listAllPractitioners() {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('outpatient_practitioners')
    .select('*')
    .order('display_order', { ascending: true })
  return { data, error }
}

export async function listBookings({ search, statuses, sort = 'scheduled_at.desc' } = {}) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  let q = supabase
    .from('outpatient_bookings')
    .select('*, outpatient_services(name, category), outpatient_practitioners(full_name)')
  if (statuses && statuses.length) q = q.in('status', statuses)
  if (search && search.trim()) {
    const s = `%${search.trim()}%`
    q = q.or(`reference_code.ilike.${s},patient_name.ilike.${s},booker_name.ilike.${s},booker_email.ilike.${s},patient_phone.ilike.${s}`)
  }
  const [col, dir] = sort.split('.')
  q = q.order(col, { ascending: dir === 'asc' })
  const { data, error } = await q
  return { data, error }
}

export async function getBookingById(id) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('outpatient_bookings')
    .select('*, outpatient_services(*), outpatient_practitioners(*)')
    .eq('id', id)
    .maybeSingle()
  return { data, error }
}

export async function updateBooking(id, patch) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('outpatient_bookings')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function bulkUpdateBookings(ids, patch) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('outpatient_bookings')
    .update(patch)
    .in('id', ids)
    .select()
  return { data, error }
}

// ── Service / practitioner CRUD (admin) ───────────────────
export async function upsertService(row) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { id, ...rest } = row
  if (id) {
    const { data, error } = await supabase
      .from('outpatient_services').update(rest).eq('id', id).select().single()
    return { data, error }
  }
  const { data, error } = await supabase
    .from('outpatient_services').insert(rest).select().single()
  return { data, error }
}

export async function upsertPractitioner(row) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { id, ...rest } = row
  if (id) {
    const { data, error } = await supabase
      .from('outpatient_practitioners').update(rest).eq('id', id).select().single()
    return { data, error }
  }
  const { data, error } = await supabase
    .from('outpatient_practitioners').insert(rest).select().single()
  return { data, error }
}

export function exportBookingsCSV(rows) {
  const cols = [
    'reference_code', 'status', 'payment_status', 'scheduled_at',
    'patient_name', 'patient_age', 'patient_phone', 'patient_email',
    'booker_name', 'booker_phone', 'booker_email', 'booker_relationship',
    'amount_paid_ngn', 'converted_to_inpatient', 'created_at',
  ]
  const esc = v => {
    if (v === null || v === undefined) return ''
    const s = String(v).replace(/"/g, '""')
    return /[",\n]/.test(s) ? `"${s}"` : s
  }
  const lines = [cols.join(',')]
  for (const r of rows) {
    const flat = { ...r,
      service_name: r.outpatient_services?.name,
      practitioner_name: r.outpatient_practitioners?.full_name,
    }
    lines.push(cols.map(c => esc(flat[c])).join(','))
  }
  return lines.join('\n')
}

export function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}
