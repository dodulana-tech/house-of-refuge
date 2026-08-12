import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getApplications as getLocalApps } from '../../utils/store'
import { getApplications as getSupaApps, isSupabaseReady } from '../../utils/supabase'
import { fmt } from '../../utils/paystack'
import { SUBSTANCE_PATHWAYS, SUBSTANCE_PATHWAY_META, POPULATION_PATHWAY_LABELS, INSIGHT_COLORS } from '../../data/clinicalConstants'

/*
  Admissions Pipeline — maps to the 8-step SOP admission process:
  1. Submitted → 2. Pre-screening → 3. Clinical Assessment → 4. Admission Decision
  5. Documentation → 6. Intake → 7. Treatment Planning → 8. Admitted
  + Outpatient Pathway, Referred, Deferred, Declined, Withdrawn
*/

/*
  Every status the `applications` CHECK constraint allows must appear here.
  Documentation, intake, treatment-planning, deferred, declined and withdrawn
  were missing, so files parked in those stages were reachable only through the
  "All" view and were invisible in the stage chips.
*/
const PIPELINE_STAGES = [
  { key: 'submitted', label: 'Submitted', color: 'var(--blue)' },
  { key: 'pre-screening', label: 'Pre-screening', color: '#DD6B20' },
  { key: 'clinical-assessment', label: 'Clinical Assessment', color: '#D69E2E' },
  { key: 'admission-decision', label: 'Decision', color: '#805AD5' },
  { key: 'documentation', label: 'Documentation', color: '#805AD5' },
  { key: 'intake', label: 'Intake', color: '#2B6CB0' },
  { key: 'treatment-planning', label: 'Treatment Planning', color: '#2B6CB0' },
  { key: 'admitted', label: 'Admitted', color: '#1A7A4A' },
  { key: 'outpatient-pathway', label: 'Outpatient', color: 'var(--g500)' },
  { key: 'referred', label: 'Referred', color: '#E53E3E' },
  { key: 'deferred', label: 'Deferred', color: '#B7791F' },
  { key: 'declined', label: 'Declined', color: '#822727' },
  { key: 'withdrawn', label: 'Withdrawn', color: 'var(--g500)' },
]

const PATHWAY_COLORS = Object.fromEntries(
  Object.entries(SUBSTANCE_PATHWAY_META).map(([k, v]) => [k, v.color])
)

const insightColors = INSIGHT_COLORS

export default function Admissions() {
  const [apps, setApps] = useState([])
  const [stage, setStage] = useState('all')
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    async function load() {
      if (isSupabaseReady()) {
        const { data, error } = await getSupaApps()
        /*
          A failed read used to leave the page showing "No applications", which
          is indistinguishable from an empty pipeline. RLS denies the read
          outright when the session has expired or the account is not staff, so
          say which it is rather than implying nobody has applied.
        */
        if (error) { setLoadError(error.message || 'Could not load applications.'); return }
        setApps(data || [])
      } else {
        const local = getLocalApps()
        if (local?.length) setApps(local.map(a => ({
          ...a, first_name: a.fn, last_name: a.ln, insight_level: a.insightLevel,
          created_at: a.submittedAt, deposit_paid: a.depositPaid,
        })))
      }
    }
    load()
  }, [])

  const filtered = stage === 'all' ? apps : apps.filter(a => (a.status || '') === stage)

  const known = new Set(PIPELINE_STAGES.map(s => s.key))
  const unknownStages = Object.entries(
    apps.reduce((acc, a) => {
      const key = a.status || ''
      if (!known.has(key)) acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  ).map(([key, count]) => ({ key, count }))

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
        {/* Anything written by a route we do not know about still gets a chip,
            so a new or mistyped status can never hide a file from admissions. */}
        {unknownStages.map(s => (
          <button key={s.key} className={`btn btn--sm ${stage === s.key ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setStage(s.key)}>
            {s.key || 'No status'} ({s.count})
          </button>
        ))}
      </div>

      {/* Application cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(app => {
          const stageInfo = PIPELINE_STAGES.find(s => s.key === app.status) || { label: app.status, color: 'var(--g500)' }
          return (
            <div key={app.id} className="card" style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <Link to={'/dashboard/admissions/' + app.id} style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--charcoal)', textDecoration: 'none', display: 'block' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--blue)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--charcoal)'}>
                    {app.initials || ((app.first_name || app.fn || '').charAt(0) + (app.last_name || app.ln || '').charAt(0)).toUpperCase()}
                  </Link>
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
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {(app.substancePathway || SUBSTANCE_PATHWAYS[app.substance]) && (
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '.68rem', fontWeight: 700, background: (PATHWAY_COLORS[app.substancePathway || SUBSTANCE_PATHWAYS[app.substance]] || '#2B6CB0') + '12', color: PATHWAY_COLORS[app.substancePathway || SUBSTANCE_PATHWAYS[app.substance]] || '#2B6CB0' }}>
                    {app.substancePathway || SUBSTANCE_PATHWAYS[app.substance]} Pathway
                  </span>
                )}
                {app.careLevel && app.careLevel !== 'residential' && (
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '.68rem', fontWeight: 700, background: 'rgba(221,107,32,.1)', color: '#DD6B20' }}>
                    {app.careLevel === 'iop' ? 'IOP (Level 2.1)' : 'Outpatient (Level 1)'}
                  </span>
                )}
                {app.populationPathway && app.populationPathway !== 'standard' && (
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '.68rem', fontWeight: 700, background: 'rgba(128,90,213,.1)', color: '#805AD5' }}>
                    {POPULATION_PATHWAY_LABELS[app.populationPathway] || app.populationPathway}
                  </span>
                )}
              </div>
            </div>
          )
        })}
        {loadError && (
          <div className="card" style={{ padding: 24, borderLeft: '3px solid #E53E3E' }}>
            <div style={{ fontWeight: 700, color: '#822727', marginBottom: 6 }}>Applications could not be loaded</div>
            <div style={{ fontSize: '.85rem', color: 'var(--g700)', marginBottom: 8 }}>{loadError}</div>
            <div style={{ fontSize: '.82rem', color: 'var(--g500)' }}>
              This is an access problem, not an empty pipeline. Sign out and back in; if it persists, the
              signed-in account needs the staff or admin role in Supabase.
            </div>
          </div>
        )}
        {!loadError && filtered.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--g500)' }}>
            No applications in this stage.
          </div>
        )}
      </div>
    </div>
  )
}
