import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fmt } from '../../utils/paystack'

const COMM_TYPES = ['email', 'call', 'visit', 'letter']

const initDonors = () => [
  { id: 1, name: 'Mrs. Adeyemi Olufunmi', type: 'individual', totalGiven: 750000, lastGift: '2026-03-15', frequency: 'monthly', engagementScore: 87, preferredComm: 'call',
    comms: [
      { date: '2026-03-15', type: 'call', notes: 'Thanked for recurring donation. Expressed interest in sponsoring a client.' },
      { date: '2026-02-14', type: 'email', notes: 'Sent monthly impact newsletter. Opened and replied positively.' },
      { date: '2026-01-20', type: 'call', notes: 'New year check-in. Confirmed continued monthly pledge.' },
    ] },
  { id: 2, name: 'Zenith Bank Foundation', type: 'corporate', totalGiven: 5000000, lastGift: '2026-01-10', frequency: 'annual', engagementScore: 72, preferredComm: 'email',
    comms: [
      { date: '2026-01-10', type: 'email', notes: 'CSR grant disbursed for Q1 2026.' },
      { date: '2025-11-05', type: 'visit', notes: 'CSR team visited facility for due diligence.' },
    ] },
  { id: 3, name: 'RCCG Abuja Parish 4', type: 'church', totalGiven: 1200000, lastGift: '2026-02-28', frequency: 'quarterly', engagementScore: 91, preferredComm: 'visit',
    comms: [
      { date: '2026-02-28', type: 'visit', notes: 'Pastor visited facility. Committed to quarterly support.' },
      { date: '2025-12-15', type: 'call', notes: 'Christmas season planning call. Arranged carol service at facility.' },
    ] },
  { id: 4, name: 'Chief Emeka Okafor', type: 'individual', totalGiven: 2000000, lastGift: '2025-12-20', frequency: 'one-time', engagementScore: 45, preferredComm: 'letter',
    comms: [
      { date: '2025-12-20', type: 'letter', notes: 'Christmas donation. Sent thank-you letter and impact report.' },
    ] },
  { id: 5, name: 'Dangote Foundation', type: 'corporate', totalGiven: 10000000, lastGift: '2025-11-01', frequency: 'annual', engagementScore: 68, preferredComm: 'email',
    comms: [
      { date: '2025-11-01', type: 'email', notes: 'Equipment sponsorship agreement signed for 2026.' },
      { date: '2025-09-15', type: 'visit', notes: 'Foundation representatives toured facility.' },
      { date: '2025-08-01', type: 'email', notes: 'Initial proposal submitted for equipment grant.' },
    ] },
  { id: 6, name: 'Dr. Nnamdi Azikiwe', type: 'individual', totalGiven: 350000, lastGift: '2026-03-01', frequency: 'bi-monthly', engagementScore: 79, preferredComm: 'call',
    comms: [
      { date: '2026-03-01', type: 'call', notes: 'Regular check-in. Will increase giving from April.' },
      { date: '2026-01-05', type: 'email', notes: 'Shared annual report. Very impressed with outcomes.' },
    ] },
]

const MOCK_DONATIONS = {
  1: [
    { date: '2026-03-15', amount: 150000, purpose: 'Monthly Pledge', ref: 'DON-2603-001' },
    { date: '2026-02-15', amount: 150000, purpose: 'Monthly Pledge', ref: 'DON-2602-001' },
    { date: '2026-01-15', amount: 150000, purpose: 'Monthly Pledge', ref: 'DON-2601-001' },
    { date: '2025-12-15', amount: 150000, purpose: 'Monthly Pledge', ref: 'DON-2512-001' },
    { date: '2025-11-15', amount: 150000, purpose: 'Monthly Pledge', ref: 'DON-2511-001' },
  ],
  2: [
    { date: '2026-01-10', amount: 5000000, purpose: 'CSR Annual Grant — Q1 2026', ref: 'DON-ZBF-2601' },
  ],
  3: [
    { date: '2026-02-28', amount: 400000, purpose: 'Quarterly Church Offering', ref: 'DON-RCCG-Q1' },
    { date: '2025-11-30', amount: 400000, purpose: 'Quarterly Church Offering', ref: 'DON-RCCG-Q4' },
    { date: '2025-08-31', amount: 400000, purpose: 'Quarterly Church Offering', ref: 'DON-RCCG-Q3' },
  ],
  4: [
    { date: '2025-12-20', amount: 2000000, purpose: 'Christmas Gift — General Fund', ref: 'DON-CEO-2512' },
  ],
  5: [
    { date: '2025-11-01', amount: 7000000, purpose: 'Equipment Sponsorship Grant', ref: 'DON-DGF-EQ01' },
    { date: '2025-05-01', amount: 3000000, purpose: 'Facility Maintenance Grant', ref: 'DON-DGF-FM01' },
  ],
  6: [
    { date: '2026-03-01', amount: 75000, purpose: 'Bi-monthly Pledge', ref: 'DON-NA-2603' },
    { date: '2026-01-01', amount: 75000, purpose: 'Bi-monthly Pledge', ref: 'DON-NA-2601' },
    { date: '2025-11-01', amount: 75000, purpose: 'Bi-monthly Pledge', ref: 'DON-NA-2511' },
    { date: '2025-09-01', amount: 50000, purpose: 'Bi-monthly Pledge', ref: 'DON-NA-2509' },
    { date: '2025-07-01', amount: 50000, purpose: 'Bi-monthly Pledge', ref: 'DON-NA-2507' },
  ],
}

