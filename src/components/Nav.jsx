import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Nav.module.css'

const NAV = [
  { to: '/',     label: 'Home'  },
  { to: '/about', label: 'About' },
  {
    label: 'Admissions',
    children: [
      { to: '/prospectus', label: 'Family Prospectus'    },
      { to: '/outpatient', label: 'Outpatient Services'  },
      { to: '/assistance', label: 'Financial Assistance' },
      { to: '/apply',      label: 'Begin Admission'       },
    ],
  },
  {
    label: 'Support',
    children: [
      { to: '/donate',  label: 'Donate'            },
      { to: '/sponsor', label: 'Sponsor Equipment' },
    ],
  },
  { to: '/contact', label: 'Contact' },
]

function Caret({ className }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Nav() {
  const [mob, setMob] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openMenu, setOpenMenu] = useState(null)   // desktop dropdown
  const [openMob, setOpenMob] = useState(null)     // mobile accordion
  const nav = useNavigate()
  const loc = useLocation()
  const { user, logout } = useAuth()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const isGroupActive = (item) =>
    item.children?.some(c => loc.pathname === c.to || loc.pathname.startsWith(c.to + '/'))

  const closeMob = () => { setMob(false); setOpenMob(null) }

  const portalLink = '/dashboard'
  const portalLabel = 'Dashboard'

  return (
    <>
      <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.inner}>
          <button className={styles.logo} onClick={() => { nav('/'); setMob(false) }} aria-label="House of Refuge home">
            <img src="/logo.svg" alt="House of Refuge" style={{ height: 36, width: 'auto', display: 'block' }} />
          </button>

          <div className={styles.links}>
            {NAV.map(item => item.children ? (
              <div
                key={item.label}
                className={styles.navItem}
                onMouseEnter={() => setOpenMenu(item.label)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <button
                  className={`${styles.link} ${styles.dropBtn} ${isGroupActive(item) ? styles.active : ''}`}
                  onClick={() => setOpenMenu(o => o === item.label ? null : item.label)}
                  aria-haspopup="true"
                  aria-expanded={openMenu === item.label}
                >
                  {item.label}
                  <Caret className={styles.caret} />
                </button>
                {openMenu === item.label && (
                  <div className={styles.dropPanel} role="menu">
                    {item.children.map(c => (
                      <NavLink
                        key={c.to}
                        to={c.to}
                        role="menuitem"
                        className={({ isActive }) => `${styles.dropLink} ${isActive ? styles.dropActive : ''}`}
                        onClick={() => setOpenMenu(null)}
                      >{c.label}</NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>{item.label}</NavLink>
            ))}
            {user ? (
              <>
                <NavLink to={portalLink} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>{portalLabel}</NavLink>
                <button className={styles.userBtn} onClick={() => { logout(); nav('/') }} title="Sign Out">
                  <span className={styles.userAvatar}>{(user.name || user.full_name || '?').split(' ').map(n => n[0]).join('')}</span>
                  <span className={styles.signOut}>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>Sign In</NavLink>
                <button className={styles.cta} onClick={() => nav('/donate')}>Donate Now</button>
              </>
            )}
          </div>

          <button className={`${styles.ham} ${mob ? styles.hamOpen : ''}`} onClick={() => setMob(v => !v)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {mob && (
        <div className={styles.mobNav}>
          {NAV.map(item => item.children ? (
            <div key={item.label} className={styles.mobGroup}>
              <button
                className={styles.mobGroupBtn}
                onClick={() => setOpenMob(o => o === item.label ? null : item.label)}
                aria-expanded={openMob === item.label}
              >
                {item.label}
                <Caret className={`${styles.caret} ${openMob === item.label ? styles.caretUp : ''}`} />
              </button>
              {openMob === item.label && (
                <div className={styles.mobSub}>
                  {item.children.map(c => (
                    <NavLink key={c.to} to={c.to} className={styles.mobSubLink} onClick={closeMob}>{c.label}</NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={styles.mobLink} onClick={closeMob}>{item.label}</NavLink>
          ))}
          {user ? (
            <>
              <NavLink to={portalLink} className={styles.mobLink} onClick={closeMob}>{portalLabel}</NavLink>
              <button className={`${styles.mobLink} ${styles.mobCta}`} onClick={() => { logout(); nav('/'); closeMob() }}>Sign Out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={styles.mobLink} onClick={closeMob}>Sign In</NavLink>
              <button className={`${styles.mobLink} ${styles.mobCta}`} onClick={() => { nav('/donate'); closeMob() }}>Donate Now</button>
            </>
          )}
        </div>
      )}
    </>
  )
}
