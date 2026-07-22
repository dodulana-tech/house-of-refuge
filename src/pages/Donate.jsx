import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNotif } from '../App'
import { submitDonation } from '../utils/supabase'
import styles from './Donate.module.css'

const BANK = [
  ['Account Name', 'Freedom Foundation - House of Refuge'],
  ['Account No.',  '1014768696'],
  ['Bank',         'Zenith Bank'],
  ['Currency',     'Naira (₦)'],
]

export default function Donate() {
  const showNotif = useNotif()
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ fn:'', ln:'', email:'', phone:'', amount:'', message:'' })

  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.fn)                   { showNotif('Name required',  'Please enter your first name.'); return }
    if (!form.email?.includes('@')) { showNotif('Email required', 'Please enter a valid email address.'); return }
    setSaving(true)
    const { error } = await submitDonation({
      first_name: form.fn.trim(),
      last_name:  form.ln.trim() || null,
      email:      form.email.trim(),
      phone:      form.phone.trim() || null,
      amount:     form.amount ? Number(form.amount) : null,
      message:    form.message.trim() || null,
    })
    setSaving(false)
    if (error) {
      // Don't block the gift: still show account details, but flag the save.
      showNotif('We could not record your details', 'Please still go ahead with your transfer, and email us so we can acknowledge your gift.')
    }
    setSubmitted(true)
  }

  return (
    <>
      <Helmet>
        <title>Donate | House of Refuge</title>
        <meta name="description" content="Donate to House of Refuge and fund free and subsidised drug rehabilitation care for those who cannot afford treatment." />
      </Helmet>
      <div className="ph"><div className="container">
        <h1>Donate to House of Refuge</h1>
        <p>Your generosity funds free and subsidised care for those who cannot afford treatment</p>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:16 }}><div style={{ width:32, height:2, background:'rgba(255,255,255,.5)' }} /><span style={{ fontSize:'.72rem', letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.7)', fontWeight:700 }}>A Freedom Foundation Initiative</span></div>
      </div></div>

      <section className="section">
        <div className="container">
          <div className={styles.wrap}>

            {!submitted ? (
              /* ── Step 1: donor form ── */
              <form className="card" onSubmit={handleSubmit}>
                <h3 style={{ marginBottom:4, fontSize:'1.5rem' }}>Make a donation</h3>
                <p style={{ fontSize:'.82rem', color:'var(--g500)', marginBottom:18 }}>
                  Enter your details below and we will show you the account to transfer your gift to.
                </p>

                <div className="frow">
                  <div className="fg"><label className="flabel">First Name *</label><input className="fi" {...f('fn')} placeholder="Emeka" /></div>
                  <div className="fg"><label className="flabel">Last Name</label><input className="fi" {...f('ln')} placeholder="Okafor" /></div>
                </div>
                <div className="fg"><label className="flabel">Email Address *</label><input className="fi" type="email" {...f('email')} placeholder="emeka@example.com" /></div>
                <div className="fg"><label className="flabel">Phone (optional)</label><input className="fi" type="tel" {...f('phone')} placeholder="+234 801 234 5678" /></div>
                <div className="fg"><label className="flabel">Amount you plan to give (optional, ₦)</label><input className="fi" type="number" {...f('amount')} placeholder="e.g. 50000" /></div>
                <div className="fg"><label className="flabel">Dedication or message (optional)</label><input className="fi" {...f('message')} placeholder="In honour of... / In memory of..." /></div>

                <button className="btn btn--gold btn--full" type="submit" disabled={saving}>
                  {saving ? <span className="spin" /> : 'Continue to account details'}
                </button>
              </form>
            ) : (
              /* ── Step 2: account details ── */
              <div className="card">
                <h3 style={{ marginBottom:6, fontSize:'1.5rem' }}>🙏 Thank you, {form.fn}!</h3>
                <p style={{ fontSize:'.9rem', color:'var(--g700)', marginBottom:16, lineHeight:1.6 }}>
                  Please transfer your gift to the account below. Every contribution goes directly towards
                  care for those who cannot afford treatment.
                </p>

                <div className={styles.bank}>
                  {BANK.map(([k,v]) => (
                    <div key={k} className={styles.bankRow}><span>{k}</span><span>{v}</span></div>
                  ))}
                </div>

                <p style={{ fontSize:'.82rem', color:'var(--g500)', marginTop:14, lineHeight:1.6 }}>
                  After your transfer, please email your reference to{' '}
                  <a href="mailto:donations@houseofrefugeng.org" style={{ color:'var(--blue)' }}>donations@houseofrefugeng.org</a>{' '}
                  so we can acknowledge your gift and issue a receipt.
                </p>

                <button className="btn btn--outline btn--full" style={{ marginTop:18 }} onClick={() => setSubmitted(false)}>
                  Back to form
                </button>
              </div>
            )}

          </div>
        </div>
      </section>
    </>
  )
}
