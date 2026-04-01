import React, { useState } from 'react'
import { useNotif } from '../App'
import styles from './Contact.module.css'

export default function Contact() {
  const showNotif = useNotif()
  const [form, setForm] = useState({ name:'', email:'', subject:'General enquiry', message:'' })
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

  function handleSend() {
    if (!form.name || !form.email || !form.message) {
      showNotif('Required fields', 'Please fill in your name, email and message.'); return
    }
    showNotif('Message sent!', `Thank you, ${form.name}. We'll be in touch soon.`, 'ok')
    setForm({ name:'', email:'', subject:'General enquiry', message:'' })
  }

  return (
    <>
      <div className="ph"><div className="container">
        <h1>Contact Us</h1>
        <p>We'd love to hear from you — patient, family, volunteer, or donor</p>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:16 }}><div style={{ width:32, height:2, background:'rgba(255,255,255,.5)' }} /><span style={{ fontSize:'.72rem', letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.7)', fontWeight:700 }}>A Freedom Foundation Initiative</span></div>
      </div></div>

      <section className="section">
        <div className="container">
          <div className={styles.grid}>

            {/* Form */}
            <div className="card">
              <h3 style={{ marginBottom:20, fontSize:'1.5rem' }}>Send us a message</h3>
              <div className="frow">
                <div className="fg"><label className="flabel">Name *</label><input className="fi" {...f('name')} placeholder="Your full name" /></div>
                <div className="fg"><label className="flabel">Email *</label><input className="fi" type="email" {...f('email')} placeholder="you@example.com" /></div>
              </div>
              <div className="fg"><label className="flabel">Subject</label>
                <select className="fi" {...f('subject')}>
                  {['General enquiry','Admissions question','Donation / partnership','Volunteer','Media / press','Other'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="fg"><label className="flabel">Message *</label>
                <textarea className="fi" rows={6} {...f('message')} placeholder="How can we help?" style={{ resize:'vertical' }} />
              </div>
              <button className="btn btn--primary" onClick={handleSend}>Send Message</button>
            </div>

            {/* Info */}
            <div>
              <div className={styles.infoList}>
                {[
                  { icon:'📍', lbl:'Address',          val:'Lekki, Lagos State, Nigeria' },
                  { icon:'📞', lbl:'Phone',             val:<a href="tel:09011277600" style={{color:'var(--blue)'}}>09011277600</a> },
                  { icon:'✉️', lbl:'Email',             val:<a href="mailto:e.abutu@freedomfoundationng.org" style={{color:'var(--blue)',fontSize:'.85rem'}}>e.abutu@freedomfoundationng.org</a> },
                  { icon:'🕐', lbl:'Admissions Hours',  val:'Mon – Sat, 8:00am – 6:00pm' },
                  { icon:'🌐', lbl:'Management Partner',val:<a href="https://consultforafrica.com" target="_blank" rel="noreferrer" style={{color:'var(--blue)'}}>consultforafrica.com</a> },
                ].map(({ icon, lbl, val }) => (
                  <div key={lbl} className={styles.infoItem}>
                    <div className={styles.infoIcon}>{icon}</div>
                    <div>
                      <div className={styles.infoLbl}>{lbl}</div>
                      <div className={styles.infoVal}>{val}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.bank}>
                <h4>Bank Transfer Details</h4>
                {[
                  ['Bank Name',      'Freedom Foundation'],
                  ['Account Name',   'House of Refuge — Rehab Centre'],
                  ['Account Number', 'Contact us for details'],
                ].map(([k,v]) => (
                  <div key={k} className={styles.bankRow}>
                    <span>{k}</span><span>{v}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  )
}
