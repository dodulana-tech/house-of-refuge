import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Graceful fallback if Supabase isn't configured yet
const isConfigured = supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project')

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isSupabaseReady = () => !!supabase

// ── Auth helpers ──────────────────────────────────────────
export async function signUp({ email, password, metadata }) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  })
  return { data, error }
}

export async function signIn({ email, password }) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

/*
  Password recovery. Supabase emails a link back to /reset-password carrying a
  recovery token; opening it puts the browser into a temporary recovery session,
  which is what lets updatePassword() succeed without the old password.
*/
export async function sendPasswordReset(email) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  return { error }
}

export async function updatePassword(password) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { error } = await supabase.auth.updateUser({ password })
  return { error }
}

/*
  Verifies the current password by signing in with it on a throwaway client, so
  the check cannot disturb the session of the person already signed in. Used to
  gate the change-password form.
*/
export async function verifyPassword(email, password) {
  if (!supabase) return false
  const probe = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: 'hor-probe' },
  })
  const { error } = await probe.auth.signInWithPassword({ email, password })
  await probe.auth.signOut()
  return !error
}

// ── Account administration ────────────────────────────────
// Listing relies on the existing "Staff can read all profiles" policy; role
// changes go through SECURITY DEFINER functions that re-check the caller is an
// admin server-side, so the anon key alone grants nothing.

export const getProfiles = () => listBy('profiles', null, null, 'created_at', false)

export async function adminSetRole(targetId, newRole) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase.rpc('admin_set_role', {
    target_id: targetId, new_role: newRole,
  })
  return { data, error }
}

export async function adminUpdateProfile(targetId, { name, phone, department, title }) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { error } = await supabase.rpc('admin_update_profile', {
    target_id: targetId,
    new_name: name ?? '',
    new_phone: phone ?? null,
    new_department: department ?? null,
    new_title: title ?? null,
  })
  return { error }
}

/*
  Creates a staff account without disturbing the admin's own session.

  signUp() would sign the browser in as the account just created, so it runs on
  an isolated client with its own storage. The new account is created with a
  throwaway password that nobody is told; the person sets their own via the
  emailed reset link. handle_new_user() forces the profile to 'patient', so the
  role is applied afterwards through admin_set_role.
*/
// Staff can read all profiles, so an admin can check whether a directory entry
// has a login before deciding to invite or simply resend.
export async function getProfileByEmail(email) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .ilike('email', (email || '').trim())
    .maybeSingle()
  return { data, error }
}

/*
  Invite a staff directory entry to the platform, or resend their set-password
  link if they already have an account.

  The staff table is a directory only: it has an email column but no link to
  auth.users, so adding someone to Staff Directory never created a login and
  never sent them anything. This closes that gap.

  Returns { action: 'invited' | 'resent' } so the caller can say which happened.
*/
export async function inviteOrResendStaff({ email, fullName, phone, role = 'staff', department, title }) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const addr = (email || '').trim()
  if (!addr.includes('@')) return { error: { message: 'This staff member has no valid email address on file.' } }

  const { data: existing, error: lookupErr } = await getProfileByEmail(addr)
  if (lookupErr) return { error: lookupErr }

  if (existing) {
    const { error } = await sendPasswordReset(addr)
    return error ? { error } : { action: 'resent', id: existing.id, role: existing.role }
  }

  const res = await adminCreateStaffAccount({ email: addr, fullName, phone, role, department, title })
  if (res.error) return res
  return { action: 'invited', id: res.data?.id, inviteError: res.inviteError }
}

export async function adminCreateStaffAccount({ email, fullName, phone, role, department, title }) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }

  const isolated = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: 'hor-provision' },
  })

  const throwaway = crypto.randomUUID() + 'Aa1!'
  const { data, error } = await isolated.auth.signUp({
    email,
    password: throwaway,
    options: { data: { full_name: fullName, phone: phone || '' } },
  })
  if (error) return { error }

  const newId = data?.user?.id
  if (!newId) return { error: { message: 'Account created but no user id was returned.' } }

  await isolated.auth.signOut()

  const { error: roleErr } = await adminSetRole(newId, role)
  if (roleErr) return { error: roleErr, partial: true, id: newId }

  if (department || title || fullName) {
    await adminUpdateProfile(newId, { name: fullName, phone, department, title })
  }

  const { error: inviteErr } = await sendPasswordReset(email)
  return { data: { id: newId }, inviteError: inviteErr }
}

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data?.session
}

