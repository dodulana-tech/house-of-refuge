import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { fmt } from '../../utils/paystack'

/*
  Donor CRM — per SOP Chapter 12
  5 Income Streams: Individual Donors, Corporate Sponsorship, Grants, Client Fees, Revenue Ventures
*/

const DONOR_TYPES = ['individual', 'corporate', 'church']
const COMM_TYPES = ['email', 'call', 'visit', 'letter']

const initDonors = () => [
  { id: 1, name: 'Mrs. Adeyemi Olufunmi', type: 'individual', totalGiven: 750000, lastGift: '2026-03-15', frequency: 'monthly',
    comms: [{ date: '2026-03-15', type: 'call', notes: 'Thanked for recurring donation. Expressed interest in sponsoring a client.' }] },
  { id: 2, name: 'Zenith Bank Foundation', type: 'corporate', totalGiven: 5000000, lastGift: '2026-01-10', frequency: 'annual',
    comms: [{ date: '2026-01-10', type: 'email', notes: 'CSR grant disbursed for Q1 2026.' }] },
  { id: 3, name: 'RCCG Abuja Parish 4', type: 'church', totalGiven: 1200000, lastGift: '2026-02-28', frequency: 'quarterly',
    comms: [{ date: '2026-02-28', type: 'visit', notes: 'Pastor visited facility. Committed to quarterly support.' }] },
  { id: 4, name: 'Chief Emeka Okafor', type: 'individual', totalGiven: 2000000, lastGift: '2025-12-20', frequency: 'one-time',
    comms: [{ date: '2025-12-20', type: 'letter', notes: 'Christmas donation. Sent thank-you letter and impact report.' }] },
  { id: 5, name: 'Dangote Foundation', type: 'corporate', totalGiven: 10000000, lastGift: '2025-11-01', frequency: 'annual',
    comms: [{ date: '2025-11-01', type: 'email', notes: 'Equipment sponsorship agreement signed for 2026.' }] },
  { id: 6, name: 'Dr. Nnamdi Azikiwe', type: 'individual', totalGiven: 350000, lastGift: '2026-03-01', frequency: 'bi-monthly',
    comms: [{ date: '2026-03-01', type: 'call', notes: 'Regular check-in. Will increase giving from April.' }] },
]

