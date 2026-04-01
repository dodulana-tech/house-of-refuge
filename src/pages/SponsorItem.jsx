import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { SPONSOR_ITEMS, CAT_LABELS } from '../data/items'
import { pay, ref, fmt } from '../utils/paystack'
import { useNotif } from '../App'
import { load, save } from '../utils/store'
import styles from './SponsorItem.module.css'

const PRESET_PCTS = [25, 50, 100]

function getDonations(itemId) { return load(`sponsor_${itemId}`, []) }
function saveDonation(itemId, donation) {
  const list = getDonations(itemId)
  list.unshift({ ...donation, id: Date.now(), date: new Date().toISOString() })
  save(`sponsor_${itemId}`, list)
  return list
}

export default function SponsorItem() {
  const { id } = useParams()
  const nav = useNavigate()
  const showNotif = useNotif()

  const item = SPONSOR_ITEMS.find(i => String(i.id) === id)
  const [donations, setDonations] = useState([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [custom, setCustom] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (item) setDonations(getDonations(item.id))
  }, [item])

  if (!item) return (
    <div style={{ padding: '120px 24px', textAlign: 'center' }}>
      <h2>Item not found</h2>
      <p style={{ marginBottom: 24 }}>This sponsorship item doesn't exist.</p>
      <button className="btn btn--primary" onClick={() => nav('/sponsor')}>View All Items</button>
    </div>
  )

  const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0)
  const pctFunded = Math.min(Math.round((totalRaised / item.total) * 100), 100)
  const remaining = Math.max(item.total - totalRaised, 0)

  function selectPreset(pct) {
    setCustom(false)
    setAmount(Math.round(item.total * pct / 100))
  }

  function handlePay() {
    if (!email || !email.includes('@')) { showNotif('Email required', 'Please enter a valid email.'); return }
    const numAmount = Number(amount)
    if (!numAmount || numAmount < 1000) { showNotif('Amount required', 'Minimum donation is ₦1,000.'); return }

    setLoading(true)
    pay({
      email,
      amount: numAmount * 100,
      ref: ref('HOR_S'),
      fields: [
        { display_name: 'Item', variable_name: 'item', value: item.name },
        { display_name: 'Sponsor', variable_name: 'sponsor', value: name || 'Anonymous' },
      ],
      onSuccess: (r) => {
        const updated = saveDonation(item.id, {
          name: name || 'Anonymous',
          email,
          amount: numAmount,
          ref: r.reference,
        })
        setDonations(updated)
        setLoading(false)
        setName(''); setEmail(''); setPhone(''); setAmount('')
        showNotif('Thank you!', `Your ₦${numAmount.toLocaleString()} contribution toward ${item.name} has been received. Ref: ${r.reference}`, 'ok')
      },
      onClose: () => setLoading(false),
      onError: (msg) => { setLoading(false); showNotif('Payment Error', msg) },
    })
  }

  const nearby = SPONSOR_ITEMS.filter(i => i.cat === item.cat && i.id !== item.id).slice(0, 3)

  return (
    <>
      <Helmet>
        <title>{item.name} | Sponsor Equipment | House of Refuge</title>
        <meta name="description" content={`Sponsor ${item.name} for House of Refuge. ${item.desc}. Total needed: ${fmt(item.total)}.`} />
      </Helmet>

      <div className="ph"><div className="container">
        <Link to="/sponsor" className={styles.back}>← All items</Link>
        <h1>{item.name}</h1>
        <p>{CAT_LABELS[item.cat]}</p>
      </div></div>

      <section className="section">
        <div className="container">
          <div className={styles.grid}>

            {/* Left: Item details + progress */}
            <div>
              <div className="card" style={{ marginBottom: 18 }}>
                <div className={styles.catBadge}>{CAT_LABELS[item.cat]}</div>
                <p className={styles.desc}>{item.desc}</p>
                <div className={styles.meta}>
                  <div><span className={styles.metaLabel}>Quantity needed</span><span className={styles.metaValue}>{item.qty}</span></div>
                  <div><span className={styles.metaLabel}>Unit cost</span><span className={styles.metaValue}>{fmt(Math.round(item.total / item.qty))}</span></div>
                  <div><span className={styles.metaLabel}>Total needed</span><span className={styles.metaValue}>{fmt(item.total)}{item.sfx || ''}</span></div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 18 }}>
                <div className={styles.fundingHeader}>
                  <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem' }}>Funding Progress</h4>
                  <span className={styles.fundingPct}>{pctFunded}%</span>
                </div>
                <div className="pbar" style={{ marginBottom: 10 }}>
                  <div className="pfill" style={{ width: `${Math.max(pctFunded, 2)}%`, transition: 'width .4s ease' }} />
                </div>
                <div className={styles.fundingStats}>
                  <div><span className={styles.raised}>{fmt(totalRaised)}</span> raised</div>
                  <div>{fmt(remaining)} remaining</div>
                </div>
                <div className={styles.donorCount}>{donations.length} donor{donations.length !== 1 ? 's' : ''} so far</div>
              </div>

              {/* Recent donors */}
              {donations.length > 0 && (
                <div className="card">
                  <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Recent Donors</h4>
                  <div className={styles.donorList}>
                    {donations.slice(0, 10).map(d => (
                      <div key={d.id} className={styles.donorRow}>
                        <div className={styles.donorAvatar}>{(d.name || 'A')[0].toUpperCase()}</div>
                        <div className={styles.donorInfo}>
                          <div className={styles.donorName}>{d.name}</div>
                          <div className={styles.donorDate}>{new Date(d.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </div>
                        <div className={styles.donorAmt}>{fmt(d.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Donation form */}
            <div>
              <div className="card" style={{ position: 'sticky', top: 88 }}>
                <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.35rem', marginBottom: 4 }}>Contribute to this item</h3>
                <p style={{ fontSize: '.84rem', color: 'var(--g500)', marginBottom: 20 }}>
                  Every contribution counts. You can sponsor the full item or give any amount.
                </p>

                {/* Amount presets */}
                <div className={styles.presets}>
                  {PRESET_PCTS.map(pct => {
                    const val = Math.round(item.total * pct / 100)
                    const active = !custom && Number(amount) === val
                    return (
                      <button key={pct} type="button" className={`${styles.preset} ${active ? styles.presetActive : ''}`} onClick={() => selectPreset(pct)}>
                        <span className={styles.presetPct}>{pct}%</span>
                        <span className={styles.presetAmt}>{fmt(val)}</span>
                      </button>
                    )
                  })}
                  <button type="button" className={`${styles.preset} ${custom ? styles.presetActive : ''}`} onClick={() => { setCustom(true); setAmount('') }}>
                    <span className={styles.presetPct}>Custom</span>
                    <span className={styles.presetAmt}>Any amount</span>
                  </button>
                </div>

                {custom && (
                  <div className="fg">
                    <label className="flabel">Amount (₦)</label>
                    <input className="fi" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" min="1000" />
                  </div>
                )}

                {!custom && amount && (
                  <div className={styles.selectedAmt}>
                    You're giving <strong>{fmt(Number(amount))}</strong> toward {item.name}
                  </div>
                )}

                <div className="fg"><label className="flabel">Your Name (optional)</label>
                  <input className="fi" value={name} onChange={e => setName(e.target.value)} placeholder="Full name or 'Anonymous'" />
                </div>
                <div className="fg"><label className="flabel">Email Address *</label>
                  <input className="fi" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
                </div>
                <div className="fg"><label className="flabel">Phone (optional)</label>
                  <input className="fi" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234 801 000 0000" />
                </div>

                <button className="btn btn--primary btn--full" onClick={handlePay} disabled={loading || !amount}>
                  {loading ? <span className="spin" /> : `Donate ${amount ? fmt(Number(amount)) : ''} via Paystack`}
                </button>
                <p style={{ fontSize: '.72rem', color: 'var(--g500)', textAlign: 'center', marginTop: 10 }}>
                  Secured by Paystack. Tax-deductible receipt available on request.
                </p>
              </div>
            </div>
          </div>

          {/* Related items */}
          {nearby.length > 0 && (
            <div style={{ marginTop: 48 }}>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 18 }}>Other items in {CAT_LABELS[item.cat]}</h3>
              <div className={styles.related}>
                {nearby.map(r => (
                  <Link key={r.id} to={`/sponsor/${r.id}`} className={`${styles.relatedCard} card`}>
                    <div className={styles.relatedName}>{r.name}</div>
                    <div className={styles.relatedAmt}>{fmt(r.total)}{r.sfx || ''}</div>
                    <div className={styles.relatedQty}>Qty: {r.qty}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
