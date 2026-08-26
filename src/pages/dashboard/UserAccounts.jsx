import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotif } from '../../App'
import {
  isSupabaseReady, getProfiles, adminSetRole, adminUpdateProfile,
  adminCreateStaffAccount, sendPasswordReset,
} from '../../utils/supabase'

/*
  User Accounts — admin-only account administration.

  Creating an auth user normally needs the service-role key, which must never
  reach the browser. Instead a new account is signed up on an isolated Supabase
  client (so the admin stays signed in), then raised to its role through the
  admin_set_role SECURITY DEFINER function, which re-checks the caller is an
  admin in the database. The new member sets their own password from the emailed
  link, so no temporary password is ever shared.
*/

const ROLES = [
  { value: 'staff',   label: 'Staff',         desc: 'Clinical and operational dashboard access' },
  { value: 'admin',   label: 'Administrator', desc: 'Full access, including account management' },
  { value: 'family',  label: 'Family',        desc: 'Family portal for a linked resident' },
  { value: 'patient', label: 'Resident',      desc: 'Resident portal only' },
]
const ROLE_STYLE = {
  admin:   { bg: '#FED7D7', color: '#822727' },
  staff:   { bg: '#BEE3F8', color: '#2A4365' },
  family:  { bg: '#E9D8FD', color: '#44337A' },
  patient: { bg: '#C6F6D5', color: '#22543D' },
}

const BLANK = { email: '', fullName: '', phone: '', role: 'staff', department: '', title: '' }

