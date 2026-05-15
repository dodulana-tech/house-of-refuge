import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Nav.module.css'

const PUBLIC_LINKS = [
  { to: '/',           label: 'Home'       },
  { to: '/about',      label: 'About'      },
  { to: '/prospectus', label: 'Prospectus' },
  { to: '/outpatient', label: 'Outpatient' },
  { to: '/sponsor',    label: 'Sponsor'    },
  { to: '/apply',      label: 'Apply'      },
  { to: '/contact',    label: 'Contact'    },
]

export default function Nav() {
  const [mob, setMob] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const nav = useNavigate()
  const { user, logout } = useAuth()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

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
            {PUBLIC_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>{label}</NavLink>
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
          {PUBLIC_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={styles.mobLink} onClick={() => setMob(false)}>{label}</NavLink>
          ))}
          {user ? (
            <>
              <NavLink to={portalLink} className={styles.mobLink} onClick={() => setMob(false)}>{portalLabel}</NavLink>
              <button className={`${styles.mobLink} ${styles.mobCta}`} onClick={() => { logout(); nav('/'); setMob(false) }}>Sign Out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={styles.mobLink} onClick={() => setMob(false)}>Sign In</NavLink>
              <button className={`${styles.mobLink} ${styles.mobCta}`} onClick={() => { nav('/donate'); setMob(false) }}>Donate Now</button>
            </>
          )}
        </div>
      )}
    </>
  )
}
