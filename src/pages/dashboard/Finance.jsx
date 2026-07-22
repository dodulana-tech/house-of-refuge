import React, { useState, useEffect } from 'react'
import { fmt } from '../../utils/paystack'
import { getPayments, isSupabaseReady } from '../../utils/supabase'

/*
  Financial Overview — Revenue streams per SOP Chapter 12.
  Reads live payment records from Supabase (amounts stored in kobo).
*/

const TYPE_LABELS = {
  deposit: 'Deposit',
  'treatment-fee': 'Treatment Fee',
  donation: 'Donation',
  sponsorship: 'Sponsorship',
  medication: 'Medication',
}

function isThisMonth(iso) {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export default function Finance() {
  const [tab, setTab] = useState('overview')
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      if (isSupabaseReady()) {
        const { data } = await getPayments() // all payments (staff RLS)
        if (active) setPayments(data || [])
      }
      if (active) setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  // Settled payments only, amounts kobo → naira.
  const settled = payments.filter(p => p.status === 'paid' || p.verified)
  const naira = p => Math.round((p.amount || 0) / 100)
  const mtd = settled.filter(p => isThisMonth(p.created_at))
  const sumByType = (list, type) => list.filter(p => p.type === type).reduce((s, p) => s + naira(p), 0)

  const REVENUE = {
    deposits: sumByType(mtd, 'deposit'),
    treatmentFees: sumByType(mtd, 'treatment-fee'),
    donations: sumByType(mtd, 'donation'),
    sponsorship: sumByType(mtd, 'sponsorship'),
    grants: 0,
  }
  const total = Object.values(REVENUE).reduce((s, v) => s + v, 0)

  const TRANSACTIONS = settled
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(p => ({
      date: (p.created_at || '').slice(0, 10),
      desc: p.description || `${TYPE_LABELS[p.type] || p.type || 'Payment'}`,
      type: p.type,
      amount: naira(p),
      status: p.verified ? 'verified' : p.status,
      ref: p.paystack_ref || '—',
    }))

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

      {tab === 'overview' && TRANSACTIONS.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--g500)' }}>
          {loading ? 'Loading transactions…' : 'No payments recorded yet.'}
        </div>
      )}

      {tab === 'overview' && TRANSACTIONS.length > 0 && (
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