export async function getUser() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data?.user
}

// ── Application CRUD ──────────────────────────────────────
/*
  No .select() read-back. Applicants submit anonymously and the anon SELECT
  policy was removed on 2026-07-25 to close the PII leak, so asking for the row
  back made PostgREST issue INSERT ... RETURNING, which requires SELECT
  visibility of the new row. RLS refused it with 42501 and rolled the whole
  insert back, silently killing every public application for three weeks. The
  insert itself is permitted; only the read-back was not. Same reasoning as
  submitDonation below.
*/
export async function submitApplication(appData) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { error } = await supabase
    .from('applications')
    .insert([appData])
  return { error }
}

export async function getApplications(filters = {}) {
  if (!supabase) return { data: [], error: null }
  let query = supabase.from('applications').select('*').order('created_at', { ascending: false })
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.pathway) query = query.eq('pathway', filters.pathway)
  const { data, error } = await query
  return { data: data || [], error }
}

export async function getApplicationById(id) {
  if (!supabase) return { data: null, error: null }
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export async function updateApplication(id, updates) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('applications')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// ── Admin: trigger deposit-request email ──────────────────
// Calls the `send-deposit-request` Edge Function. Requires the caller to be
// signed in as staff/admin — the function verifies role server-side.
export async function sendDepositRequestEmail({
  applicationId,
  recipientEmail,
  recipientName = '',
  pathway = '',
  paymentLink = '',
  reviewerName = '',
  reviewerTitle = 'Admissions Coordinator',
  amountNaira = 1_000_000,
}) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase.functions.invoke('send-deposit-request', {
    body: {
      applicationId, recipientEmail, recipientName, pathway,
      paymentLink, reviewerName, reviewerTitle, amountNaira,
    },
  })
  return { data, error }
}

// ── Public deposit-page lookup ────────────────────────────
// Calls the public `get-deposit-application` Edge Function which uses the
// service-role key server-side and returns ONLY the whitelisted fields the
// deposit page needs to render. No login required. We don't want anon to
// have direct SELECT on `applications`, so this is the only public read path.
export async function getDepositApplication(applicationId) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase.functions.invoke('get-deposit-application', {
    body: { applicationId },
  })
  return { data, error }
}

// ── Patient records ───────────────────────────────────────
export async function getPatients() {
  if (!supabase) return { data: [], error: null }
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('admitted_at', { ascending: false })
  return { data: data || [], error }
}

export async function getPatient(id) {
  if (!supabase) return { data: null, error: null }
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

// ── Check-ins ─────────────────────────────────────────────
export async function submitCheckin(patientId, checkinData) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('checkins')
    .insert([{ patient_id: patientId, ...checkinData }])
    .select()
    .single()
  return { data, error }
}

export async function getCheckins(patientId) {
  if (!supabase) return { data: [], error: null }
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

// ── Payments ──────────────────────────────────────────────
/*
  No .select() read-back. The deposit page runs unauthenticated (families
  arrive on an emailed link), and payments allows anon INSERT but restricts
  SELECT to staff and the paying user, so requesting the row back would fail
  the whole insert with 42501 and lose the payment record.
*/
export async function recordPayment(paymentData) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { error } = await supabase
    .from('payments')
    .insert([paymentData])
  return { error }
}

export async function getPayments(userId) {
  if (!supabase) return { data: [], error: null }
  let query = supabase.from('payments').select('*').order('created_at', { ascending: false })
  if (userId) query = query.eq('user_id', userId)
  const { data, error } = await query
  return { data: data || [], error }
}

// ── Patient writes (admit / update / discharge) ───────────
export async function createPatient(patientData) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('patients')
    .insert([patientData])
    .select()
    .single()
  return { data, error }
}

export async function updatePatient(id, updates) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// Latest check-in per patient (for mood/cravings on roster screens).
// Returns a map keyed by patient_id. Staff RLS lets staff read all check-ins.
export async function getLatestCheckinsByPatient() {
  if (!supabase) return { data: {}, error: null }
  const { data, error } = await supabase
    .from('checkins')
    .select('patient_id, mood, cravings, anxiety, created_at')
    .order('created_at', { ascending: false })
  const latest = {}
  for (const c of data || []) {
    if (!latest[c.patient_id]) latest[c.patient_id] = c
  }
  return { data: latest, error }
}

