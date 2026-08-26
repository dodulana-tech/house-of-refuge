import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase, isSupabaseReady, signIn as sbSignIn, signOut as sbSignOut, signUp as sbSignUp } from '../utils/supabase'
import { load, save, remove } from '../utils/store'

const AuthContext = createContext(null)

export const ROLES = {
  PATIENT: 'patient',
  FAMILY: 'family',
  STAFF: 'staff',
  ADMIN: 'admin',
}

// Demo accounts - used when Supabase is not configured
const DEMO_ACCOUNTS = import.meta.env.DEV ? [
  { id: 'P001', email: 'patient@hor.ng', password: 'patient123', role: ROLES.PATIENT, name: 'Chidi Okonkwo', phone: '08012345678', admissionDate: '2026-04-15', status: 'admitted' },
  { id: 'F001', email: 'family@hor.ng', password: 'family123', role: ROLES.FAMILY, name: 'Ngozi Okonkwo', phone: '08098765432', patientId: 'P001', relationship: 'Mother' },
  { id: 'S001', email: 'staff@hor.ng', password: 'staff123', role: ROLES.STAFF, name: 'Dr. Amina Ibrahim', phone: '08055667788', department: 'Clinical', title: 'Head of Clinical Services' },
  { id: 'A001', email: 'admin@hor.ng', password: 'admin123', role: ROLES.ADMIN, name: 'Dr Adediwura Okeleye', phone: '09112777600', department: 'Administration', title: 'Program Director' },
] : []

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => load('user', null))
  const [loading, setLoading] = useState(true)

  /*
    Session bootstrap. Two rules here, both learned the hard way, because every
    failure in this effect shows up as the app sitting on the loading spinner
    forever ("just rolling") with no way out but a hard reload:

    1. `loading` MUST end on every path, including thrown errors. getSession()
       rejects on any network blip, and an unhandled rejection used to leave
       setLoading(false) unreached.

    2. NEVER await a supabase call inside the onAuthStateChange callback.
       supabase-js holds an internal lock while dispatching that callback, and
       any other supabase call needs the same lock to read the session, so
       awaiting one inside deadlocks the client. Sign-in then hangs forever.
       The work is deferred out of the callback with setTimeout(0) instead,
       which is the documented workaround.
  */
  useEffect(() => {
    if (!isSupabaseReady()) {
      setLoading(false)
      return
    }

    let active = true
    const finish = () => { if (active) setLoading(false) }

    // Last-resort watchdog: whatever happens, the app stops spinning.
    const watchdog = setTimeout(() => {
      if (active) {
        console.warn('[auth] session bootstrap timed out; continuing signed out')
        setLoading(false)
      }
    }, 8000)

    const applySession = async (session) => {
      if (!session?.user) {
        /*
          No Supabase session, but a user object may still be cached in
          localStorage from a previous sign-in. Keeping it made the dashboard
          render as staff/admin while every query ran as anon, so RLS returned
          nothing and pages looked empty instead of signed out. Drop the cached
          user so the session guard sends them back to /login. DEV demo accounts
          never had a session to begin with, so they are left alone.
        */
        setUser(prev => {
          if (prev && !prev.demo) { remove('user'); return null }
          return prev
        })
        return
      }

      // maybeSingle, not single: single() rejects when the profile row is
      // missing or hidden by RLS, and that rejection used to strand the app.
      const { data: profile, error } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      if (!active) return

      if (profile) {
        const userData = { ...profile, name: profile.full_name }
        save('user', userData)
        setUser(userData)
        return
      }

      // No readable profile. Sign them in from auth metadata rather than
      // hanging, but never invent a privileged role.
      if (error) console.warn('[auth] profile fetch failed:', error.message)
      const meta = session.user.user_metadata || {}
      const userData = {
        id: session.user.id,
        email: session.user.email,
        name: meta.full_name || session.user.email,
        full_name: meta.full_name || session.user.email,
        role: 'patient',
        phone: meta.phone || '',
        profileMissing: true,
      }
      save('user', userData)
      setUser(userData)
    }

    supabase.auth.getSession()
      .then(({ data }) => applySession(data?.session))
      .catch(err => { console.error('[auth] getSession failed:', err) })
      .finally(() => { clearTimeout(watchdog); finish() })

    // Deliberately NOT an async callback - see rule 2 above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        remove('user')
        setUser(null)
        return
      }
      if (session?.user) {
        setTimeout(() => {
          applySession(session)
            .catch(err => console.error('[auth] session apply failed:', err))
            .finally(finish)
        }, 0)
      }
    })

    return () => {
      active = false
      clearTimeout(watchdog)
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email, password) => {
    // Try Supabase first
    if (isSupabaseReady()) {
      const { data, error } = await sbSignIn({ email, password })
      if (error) {
        // Fallback to demo accounts on Supabase error
        const account = DEMO_ACCOUNTS.find(a => a.email === email && a.password === password)
        if (account) {
          const { password: _, ...rest } = account
          const userData = { ...rest, demo: true }
          save('user', userData)
          setUser(userData)
          return { ok: true, user: userData }
        }
        return { ok: false, error: error.message }
      }
      // Fetch profile directly after sign-in
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      if (profile) {
        const userData = { ...profile, name: profile.full_name }
        save('user', userData)
        setUser(userData)
        return { ok: true, user: userData }
      }
      // Profile not found — use auth metadata as fallback
      const meta = data.user.user_metadata || {}
      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: meta.full_name || email,
        full_name: meta.full_name || email,
        role: meta.role || 'patient',
        phone: meta.phone || '',
      }
      save('user', userData)
      setUser(userData)
      return { ok: true, user: userData }
    }

    // Fallback to demo accounts
    const account = DEMO_ACCOUNTS.find(a => a.email === email && a.password === password)
    if (!account) return { ok: false, error: 'Invalid email or password' }
    const { password: _, ...rest } = account
    const userData = { ...rest, demo: true }
    save('user', userData)
    setUser(userData)
    return { ok: true, user: userData }
  }, [])

  const register = useCallback(async (data) => {
    if (isSupabaseReady()) {
      const { error } = await sbSignUp({
        email: data.email,
        password: data.password,
        metadata: {
          full_name: data.name,
          phone: data.phone,
          role: data.role || ROLES.PATIENT,
        },
      })
      if (error) return { ok: false, error: error.message }
      return { ok: true }
    }

    // Fallback
    const newUser = { id: `U${Date.now()}`, ...data, role: data.role || ROLES.PATIENT, status: 'pending' }
    const { password: _, ...userData } = newUser
    save('user', userData)
    setUser(userData)
    return { ok: true, user: userData }
  }, [])

  const logout = useCallback(async () => {
    if (isSupabaseReady()) await sbSignOut()
    // Clear all HOR data from storage
    const keys = Object.keys(localStorage).filter(k => k.startsWith('hor_'))
    keys.forEach(k => localStorage.removeItem(k))
    try { sessionStorage.removeItem('hor_apply_draft') } catch {}
    remove('user')
    setUser(null)
  }, [])

  const isRole = useCallback((role) => user?.role === role, [user])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isRole, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
