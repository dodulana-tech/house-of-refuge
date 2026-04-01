import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../utils/paystack'

/*
  Role-aware overview — renders different KPI dashboards per role.
  All roles see the same component, different data.
*/

const MOCK_KPIs = {
  admin: {
    title: 'Centre Overview',
    subtitle: 'Program Director Dashboard',
    cards: [
      { n: '4', label: 'Current Residents', sub: 'of 24 beds', color: 'var(--blue)' },
      { n: '20', label: 'Beds Available', sub: '83% capacity free', color: '#1A7A4A' },
      { n: '3', label: 'Pending Applications', sub: '2 with deposit', color: '#DD6B20' },
      { n: fmt(3595000), label: 'Revenue (MTD)', sub: 'Deposits + fees', color: 'var(--gold)' },
    ],
    sections: [
      {
        title: 'Admission Pipeline',
        items: [
          { label: 'Submitted', count: 2, color: 'var(--blue)' },
          { label: 'Pre-screening', count: 1, color: '#DD6B20' },
          { label: 'Clinical Assessment', count: 1, color: '#D69E2E' },
          { label: 'Outpatient Pathway', count: 1, color: 'var(--g500)' },
        ],
      },
      {
        title: 'Residents by Phase',
        items: [
          { label: 'Medical Stabilization (Wk 1–2)', count: 1, color: '#E53E3E' },
          { label: 'Therapeutic Foundation (Wk 3–6)', count: 1, color: '#DD6B20' },
          { label: 'Deepening & Skills (Wk 7–10)', count: 1, color: '#D69E2E' },
          { label: 'Reintegration (Wk 11–12)', count: 1, color: '#1A7A4A' },
        ],
      },
    ],
  },
  staff: {
    title: 'Clinical Overview',
    subtitle: 'Care Team Dashboard',
    cards: [
      { n: '2', label: 'My Caseload', sub: 'Active patients', color: 'var(--blue)' },
      { n: '3', label: 'Sessions Today', sub: '1 individual, 2 group', color: '#1A7A4A' },
      { n: '1', label: 'MDT Review Due', sub: 'Week 4 review', color: '#DD6B20' },
      { n: '0', label: 'Open Incidents', sub: 'All resolved', color: 'var(--g500)' },
    ],
    sections: [
      {
        title: "Today's Schedule",
        items: [
          { label: '9:00 AM — Bible School / Spiritual Formation', count: null, color: 'var(--gold)' },
          { label: '11:00 AM — Group CBT / Relapse Prevention', count: null, color: 'var(--blue)' },
          { label: '1:30 PM — Life Skills Training Group', count: null, color: '#1A7A4A' },
          { label: '3:30 PM — Individual Counseling (Chidi O.)', count: null, color: '#805AD5' },
        ],
      },
      {
        title: 'Patient Alerts',
        items: [
          { label: 'Ibrahim M. — Day 8, detox monitoring (CIWA)', count: 'HIGH', color: '#E53E3E' },
          { label: 'Chidi O. — Week 4 treatment plan review due', count: 'DUE', color: '#DD6B20' },
          { label: 'Adaeze N. — Mood trend declining (3 days)', count: 'WATCH', color: '#D69E2E' },
        ],
      },
    ],
  },
  patient: {
    title: 'My Recovery',
    subtitle: 'Day 23 of 84 — Therapeutic Foundation',
    cards: [
      { n: 'Day 23', label: 'Programme Progress', sub: 'of 84 days (12 weeks)', color: 'var(--blue)' },
      { n: '4/5', label: "Today's Mood", sub: 'Last check-in', color: '#38A169' },
      { n: '2/5', label: 'Cravings', sub: 'Last check-in', color: '#DD6B20' },
      { n: '5/12', label: 'Individual Sessions', sub: 'Completed', color: 'var(--gold)' },
    ],
    sections: [
      {
        title: "Today's Schedule",
        items: [
          { label: '5:30 AM — Wake-up & Hygiene', count: null, color: 'var(--g500)' },
          { label: '6:00 AM — Boot Camp (45 min)', count: null, color: '#805AD5' },
          { label: '7:00 AM — Morning Prayer & Devotions', count: null, color: 'var(--gold)' },
          { label: '9:00 AM — Bible School (2 hrs)', count: null, color: 'var(--gold)' },
          { label: '11:00 AM — Group Therapy: CBT', count: null, color: 'var(--blue)' },
          { label: '3:30 PM — Individual Counseling', count: null, color: '#805AD5' },
        ],
      },
    ],
  },
  family: {
    title: "Chidi's Progress",
    subtitle: 'Family Dashboard — Ngozi Okonkwo (Mother)',
    cards: [
      { n: 'Day 23', label: 'Programme Day', sub: 'of 84 days', color: 'var(--blue)' },
      { n: 'Positive', label: 'Overall Progress', sub: 'Care team assessment', color: '#1A7A4A' },
      { n: '95%', label: 'Attendance', sub: 'Programme sessions', color: 'var(--gold)' },
      { n: 'May 4', label: 'Next Visit', sub: 'Sunday 12–6 PM', color: '#805AD5' },
    ],
    sections: [
      {
        title: 'Recent Updates',
        items: [
          { label: 'Engaging well in group therapy — mood stable this week', count: 'Apr 1', color: '#1A7A4A' },
          { label: 'Completed Detox & Stabilisation phase successfully', count: 'Mar 28', color: 'var(--blue)' },
          { label: 'Comprehensive psychosocial assessment completed', count: 'Mar 20', color: 'var(--gold)' },
        ],
      },
    ],
  },
}

export default function Overview() {
  const { user } = useAuth()
  const role = user?.role || 'patient'
  const data = MOCK_KPIs[role] || MOCK_KPIs.patient

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', marginBottom: 4 }}>{data.title}</h1>
        <p style={{ fontSize: '.92rem', color: 'var(--g500)' }}>{data.subtitle}</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {data.cards.map(card => (
          <div key={card.label} className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', fontWeight: 700, color: card.color, lineHeight: 1.1 }}>{card.n}</div>
            <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--charcoal)', marginTop: 4 }}>{card.label}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: data.sections.length > 1 ? '1fr 1fr' : '1fr', gap: 20 }}>
        {data.sections.map(section => (
          <div key={section.title} className="card">
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: 14 }}>{section.title}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {section.items.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: i < section.items.length - 1 ? '1px solid var(--g100)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '.86rem', color: 'var(--g700)' }}>{item.label}</span>
                  </div>
                  {item.count !== null && (
                    <span style={{ fontSize: '.78rem', fontWeight: 700, color: item.color }}>{item.count}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
