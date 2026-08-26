import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseReady, updatePassword } from '../utils/supabase'
import { useNotif } from '../App'
import styles from './Login.module.css'

/*
  Landing page for the emailed recovery link.

  Supabase has shipped three link formats over the years and which one arrives
  depends on project settings, so all three are handled rather than assuming:
    - implicit  : tokens in the URL hash, consumed automatically by detectSessionInUrl
    - PKCE      : ?code=... exchanged for a session
    - token hash: ?token_hash=...&type=recovery verified as an OTP
  Whichever path succeeds leaves a temporary recovery session, which is what
  allows updateUser({ password }) to run without the old password.
*/

function strength(pw) {
  if (pw.length < 10) return { ok: false, msg: 'Use at least 10 characters.' }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(re => re.test(pw)).length
  if (classes < 3) return { ok: false, msg: 'Mix upper case, lower case, numbers, and symbols.' }
  return { ok: true, msg: 'Strong enough.' }
}

export default function ResetPassword() {
  const showNotif = useNotif()
  const nav = useNavigate()
  const [phase, setPhase] = useState('checking') // checking | ready | invalid | done
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    if (!isSupabaseReady()) { setPhase('invalid'); return }

    // A recovery session may land slightly after mount, so listen as well as poll.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || session) setPhase('ready')
    })

    ;(async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const tokenHash = params.get('token_hash')

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
          if (error) throw error
        }
      } catch {
        if (active) setPhase('invalid')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return
      setPhase(session ? 'ready' : 'invalid')
    })()

    return () => { active = false; subscription.unsubscribe() }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const s = strength(pw)
    if (!s.ok) { showNotif('Password too weak', s.msg); return }
    if (pw !== pw2) { showNotif('Mismatch', 'The two passwords do not match.'); return }

    setSaving(true)
    const { error } = await updatePassword(pw)
    setSaving(false)
    if (error) { showNotif('Could not update', error.message); return }

    setPhase('done')
    // Force a fresh sign-in so the recovery session is not reused as a login.
    await supabase.auth.signOut()
    showNotif('Password updated', 'Sign in with your new password.', 'ok')
    setTimeout(() => nav('/login'), 2200)
  }

  const s = pw ? strength(pw) : null

  return (
    <>
      <Helmet>
        <title>Set a New Password | House of Refuge</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="ph"><div className="container">
        <h1>Set a New Password</h1>
        <p>Choose a password you do not use anywhere else</p>
      </div></div>

      <section className="section">
        <div className="container">
          <div className={styles.wrap}>
            <div className="card" style={{ maxWidth: 440, margin: '0 auto' }}>
              {phase === 'checking' && (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                  <span className="spin" />
                  <p style={{ fontSize: '.84rem', color: 'var(--g500)', marginTop: 12 }}>Verifying your link…</p>
                </div>
              )}

              {phase === 'invalid' && (
                <>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: 8 }}>This link is no longer valid</h3>
                  <p style={{ fontSize: '.86rem', color: 'var(--g700)', lineHeight: 1.7, marginBottom: 20 }}>
                    Reset links expire after one hour and can only be used once. Request a fresh one and it will work.
                  </p>
                  <Link to="/forgot-password" className="btn btn--primary btn--full">Request a New Link</Link>
                  <p style={{ fontSize: '.82rem', textAlign: 'center', marginTop: 16 }}>
                    <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>Back to Sign In</Link>
                  </p>
                </>
              )}

              {phase === 'done' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: 8 }}>Password updated</h3>
                  <p style={{ fontSize: '.86rem', color: 'var(--g700)' }}>Taking you to sign in…</p>
                </div>
              )}

              {phase === 'ready' && (
                <form onSubmit={handleSubmit}>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: 4 }}>Choose a new password</h3>
                  <p style={{ fontSize: '.82rem', color: 'var(--g500)', marginBottom: 24 }}>
                    At least 10 characters, mixing upper case, lower case, numbers, and symbols.
                  </p>

                  <div className="fg">
                    <label className="flabel">New Password</label>
                    <input
                      className="fi" type="password" autoComplete="new-password" autoFocus
                      value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter a new password"
                    />
                    {s && (
                      <div style={{ fontSize: '.76rem', marginTop: 6, color: s.ok ? '#1A7A4A' : '#B7791F' }}>
                        {s.msg}
                      </div>
                    )}
                  </div>

                  <div className="fg">
                    <label className="flabel">Confirm New Password</label>
                    <input
                      className="fi" type="password" autoComplete="new-password"
                      value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Re-enter the password"
                    />
                    {pw2 && pw !== pw2 && (
                      <div style={{ fontSize: '.76rem', marginTop: 6, color: '#C53030' }}>Passwords do not match.</div>
                    )}
                  </div>

                  <button className="btn btn--primary btn--full" type="submit" disabled={saving}>
                    {saving ? <span className="spin" /> : 'Update Password'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
