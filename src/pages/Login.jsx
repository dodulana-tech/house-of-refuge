import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotif } from '../App'
import styles from './Login.module.css'

export default function Login() {
  const { login } = useAuth()
  const showNotif = useNotif()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) { showNotif('Required', 'Please enter email and password.'); return }
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.ok) {
      showNotif('Welcome back', `Signed in successfully`, 'ok')
      // Wait briefly for auth state to propagate
      setTimeout(() => {
        const u = result.user
        const role = u?.user_metadata?.role || u?.role
        const dest = role === 'admin' || role === 'staff' ? '/admin' :
                     role === 'family' ? '/family' : '/portal'
        nav(dest)
      }, 300)
    } else {
      showNotif('Login failed', result.error)
    }
  }

  return (
    <>
      <Helmet>
        <title>Sign In | House of Refuge</title>
        <meta name="description" content="Sign in to access your House of Refuge patient portal, family dashboard, or staff panel." />
      </Helmet>
      <div className="ph"><div className="container">
        <h1>Sign In</h1>
        <p>Access your patient portal, family dashboard, or staff panel</p>
      </div></div>

      <section className="section">
        <div className="container">
          <div className={styles.wrap}>
            <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 440, margin: '0 auto' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Welcome back</h3>
              <p style={{ fontSize: '.82rem', color: 'var(--g500)', marginBottom: 24 }}>Sign in to your House of Refuge account</p>

              <div className="fg">
                <label className="flabel">Email Address</label>
                <input className="fi" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="fg">
                <label className="flabel">Password</label>
                <input className="fi" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
              </div>

              <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
                {loading ? <span className="spin" /> : 'Sign In'}
              </button>

              {import.meta.env.DEV && (
              <div className={styles.demo}>
                <div className={styles.demoTitle}>Quick Access</div>
                <div className={styles.demoGrid}>
                  {[
                    ['Patient', 'patient@hor.ng', 'HOR_Patient_2026!'],
                    ['Family', 'family@hor.ng', 'HOR_Family_2026!'],
                    ['Staff', 'clinical@hor.ng', 'HOR_Clinical_2026!'],
                    ['Admin', 'admin@hor.ng', 'HOR_Admin_2026!'],
                  ].map(([role, em, pw]) => (
                    <button key={role} type="button" className={styles.demoBtn} onClick={() => { setEmail(em); setPassword(pw) }}>
                      {role}
                    </button>
                  ))}
                </div>
              </div>
              )}

              <p style={{ fontSize: '.82rem', textAlign: 'center', marginTop: 16 }}>
                Don't have an account? <Link to="/apply" style={{ color: 'var(--blue)', fontWeight: 600 }}>Apply for Admission</Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}