const typeColors = {
  individual: { bg: '#BEE3F8', color: '#2A4365' },
  corporate: { bg: '#E9D8FD', color: '#44337A' },
  church: { bg: '#FEFCBF', color: '#744210' },
}

export default function DonorDetail() {
  const { id } = useParams()
  const donors = initDonors()
  const donor = donors.find(d => String(d.id) === id)

  const [commForm, setCommForm] = useState({ date: '', type: 'email', notes: '' })
  const [comms, setComms] = useState(donor ? [...donor.comms] : [])

  if (!donor) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', marginBottom: 12 }}>Donor Not Found</h2>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)', marginBottom: 20 }}>No donor record matches this ID.</p>
        <Link to="/dashboard/donors" style={{ color: 'var(--blue)', fontWeight: 600, fontSize: '.88rem' }}>&larr; Back to Donors</Link>
      </div>
    )
  }

  const tc = typeColors[donor.type] || { bg: '#E2E8F0', color: '#4A5568' }
  const donations = MOCK_DONATIONS[donor.id] || []

  const handleLogComm = (e) => {
    e.preventDefault()
    if (!commForm.date || !commForm.notes) return
    setComms(prev => [{ ...commForm }, ...prev])
    setCommForm({ date: '', type: 'email', notes: '' })
  }

  const scoreColor = donor.engagementScore >= 80 ? '#1A7A4A' : donor.engagementScore >= 60 ? '#D69E2E' : '#E53E3E'

  return (
    <div>
      {/* Back link */}
      <Link to="/dashboard/donors" style={{ color: 'var(--blue)', fontWeight: 600, fontSize: '.84rem', textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}>
        &larr; Back to Donors
      </Link>

      {/* Donor Info Card */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', margin: 0 }}>{donor.name}</h1>
              <span style={{ padding: '3px 12px', borderRadius: 12, fontSize: '.72rem', fontWeight: 700, background: tc.bg, color: tc.color }}>
                {donor.type}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
              {[
                { label: 'Total Given', value: fmt(donor.totalGiven), color: '#1A7A4A' },
                { label: 'Engagement Score', value: `${donor.engagementScore}/100`, color: scoreColor },
                { label: 'Last Contact', value: donor.lastGift },
                { label: 'Frequency', value: donor.frequency.charAt(0).toUpperCase() + donor.frequency.slice(1) },
                { label: 'Preferred Communication', value: donor.preferredComm.charAt(0).toUpperCase() + donor.preferredComm.slice(1) },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: '.95rem', fontWeight: 700, color: item.color || 'var(--charcoal)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Communication History Timeline */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Communication History</h2>
        {comms.length === 0 ? (
          <p style={{ fontSize: '.84rem', color: 'var(--g400)' }}>No communication logged yet.</p>
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

      {/* Donations / Transactions Table */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Donations &amp; Transactions</h2>
        {donations.length === 0 ? (
          <p style={{ fontSize: '.84rem', color: 'var(--g400)' }}>No transactions on record.</p>
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
                {donations.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--g100)' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--g500)' }}>{d.date}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1A7A4A' }}>{fmt(d.amount)}</td>
                    <td style={{ padding: '8px 10px' }}>{d.purpose}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--g400)', fontFamily: 'monospace', fontSize: '.76rem' }}>{d.ref}</td>
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
              {COMM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Notes</label>
            <textarea value={commForm.notes} onChange={e => setCommForm(p => ({ ...p, notes: e.target.value }))}
              rows={3} placeholder="Communication summary..."
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem', resize: 'vertical' }} />
          </div>
          <div>
            <button type="submit" style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: 'var(--blue)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.82rem' }}>
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
