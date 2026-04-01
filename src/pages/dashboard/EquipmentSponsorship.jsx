import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../utils/paystack'
import { load, save } from '../../utils/store'
import { SPONSOR_ITEMS, CAT_LABELS, TOTAL_GOAL } from '../../data/items'

/*
  Equipment Sponsorship — SOP Chapter 12
  32-item sponsorship tracking with category filters and progress.
  HIPAA: no patient data.
*/

const STORE_KEY = 'equip_sponsorship'
const SPONSOR_STATUSES = ['Unsponsored', 'Partially Sponsored', 'Fully Sponsored', 'Delivered', 'Installed']
const statusColors = { Unsponsored: 'var(--g400)', 'Partially Sponsored': '#DD6B20', 'Fully Sponsored': '#1A7A4A', Delivered: 'var(--blue)', Installed: '#805AD5' }
const DELIVERY_STATUSES = ['Pending', 'Ordered', 'In Transit', 'Delivered', 'Installed']

const DONORS = ['Anonymous', 'Mrs. Adeyemi', 'Pastor Johnson', 'Okonkwo Foundation', 'GTBank CSR', 'Shell Nigeria', 'MTN Foundation', 'Dangote Foundation', 'NDLEA Partners', 'Individual Donor']

function initItemState() {
  const saved = load(STORE_KEY, null)
  if (saved) return saved
  const state = {}
  SPONSOR_ITEMS.forEach(item => {
    const preSponsored = [2, 6, 14, 17, 25].includes(item.id)
    state[item.id] = {
      status: preSponsored ? 'Fully Sponsored' : 'Unsponsored',
      sponsor: preSponsored ? DONORS[Math.floor(Math.random() * 3) + 1] : '',
      dateSpon: preSponsored ? '2026-03-15' : '',
      delivery: preSponsored ? 'Delivered' : 'Pending',
    }
  })
  save(STORE_KEY, state)
  return state
}

export default function EquipmentSponsorship() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('all')
  const [itemStates, setItemStates] = useState(initItemState)

  const handleField = (id, field, val) => {
    setItemStates(prev => {
      const next = { ...prev, [id]: { ...prev[id], [field]: val } }
      save(STORE_KEY, next)
      return next
    })
  }

  const categories = ['all', 'general', 'medical', 'additional']
  const filtered = filter === 'all' ? SPONSOR_ITEMS : SPONSOR_ITEMS.filter(i => i.cat === filter)

  const sponsored = SPONSOR_ITEMS.filter(i => ['Fully Sponsored', 'Delivered', 'Installed'].includes(itemStates[i.id].status))
  const sponsoredAmount = sponsored.reduce((s, i) => s + i.total, 0)
  const remaining = TOTAL_GOAL - sponsoredAmount
  const pct = Math.round((sponsoredAmount / TOTAL_GOAL) * 100)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Equipment Sponsorship</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>32-item facility sponsorship tracking — {fmt(TOTAL_GOAL)} target</p>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: '.88rem', fontWeight: 600 }}>Total Sponsorship Progress</span>
          <span style={{ fontSize: '.88rem', fontWeight: 700, color: '#1A7A4A' }}>{pct}%</span>
        </div>
        <div style={{ width: '100%', height: 16, background: 'var(--g100)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #1A7A4A, #38A169)', borderRadius: 8, transition: 'width .3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: '.72rem', color: 'var(--g500)' }}>{fmt(sponsoredAmount)} raised</span>
          <span style={{ fontSize: '.72rem', color: 'var(--g500)' }}>{fmt(TOTAL_GOAL)} goal</span>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: '#1A7A4A' }}>{sponsored.length}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Items Sponsored</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: '#DD6B20' }}>{SPONSOR_ITEMS.length - sponsored.length}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Items Remaining</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--blue)' }}>{fmt(sponsoredAmount)}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Total Funded</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--gold)' }}>{fmt(remaining)}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Remaining Need</div>
        </div>
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: filter === c ? 'var(--charcoal)' : 'var(--g100)', color: filter === c ? '#fff' : 'var(--g600)', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer' }}>
            {c === 'all' ? 'All Items' : CAT_LABELS[c]} ({c === 'all' ? SPONSOR_ITEMS.length : SPONSOR_ITEMS.filter(i => i.cat === c).length})
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {filtered.map(item => {
          const st = itemStates[item.id]
          return (
            <div key={item.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{item.name}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Qty: {item.qty} | {fmt(item.total)}{item.sfx || ''}</div>
                </div>
                <span style={{ fontSize: '.68rem', padding: '2px 8px', borderRadius: 10, background: (statusColors[st.status] || 'var(--g400)') + '18', color: statusColors[st.status], fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {st.status}
                </span>
              </div>
              <span style={{ display: 'inline-block', fontSize: '.68rem', padding: '2px 8px', borderRadius: 10, background: 'var(--g100)', color: 'var(--g600)', marginBottom: 10 }}>{CAT_LABELS[item.cat]}</span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '.7rem', color: 'var(--g500)', display: 'block', marginBottom: 2 }}>Status</label>
                  <select value={st.status} onChange={e => handleField(item.id, 'status', e.target.value)}
                    style={{ width: '100%', padding: '5px 6px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.78rem' }}>
                    {SPONSOR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '.7rem', color: 'var(--g500)', display: 'block', marginBottom: 2 }}>Sponsor</label>
                  <input type="text" value={st.sponsor} onChange={e => handleField(item.id, 'sponsor', e.target.value)}
                    list={`donors-${item.id}`} placeholder="Type or select sponsor"
                    style={{ width: '100%', padding: '5px 6px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.78rem' }} />
                  <datalist id={`donors-${item.id}`}>
                    {DONORS.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>
                <div>
                  <label style={{ fontSize: '.7rem', color: 'var(--g500)', display: 'block', marginBottom: 2 }}>Date Sponsored</label>
                  <input type="date" value={st.dateSpon} onChange={e => handleField(item.id, 'dateSpon', e.target.value)}
                    style={{ width: '100%', padding: '5px 6px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.78rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '.7rem', color: 'var(--g500)', display: 'block', marginBottom: 2 }}>Delivery</label>
                  <select value={st.delivery} onChange={e => handleField(item.id, 'delivery', e.target.value)}
                    style={{ width: '100%', padding: '5px 6px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.78rem' }}>
                    {DELIVERY_STATUSES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
