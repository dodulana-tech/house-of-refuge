import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../utils/paystack'
import { getApplications, getPatients, getPayments, getLatestCheckinsByPatient, isSupabaseReady } from '../../utils/supabase'
import { mapPatientRow, dayInProgramme, phaseForDay, PROGRAMME_DAYS } from '../../utils/patients'

/*
  Role-aware overview — renders different KPI dashboards per role.
  All figures are computed live from Supabase; no hardcoded data.
*/

const TOTAL_BEDS = 19
const PENDING_STATUSES = ['submitted', 'pre-screening', 'clinical-assessment', 'admission-decision', 'documentation', 'intake', 'treatment-planning']
const PHASE_LABELS = {
  stabilization: 'Medical Stabilization (Wk 1–2)',
  foundation: 'Therapeutic Foundation (Wk 3–6)',
  deepening: 'Deepening & Skills (Wk 7–10)',
  reintegration: 'Reintegration (Wk 11–12)',
}
const PHASE_COLORS = { stabilization: '#E53E3E', foundation: '#DD6B20', deepening: '#D69E2E', reintegration: '#1A7A4A' }

function isThisMonth(iso) {
  if (!iso) return false
  const d = new Date(iso), now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

function buildAdmin(apps, patients, payments) {
  const active = patients.filter(p => ['admitted', 'on-pass', 'suspended'].includes(p.status))
  const pending = apps.filter(a => PENDING_STATUSES.includes(a.status))
  const settledMtd = payments.filter(p => (p.status === 'paid' || p.verified) && isThisMonth(p.created_at))
  const revenueMtd = settledMtd.reduce((s, p) => s + Math.round((p.amount || 0) / 100), 0)
  const occupancyFree = TOTAL_BEDS > 0 ? Math.round(((TOTAL_BEDS - active.length) / TOTAL_BEDS) * 100) : 0

  const pipelineItems = [
    ['submitted', 'Submitted', 'var(--blue)'],
    ['pre-screening', 'Pre-screening', '#DD6B20'],
    ['clinical-assessment', 'Clinical Assessment', '#D69E2E'],
    ['admission-decision', 'Admission Decision', '#805AD5'],
    ['outpatient-pathway', 'Outpatient Pathway', 'var(--g500)'],
  ].map(([key, label, color]) => ({ label, color, count: apps.filter(a => a.status === key).length }))
   .filter(i => i.count > 0)

  const phaseItems = ['stabilization', 'foundation', 'deepening', 'reintegration'].map(ph => ({
    label: PHASE_LABELS[ph],
    color: PHASE_COLORS[ph],
    count: active.filter(p => (p.current_phase && p.current_phase !== 'stabilization' ? p.current_phase : phaseForDay(dayInProgramme(p))) === ph).length,
  }))

  return {
    title: 'Centre Overview',
    subtitle: 'Program Director Dashboard',
    cards: [
      { n: String(active.length), label: 'Current Residents', sub: `of ${TOTAL_BEDS} beds`, color: 'var(--blue)' },
      { n: String(TOTAL_BEDS - active.length), label: 'Beds Available', sub: `${occupancyFree}% capacity free`, color: '#1A7A4A' },
      { n: String(pending.length), label: 'Pending Applications', sub: `${apps.filter(a => a.deposit_paid).length} with deposit`, color: '#DD6B20' },
      { n: fmt(revenueMtd), label: 'Revenue (MTD)', sub: 'Settled payments', color: 'var(--gold)' },
    ],
    sections: [
      { title: 'Admission Pipeline', items: pipelineItems.length ? pipelineItems : [{ label: 'No active applications', count: null, color: 'var(--g500)' }] },
      { title: 'Residents by Phase', items: phaseItems },
    ],
  }
}

function buildPatientView(me, checkin) {
  if (!me) {
    return { title: 'My Recovery', subtitle: 'No active programme record', cards: [], sections: [] }
  }
  const m = mapPatientRow(me, checkin)
  return {
    title: 'My Recovery',
    subtitle: `Day ${m.day} of ${PROGRAMME_DAYS}`,
    cards: [
      { n: `Day ${m.day}`, label: 'Programme Progress', sub: `of ${PROGRAMME_DAYS} days (12 weeks)`, color: 'var(--blue)' },
      { n: m.mood != null ? `${m.mood}/5` : '—', label: "Today's Mood", sub: 'Last check-in', color: '#38A169' },
      { n: m.cravings != null ? `${m.cravings}/5` : '—', label: 'Cravings', sub: 'Last check-in', color: '#DD6B20' },
      { n: m.phase, label: 'Current Phase', sub: 'Programme phase', color: 'var(--gold)' },
    ],
    sections: [],
  }
}

export default function Overview() {
  const { user } = useAuth()
  const role = user?.role || 'patient'
  const [data, setData] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      if (!isSupabaseReady()) { if (active) setData({ title: 'Overview', subtitle: '', cards: [], sections: [] }); return }
      if (role === 'admin' || role === 'staff') {
        const [{ data: apps }, { data: patients }, { data: payments }] = await Promise.all([
          getApplications(), getPatients(), getPayments(),
        ])
        if (active) setData(buildAdmin(apps || [], patients || [], payments || []))
      } else {
        const [{ data: patients }, { data: checkins }] = await Promise.all([
          getPatients(), getLatestCheckinsByPatient(),
        ])
        const me = (patients || []).find(p => p.user_id === user?.id) || (patients || [])[0]
        if (active) setData(buildPatientView(me, me ? checkins?.[me.id] : null))
      }
    }
    load()
    return () => { active = false }
  }, [role, user?.id])

  if (!data) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--g500)' }}>Loading overview…</div>
  }

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
