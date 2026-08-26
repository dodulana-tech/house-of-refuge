import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNotif } from '../../App'
import { isSupabaseReady, verifyPassword, updatePassword } from '../../utils/supabase'

/*
  My Account — profile summary and self-service password change.
  Available to every signed-in role.
*/

function strength(pw) {
  if (pw.length < 10) return { ok: false, msg: 'Use at least 10 characters.' }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(re => re.test(pw)).length
  if (classes < 3) return { ok: false, msg: 'Mix upper case, lower case, numbers, and symbols.' }
  return { ok: true, msg: 'Strong enough.' }
}

const ROLE_LABEL = { admin: 'Administrator', staff: 'Staff', patient: 'Resident', family: 'Family' }

export default function Account() {
  const { user } = useAuth()
  const showNotif = useNotif()
  const [current, setCurrent] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [saving, setSaving] = useState(false)

  const s = pw ? strength(pw) : null

  async function handleChange(e) {
    e.preventDefault()
    if (!isSupabaseReady()) { showNotif('Unavailable', 'The database is not configured.'); return }
    if (!current) { showNotif('Required', 'Enter your current password.'); return }
    const st = strength(pw)
    if (!st.ok) { showNotif('Password too weak', st.msg); return }
    if (pw !== pw2) { showNotif('Mismatch', 'The two new passwords do not match.'); return }
    if (pw === current) { showNotif('No change', 'The new password matches your current one.'); return }

    setSaving(true)
    // Re-authenticate first: without this, anyone with access to an unlocked
    // machine could change the password of whoever is signed in.
    const valid = await verifyPassword(user.email, current)
    if (!valid) {
      setSaving(false)
      showNotif('Incorrect password', 'Your current password is not correct.')
      return
    }

    const { error } = await updatePassword(pw)
    setSaving(false)
    if (error) { showNotif('Could not update', error.message); return }

    setCurrent(''); setPw(''); setPw2('')
    showNotif('Password updated', 'Your new password is active from now on.', 'ok')
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>My Account</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Your profile and sign-in security.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, alignItems: 'start' }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', marginBottom: 14 }}>Profile</h3>
          {[
            ['Name', user?.name || user?.full_name || '—'],
            ['Email', user?.email || '—'],
            ['Role', ROLE_LABEL[user?.role] || user?.role || '—'],
            ['Title', user?.title || '—'],
            ['Department', user?.department || '—'],
            ['Phone', user?.phone || '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--g100)' }}>
              <span style={{ fontSize: '.8rem', color: 'var(--g500)' }}>{k}</span>
              <span style={{ fontSize: '.84rem', fontWeight: 600, textAlign: 'right' }}>{v}</span>
            </div>
          ))}
          <p style={{ fontSize: '.76rem', color: 'var(--g500)', marginTop: 12, lineHeight: 1.6 }}>
            Name, title, and department are maintained by an administrator. Ask them to update anything that is wrong here.
          </p>
        </div>

        <form className="card" style={{ padding: 20 }} onSubmit={handleChange}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', marginBottom: 4 }}>Change Password</h3>
          <p style={{ fontSize: '.8rem', color: 'var(--g500)', marginBottom: 18 }}>
            At least 10 characters, mixing upper case, lower case, numbers, and symbols.
          </p>

          <div className="fg">
            <label className="flabel">Current Password</label>
            <input className="fi" type="password" autoComplete="current-password"
              value={current} onChange={e => setCurrent(e.target.value)} placeholder="Your current password" />
          </div>
          <div className="fg">
            <label className="flabel">New Password</label>
            <input className="fi" type="password" autoComplete="new-password"
              value={pw} onChange={e => setPw(e.target.value)} placeholder="Choose a new password" />
            {s && <div style={{ fontSize: '.76rem', marginTop: 6, color: s.ok ? '#1A7A4A' : '#B7791F' }}>{s.msg}</div>}
          </div>
          <div className="fg">
            <label className="flabel">Confirm New Password</label>
            <input className="fi" type="password" autoComplete="new-password"
              value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Re-enter the new password" />
            {pw2 && pw !== pw2 && <div style={{ fontSize: '.76rem', marginTop: 6, color: '#C53030' }}>Passwords do not match.</div>}
          </div>

          <button className="btn btn--primary btn--full" type="submit" disabled={saving}>
            {saving ? <span className="spin" /> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
