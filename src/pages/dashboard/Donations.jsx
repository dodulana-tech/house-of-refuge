import React, { useState, useEffect } from 'react'
import { fmt } from '../../utils/paystack'
import { isSupabaseReady, getDonations, updateDonation } from '../../utils/supabase'

/*
  Donations — public /donate submissions.
  Each row is a pledge captured when a supporter fills the donate form (which then
  shows bank-transfer details). Staff reconcile pledges against bank receipts and
  move them pledged → received → thanked. Live data: `donations` table.
*/

const STATUSES = ['pledged', 'received', 'thanked']
const STATUS_STYLE = {
  pledged:  { bg: '#FEFCBF', color: '#744210', label: 'Pledged' },
  received: { bg: '#C6F6D5', color: '#22543D', label: 'Received' },
  thanked:  { bg: '#BEE3F8', color: '#2A4365', label: 'Thanked' },
}

function fmtDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Donations() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [notReady, setNotReady] = useState(false)
  const [filter, setFilter] = useState('all')
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    let active = true
    if (!isSupabaseReady()) {
      setNotReady(true)
      setLoading(false)
      return
    }
    getDonations().then(({ data, error }) => {
      if (!active) return
      if (error) console.error(error)
      setRows(data || [])
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const totalPledged = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const receivedSum = rows
    .filter(r => r.status === 'received' || r.status === 'thanked')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)

  const setStatus = async (row, status) => {
    if (savingId) return
    setSavingId(row.id)
    const { data, error } = await updateDonation(row.id, { status })
    setSavingId(null)
    if (error) { alert(error.message || 'Failed to update donation.'); return }
    setRows(prev => prev.map(r => (r.id === row.id ? (data || { ...r, status }) : r)))
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Donations</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
          Pledges submitted on the public donate page. Reconcile against bank receipts and mark received.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Pledges', value: rows.length, color: 'var(--blue)' },
          { label: 'Amount Pledged', value: fmt(totalPledged), color: '#744210' },
          { label: 'Received', value: fmt(receivedSum), color: '#1A7A4A' },
          { label: 'Awaiting', value: rows.filter(r => r.status === 'pledged').length, color: '#B7791F' },
        ].map(kpi => (
          <div key={kpi.label} className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', ...STATUSES].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '.78rem',
              background: filter === f ? 'var(--blue)' : 'var(--g100)', color: filter === f ? '#fff' : 'var(--g600)',
            }}>
            {f === 'all' ? 'All' : (STATUS_STYLE[f]?.label || f)}
          </button>
        ))}
      </div>

      {/* States */}
      {loading && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Loading donations…</p>
        </div>
      )}
      {!loading && notReady && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Donations are unavailable — the database is not configured.</p>
        </div>
      )}
      {!loading && !notReady && rows.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)', margin: 0 }}>No donations yet. Submissions from the donate page appear here.</p>
        </div>
      )}
      {!loading && !notReady && rows.length > 0 && filtered.length === 0 && (
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: '.84rem', color: 'var(--g500)', margin: 0 }}>No {STATUS_STYLE[filter]?.label.toLowerCase() || filter} donations.</p>
        </div>
      )}

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(r => {
          const st = STATUS_STYLE[r.status] || { bg: '#E2E8F0', color: '#4A5568', label: r.status }
          const name = [r.first_name, r.last_name].filter(Boolean).join(' ')
          return (
            <div key={r.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--charcoal)' }}>{name || '—'}</span>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: '.68rem', fontWeight: 700, background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '.8rem', color: 'var(--g500)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span>{r.amount ? <>Amount: <strong style={{ color: '#744210' }}>{fmt(Number(r.amount))}</strong></> : 'Amount: unspecified'}</span>
                    <span>{fmtDate(r.created_at)}</span>
                  </div>
                  <div style={{ fontSize: '.8rem', color: 'var(--g600)', display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                    <a href={'mailto:' + r.email} style={{ color: 'var(--blue)', textDecoration: 'none' }}>{r.email}</a>
                    {r.phone && <a href={'tel:' + r.phone} style={{ color: 'var(--g600)', textDecoration: 'none' }}>{r.phone}</a>}
                  </div>
                  {r.message && (
                    <div style={{ fontSize: '.8rem', color: 'var(--g600)', marginTop: 6, fontStyle: 'italic' }}>“{r.message}”</div>
                  )}
                </div>

                {/* Status actions */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STATUSES.filter(s => s !== r.status).map(s => (
                    <button key={s} onClick={() => setStatus(r, s)} disabled={savingId === r.id}
                      style={{
                        padding: '5px 12px', borderRadius: 6, border: '1px solid var(--g200)', background: '#fff',
                        cursor: savingId === r.id ? 'default' : 'pointer', opacity: savingId === r.id ? 0.6 : 1,
                        fontSize: '.75rem', fontWeight: 600,
                      }}>
                      Mark {STATUS_STYLE[s]?.label || s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