export default function DonorCRM() {
  const [donors, setDonors] = useState(initDonors)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showCommForm, setShowCommForm] = useState(null)
  const [donorForm, setDonorForm] = useState({ name: '', type: 'individual', totalGiven: '', frequency: 'one-time' })
  const [commForm, setCommForm] = useState({ date: '', type: 'email', notes: '' })
  const [filter, setFilter] = useState('all')

  const totalRaised = donors.reduce((s, d) => s + d.totalGiven, 0)
  const filtered = filter === 'all' ? donors : donors.filter(d => d.type === filter)

  const handleAddDonor = e => {
    e.preventDefault()
    if (!donorForm.name) return
    setDonors(prev => [...prev, {
      id: Date.now(),
      name: donorForm.name,
      type: donorForm.type,
      totalGiven: Number(donorForm.totalGiven) || 0,
      lastGift: new Date().toISOString().split('T')[0],
      frequency: donorForm.frequency,
      comms: [],
    }])
    setDonorForm({ name: '', type: 'individual', totalGiven: '', frequency: 'one-time' })
    setShowAddForm(false)
  }

  const handleLogComm = (donorId) => {
    if (!commForm.date || !commForm.notes) return
    setDonors(prev => prev.map(d =>
      d.id === donorId ? { ...d, comms: [{ ...commForm }, ...d.comms] } : d
    ))
    setCommForm({ date: '', type: 'email', notes: '' })
    setShowCommForm(null)
  }

  const typeColors = {
    individual: { bg: '#BEE3F8', color: '#2A4365' },
    corporate: { bg: '#E9D8FD', color: '#44337A' },
    church: { bg: '#FEFCBF', color: '#744210' },
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Donor CRM</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Donor management across all 5 income streams — SOP Chapter 12</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Raised', value: fmt(totalRaised), color: '#1A7A4A' },
          { label: 'Total Donors', value: donors.length, color: 'var(--blue)' },
          { label: 'Individual', value: donors.filter(d => d.type === 'individual').length, color: '#2A4365' },
          { label: 'Corporate', value: donors.filter(d => d.type === 'corporate').length, color: '#44337A' },
          { label: 'Church', value: donors.filter(d => d.type === 'church').length, color: '#744210' },
        ].map(kpi => (
          <div key={kpi.label} className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Filter + Add */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', ...DONOR_TYPES].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '.78rem',
                background: filter === f ? 'var(--blue)' : 'var(--g100)', color: filter === f ? '#fff' : 'var(--g600)',
              }}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)}
          style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#1A7A4A', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.8rem' }}>
          {showAddForm ? 'Cancel' : '+ Add Donor'}
        </button>
      </div>

      {/* Add Donor Form */}
      {showAddForm && (
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Add New Donor</h3>
          <form onSubmit={handleAddDonor} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Donor Name</label>
              <input type="text" value={donorForm.name} onChange={e => setDonorForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Full name or organisation" style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Type</label>
              <select value={donorForm.type} onChange={e => setDonorForm(p => ({ ...p, type: e.target.value }))}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }}>
                {DONOR_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Initial Gift Amount</label>
              <input type="number" value={donorForm.totalGiven} onChange={e => setDonorForm(p => ({ ...p, totalGiven: e.target.value }))}
                placeholder="0" style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Frequency</label>
              <select value={donorForm.frequency} onChange={e => setDonorForm(p => ({ ...p, frequency: e.target.value }))}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }}>
                {['one-time', 'monthly', 'quarterly', 'bi-monthly', 'annual'].map(f => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: '#1A7A4A', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.82rem' }}>
                Save Donor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Donor List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(d => {
          const tc = typeColors[d.type]
          return (
            <div key={d.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Link to={'/dashboard/donors/' + d.id} style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--charcoal)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--blue)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--charcoal)'}>{d.name}</Link>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: '.68rem', fontWeight: 700, background: tc.bg, color: tc.color }}>
                      {d.type}
                    </span>
                  </div>
                  <div style={{ fontSize: '.8rem', color: 'var(--g500)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span>Total: <strong style={{ color: '#1A7A4A' }}>{fmt(d.totalGiven)}</strong></span>
                    <span>Last Gift: {d.lastGift}</span>
                    <span>Frequency: {d.frequency}</span>
                  </div>
                </div>
                <button onClick={() => setShowCommForm(showCommForm === d.id ? null : d.id)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--g200)', background: '#fff', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600 }}>
                  {showCommForm === d.id ? 'Close' : 'Log Communication'}
                </button>
              </div>

              {/* Log Communication Form */}
              {showCommForm === d.id && (
                <div style={{ marginTop: 12, padding: 14, background: 'var(--g50, #F7FAFC)', borderRadius: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>Date</label>
                      <input type="date" value={commForm.date} onChange={e => setCommForm(p => ({ ...p, date: e.target.value }))}
                        style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.8rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>Type</label>
                      <select value={commForm.type} onChange={e => setCommForm(p => ({ ...p, type: e.target.value }))}
                        style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.8rem' }}>
                        {COMM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>Notes</label>
                      <textarea value={commForm.notes} onChange={e => setCommForm(p => ({ ...p, notes: e.target.value }))}
                        rows={2} placeholder="Communication summary..."
                        style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.8rem', resize: 'vertical' }} />
                    </div>
                  </div>
                  <button onClick={() => handleLogComm(d.id)}
                    style={{ marginTop: 8, padding: '6px 18px', borderRadius: 6, border: 'none', background: 'var(--blue)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.78rem' }}>
                    Save Entry
                  </button>
                </div>
              )}

              {/* Communication Log */}
              {d.comms.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', marginBottom: 4 }}>Communication Log</div>
                  {d.comms.slice(0, 3).map((c, i) => (
                    <div key={i} style={{ fontSize: '.78rem', padding: '4px 0', borderTop: '1px solid var(--g100)', display: 'flex', gap: 10 }}>
                      <span style={{ color: 'var(--g400)', minWidth: 80 }}>{c.date}</span>
                      <span style={{ fontWeight: 600, minWidth: 44, textTransform: 'capitalize' }}>{c.type}</span>
                      <span style={{ color: 'var(--g600)' }}>{c.notes}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
