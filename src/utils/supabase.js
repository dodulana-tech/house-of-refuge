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
export async function submitApplication(appData) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('applications')
    .insert([appData])
    .select()
    .single()
  return { data, error }
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
export async function recordPayment(paymentData) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('payments')
    .insert([paymentData])
    .select()
    .single()
  return { data, error }
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

export const getDetoxRecords = (patientId) => listBy('detox_records', 'patient_id', patientId)
export const addDetoxRecord = (row) => insertRow('detox_records', row)

export const getAssessments = (patientId, type) => {
  if (!supabase) return Promise.resolve({ data: [], error: null })
  let q = supabase.from('assessments').select('*')
  if (patientId) q = q.eq('patient_id', patientId)
  if (type) q = q.eq('type', type)
  return q.order('created_at', { ascending: false }).then(({ data, error }) => ({ data: data || [], error }))
}
export const addAssessment = (row) => insertRow('assessments', row)

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
