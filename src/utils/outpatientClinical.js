// Outpatient clinical records — clients and encounters.
//
// Bookings are the commercial record; these are the clinical one. A booking is
// linked to exactly one client (server-side, by outpatient_link_booking_to_client
// so the name/phone matching stays in one place), and each session produces one
// encounter that is signed and then immutable.
//
// Backed by supabase/migrations/20260824_outpatient_clinical_records.sql.

import { supabase } from './supabase'

export const ENCOUNTER_TYPES = [
  { key: 'consultation',   label: 'Consultation' },
  { key: 'therapy',        label: 'Therapy session' },
  { key: 'counselling',    label: 'Counselling session' },
  { key: 'family_therapy', label: 'Family therapy' },
  { key: 'assessment',     label: 'Assessment' },
  { key: 'diagnostic',     label: 'Diagnostic review' },
  { key: 'detox_review',   label: 'Detox review' },
  { key: 'aftercare',      label: 'Aftercare / alumni' },
  { key: 'phone_review',   label: 'Phone review' },
  { key: 'addendum',       label: 'Addendum' },
]

export const ATTENDANCE = [
  { key: 'attended',       label: 'Attended',        color: '#1A7A4A' },
  { key: 'telehealth',     label: 'Telehealth',      color: '#1A5FAD' },
  { key: 'did_not_attend', label: 'Did not attend',  color: '#8B2A2A' },
  { key: 'cancelled',      label: 'Cancelled',       color: '#7A8090' },
]

// Ordered least to most severe; index is used for comparisons.
export const RISK_FLAGS = [
  { key: 'none',      label: 'No concern',        color: '#7A8090' },
  { key: 'low',       label: 'Low',               color: '#1A7A4A' },
  { key: 'moderate',  label: 'Moderate',          color: '#C08A30' },
  { key: 'high',      label: 'High',              color: '#8B2A2A' },
  { key: 'immediate', label: 'Immediate danger',  color: '#5C0E0E' },
]

// Raising risk to moderate or above opens a safeguarding concern on signature.
export const ESCALATING_RISK = ['moderate', 'high', 'immediate']

export const RISK_STATUSES = [
  { key: 'none',      label: 'Not applicable', color: '#7A8090' },
  { key: 'open',      label: 'Open',           color: '#C08A30' },
  { key: 'escalated', label: 'Escalated to DSL', color: '#8B2A2A' },
  { key: 'resolved',  label: 'Resolved',       color: '#1A7A4A' },
]

export const FOLLOW_UP_STATUSES = [
  { key: 'none',             label: 'None',              color: '#7A8090' },
  { key: 'pending',          label: 'Due',               color: '#C08A30' },
  { key: 'booked',           label: 'Booked',            color: '#1A5FAD' },
  { key: 'completed',        label: 'Completed',         color: '#1A7A4A' },
  { key: 'declined',         label: 'Declined',          color: '#7A8090' },
  { key: 'lost_to_follow_up',label: 'Lost to follow-up', color: '#8B2A2A' },
]

export const CLIENT_STATUSES = [
  { key: 'active',                 label: 'Active',              color: '#1A7A4A' },
  { key: 'inactive',               label: 'Inactive',            color: '#7A8090' },
  { key: 'discharged',             label: 'Discharged',          color: '#1A5FAD' },
  { key: 'converted_to_inpatient', label: 'Admitted (inpatient)', color: '#C08A30' },
]

export const labelOf = (list, key) => list.find(x => x.key === key)?.label || key || '—'
export const colorOf = (list, key) => list.find(x => x.key === key)?.color || '#7A8090'

const notReady = { data: null, error: { message: 'Supabase not configured' } }

// The encounter columns a clinician writes. A signed row rejects changes to any
// of these at the database, so the UI never sends them for a signed note.
const CLINICAL_FIELDS = [
  'encounter_date', 'duration_minutes', 'encounter_type', 'attendance',
  'presenting_complaint', 'subjective', 'objective', 'assessment', 'plan',
  'diagnosis', 'medications', 'risk_flag', 'risk_notes',
  'follow_up_required', 'follow_up_at', 'follow_up_notes',
  'practitioner_id', 'service_id', 'booking_id', 'amends_encounter_id',
]

function pick(obj, keys) {
  const out = {}
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k]
  return out
}

export function initialsFrom(name) {
  if (!name) return '—'
  const parts = String(name).trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '—'
}

