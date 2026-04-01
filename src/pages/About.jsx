// About.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function About() {
  const nav = useNavigate()
  return (
    <>
      <div className="ph"><div className="container">
        <h1>About House of Refuge</h1>
        <p>A church-rooted initiative meeting one of Lagos's most pressing needs</p>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:16 }}>
          <div style={{ width:32, height:2, background:'rgba(255,255,255,.5)' }} />
          <span style={{ fontSize:'.72rem', letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.7)', fontWeight:700 }}>A Freedom Foundation Initiative</span>
        </div>
      </div></div>

      <section className="section">
        <div className="container" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:56, alignItems:'start' }}>
          <div>
            <div className="sh__lbl">The Foundation</div>
            <h2>Born out of faith, built for transformation</h2>
            <div className="dv" />
            <p style={{ marginBottom:14 }}>House of Refuge is an initiative of <strong>Freedom Foundation Nigeria</strong>, an NGO founded and supported by our present house church. What began as a pastoral response to drug-affected families in our congregation has grown into a fully planned, clinically governed 24-bed residential rehabilitation facility.</p>
            <p style={{ marginBottom:14 }}>Situated in <strong>Lekki, Lagos</strong>, the centre offers a faith-integrated, medically supervised residential programme for individuals struggling with substance use disorders. The care provided is holistic, dignified, and genuinely transformative.</p>
            <p>The project is professionally managed by <strong>ConsultForAfrica</strong>, a specialist management consultancy contracted to oversee all pre-launch and ongoing operational workstreams, targeting a go-live of <strong>April 15, 2026</strong>.</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div className="card" style={{ background:'var(--blue-lt)', border:'none' }}>
              <div className="sh__lbl">Freedom Foundation Nigeria</div>
              <h3 style={{ marginBottom:8, fontSize:'1.25rem' }}>The NGO behind the vision</h3>
              <p style={{ fontSize:'.85rem' }}>Freedom Foundation is a registered Nigerian NGO committed to social transformation through faith-motivated action. House of Refuge is its flagship healthcare initiative.</p>
            </div>
            <div className="card" style={{ background:'var(--gold-lt)', border:'1px solid rgba(192,138,48,.2)' }}>
              <div style={{ fontSize:'.7rem', letterSpacing:'.12em', textTransform:'uppercase', color:'var(--gold)', fontWeight:700, marginBottom:7 }}>Management Partner</div>
              <h3 style={{ marginBottom:8, fontSize:'1.25rem' }}>ConsultForAfrica</h3>
              <p style={{ fontSize:'.85rem' }}>Contracted for recruitment, clinical protocols, technology systems, nutrition operations, and all pre-launch workstreams.</p>
              <a href="https://consultforafrica.com" target="_blank" rel="noreferrer" style={{ fontSize:'.83rem', color:'var(--gold)', fontWeight:600, display:'block', marginTop:10 }}>consultforafrica.com →</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <div className="sh"><div className="sh__lbl">Our Values</div><h2>What drives everything we do</h2></div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {[
              { icon:'❤️', t:'Compassion',          d:'Every resident is treated with dignity, respect, and unconditional care, no matter their background or history.' },
              { icon:'🔬', t:'Clinical Excellence',  d:'Evidence-based protocols, qualified medical staff, and rigorous governance ensure the safest outcomes.' },
              { icon:'✝️', t:'Faith Foundation',     d:'Biblical truth and spiritual healing are woven through every aspect of the programme, addressing the whole person.' },
              { icon:'👨‍👩‍👧', t:'Family Involvement',   d:'Healing happens best in community. Families are partners in the recovery journey, not bystanders.' },
              { icon:'🌱', t:'Lasting Change',       d:'Our aftercare extends well beyond discharge, planting seeds for lifelong transformation and reintegration.' },
              { icon:'🤝', t:'Accountability',       d:'Every donation, clinical decision, and outcome is tracked, reported, and held to the highest standards.' },
            ].map(v => (
              <div key={v.t} className="card" style={{ textAlign:'center', padding:'28px 18px' }}>
                <div style={{ fontSize:'1.8rem', marginBottom:12 }}>{v.icon}</div>
                <h3 style={{ fontSize:'1.1rem', marginBottom:8 }}>{v.t}</h3>
                <p style={{ fontSize:'.85rem' }}>{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <h2>Come alongside us</h2>
          <p>There are many ways to be part of this work: donate, volunteer, refer, or pray.</p>
          <div className="cta__acts">
            <button className="btn btn--white" onClick={() => nav('/donate')}>Give Today</button>
            <button className="btn btn--outline-white" onClick={() => nav('/contact')}>Get in Touch</button>
          </div>
        </div>
      </section>
    </>
  )
}