// ── Clinical domain (Wave 2) ──────────────────────────────
// Generic per-patient list/insert helpers keep the pages thin.
async function listBy(table, column, value, orderCol = 'created_at', asc = false) {
  if (!supabase) return { data: [], error: null }
  let q = supabase.from(table).select('*')
  if (value !== undefined && value !== null) q = q.eq(column, value)
  const { data, error } = await q.order(orderCol, { ascending: asc })
  return { data: data || [], error }
}
async function insertRow(table, row) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase.from(table).insert([row]).select().single()
  return { data, error }
}
async function deleteRow(table, id) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { error } = await supabase.from(table).delete().eq('id', id)
  return { error }
}
async function updateRow(table, id, updates) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single()
  return { data, error }
}

export const getClinicalNotes = () => listBy('clinical_notes', null, null)
export const addClinicalNote = (row) => insertRow('clinical_notes', row)
export const deleteClinicalNote = (id) => deleteRow('clinical_notes', id)

export const getUdsTests = (patientId) => listBy('uds_tests', 'patient_id', patientId, 'test_date', true)
export const getAllUdsTests = () => listBy('uds_tests', null, null, 'test_date', true)
export const addUdsTest = (row) => insertRow('uds_tests', row)

export const getMedications = (patientId) => listBy('medications', 'patient_id', patientId)
export const getAllMedications = () => listBy('medications', null, null)
export const getAllMedAdministrations = () => listBy('medication_administrations', null, null, 'administered_at', false)
export const addMedication = (row) => insertRow('medications', row)
export async function updateMedication(id, updates) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase.from('medications').update(updates).eq('id', id).select().single()
  return { data, error }
}
export const getMedAdministrations = (patientId) => listBy('medication_administrations', 'patient_id', patientId, 'administered_at', false)
export const addMedAdministration = (row) => insertRow('medication_administrations', row)

export const getLabTests = (patientId) => listBy('lab_tests', 'patient_id', patientId, 'ordered_date', false)
export const getAllLabTests = () => listBy('lab_tests', null, null, 'ordered_date', false)
export const addLabTest = (row) => insertRow('lab_tests', row)
export const updateLabTest = (id, updates) => updateRow('lab_tests', id, updates)

export const getDetoxRecords = (patientId) => listBy('detox_records', 'patient_id', patientId)
export const addDetoxRecord = (row) => insertRow('detox_records', row)

// ── Treatment plans (per-patient JSONB plan; Columbia Model builder) ──
export async function getTreatmentPlan(patientId) {
  if (!supabase) return { data: null, error: null }
  const { data, error } = await supabase
    .from('treatment_plans')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle()
  return { data, error }
}
// fields is a partial column object, e.g. { plan } or { prpp }.
export async function upsertTreatmentPlan(patientId, fields, updatedByCode) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('treatment_plans')
    .upsert({ patient_id: patientId, ...fields, updated_by_code: updatedByCode || null, updated_at: new Date().toISOString() }, { onConflict: 'patient_id' })
    .select()
    .single()
  return { data, error }
}

export const getAssessments = (patientId, type) => {
  if (!supabase) return Promise.resolve({ data: [], error: null })
  let q = supabase.from('assessments').select('*')
  if (patientId) q = q.eq('patient_id', patientId)
  if (type) q = q.eq('type', type)
  return q.order('created_at', { ascending: false }).then(({ data, error }) => ({ data: data || [], error }))
}
export const addAssessment = (row) => insertRow('assessments', row)

// ── Residential domain (Wave 3) ───────────────────────────
// Passes
export const getPasses = () => listBy('passes', null, null)
export const addPass = (row) => insertRow('passes', row)
export const updatePass = (id, updates) => updateRow('passes', id, updates)
export const deletePass = (id) => deleteRow('passes', id)

// Behavioural incidents (existing `incidents` table)
export const getIncidents = () => listBy('incidents', null, null)
export const getIncident = async (id) => {
  if (!supabase) return { data: null, error: null }
  const { data, error } = await supabase.from('incidents').select('*').eq('id', id).single()
  return { data, error }
}
export const addIncident = (row) => insertRow('incidents', row)
export const updateIncident = (id, updates) => updateRow('incidents', id, updates)
export const deleteIncident = (id) => deleteRow('incidents', id)

