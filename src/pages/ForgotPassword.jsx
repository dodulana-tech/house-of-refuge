import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { isSupabaseReady, sendPasswordReset } from '../utils/supabase'
import { useNotif } from '../App'
import styles from './Login.module.css'

/*
  Request a password reset link. Deliberately reports success even when the
  address is not registered — telling a stranger which staff emails exist would
  hand them half of a login.
*/
export default function ForgotPassword() {
  const showNotif = useNotif()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.includes('@')) { showNotif('Required', 'Please enter a valid email address.'); return }
    if (!isSupabaseReady()) { showNotif('Unavailable', 'Password reset is unavailable — the database is not configured.'); return }

    setLoading(true)
    const { error } = await sendPasswordReset(email.trim())
    setLoading(false)
    if (error && !/user not found/i.test(error.message)) {
      showNotif('Could not send', error.message)
      return
    }
    setSent(true)
  }

  return (
    <>
      <Helmet>
        <title>Reset Your Password | House of Refuge</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="ph"><div className="container">
        <h1>Reset Your Password</h1>
        <p>We will email you a secure link to set a new password</p>
      </div></div>

      <section className="section">
        <div className="container">
          <div className={styles.wrap}>
            <div className="card" style={{ maxWidth: 440, margin: '0 auto' }}>
              {sent ? (
                <>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: 8 }}>Check your inbox</h3>
                  <p style={{ fontSize: '.86rem', color: 'var(--g700)', lineHeight: 1.7, marginBottom: 16 }}>
                    If <strong>{email}</strong> matches an account, a reset link is on its way. The link expires in one hour and can only be used once.
                  </p>
                  <p style={{ fontSize: '.82rem', color: 'var(--g500)', lineHeight: 1.7, marginBottom: 20 }}>
                    Nothing after a few minutes? Check spam, and confirm you used the address the account was created with. Admissions can confirm it on <a href="tel:09112777600" style={{ color: 'var(--blue)', fontWeight: 600 }}>0911 277 7600</a>.
                  </p>
                  <Link to="/login" className="btn btn--secondary btn--full">Back to Sign In</Link>
                </>
              ) : (
                <form onSubmit={handleSubmit}>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: 4 }}>Forgotten password</h3>
                  <p style={{ fontSize: '.82rem', color: 'var(--g500)', marginBottom: 24 }}>
                    Enter the email address on your account and we will send a link to set a new password.
                  </p>

                  <div className="fg">
                    <label className="flabel">Email Address</label>
                    <input
                      className="fi" type="email" autoComplete="email" autoFocus
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>

                  <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
                    {loading ? <span className="spin" /> : 'Send Reset Link'}
                  </button>

                  <p style={{ fontSize: '.82rem', textAlign: 'center', marginTop: 16 }}>
                    Remembered it? <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>Sign In</Link>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