// ── Clients ───────────────────────────────────────────────
export async function listClients({ search, statuses } = {}) {
  if (!supabase) return notReady
  let q = supabase
    .from('outpatient_clients')
    .select('*')
    .order('last_seen_at', { ascending: false, nullsFirst: false })
  if (statuses?.length) q = q.in('status', statuses)
  if (search?.trim()) {
    const s = `%${search.trim()}%`
    q = q.or(`full_name.ilike.${s},client_code.ilike.${s},phone.ilike.${s},email.ilike.${s}`)
  }
  const { data, error } = await q
  return { data, error }
}

export async function getClientById(id) {
  if (!supabase) return notReady
  const { data, error } = await supabase
    .from('outpatient_clients')
    .select('*, patients(id, full_name, status)')
    .eq('id', id)
    .maybeSingle()
  return { data, error }
}

export async function updateClient(id, patch) {
  if (!supabase) return notReady
  const { data, error } = await supabase
    .from('outpatient_clients').update(patch).eq('id', id).select().single()
  return { data, error }
}

export async function createClient(row) {
  if (!supabase) return notReady
  const { data, error } = await supabase
    .from('outpatient_clients').insert(row).select().single()
  return { data, error }
}

// Every booking this client has ever made, newest first.
export async function getClientBookings(clientId) {
  if (!supabase) return notReady
  const { data, error } = await supabase
    .from('outpatient_bookings')
    .select('*, outpatient_services(name, category), outpatient_practitioners(full_name)')
    .eq('client_id', clientId)
    .order('scheduled_at', { ascending: false })
  return { data, error }
}

/*
  Resolves the client for a booking, creating one only if name+phone and
  name+email both miss. Runs server-side (SECURITY DEFINER) because matching has
  to scan clients the caller may not have loaded, and because doing it in the
  browser would race two staff checking in the same family.
*/
export async function linkBookingToClient(bookingId) {
  if (!supabase) return notReady
  const { data, error } = await supabase
    .rpc('outpatient_link_booking_to_client', { p_booking_id: bookingId })
  return { data, error }
}

// ── Encounters ────────────────────────────────────────────
const ENCOUNTER_SELECT =
  '*, outpatient_clients(id, client_code, full_name, phone), ' +
  'outpatient_services(name, category), outpatient_practitioners(full_name, title)'

export async function getEncountersByClient(clientId) {
  if (!supabase) return notReady
  const { data, error } = await supabase
    .from('outpatient_encounters')
    .select(ENCOUNTER_SELECT)
    .eq('client_id', clientId)
    .order('encounter_date', { ascending: false })
  return { data, error }
}

export async function getEncountersByBooking(bookingId) {
  if (!supabase) return notReady
  const { data, error } = await supabase
    .from('outpatient_encounters')
    .select(ENCOUNTER_SELECT)
    .eq('booking_id', bookingId)
    .order('encounter_date', { ascending: false })
  return { data, error }
}

export async function createEncounter(row) {
  if (!supabase) return notReady
  const { data, error } = await supabase
    .from('outpatient_encounters')
    .insert(pick(row, [...CLINICAL_FIELDS, 'client_id', 'author_id', 'author_code']))
    .select(ENCOUNTER_SELECT)
    .single()
  return { data, error }
}

// Drafts only. A signed row rejects these columns, which is the point.
export async function updateEncounterDraft(id, patch) {
  if (!supabase) return notReady
  const { data, error } = await supabase
    .from('outpatient_encounters')
    .update(pick(patch, CLINICAL_FIELDS))
    .eq('id', id)
    .select(ENCOUNTER_SELECT)
    .single()
  return { data, error }
}