// MDT meetings
export const getMdtReviews = () => listBy('mdt_reviews', null, null, 'meeting_date', false)
export const addMdtReview = (row) => insertRow('mdt_reviews', row)
export const updateMdtReview = (id, updates) => updateRow('mdt_reviews', id, updates)

// Inventory
export const getInventoryItems = () => listBy('inventory_items', null, null, 'name', true)
export const addInventoryItem = (row) => insertRow('inventory_items', row)
export const updateInventoryItem = (id, updates) => updateRow('inventory_items', id, updates)
export const getInventoryOrders = () => listBy('inventory_orders', null, null)
export const addInventoryOrder = (row) => insertRow('inventory_orders', row)

// Shifts (one JSONB doc per week_start)
export async function getShiftWeek(weekStart) {
  if (!supabase) return { data: null, error: null }
  const { data, error } = await supabase.from('shifts').select('*').eq('week_start', weekStart).maybeSingle()
  return { data, error }
}
export async function upsertShiftWeek(weekStart, fields, updatedByCode) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('shifts')
    .upsert({ week_start: weekStart, ...fields, updated_by_code: updatedByCode || null, updated_at: new Date().toISOString() }, { onConflict: 'week_start' })
    .select()
    .single()
  return { data, error }
}

// Daily schedule attendance
export async function getScheduleAttendance(dateStr) {
  if (!supabase) return { data: [], error: null }
  const { data, error } = await supabase.from('schedule_attendance').select('*').eq('attend_date', dateStr)
  return { data: data || [], error }
}
export async function setScheduleAttendance(row) {
  // row: { attend_date, patient_id, slot, status, recorded_by_code }
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('schedule_attendance')
    .upsert(row, { onConflict: 'attend_date,patient_id,slot' })
    .select()
    .single()
  return { data, error }
}

// ── Spiritual / family / discharge / alumni (Wave 4) ──────
// Flexible per-patient JSONB progress store (domain-keyed).
export async function getProgress(patientId, domain) {
  if (!supabase) return { data: null, error: null }
  const { data, error } = await supabase.from('progress_records')
    .select('*').eq('patient_id', patientId).eq('domain', domain).maybeSingle()
  return { data, error }
}
export async function getAllProgress(domain) {
  if (!supabase) return { data: [], error: null }
  const { data, error } = await supabase.from('progress_records').select('*').eq('domain', domain)
  return { data: data || [], error }
}
export async function upsertProgress(patientId, domain, data, updatedByCode) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data: row, error } = await supabase.from('progress_records')
    .upsert({ patient_id: patientId, domain, data, updated_by_code: updatedByCode || null, updated_at: new Date().toISOString() }, { onConflict: 'patient_id,domain' })
    .select().single()
  return { data: row, error }
}

// Therapy / counselling sessions
export async function getTherapySessions(type) {
  if (!supabase) return { data: [], error: null }
  let q = supabase.from('therapy_sessions').select('*')
  if (type) q = q.eq('type', type)
  const { data, error } = await q.order('session_date', { ascending: false })
  return { data: data || [], error }
}
export async function getTherapySessionsByPatient(patientId, type) {
  if (!supabase) return { data: [], error: null }
  let q = supabase.from('therapy_sessions').select('*').eq('patient_id', patientId)
  if (type) q = q.eq('type', type)
  const { data, error } = await q.order('session_date', { ascending: false })
  return { data: data || [], error }
}
export const addTherapySession = (row) => insertRow('therapy_sessions', row)
export const updateTherapySession = (id, updates) => updateRow('therapy_sessions', id, updates)
export const deleteTherapySession = (id) => deleteRow('therapy_sessions', id)

// Alumni CRM
export const getAlumni = () => listBy('alumni', null, null, 'created_at', false)
export async function getAlumnus(id) {
  if (!supabase) return { data: null, error: null }
  const { data, error } = await supabase.from('alumni').select('*').eq('id', id).single()
  return { data, error }
}
export const addAlumnus = (row) => insertRow('alumni', row)
export const updateAlumnus = (id, updates) => updateRow('alumni', id, updates)

