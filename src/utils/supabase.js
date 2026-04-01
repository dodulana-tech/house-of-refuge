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
