import React, { useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './DashboardLayout.module.css'

/*
  HOR Practice Management Platform — MECE Sidebar
  7 Pillars mapped to John Akinola's SOPs + Org Chart

  1. Clinical Operations
  2. Admissions & Discharge
  3. Residential Operations
  4. Spiritual & Programme
  5. People & HR
  6. Finance & Revenue
  7. M&E & Compliance
*/

const MENU = {
  admin: [
    { section: 'Overview' },
    { icon: '📊', to: '/dashboard', label: 'Dashboard', end: true },

    { section: 'Clinical Operations' },
    { icon: '🏥', to: '/dashboard/patients', label: 'Patient Records' },
    { icon: '📋', to: '/dashboard/treatment-plans', label: 'Treatment Plans' },
    { icon: '💊', to: '/dashboard/medication', label: 'Medication (MAR)' },
    { icon: '🤝', to: '/dashboard/mdt', label: 'MDT Reviews' },
    { icon: '📝', to: '/dashboard/clinical-notes', label: 'Clinical Notes' },

    { section: 'Admissions & Discharge' },
    { icon: '📥', to: '/dashboard/admissions', label: 'Admissions Pipeline' },
    { icon: '📄', to: '/dashboard/consents', label: 'Consent Management' },
    { icon: '🎓', to: '/dashboard/discharge', label: 'Discharge & Graduation' },

    { section: 'Residential Operations' },
    { icon: '🛏️', to: '/dashboard/beds', label: 'Bed Management' },
    { icon: '📅', to: '/dashboard/schedule', label: 'Daily Schedule' },
    { icon: '⚠️', to: '/dashboard/behavioral', label: 'Behavioral Management' },
    { icon: '🎫', to: '/dashboard/passes', label: 'Passes & Leave' },
    { icon: '👨‍👩‍👧', to: '/dashboard/visitation', label: 'Visitation' },

    { section: 'Spiritual & Programme' },
    { icon: '✝️', to: '/dashboard/spiritual', label: 'Spiritual Formation' },
    { icon: '📚', to: '/dashboard/life-skills', label: 'Life Skills & Vocational' },

    { section: 'People & HR' },
    { icon: '👥', to: '/dashboard/staff', label: 'Staff Directory' },
    { icon: '🔄', to: '/dashboard/shifts', label: 'Shift Scheduling' },
    { icon: '📈', to: '/dashboard/training', label: 'Training & CPD' },

    { section: 'Supply Chain & Inventory' },
    { icon: '📦', to: '/dashboard/inventory', label: 'Inventory Management' },
    { icon: '🎁', to: '/dashboard/sponsorship', label: 'Equipment Sponsorship' },

    { section: 'Finance & Revenue' },
    { icon: '💰', to: '/dashboard/finance', label: 'Financial Overview' },
    { icon: '💳', to: '/dashboard/payments', label: 'Payments & Deposits' },
    { icon: '❤️', to: '/dashboard/donors', label: 'Donors & CRM' },
    { icon: '🎁', to: '/dashboard/sponsorship', label: 'Equipment Sponsorship' },

    { section: 'M&E & Compliance' },
    { icon: '📊', to: '/dashboard/outcomes', label: 'Outcome Tracking' },
    { icon: '🎓', to: '/dashboard/alumni', label: 'Alumni Programme' },
    { icon: '🔒', to: '/dashboard/safeguarding', label: 'Safeguarding' },
    { icon: '📋', to: '/dashboard/reports', label: 'Board Reports' },
  ],
  staff: [
    { section: 'Clinical' },
    { icon: '📊', to: '/dashboard', label: 'Overview', end: true },
    { icon: '📁', to: '/dashboard/caseload', label: 'My Caseload' },
    { icon: '🏥', to: '/dashboard/patients', label: 'Patient Records' },
    { icon: '📝', to: '/dashboard/clinical-notes', label: 'Clinical Notes' },
    { icon: '💊', to: '/dashboard/medication', label: 'Medication (MAR)' },
    { icon: '🤝', to: '/dashboard/mdt', label: 'MDT Reviews' },

    { section: 'Programme' },
    { icon: '📅', to: '/dashboard/schedule', label: 'Daily Schedule' },
    { icon: '✝️', to: '/dashboard/spiritual', label: 'Spiritual Formation' },
    { icon: '📚', to: '/dashboard/life-skills', label: 'Life Skills' },

    { section: 'Operations' },
    { icon: '⚠️', to: '/dashboard/behavioral', label: 'Behavioral Management' },
    { icon: '🎫', to: '/dashboard/passes', label: 'Passes & Leave' },
    { icon: '👨‍👩‍👧', to: '/dashboard/visitation', label: 'Visitation' },
    { icon: '🔒', to: '/dashboard/safeguarding', label: 'Safeguarding' },
  ],
  patient: [
    { section: 'My Recovery' },
    { icon: '🏠', to: '/dashboard', label: 'My Dashboard', end: true },
    { icon: '✅', to: '/dashboard/checkin', label: 'Daily Check-in' },
    { icon: '📋', to: '/dashboard/treatment', label: 'Treatment Plan' },
    { icon: '📅', to: '/dashboard/my-schedule', label: 'My Schedule' },

    { section: 'Daily Life' },
    { icon: '🍽️', to: '/dashboard/meals', label: 'Meals' },
    { icon: '✝️', to: '/dashboard/my-spiritual', label: 'Spiritual Journal' },
    { icon: '📚', to: '/dashboard/my-skills', label: 'Life Skills Progress' },

    { section: 'Admin' },
    { icon: '💳', to: '/dashboard/my-payments', label: 'Payments' },
    { icon: '📖', to: '/dashboard/my-rights', label: 'My Rights' },
  ],
  family: [
    { section: 'Patient' },
    { icon: '📊', to: '/dashboard', label: 'Progress Overview', end: true },
    { icon: '📋', to: '/dashboard/milestones', label: 'Recovery Milestones' },
    { icon: '📅', to: '/dashboard/visits', label: 'Visit Requests' },

    { section: 'Support' },
    { icon: '📚', to: '/dashboard/resources', label: 'Family Resources' },
    { icon: '🤝', to: '/dashboard/family-therapy', label: 'Family Therapy' },
    { icon: '💳', to: '/dashboard/family-payments', label: 'Payments' },
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
  const title = user?.title || (role === 'patient' ? 'Resident' : role === 'family' ? 'Family Member' : role === 'admin' ? 'Program Director' : 'Staff')

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobOpen ? styles.mobOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <button className={styles.brand} onClick={() => nav('/')}>
            <svg width="28" height="18" viewBox="0 0 44 28" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M4 26L4 14L22 2L40 14L40 26" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M0 15L22 1L44 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            {!collapsed && (
              <div>
                <div className={styles.brandText}>HOUSE OF REFUGE</div>
                <div className={styles.brandSub}>Practice Management</div>
              </div>
            )}
          </button>
          <button className={styles.collapseBtn} onClick={() => setCollapsed(c => !c)} aria-label="Toggle sidebar">
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {menu.map((item, i) => {
            if (item.section) {
              if (collapsed) return null
              return <div key={`s-${i}`} className={styles.sectionLabel}>{item.section}</div>
            }
            return (
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
            )
          })}
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
            <button className={styles.logoutBtn} onClick={() => { logout(); nav('/') }}>Sign Out</button>
          )}
        </div>
      </aside>

      {mobOpen && <div className={styles.overlay} onClick={() => setMobOpen(false)} />}

      <div className={`${styles.main} ${collapsed ? styles.mainExpanded : ''}`}>
        <header className={styles.topbar}>
          <button className={styles.mobMenu} onClick={() => setMobOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
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
