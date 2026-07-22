// Partners.jsx
import React from 'react'
import { Helmet } from 'react-helmet-async'

const SECTIONS = [
  {
    lbl: 'The Foundation',
    title: 'The NGO behind House of Refuge',
    alt: false,
    partners: [
      {
        name: 'Freedom Foundation Nigeria',
        role: 'Founding NGO',
        tone: 'blue',
        body: 'Freedom Foundation is a registered Nigerian NGO committed to social transformation through faith-motivated action. House of Refuge is its flagship healthcare initiative, born out of a pastoral response to drug-affected families and grown into a fully planned, clinically governed residential facility.',
      },
    ],
  },
  {
    lbl: 'Management & Operations',
    title: 'The team running the centre',
    alt: true,
    partners: [
      {
        name: 'ConsultForAfrica',
        role: 'Management Partner',
        tone: 'gold',
        url: 'https://consultforafrica.com',
        urlLabel: 'consultforafrica.com',
        body: 'ConsultForAfrica is a specialist management consultancy contracted to oversee recruitment, clinical protocols, technology systems, nutrition operations, and the full programme of pre-launch and ongoing operational workstreams.',
      },
    ],
  },
  {
    lbl: 'Service Partners',
    title: 'Partners in daily care',
    alt: false,
    partners: [
      {
        name: 'CookedIndoors',
        role: 'Catering & Nutrition',
        tone: 'blue',
        url: 'https://cookedindoors.com',
        urlLabel: 'cookedindoors.com',
        body: 'CookedIndoors delivers freshly prepared, balanced meals for residents, supporting recovery with consistent, nourishing food throughout the programme.',
      },
    ],
  },
]

function PartnerCard({ p }) {
  const gold = p.tone === 'gold'
  const accent = gold ? 'var(--gold)' : 'var(--blue)'
  return (
    <div className="card" style={{ background: gold ? 'var(--gold-lt)' : 'var(--blue-lt)', border: gold ? '1px solid rgba(192,138,48,.2)' : 'none' }}>
      <div style={{ fontSize:'.7rem', letterSpacing:'.12em', textTransform:'uppercase', color:accent, fontWeight:700, marginBottom:7 }}>{p.role}</div>
      <h3 style={{ marginBottom:10, fontSize:'1.3rem', fontFamily:'var(--fd)' }}>{p.name}</h3>
      <p style={{ fontSize:'.9rem', color:'var(--g700)', lineHeight:1.65 }}>{p.body}</p>
      {p.url && (
        <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize:'.85rem', color:accent, fontWeight:600, display:'inline-block', marginTop:12 }}>
          {p.urlLabel} →
        </a>
      )}
    </div>
  )
}

export default function Partners() {
  return (
    <>
      <Helmet>
        <title>Our Partners | House of Refuge</title>
        <meta name="description" content="The organisations behind House of Refuge: Freedom Foundation Nigeria, ConsultForAfrica, and CookedIndoors." />
      </Helmet>
      <div className="ph"><div className="container">
        <h1>Our Partners</h1>
        <p>The organisations that make House of Refuge possible</p>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:16 }}>
          <div style={{ width:32, height:2, background:'rgba(255,255,255,.5)' }} />
          <span style={{ fontSize:'.72rem', letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.7)', fontWeight:700 }}>A Freedom Foundation Initiative</span>
        </div>
      </div></div>

      {SECTIONS.map(sec => (
        <section key={sec.lbl} className={`section ${sec.alt ? 'section--alt' : ''}`}>
          <div className="container">
            <div className="sh"><div className="sh__lbl">{sec.lbl}</div><h2>{sec.title}</h2></div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20 }}>
              {sec.partners.map(p => <PartnerCard key={p.name} p={p} />)}
            </div>
          </div>
        </section>
      ))}
    </>
  )
}
