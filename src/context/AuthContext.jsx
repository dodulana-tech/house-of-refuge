import React, { createContext, useContext, useState, useCallback } from 'react'
import { load, save, remove } from '../utils/store'

const AuthContext = createContext(null)

export const ROLES = {
  PATIENT: 'patient',
  FAMILY: 'family',
  STAFF: 'staff',
  ADMIN: 'admin',
}

// Demo accounts for MVP — replace with API auth
const DEMO_ACCOUNTS = [
  { id: 'P001', email: 'patient@hor.ng', password: 'patient123', role: ROLES.PATIENT, name: 'Chidi Okonkwo', phone: '08012345678', admissionDate: '2026-04-15', status: 'admitted' },
  { id: 'F001', email: 'family@hor.ng', password: 'family123', role: ROLES.FAMILY, name: 'Ngozi Okonkwo', phone: '08098765432', patientId: 'P001', relationship: 'Mother' },
  { id: 'S001', email: 'staff@hor.ng', password: 'staff123', role: ROLES.STAFF, name: 'Dr. Amina Ibrahim', phone: '08055667788', department: 'Clinical', title: 'Consultant Psychiatrist' },
  { id: 'A001', email: 'admin@hor.ng', password: 'admin123', role: ROLES.ADMIN, name: 'Emmanuel Abutu', phone: '09011277600', department: 'Administration', title: 'Centre Director' },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => load('user', null))

  const login = useCallback((email, password) => {
    const account = DEMO_ACCOUNTS.find(a => a.email === email && a.password === password)
    if (!account) return { ok: false, error: 'Invalid email or password' }
    const { password: _, ...userData } = account
    save('user', userData)
    setUser(userData)
    return { ok: true, user: userData }
  }, [])

  const register = useCallback((data) => {
    // MVP: create account in localStorage
    const newUser = {
      id: `U${Date.now()}`,
      ...data,
      role: data.role || ROLES.PATIENT,
      status: 'pending',
    }
    const { password: _, ...userData } = newUser
    save('user', userData)
    setUser(userData)
    return { ok: true, user: userData }
  }, [])

  const logout = useCallback(() => {
    remove('user')
    setUser(null)
  }, [])

  const isRole = useCallback((role) => user?.role === role, [user])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