/*
  Signing is the point of no return: the note locks, the booking is marked
  completed (or no-show, following attendance), a moderate-or-above risk flag
  opens a safeguarding concern, and a follow-up date arms the recall list. All
  of that happens in trg_encounter_signed, so this only has to stamp the
  signature.
*/
export async function signEncounter(id, { signedBy, signedByName }) {
  if (!supabase) return notReady
  const { data, error } = await supabase
    .from('outpatient_encounters')
    .update({
      signed_by: signedBy || null,
      signed_by_name: signedByName || null,
      signed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('signed_at', null)
    .select(ENCOUNTER_SELECT)
    .single()
  return { data, error }
}

export async function deleteEncounterDraft(id) {
  if (!supabase) return notReady
  const { error } = await supabase
    .from('outpatient_encounters').delete().eq('id', id).is('signed_at', null)
  return { error }
}

// ── Recall list ───────────────────────────────────────────
/*
  Everything with a follow-up still owed. `within` (days) bounds how far ahead to
  look; overdue rows are always included, since those are the ones that get lost.
*/
export async function listFollowUpsDue({ within = 30 } = {}) {
  if (!supabase) return notReady
  const horizon = new Date()
  horizon.setDate(horizon.getDate() + within)
  const { data, error } = await supabase
    .from('outpatient_encounters')
    .select(ENCOUNTER_SELECT)
    .eq('follow_up_required', true)
    .in('follow_up_status', ['pending', 'booked'])
    .not('signed_at', 'is', null)
    .lte('follow_up_at', horizon.toISOString().slice(0, 10))
    .order('follow_up_at', { ascending: true })
  return { data, error }
}

export async function setFollowUpStatus(id, status, extra = {}) {
  if (!supabase) return notReady
  const { data, error } = await supabase
    .from('outpatient_encounters')
    .update({ follow_up_status: status, ...pick(extra, ['follow_up_notes', 'follow_up_booking_id']) })
    .eq('id', id)
    .select(ENCOUNTER_SELECT)
    .single()
  return { data, error }
}

export function isOverdue(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(new Date().toDateString())
}

// ── Safeguarding ──────────────────────────────────────────
// Open outpatient risk concerns, for the Safeguarding dashboard. These can't go
// through the `incidents` table: incidents.patient_id is NOT NULL and an
// outpatient client has no patients row.
export async function listOpenRiskFlags() {
  if (!supabase) return notReady
  const { data, error } = await supabase
    .from('outpatient_encounters')
    .select(ENCOUNTER_SELECT)
    .in('risk_status', ['open', 'escalated'])
    .not('signed_at', 'is', null)
    .order('encounter_date', { ascending: false })
  return { data, error }
}

export async function setRiskStatus(id, status, { outcome, reviewedBy } = {}) {
  if (!supabase) return notReady
  const patch = { risk_status: status }
  if (outcome !== undefined) patch.risk_outcome = outcome
  if (status !== 'open') {
    patch.risk_reviewed_at = new Date().toISOString()
    if (reviewedBy) patch.risk_reviewed_by = reviewedBy
  }
  const { data, error } = await supabase
    .from('outpatient_encounters').update(patch).eq('id', id).select(ENCOUNTER_SELECT).single()
  return { data, error }
}

/*
  Documentation status for a page of bookings, as bookingId -> {signed, draft}.
  Lets the bookings list show which appointments still have no note without
  pulling every note body down with the list.
*/
export async function getDocumentationStatus(bookingIds) {
  if (!supabase) return notReady
  const ids = (bookingIds || []).filter(Boolean)
  if (!ids.length) return { data: {}, error: null }
  const { data, error } = await supabase
    .from('outpatient_encounters')
    .select('booking_id, signed_at')
    .in('booking_id', ids)
  if (error) return { data: {}, error }
  const map = {}
  for (const row of data || []) {
    const m = (map[row.booking_id] ||= { signed: 0, draft: 0 })
    if (row.signed_at) m.signed++
    else m.draft++
  }
  return { data: map, error: null }
}

// ── Outpatient → inpatient ────────────────────────────────
/*
  An outpatient client who is admitted becomes a `patients` row, but their
  outpatient history must not be orphaned by that: the assessing clinician needs
  to read what was already documented. Linking sets both sides of that lookup.
*/
export async function linkClientToPatient(clientId, patientId) {
  if (!supabase) return notReady
  const { data, error } = await supabase
    .from('outpatient_clients')
    .update({ patient_id: patientId, status: patientId ? 'converted_to_inpatient' : 'active' })
    .eq('id', clientId)
    .select()
    .single()
  return { data, error }
}

// The outpatient record behind an admitted patient, if there is one. Returns
// { client, encounters } so the patient screen can show the history in one read.
export async function getOutpatientHistoryForPatient(patientId) {
  if (!supabase) return { data: null, error: null }
  const { data: client, error } = await supabase
    .from('outpatient_clients')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle()
  if (error || !client) return { data: null, error }
  const { data: encounters } = await supabase
    .from('outpatient_encounters')
    .select(ENCOUNTER_SELECT)
    .eq('client_id', client.id)
    .not('signed_at', 'is', null)
    .order('encounter_date', { ascending: false })
  return { data: { client, encounters: encounters || [] }, error: null }
}