export default function UserAccounts() {
  const { user } = useAuth()
  const showNotif = useNotif()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [notReady, setNotReady] = useState(false)
  const [filter, setFilter] = useState('all')
  const [busyId, setBusyId] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    if (!isSupabaseReady()) { setNotReady(true); setLoading(false); return }
    const { data, error } = await getProfiles()
    if (error) showNotif('Could not load accounts', error.message)
    setRows(data || [])
    setLoading(false)
  }

  // Admin-only page. Non-admins are bounced rather than shown a disabled UI.
  if (user && user.role !== 'admin') return <Navigate to="/dashboard" replace />

  const filtered = filter === 'all' ? rows : rows.filter(r => r.role === filter)
  const adminCount = rows.filter(r => r.role === 'admin').length

  async function changeRole(row, newRole) {
    if (busyId) return
    if (newRole === 'admin' && !window.confirm(`Give ${row.email} full administrator access, including the ability to manage every account?`)) return
    setBusyId(row.id)
    const { error } = await adminSetRole(row.id, newRole)
    setBusyId(null)
    if (error) { showNotif('Could not change role', error.message); return }
    setRows(prev => prev.map(r => (r.id === row.id ? { ...r, role: newRole } : r)))
    showNotif('Role updated', `${row.email} is now ${newRole}.`, 'ok')
  }

  async function resend(row) {
    setBusyId(row.id)
    const { error } = await sendPasswordReset(row.email)
    setBusyId(null)
    if (error) { showNotif('Could not send', error.message); return }
    showNotif('Reset link sent', `${row.email} can now set a new password.`, 'ok')
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.email.includes('@')) { showNotif('Required', 'Enter a valid email address.'); return }
    if (!form.fullName.trim()) { showNotif('Required', 'Enter the full name.'); return }

    setCreating(true)
    const { error, inviteError, partial } = await adminCreateStaffAccount(form)
    setCreating(false)

    if (error) {
      showNotif(partial ? 'Account made, role not set' : 'Could not create account', error.message)
      await load()
      return
    }
    if (inviteError) {
      showNotif('Account created', `Role set, but the invitation email failed: ${inviteError.message}. Use "Send reset link" on the row.`)
    } else {
      showNotif('Account created', `${form.email} has been emailed a link to set their password.`, 'ok')
    }
    setForm(BLANK)
    setShowNew(false)
    await load()
  }

  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>User Accounts</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
            Create staff logins and manage what each account can reach.
          </p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setShowNew(v => !v)}>
          {showNew ? 'Cancel' : 'New Account'}
        </button>
      </div>

      {showNew && (
        <form className="card" style={{ padding: 20, marginBottom: 20 }} onSubmit={handleCreate}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', marginBottom: 4 }}>Create a staff account</h3>
          <p style={{ fontSize: '.8rem', color: 'var(--g500)', marginBottom: 18, lineHeight: 1.6 }}>
            They receive an email inviting them to set their own password. No temporary password is created or shared.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div className="fg"><label className="flabel">Work Email *</label>
              <input className="fi" type="email" {...f('email')} placeholder="name@houseofrefugeng.org" /></div>
            <div className="fg"><label className="flabel">Full Name *</label>
              <input className="fi" {...f('fullName')} placeholder="Dr Adediwura Okeleye" /></div>
            <div className="fg"><label className="flabel">Phone</label>
              <input className="fi" {...f('phone')} placeholder="0911 277 7600" /></div>
            <div className="fg"><label className="flabel">Role *</label>
              <select className="fi" {...f('role')}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <div style={{ fontSize: '.74rem', color: 'var(--g500)', marginTop: 5 }}>
                {ROLES.find(r => r.value === form.role)?.desc}
              </div>
            </div>
            <div className="fg"><label className="flabel">Department</label>
              <input className="fi" {...f('department')} placeholder="Clinical" /></div>
            <div className="fg"><label className="flabel">Title</label>
              <input className="fi" {...f('title')} placeholder="Head of Clinical Services" /></div>
          </div>

          <button className="btn btn--primary" type="submit" disabled={creating} style={{ marginTop: 6 }}>
            {creating ? <span className="spin" /> : 'Create Account & Send Invite'}
          </button>
        </form>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Accounts', value: rows.length, color: 'var(--blue)' },
          { label: 'Administrators', value: adminCount, color: '#822727' },
          { label: 'Staff', value: rows.filter(r => r.role === 'staff').length, color: '#2A4365' },
          { label: 'Residents & Family', value: rows.filter(r => r.role === 'patient' || r.role === 'family').length, color: '#22543D' },
        ].map(k => (
          <div key={k.label} className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', ...ROLES.map(r => r.value)].map(v => (
          <button key={v} onClick={() => setFilter(v)}
            style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '.78rem',
              background: filter === v ? 'var(--blue)' : 'var(--g100)', color: filter === v ? '#fff' : 'var(--g600)',
            }}>
            {v === 'all' ? 'All' : ROLES.find(r => r.value === v)?.label}
          </button>
        ))}
      </div>

      {loading && <div className="card" style={{ padding: 40, textAlign: 'center' }}><span className="spin" /></div>}
      {!loading && notReady && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Account management is unavailable — the database is not configured.</p>
        </div>
      )}
      {!loading && !notReady && filtered.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)', margin: 0 }}>No accounts in this category.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(r => {
          const st = ROLE_STYLE[r.role] || { bg: '#E2E8F0', color: '#4A5568' }
          const isSelf = r.id === user?.id
          const lastAdmin = r.role === 'admin' && adminCount <= 1
          return (
            <div key={r.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--charcoal)' }}>{r.full_name || '—'}</span>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: '.68rem', fontWeight: 700, background: st.bg, color: st.color }}>
                      {ROLES.find(x => x.value === r.role)?.label || r.role}
                    </span>
                    {isSelf && <span style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600 }}>you</span>}
                  </div>
                  <div style={{ fontSize: '.8rem', color: 'var(--g600)' }}>{r.email}</div>
                  {(r.title || r.department) && (
                    <div style={{ fontSize: '.78rem', color: 'var(--g500)', marginTop: 3 }}>
                      {[r.title, r.department].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    className="fi"
                    style={{ width: 'auto', padding: '5px 10px', fontSize: '.78rem' }}
                    value={r.role}
                    disabled={busyId === r.id || isSelf || lastAdmin}
                    onChange={e => changeRole(r, e.target.value)}
                    title={isSelf ? 'You cannot change your own role' : lastAdmin ? 'The last administrator cannot be demoted' : 'Change role'}
                  >
                    {ROLES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                  <button className="btn btn--secondary btn--sm" disabled={busyId === r.id} onClick={() => resend(r)}>
                    Send reset link
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: '.76rem', color: 'var(--g500)', marginTop: 18, lineHeight: 1.7 }}>
        Role changes are recorded in an audit log with who made them. An administrator cannot remove their own access, and the last
        administrator account cannot be demoted, so the facility can never be locked out of its own platform.
      </p>
    </div>
  )
}
