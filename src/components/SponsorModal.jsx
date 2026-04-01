import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useModal, useNotif } from '../App'
import { pay, ref, fmt } from '../utils/paystack'
import styles from './SponsorModal.module.css'

export default function SponsorModal() {
  const { modal, closeModal } = useModal()
  const showNotif = useNotif()
  const nav = useNavigate()
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!modal.open || !modal.item) return null
  const { item } = modal

  function handlePay() {
    if (!email || !email.includes('@')) { showNotif('Email required', 'Please enter a valid email.'); return }
    const numAmount = useCustom ? Number(amount) : item.total
    if (!numAmount || numAmount < 1000) { showNotif('Amount required', 'Minimum donation is ₦1,000.'); return }
    setLoading(true)
    pay({
      email,
      amount: numAmount * 100,
      ref: ref('HOR_S'),
      fields: [
        { display_name: 'Item',    variable_name: 'item',    value: item.name },
        { display_name: 'Sponsor', variable_name: 'sponsor', value: name || 'Anonymous' },
      ],
      onSuccess: (r) => {
        setLoading(false)
        closeModal()
        showNotif('Thank you!', `Your ${fmt(numAmount)} contribution toward ${item.name} has been received. Ref: ${r.reference}`, 'ok')
      },
      onClose: () => setLoading(false),
      onError: (msg) => { setLoading(false); showNotif('Payment Error', msg) },
    })
  }

  const payAmount = useCustom ? Number(amount) || 0 : item.total

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Sponsor item" onClick={e => e.target === e.currentTarget && closeModal()} onKeyDown={e => e.key === 'Escape' && closeModal()}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={closeModal}>×</button>
        <h3>Sponsor this item</h3>
        <div className={styles.itemTag}>{item.name}: {fmt(item.total)}{item.sfx || ''}</div>

        <div className={styles.amountToggle}>
          <button type="button" className={`${styles.toggleBtn} ${!useCustom ? styles.toggleActive : ''}`} onClick={() => setUseCustom(false)}>Full amount</button>
          <button type="button" className={`${styles.toggleBtn} ${useCustom ? styles.toggleActive : ''}`} onClick={() => setUseCustom(true)}>Custom amount</button>
        </div>

        {useCustom && (
          <div className="fg">
            <label className="flabel">Amount (₦)</label>
            <input className="fi" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter any amount (min ₦1,000)" min="1000" />
          </div>
        )}

        <div className="fg"><label className="flabel">Your Name</label>
          <input className="fi" value={name} onChange={e => setName(e.target.value)} placeholder="Full name or 'Anonymous'" />
        </div>
        <div className="fg"><label className="flabel">Email Address *</label>
          <input className="fi" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="fg"><label className="flabel">Phone (optional)</label>
          <input className="fi" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234 801 000 0000" />
        </div>
        <button className="btn btn--primary btn--full" onClick={handlePay} disabled={loading || !payAmount}>
          {loading ? <span className="spin" /> : `Pay ${payAmount ? fmt(payAmount) : ''} via Paystack`}
        </button>
        <button type="button" className={styles.detailLink} onClick={() => { closeModal(); nav(`/sponsor/${item.id}`) }}>
          View full details & donor list →
        </button>
        <p className={styles.secure}>Secured by Paystack. Your details are fully protected.</p>
      </div>
    </div>
  )
}
