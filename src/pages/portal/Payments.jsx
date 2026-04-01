import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../utils/paystack'
import styles from './Portal.module.css'

const MOCK_PAYMENTS = [
  { id: 1, date: '2026-04-12', desc: 'Booking Deposit', amount: 1000000, status: 'paid', ref: 'HOR_WL_1712937400_ABC12' },
  { id: 2, date: '2026-04-15', desc: 'Month 1 Treatment Fee', amount: 850000, status: 'paid', ref: 'HOR_TF_1713192000_DEF34' },
  { id: 3, date: '2026-05-01', desc: 'Medication: Detox Support', amount: 45000, status: 'paid', ref: 'HOR_MED_1714521600_GH56' },
  { id: 4, date: '2026-05-15', desc: 'Month 2 Treatment Fee', amount: 850000, status: 'pending', ref: '' },
  { id: 5, date: '2026-06-15', desc: 'Month 3 Treatment Fee', amount: 850000, status: 'upcoming', ref: '' },
]

const TREATMENT_COST = {
  total: 3500000,
  booking: 1000000,
  monthly: 850000,
  medications: 'Variable',
  meals: 'Included',
  therapy: 'Included',
}

export default function Payments() {
  const { user } = useAuth()
  const paid = MOCK_PAYMENTS.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
  const pending = MOCK_PAYMENTS.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
  const total = MOCK_PAYMENTS.reduce((sum, p) => sum + p.amount, 0)

  return (
    <>
      <div className="ph"><div className="container">
        <div className="ph__badge"><span className="badge">Patient Portal</span></div>
        <h1>Payment History</h1>
        <p>Track your treatment payments and outstanding balance</p>
      </div></div>

      <section className="section">
        <div className="container">
          {/* Summary cards */}
          <div className={styles.paymentSummary}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className={styles.payLabel}>Total Paid</div>
              <div className={styles.payAmount} style={{ color: '#1A7A4A' }}>{fmt(paid)}</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className={styles.payLabel}>Pending</div>
              <div className={styles.payAmount} style={{ color: '#DD6B20' }}>{fmt(pending)}</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className={styles.payLabel}>Total Programme Cost</div>
              <div className={styles.payAmount}>{fmt(total)}</div>
              <div className="pbar" style={{ marginTop: 8 }}><div className="pfill" style={{ width: `${(paid / total) * 100}%`, background: '#1A7A4A' }} /></div>
              <div style={{ fontSize: '.75rem', color: 'var(--g500)', marginTop: 4 }}>{Math.round((paid / total) * 100)}% paid</div>
            </div>
          </div>

          <div className={styles.payGrid}>
            {/* Transaction history */}
            <div className="card">
              <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 18 }}>Transaction History</h4>
              <div className={styles.txList}>
                {MOCK_PAYMENTS.map(p => (
                  <div key={p.id} className={styles.txItem}>
                    <div className={styles.txLeft}>
                      <div className={styles.txDate}>{new Date(p.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      <div className={styles.txDesc}>{p.desc}</div>
                      {p.ref && <div className={styles.txRef}>Ref: {p.ref}</div>}
                    </div>
                    <div className={styles.txRight}>
                      <div className={styles.txAmount}>{fmt(p.amount)}</div>
                      <span className={`badge ${p.status === 'paid' ? 'badge--gold' : 'badge--blue'}`}>
                        {p.status === 'paid' ? 'Paid' : p.status === 'pending' ? 'Due' : 'Upcoming'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 14 }}>Cost Breakdown</h4>
                <div className={styles.costList}>
                  {[
                    ['90-Day Programme', fmt(TREATMENT_COST.total)],
                    ['Booking Deposit (applied)', fmt(TREATMENT_COST.booking)],
                    ['Monthly Treatment Fee', fmt(TREATMENT_COST.monthly)],
                    ['Medications', TREATMENT_COST.medications],
                    ['Meals (CookedIndoors)', TREATMENT_COST.meals],
                    ['All Therapy Sessions', TREATMENT_COST.therapy],
                  ].map(([k, v]) => (
                    <div key={k} className={styles.costRow}>
                      <span>{k}</span><span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 10 }}>Payment Methods</h4>
                <p style={{ fontSize: '.84rem', color: 'var(--g700)', marginBottom: 12 }}>Payments can be made via:</p>
                <ul style={{ fontSize: '.84rem', color: 'var(--g700)', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <li>Paystack (card, bank transfer, USSD)</li>
                  <li>Direct bank transfer</li>
                  <li>Cash at the Centre</li>
                </ul>
                <p style={{ fontSize: '.78rem', color: 'var(--g500)', marginTop: 12 }}>
                  For payment plans or financial assistance, contact <a href="mailto:e.abutu@freedomfoundationng.org" style={{ color: 'var(--blue)' }}>e.abutu@freedomfoundationng.org</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
