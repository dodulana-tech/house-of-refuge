import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNotif } from '../App'
import { pay, ref, fmt } from '../utils/paystack'
import styles from './Donate.module.css'

const AMOUNTS = [5000, 10000, 25000, 50000, 100000, 250000]

const IMPACTS = [
  [250000, '₦250,000 furnishes one counselling room for individual therapy'],
  [168000, '₦168,000 provides a full set of clinical uniforms for staff'],
  [126000, '₦126,000 equips the nursing team with stethoscopes'],
  [100000, '₦100,000 covers a year of sharps disposal and PPE'],
  [90000,  '₦90,000 provides 5 IV drip stands for the detox ward'],
  [60000,  '₦60,000 provides 5 pulse oximeters for monitoring'],
  [50000,  "₦50,000 covers a resident's full-year hygiene supplies"],
  [25000,  '₦25,000 sponsors digital weighing scales for residents'],
  [18000,  '₦18,000 buys a clinical stethoscope for the medical team'],
  [10000,  '₦10,000 covers a week of clinical supplies for two residents'],
  [5000,   '₦5,000 provides a week of toiletries for one resident'],
]

function getImpact(amt) {
  for (const [t, txt] of IMPACTS) if (amt >= t) return txt
  return `Your gift of ${fmt(amt)} will directly support care at House of Refuge`
}

export default function Donate() {
  const showNotif = useNotif()
  const [amount,  setAmount]  = useState(50000)
  const [custom,  setCustom]  = useState('')
  const [freq,    setFreq]    = useState('once')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ fn:'', ln:'', email:'', phone:'', dedic:'' })

  const eff = custom ? (parseInt(custom) || 0) : amount

  function pickAmt(n) { setAmount(n); setCustom('') }

  function handleDonate() {
    if (!form.fn)                       { showNotif('Name required',   'Please enter your first name.'); return }
    if (!form.email?.includes('@'))     { showNotif('Email required',  'Please enter a valid email address.'); return }
    if (eff < 100)                      { showNotif('Amount required', 'Please select or enter a donation amount.'); return }
    setLoading(true)
    pay({
      email: form.email,
      amount: eff * 100,
      ref: ref('HOR_D'),
      fields: [
        { display_name: 'Donor',      variable_name: 'name',   value: `${form.fn} ${form.ln}` },
        { display_name: 'Frequency',  variable_name: 'freq',   value: freq },
        { display_name: 'Dedication', variable_name: 'dedic',  value: form.dedic },
      ],
      onSuccess: (r) => {
        setLoading(false)
        showNotif(`🙏 Thank you, ${form.fn}!`, `Donation of ${fmt(eff)} received. Ref: ${r.reference}`, 'ok')
      },
      onClose: () => setLoading(false),
    })
  }

  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

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
          <div className={styles.grid}>

            {/* ── Left: form ── */}
            <div className="card">
              <h3 style={{ marginBottom:4, fontSize:'1.5rem' }}>Choose your gift</h3>
              <p style={{ fontSize:'.82rem', color:'var(--g500)', marginBottom:18 }}>All amounts in Nigerian Naira (₦)</p>

              {/* Frequency toggle */}
              <div className={styles.freq}>
                {['once','monthly','annually'].map(f => (
                  <button key={f} className={`${styles.freqBtn} ${freq===f ? styles.freqActive : ''}`} onClick={() => setFreq(f)}>
                    {f === 'once' ? 'Give Once' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Amount grid */}
              <div className={styles.amtGrid}>
                {AMOUNTS.map(n => (
                  <button key={n} className={`${styles.amtBtn} ${amount===n && !custom ? styles.amtSel : ''}`} onClick={() => pickAmt(n)}>
                    {fmt(n)}
                  </button>
                ))}
              </div>

              <div className="fg">
                <label className="flabel">Or enter a custom amount (₦)</label>
                <input className="fi" type="number" value={custom} placeholder="e.g. 75000"
                  onChange={e => { setCustom(e.target.value); setAmount(0) }} />
              </div>

              {/* Impact */}
              <div className={styles.impact}>{getImpact(eff)}</div>

              {/* Donor details */}
              <div className="frow">
                <div className="fg"><label className="flabel">First Name *</label><input className="fi" {...f('fn')} placeholder="Emeka" /></div>
                <div className="fg"><label className="flabel">Last Name</label><input className="fi" {...f('ln')} placeholder="Okafor" /></div>
              </div>
              <div className="fg"><label className="flabel">Email Address *</label><input className="fi" type="email" {...f('email')} placeholder="emeka@example.com" /></div>
              <div className="fg"><label className="flabel">Phone (optional)</label><input className="fi" type="tel" {...f('phone')} placeholder="+234 801 234 5678" /></div>
              <div className="fg"><label className="flabel">Dedication (optional)</label><input className="fi" {...f('dedic')} placeholder="In honour of... / In memory of..." /></div>

              <button className="btn btn--gold btn--full" onClick={handleDonate} disabled={loading}>
                {loading ? <span className="spin" /> : `Donate ${fmt(eff)} Now`}
              </button>
              <p className={styles.secure}>🔒 Secured by Paystack · Your details are fully protected</p>
            </div>

            {/* ── Right: sidebar ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              <div className="card">
                <h4 style={{ fontFamily:'var(--fd)', fontSize:'1.25rem', marginBottom:14 }}>Your impact</h4>
                <ul className={styles.ilist}>
                  {[
                    '₦5,000 provides a week of toiletries for one resident',
                    '₦18,000 buys a clinical stethoscope for the team',
                    '₦50,000 covers full-year hygiene supplies per resident',
                    '₦90,000 provides 5 IV drip stands for detox care',
                    '₦280,000 sponsors the projector & screen for group therapy',
                    '₦450,000 provides a laptop for resident education',
                  ].map(t => <li key={t}>{t}</li>)}
                </ul>
              </div>

              <div className="card">
                <h4 style={{ fontFamily:'var(--fd)', fontSize:'1.25rem', marginBottom:10 }}>Fundraising progress</h4>
                <div style={{ fontSize:'.8rem', color:'var(--g500)', marginBottom:5 }}>Goal: ₦17,400,000</div>
                <div className="pbar"><div className="pfill" style={{ width:'8%' }} /></div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.75rem', color:'var(--g500)' }}>
                  <span>₦1,392,000 raised</span><span>8%</span>
                </div>
              </div>

              <div className="card">
                <h4 style={{ fontFamily:'var(--fd)', fontSize:'1.25rem', marginBottom:10 }}>Prefer to transfer directly?</h4>
                <div className={styles.bank}>
                  {[
                    ['Bank Name',     'Freedom Foundation'],
                    ['Account Name',  'House of Refuge'],
                    ['Account No.',   'Contact us for details'],
                  ].map(([k,v]) => (
                    <div key={k} className={styles.bankRow}><span>{k}</span><span>{v}</span></div>
                  ))}
                </div>
                <p style={{ fontSize:'.78rem', color:'var(--g500)', marginTop:10 }}>
                  For transfers email <a href="mailto:e.abutu@freedomfoundationng.org" style={{ color:'var(--blue)' }}>e.abutu@freedomfoundationng.org</a>
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  )
}