// Consent register
export async function getConsents(patientId) {
  if (!supabase) return { data: [], error: null }
  const { data, error } = await supabase.from('consents').select('*').eq('patient_id', patientId)
  return { data: data || [], error }
}
export const getAllConsents = () => listBy('consents', null, null, 'created_at', false)
export async function upsertConsent(patientId, consentType, fields, recordedByCode) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase.from('consents')
    .upsert({ patient_id: patientId, consent_type: consentType, ...fields, recorded_by_code: recordedByCode || null, updated_at: new Date().toISOString() }, { onConflict: 'patient_id,consent_type' })
    .select().single()
  return { data, error }
}

// Discharges
export const getDischarges = () => listBy('discharges', null, null)
export async function getDischargeByPatient(patientId) {
  if (!supabase) return { data: null, error: null }
  const { data, error } = await supabase.from('discharges')
    .select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  return { data, error }
}
export const addDischarge = (row) => insertRow('discharges', row)
export const updateDischarge = (id, updates) => updateRow('discharges', id, updates)

// ── Visitation requests ───────────────────────────────────
export async function requestVisitation(visitData) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('visitations')
    .insert([visitData])
    .select()
    .single()
  return { data, error }
}

export async function getVisitations(patientId) {
  if (!supabase) return { data: [], error: null }
  const { data, error } = await supabase
    .from('visitations')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function getAllVisitations() {
  if (!supabase) return { data: [], error: null }
  const { data, error } = await supabase
    .from('visitations')
    .select('*')
    .order('visit_date', { ascending: false })
  return { data: data || [], error }
}

export const addVisitation = (row) => insertRow('visitations', row)
export const updateVisitation = (id, updates) => updateRow('visitations', id, updates)

// ── Governance & people (Wave 5) ──────────────────────────
// Staff directory
export const getStaff = () => listBy('staff', null, null, 'full_name', true)
export async function getStaffMember(id) {
  if (!supabase) return { data: null, error: null }
  const { data, error } = await supabase.from('staff').select('*').eq('id', id).single()
  return { data, error }
}
export const addStaff = (row) => insertRow('staff', row)
export const updateStaff = (id, updates) => updateRow('staff', id, updates)
export const deleteStaff = (id) => deleteRow('staff', id)

// Staff training
export const getStaffTraining = () => listBy('staff_training', null, null, 'created_at', false)
export const getStaffTrainingFor = (staffId) => listBy('staff_training', 'staff_id', staffId, 'created_at', false)
export const addStaffTraining = (row) => insertRow('staff_training', row)
export const updateStaffTraining = (id, updates) => updateRow('staff_training', id, updates)

// Donors
export const getDonors = () => listBy('donors', null, null, 'created_at', false)
export async function getDonor(id) {
  if (!supabase) return { data: null, error: null }
  const { data, error } = await supabase.from('donors').select('*').eq('id', id).single()
  return { data, error }
}
export const addDonor = (row) => insertRow('donors', row)
export const updateDonor = (id, updates) => updateRow('donors', id, updates)

// Public donation submissions (anon insert; staff read/manage).
// No .select() read-back: anon donors can't read the row back (staff-only SELECT
// policy), and requesting representation would fail the whole insert with a
// row-level-security error even though the insert itself is permitted.
export async function submitDonation(donation) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { error } = await supabase
    .from('donations')
    .insert([donation])
  return { error }
}
export const getDonations = () => listBy('donations', null, null, 'created_at', false)
export const updateDonation = (id, updates) => updateRow('donations', id, updates)

// Programme KPIs (quarterly board metrics)
export async function getProgrammeKpis(year, quarter) {
  if (!supabase) return { data: [], error: null }
  const { data, error } = await supabase
    .from('programme_kpis')
    .select('*')
    .eq('year', year)
    .eq('quarter', quarter)
  return { data: data || [], error }
}

// ── Meal orders ───────────────────────────────────────────
export async function submitMealOrder(patientId, orderData) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('meal_orders')
    .insert([{ patient_id: patientId, ...orderData }])
    .select()
    .single()
  return { data, error }
}

export async function getMealOrders(patientId) {
  if (!supabase) return { data: [], error: null }
  const { data, error } = await supabase
    .from('meal_orders')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}
