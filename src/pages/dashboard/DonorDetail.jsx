import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fmt } from '../../utils/paystack'
import { isSupabaseReady, getDonor, updateDonor } from '../../utils/supabase'
import { requireFields } from '../../utils/formGuard'

const COMM_TYPES = ['email', 'call', 'visit', 'letter']
const STATUS_OPTIONS = ['active', 'lapsed', 'prospect', 'inactive']

const typeColors = {
  individual: { bg: '#BEE3F8', color: '#2A4365' },
  corporate: { bg: '#E9D8FD', color: '#44337A' },
  church: { bg: '#FEFCBF', color: '#744210' },
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

export default function DonorDetail() {
  const { id } = useParams()

  const [donor, setDonor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)

  const [commForm, setCommForm] = useState({ date: '', type: 'email', notes: '' })

  useEffect(() => {
    let active = true
    if (!isSupabaseReady()) {
      setLoading(false)
      setNotFound(true)
      return
    }
    setLoading(true)
    getDonor(id).then(({ data, error }) => {
      if (!active) return
      if (error) {
        if (error.code === 'PGRST116') setNotFound(true)
        else { console.error(error); setNotFound(true) }
      } else if (!data) {
        setNotFound(true)
      } else {
        setDonor(data)
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [id])

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Loading donor…</p>
      </div>
    )
  }

  if (notFound || !donor) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', marginBottom: 12 }}>Donor Not Found</h2>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)', marginBottom: 20 }}>No donor record matches this ID.</p>
        <Link to="/dashboard/donors" style={{ color: 'var(--blue)', fontWeight: 600, fontSize: '.88rem' }}>&larr; Back to Donors</Link>
      </div>
    )
  }

  const data = donor.data || {}
  const comms = Array.isArray(data.communications) ? data.communications : []
  const gifts = Array.isArray(data.gifts) ? data.gifts : []
  const tc = typeColors[donor.type] || { bg: '#E2E8F0', color: '#4A5568' }

  const persist = async (updates) => {
    setSaving(true)
    const { data: updated, error } = await updateDonor(donor.id, updates)
    setSaving(false)
    if (error) {
      if (error.code === 'PGRST116') { setNotFound(true); return false }
      alert(error.message || 'Failed to save changes.')
      return false
    }
    if (updated) setDonor(updated)
    else setDonor(prev => ({ ...prev, ...updates }))
    return true
  }

  const handleLogComm = async (e) => {
    e.preventDefault()
    if (saving) return
    if (!requireFields([
      [commForm.date, 'Date'],
      [commForm.notes, 'Notes'],
    ])) return
    const entry = { date: commForm.date, type: commForm.type, notes: commForm.notes }
    const nextComms = [entry, ...comms]
    const ok = await persist({ data: { ...data, communications: nextComms } })
    if (ok) setCommForm({ date: '', type: 'email', notes: '' })
  }

  const handleStatusChange = async (e) => {
    const status = e.target.value
    if (saving) return
    await persist({ status })
  }

  return (
    <div>
      {/* Back link */}
      <Link to="/dashboard/donors" style={{ color: 'var(--blue)', fontWeight: 600, fontSize: '.84rem', textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}>
        &larr; Back to Donors
      </Link>

      {/* Donor Info Card */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', margin: 0 }}>{donor.name}</h1>
              {donor.type && (
                <span style={{ padding: '3px 12px', borderRadius: 12, fontSize: '.72rem', fontWeight: 700, background: tc.bg, color: tc.color, textTransform: 'capitalize' }}>
                  {donor.type}
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
              {[
                { label: 'Total Given', value: fmt(donor.total_given || 0), color: '#1A7A4A' },
                { label: 'Email', value: donor.email || '—' },
                { label: 'Phone', value: donor.phone || '—' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: '.95rem', fontWeight: 700, color: item.color || 'var(--charcoal)' }}>{item.value}</div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginBottom: 2 }}>Status</div>
                <select value={donor.status || ''} onChange={handleStatusChange} disabled={saving}
                  style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.85rem', fontWeight: 700 }}>
                  {!donor.status && <option value="">—</option>}
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{cap(s)}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Communication History Timeline */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Communication History</h2>
        {comms.length === 0 ? (
          <p style={{ fontSize: '.84rem', color: 'var(--g400)' }}>No communications logged yet.</p>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            <div style={{ position: 'absolute', left: 6, top: 4, bottom: 4, width: 2, background: 'var(--g200)' }} />
            {comms.map((c, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: 16, paddingLeft: 16 }}>
                <div style={{
                  position: 'absolute', left: -16, top: 4, width: 10, height: 10, borderRadius: '50%',
                  background: i === 0 ? 'var(--blue)' : 'var(--g300)',
                }} />
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '.78rem', color: 'var(--g400)', minWidth: 80 }}>{c.date}</span>
                  <span style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'capitalize', color: 'var(--blue)' }}>{c.type}</span>
                </div>
                <p style={{ fontSize: '.84rem', color: 'var(--g600)', margin: '4px 0 0' }}>{c.notes}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gifts / Transactions Table */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Donations &amp; Transactions</h2>
        {gifts.length === 0 ? (
          <p style={{ fontSize: '.84rem', color: 'var(--g400)' }}>No gifts recorded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--g200)' }}>
                  {['Date', 'Amount', 'Purpose', 'Reference'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, fontSize: '.72rem', color: 'var(--g500)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gifts.map((g, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--g100)' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--g500)' }}>{g.date || '—'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1A7A4A' }}>{g.amount != null ? fmt(g.amount) : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{g.purpose || '—'}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--g400)', fontFamily: 'monospace', fontSize: '.76rem' }}>{g.ref || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Communication Form */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Log Communication</h2>
        <form onSubmit={handleLogComm} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Date</label>
            <input type="date" value={commForm.date} onChange={e => setCommForm(p => ({ ...p, date: e.target.value }))}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }} />
          </div>
          <div>
            <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Type</label>
            <select value={commForm.type} onChange={e => setCommForm(p => ({ ...p, type: e.target.value }))}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }}>
              {COMM_TYPES.map(t => <option key={t} value={t}>{cap(t)}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Notes</label>
            <textarea value={commForm.notes} onChange={e => setCommForm(p => ({ ...p, notes: e.target.value }))}
              rows={3} placeholder="Communication summary..."
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem', resize: 'vertical' }} />
          </div>
          <div>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: 'var(--blue)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '.82rem', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
