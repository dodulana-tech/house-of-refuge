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

// Demo accounts — used when Supabase is not configured
const DEMO_ACCOUNTS = [
  { id: 'P001', email: 'patient@hor.ng', password: 'patient123', role: ROLES.PATIENT, name: 'Chidi Okonkwo', phone: '08012345678', admissionDate: '2026-04-15', status: 'admitted' },
  { id: 'F001', email: 'family@hor.ng', password: 'family123', role: ROLES.FAMILY, name: 'Ngozi Okonkwo', phone: '08098765432', patientId: 'P001', relationship: 'Mother' },
  { id: 'S001', email: 'staff@hor.ng', password: 'staff123', role: ROLES.STAFF, name: 'Dr. Amina Ibrahim', phone: '08055667788', department: 'Clinical', title: 'Head of Clinical Services' },
  { id: 'A001', email: 'admin@hor.ng', password: 'admin123', role: ROLES.ADMIN, name: 'Emmanuel Abutu', phone: '09011277600', department: 'Administration', title: 'Program Director' },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => load('user', null))
  const [loading, setLoading] = useState(true)

  // Listen for Supabase auth changes
  useEffect(() => {
    if (!isSupabaseReady()) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch profile
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data: profile }) => {
            if (profile) {
              const userData = { ...profile, name: profile.full_name }
              save('user', userData)
              setUser(userData)
            }
          })
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        if (profile) {
          const userData = { ...profile, name: profile.full_name }
          save('user', userData)
          setUser(userData)
        }
      } else if (event === 'SIGNED_OUT') {
        remove('user')
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email, password) => {
    // Try Supabase first
    if (isSupabaseReady()) {
      const { data, error } = await sbSignIn({ email, password })
      if (error) return { ok: false, error: error.message }
      // Profile will be set via auth state listener
      return { ok: true, user: data.user }
    }

    // Fallback to demo accounts
    const account = DEMO_ACCOUNTS.find(a => a.email === email && a.password === password)
    if (!account) return { ok: false, error: 'Invalid email or password' }
    const { password: _, ...userData } = account
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
