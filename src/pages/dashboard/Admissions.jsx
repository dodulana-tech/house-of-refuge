import React, { useState, useEffect } from 'react'
import { getApplications as getLocalApps } from '../../utils/store'
import { getApplications as getSupaApps, isSupabaseReady } from '../../utils/supabase'
import { fmt } from '../../utils/paystack'

/*
  Admissions Pipeline — maps to the 8-step SOP admission process:
  1. Submitted → 2. Pre-screening → 3. Clinical Assessment → 4. Admission Decision
  5. Documentation → 6. Intake → 7. Treatment Planning → 8. Admitted
  + Outpatient Pathway, Referred, Deferred, Declined, Withdrawn
*/

const PIPELINE_STAGES = [
  { key: 'submitted', label: 'Submitted', color: 'var(--blue)' },
  { key: 'pre-screening', label: 'Pre-screening', color: '#DD6B20' },
  { key: 'clinical-assessment', label: 'Clinical Assessment', color: '#D69E2E' },
  { key: 'admission-decision', label: 'Decision', color: '#805AD5' },
  { key: 'admitted', label: 'Admitted', color: '#1A7A4A' },
  { key: 'outpatient-pathway', label: 'Outpatient', color: 'var(--g500)' },
  { key: 'referred', label: 'Referred', color: '#E53E3E' },
]

const MOCK_APPS = [
  { id: 'APP001', first_name: 'Tunde', last_name: 'Bakare', initials: 'TB', substance: 'Cocaine', insight_level: 'contemplation', family_support: 'strong', pathway: 'A', deposit_paid: true, created_at: '2026-03-28', status: 'pre-screening', email: 'tunde@example.com', phone: '08011111111' },
  { id: 'APP002', first_name: 'Grace', last_name: 'Obi', initials: 'GO', substance: 'Alcohol', insight_level: 'preparation', family_support: 'moderate', pathway: 'A', deposit_paid: true, created_at: '2026-03-25', status: 'clinical-assessment', email: 'grace@example.com', phone: '08022222222' },
  { id: 'APP003', first_name: 'Ahmed', last_name: 'Yusuf', initials: 'AY', substance: 'Multiple', insight_level: 'denial', family_support: 'weak', pathway: 'B', deposit_paid: false, created_at: '2026-03-20', status: 'outpatient-pathway', email: 'ahmed@example.com', phone: '08033333333' },
]

const insightColors = { denial: '#E53E3E', precontemplation: '#DD6B20', contemplation: '#D69E2E', preparation: '#38A169', action: '#2B6CB0' }

export default function Admissions() {
  const [apps, setApps] = useState(MOCK_APPS)
  const [stage, setStage] = useState('all')

  useEffect(() => {
    async function load() {
      if (isSupabaseReady()) {
        const { data } = await getSupaApps()
        if (data?.length) setApps([...MOCK_APPS, ...data])
      } else {
        const local = getLocalApps()
        if (local?.length) setApps([...MOCK_APPS, ...local.map(a => ({
          ...a, first_name: a.fn, last_name: a.ln, insight_level: a.insightLevel,
          created_at: a.submittedAt, deposit_paid: a.depositPaid,
        }))])
      }
    }
    load()
  }, [])

  const filtered = stage === 'all' ? apps : apps.filter(a => a.status === stage)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Admissions Pipeline</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>8-step admission process per SOP · {apps.length} total applications</p>
      </div>

      {/* Pipeline stage counts */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={`btn btn--sm ${stage === 'all' ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setStage('all')}>
          All ({apps.length})
        </button>
        {PIPELINE_STAGES.map(s => {
          const count = apps.filter(a => a.status === s.key).length
          if (count === 0) return null
          return (
            <button key={s.key} className={`btn btn--sm ${stage === s.key ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setStage(s.key)}>
              {s.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Application cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(app => {
          const stageInfo = PIPELINE_STAGES.find(s => s.key === app.status) || { label: app.status, color: 'var(--g500)' }
          return (
            <div key={app.id} className="card" style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--charcoal)' }}>
                    {app.initials || ((app.first_name || app.fn || '').charAt(0) + (app.last_name || app.ln || '').charAt(0)).toUpperCase()}
                  </div>
                  <div style={{ fontSize: '.78rem', color: 'var(--g500)', marginTop: 2 }}>
                    {app.email} · {app.phone} · Applied: {new Date(app.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ padding: '4px 10px', borderRadius: 14, fontSize: '.72rem', fontWeight: 700, background: stageInfo.color + '15', color: stageInfo.color }}>
                    {stageInfo.label}
                  </span>
                  {app.deposit_paid && (
                    <span style={{ padding: '4px 10px', borderRadius: 14, fontSize: '.72rem', fontWeight: 700, background: 'rgba(26,122,74,.1)', color: '#1A7A4A' }}>
                      {fmt(1000000)} Paid
                    </span>
                  )}
                  <span style={{ padding: '4px 10px', borderRadius: 14, fontSize: '.72rem', fontWeight: 700, background: 'rgba(26,95,173,.08)', color: 'var(--blue)' }}>
                    Pathway {app.pathway}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: '.82rem', color: 'var(--g700)', flexWrap: 'wrap' }}>
                <span>Substance: <strong>{app.substance}</strong></span>
                <span>Insight: <strong style={{ color: insightColors[app.insight_level] || 'var(--g500)' }}>{app.insight_level || 'N/A'}</strong></span>
                <span>Family: <strong>{app.family_support || app.familyAwareness || 'N/A'}</strong></span>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--g500)' }}>
            No applications in this stage.
          </div>
        )}
      </div>
    </div>
  )
}
