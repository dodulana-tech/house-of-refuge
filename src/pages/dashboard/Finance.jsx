import React, { useState } from 'react'
import { fmt } from '../../utils/paystack'

/*
  Financial Overview — Revenue streams per SOP Chapter 12:
  1. Client Fees (Full / Subsidised / Compassion Fund)
  2. Individual Donors
  3. Corporate Sponsorship
  4. Grants (Local & International)
  5. Equipment Sponsorship
  6. Revenue-Generating Ventures
*/

const REVENUE = {
  deposits: 3000000,
  treatmentFees: 1700000,
  donations: 875000,
  sponsorship: 920000,
  grants: 0,
}

const TRANSACTIONS = [
  { date: '2026-04-01', desc: 'Booking Deposit — Chidi Okonkwo', type: 'deposit', amount: 1000000, status: 'verified', ref: 'HOR_WL_001' },
  { date: '2026-03-28', desc: 'Booking Deposit — Adaeze Nnamdi', type: 'deposit', amount: 1000000, status: 'verified', ref: 'HOR_WL_002' },
  { date: '2026-03-25', desc: 'Booking Deposit — Kunle Adeyemi', type: 'deposit', amount: 1000000, status: 'verified', ref: 'HOR_WL_003' },
  { date: '2026-04-01', desc: 'Treatment Fee — Month 1 (Chidi)', type: 'treatment', amount: 850000, status: 'verified', ref: 'HOR_TF_001' },
  { date: '2026-03-30', desc: 'Treatment Fee — Month 2 (Kunle)', type: 'treatment', amount: 850000, status: 'verified', ref: 'HOR_TF_002' },
  { date: '2026-03-28', desc: 'Donation — Anonymous', type: 'donation', amount: 250000, status: 'verified', ref: 'HOR_D_001' },
  { date: '2026-03-25', desc: 'Equipment Sponsorship — Laptop x2', type: 'sponsorship', amount: 900000, status: 'verified', ref: 'HOR_S_001' },
  { date: '2026-03-20', desc: 'Donation — Mrs. Adeyemi', type: 'donation', amount: 100000, status: 'verified', ref: 'HOR_D_002' },
]

const total = Object.values(REVENUE).reduce((s, v) => s + v, 0)

export default function Finance() {
  const [tab, setTab] = useState('overview')

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Financial Overview</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Revenue tracking across all 5 income streams</p>
      </div>

      {/* Revenue KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Revenue (MTD)', value: fmt(total), color: 'var(--charcoal)' },
          { label: 'Deposits', value: fmt(REVENUE.deposits), color: 'var(--blue)' },
          { label: 'Treatment Fees', value: fmt(REVENUE.treatmentFees), color: '#1A7A4A' },
          { label: 'Donations', value: fmt(REVENUE.donations), color: 'var(--gold)' },
          { label: 'Sponsorship', value: fmt(REVENUE.sponsorship), color: '#805AD5' },
        ].map(kpi => (
          <div key={kpi.label} className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--g100)' }}>
        {[['overview', 'Transactions'], ['outstanding', 'Outstanding'], ['fee-schedule', 'Fee Schedule']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '10px 18px', border: 'none', background: 'none',
            fontSize: '.88rem', fontWeight: 600, cursor: 'pointer',
            color: tab === k ? 'var(--blue)' : 'var(--g500)',
            borderBottom: tab === k ? '2px solid var(--blue)' : '2px solid transparent',
            marginBottom: -2,
          }}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TRANSACTIONS.map((tx, i) => (
            <div key={i} className="card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{tx.desc}</div>
                <div style={{ fontSize: '.74rem', color: 'var(--g500)' }}>{tx.date} · Ref: {tx.ref}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '1rem' }}>{fmt(tx.amount)}</span>
                <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: '.68rem', fontWeight: 700, background: 'rgba(26,122,74,.1)', color: '#1A7A4A' }}>
                  {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'fee-schedule' && (
        <div className="card">
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: 14 }}>Fee Schedule — 12-Week Programme</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              ['Booking Deposit (refundable)', fmt(1000000), 'Applied 100% to treatment fees'],
              ['Monthly Treatment Fee', fmt(850000), '3 months × ₦850,000'],
              ['Total Programme Cost', fmt(3550000), 'Deposit + 3 monthly fees'],
              ['Medications', 'Variable', 'Based on individual clinical needs'],
              ['Meals (CookedIndoors)', 'Included', 'Breakfast, lunch, dinner daily'],
              ['All Therapy Sessions', 'Included', 'CBT, MI, group, individual, family'],
              ['Subsidised Rate', 'Case-by-case', 'Board-approved reduced fee'],
              ['Compassion Fund', '₦0', 'Fully sponsored placement (Pathway B)'],
            ].map(([item, amount, note], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--g100)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '.86rem', fontWeight: 600, color: 'var(--charcoal)' }}>{item}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>{note}</div>
                </div>
                <span style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--charcoal)' }}>{amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'outstanding' && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>✓</div>
          <p style={{ color: 'var(--g500)' }}>No outstanding payments at this time.</p>
        </div>
      )}
    </div>
  )
}
