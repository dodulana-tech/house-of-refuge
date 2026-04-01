import React, { useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './DashboardLayout.module.css'

/*
  MECE Sidebar Menu Structure — mapped to HOR Org Chart & SOPs

  ADMIN / PROGRAM DIRECTOR:
    - Overview (KPIs, bed occupancy, pipeline)
    - Admissions Pipeline (8-step process)
    - Patient Records (all 24 beds)
    - Staff & HR
    - Finance & Payments
    - Reports & M&E
    - Settings

  CLINICAL (Head of Clinical Services, Nurses, Psychologist):
    - My Caseload
    - Patient Records
    - Daily Schedule
    - MDT Reviews
    - Incidents & Behavioral
    - Clinical Notes

  CHAPLAIN / SPIRITUAL:
    - My Schedule
    - Patient Records
    - Spiritual Formation Tracking
    - Chapel & Events

  PATIENT:
    - My Dashboard
    - Daily Check-in
    - Treatment Plan
    - Meals
    - Payments

  FAMILY:
    - Patient Progress
    - Visit Requests
    - Family Resources
    - Messages
*/

const MENU = {
  admin: [
    { icon: '📊', to: '/dashboard', label: 'Overview', end: true },
    { icon: '📋', to: '/dashboard/admissions', label: 'Admissions' },
    { icon: '🏥', to: '/dashboard/patients', label: 'Patients' },
    { icon: '👥', to: '/dashboard/staff', label: 'Staff' },
    { icon: '💰', to: '/dashboard/finance', label: 'Finance' },
    { icon: '📈', to: '/dashboard/reports', label: 'Reports & M&E' },
    { icon: '⚙️', to: '/dashboard/settings', label: 'Settings' },
  ],
  staff: [
    { icon: '📊', to: '/dashboard', label: 'Overview', end: true },
    { icon: '📁', to: '/dashboard/caseload', label: 'My Caseload' },
    { icon: '🏥', to: '/dashboard/patients', label: 'Patient Records' },
    { icon: '📅', to: '/dashboard/schedule', label: 'Daily Schedule' },
    { icon: '🤝', to: '/dashboard/mdt', label: 'MDT Reviews' },
    { icon: '⚠️', to: '/dashboard/incidents', label: 'Incidents' },
    { icon: '📝', to: '/dashboard/notes', label: 'Clinical Notes' },
  ],
  patient: [
    { icon: '🏠', to: '/dashboard', label: 'My Dashboard', end: true },
    { icon: '✅', to: '/dashboard/checkin', label: 'Daily Check-in' },
    { icon: '📋', to: '/dashboard/treatment', label: 'Treatment Plan' },
    { icon: '🍽️', to: '/dashboard/meals', label: 'Meals' },
    { icon: '💳', to: '/dashboard/payments', label: 'Payments' },
  ],
  family: [
    { icon: '📊', to: '/dashboard', label: 'Progress', end: true },
    { icon: '📅', to: '/dashboard/visits', label: 'Visit Requests' },
    { icon: '📚', to: '/dashboard/resources', label: 'Family Resources' },
  ],
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobOpen, setMobOpen] = useState(false)

  const role = user?.role || 'patient'
  const menu = MENU[role] || MENU.patient
  const name = user?.name || user?.full_name || 'User'
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
  const title = user?.title || (role === 'patient' ? 'Resident' : role === 'family' ? 'Family Member' : 'Staff')

  function handleLogout() {
    logout()
    nav('/')
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobOpen ? styles.mobOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.brand} onClick={() => nav('/')}>
            <svg width="28" height="18" viewBox="0 0 44 28" fill="none" aria-hidden="true">
              <path d="M4 26L4 14L22 2L40 14L40 26" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M0 15L22 1L44 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            {!collapsed && <span className={styles.brandText}>HOR</span>}
          </div>
          <button className={styles.collapseBtn} onClick={() => setCollapsed(c => !c)} aria-label="Toggle sidebar">
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {menu.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
              onClick={() => setMobOpen(false)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{initials}</div>
            {!collapsed && (
              <div className={styles.userMeta}>
                <div className={styles.userName}>{name}</div>
                <div className={styles.userRole}>{title}</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button className={styles.logoutBtn} onClick={handleLogout}>Sign Out</button>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobOpen && <div className={styles.overlay} onClick={() => setMobOpen(false)} />}

      {/* Main content */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.mobMenu} onClick={() => setMobOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
          <div className={styles.topbarLeft}>
            <h2 className={styles.pageTitle}>House of Refuge</h2>
          </div>
          <div className={styles.topbarRight}>
            <span className={styles.roleBadge}>{role}</span>
            <span className={styles.topbarName}>{name}</span>
          </div>
        </header>

        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
