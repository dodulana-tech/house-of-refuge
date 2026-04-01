import React, { useState } from 'react'
import { useModal } from '../App'
import { fmt } from '../utils/paystack'
import { SPONSOR_ITEMS, CAT_LABELS, TOTAL_GOAL } from '../data/items'
import styles from './Sponsor.module.css'

const FILTERS = [
  { key: 'all',        label: 'All Items (32)'          },
  { key: 'general',    label: 'General Facility (7)'    },
  { key: 'medical',    label: 'Medical & Clinical (12)' },
  { key: 'additional', label: 'Additional Items (13)'   },
]

export default function Sponsor() {
  const { openModal } = useModal()
  const [cat, setCat] = useState('all')

  const visible = cat === 'all' ? SPONSOR_ITEMS : SPONSOR_ITEMS.filter(i => i.cat === cat)

  return (
    <>
      <div className="ph"><div className="container">
        <h1>Sponsor an Item</h1>
        <p>32 items needed to fully equip the facility. Your gift goes directly to saving lives</p>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:16 }}><div style={{ width:32, height:2, background:'rgba(255,255,255,.5)' }} /><span style={{ fontSize:'.72rem', letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.7)', fontWeight:700 }}>A Freedom Foundation Initiative</span></div>
      </div></div>

      <section className="section">
        <div className="container">

          {/* Progress bar */}
          <div className={styles.progress}>
            <div className={styles.progRow}>
              <span className={styles.progLbl}>Fundraising progress: <strong>{fmt(TOTAL_GOAL)}</strong> total needed</span>
              <span className={styles.progPct}>8% funded</span>
            </div>
            <div className="pbar"><div className="pfill" style={{ width:'8%' }} /></div>
          </div>

          {/* Filters */}
          <div className={styles.filters}>
            {FILTERS.map(({ key, label }) => (
              <button key={key} className={`${styles.fbtn} ${cat===key ? styles.factive : ''}`} onClick={() => setCat(key)}>
                {label}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className={styles.grid}>
            {visible.map(item => (
              <div key={item.id} className={`${styles.card} card`}>
                <div className={styles.cardCat}>{CAT_LABELS[item.cat]}</div>
                <div className={styles.cardName}>{item.name}</div>
                <p className={styles.cardDesc}>{item.desc}</p>
                <div className={styles.cardFoot}>
                  <div>
                    <div className={styles.cardAmt}>{fmt(item.total)}{item.sfx || ''}</div>
                    <div className={styles.cardQty}>Qty needed: {item.qty}</div>
                  </div>
                  <button className="btn btn--primary btn--sm" onClick={() => openModal(item)}>
                    Sponsor
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      <section className="cta">
        <div className="container">
          <h2>Can't sponsor a full item?</h2>
          <p>Any donation helps. Even a partial contribution toward an item makes a real difference.</p>
          <div className="cta__acts">
            <button className="btn btn--white" onClick={() => window.location.href='/donate'}>Make a General Donation</button>
          </div>
        </div>
      </section>
    </>
  )
}
