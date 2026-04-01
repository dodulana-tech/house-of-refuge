import React, { useState } from 'react'
import { useModal, useNotif } from '../App'
import { pay, ref, fmt } from '../utils/paystack'
import styles from './SponsorModal.module.css'

export default function SponsorModal() {
  const { modal, closeModal } = useModal()
  const showNotif = useNotif()
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  if (!modal.open || !modal.item) return null
  const { item } = modal

  function handlePay() {
    if (!email || !email.includes('@')) { showNotif('Email required', 'Please enter a valid email.'); return }
    setLoading(true)
    pay({
      email,
      amount: item.total * 100,
      ref: ref('HOR_S'),
      fields: [
        { display_name: 'Item',    variable_name: 'item',    value: item.name },
        { display_name: 'Sponsor', variable_name: 'sponsor', value: name },
      ],
      onSuccess: (r) => {
        setLoading(false)
        closeModal()
        showNotif('🎉 Sponsored!', `You've sponsored: ${item.name}. Ref: ${r.reference}`, 'ok')
      },
      onClose: () => setLoading(false),
    })
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={closeModal}>×</button>
        <h3>Sponsor this item</h3>
        <p>Complete your sponsorship via Paystack</p>
        <div className={styles.itemTag}>{item.name} — {fmt(item.total)}{item.sfx || ''}</div>
        <div className="fg"><label className="flabel">Your Name</label>
          <input className="fi" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div className="fg"><label className="flabel">Email Address *</label>
          <input className="fi" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="fg"><label className="flabel">Phone (optional)</label>
          <input className="fi" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234 801 000 0000" />
        </div>
        <button className="btn btn--primary btn--full" onClick={handlePay} disabled={loading}>
          {loading ? <span className="spin" /> : `Pay ${fmt(item.total)} via Paystack`}
        </button>
        <p className={styles.secure}>🔒 Secured by Paystack · Your details are fully protected</p>
      </div>
    </div>
  )
}
