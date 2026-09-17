import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getApplications as getLocalApps } from '../../utils/store'
import { getApplications as getSupaApps, isSupabaseReady } from '../../utils/supabase'
import { fmt } from '../../utils/paystack'
import { SUBSTANCE_PATHWAYS, SUBSTANCE_PATHWAY_META, POPULATION_PATHWAY_LABELS, INSIGHT_COLORS } from '../../data/clinicalConstants'
import {
  STAGES, DISPOSITIONS, stageLabel, dispositionLabel, dispositionColor,
  fundingLabel, fundingColor, closureLabel, daysInStage, isOverdue, nextAction,
} from '../../utils/admissionsPipeline'

/*
  Admissions worklist.

  The old page filtered on a single `status` column that was doing three jobs
  at once, so a file that was clinically fine but unfunded had no chip of its
  own and simply sat in whichever stage it had reached. The list now leads with
  disposition, which answers the question that actually matters on a Monday
  morning: what owes us an action, and how long has it been waiting.
*/

const PIPELINE_STAGES = STAGES.map((s, i) => ({
  ...s,
  color: ['var(--blue)', '#DD6B20', '#D69E2E', '#805AD5', '#805AD5', '#2B6CB0', '#2B6CB0', '#1A7A4A'][i] || 'var(--g500)',
}))

// Rows from the dev local-storage fallback predate the four axes.
function normalise(a) {
  return {
    ...a,
    stage: a.stage || 'submitted',
    disposition: a.disposition || 'active-us',
    funding_route: a.funding_route || 'undetermined',
  }
}

const PATHWAY_COLORS = Object.fromEntries(
  Object.entries(SUBSTANCE_PATHWAY_META).map(([k, v]) => [k, v.color])
)

const insightColors = INSIGHT_COLORS

export default function Admissions() {
  const [apps, setApps] = useState([])
  const [stage, setStage] = useState('all')
  const [view, setView] = useState('active-us')   // disposition, the first question
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

  const rows = apps.map(normalise)

  const byDisposition = view === 'all' ? rows : rows.filter(a => a.disposition === view)
  const filtered = (stage === 'all' ? byDisposition : byDisposition.filter(a => a.stage === stage))
    /*
      Oldest first, with anything overdue pulled to the top. A worklist sorted
      by submission date buries exactly the files that have been waiting
      longest, which is how 39 of them went quiet.
    */
    .sort((a, b) => (isOverdue(b) - isOverdue(a)) || (daysInStage(b) - daysInStage(a)))

  const needsAssistance = rows.filter(a => a.funding_route === 'assistance-requested').length
  const overdue = rows.filter(isOverdue).length

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Admissions Worklist</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
          {apps.length} application{apps.length === 1 ? '' : 's'}
          {overdue > 0 && <> · <strong style={{ color: '#8B2A2A' }}>{overdue} overdue</strong></>}
          {needsAssistance > 0 && <> · {needsAssistance} awaiting financial assistance</>}
        </p>
      </div>

      {/* Who owes the next action. The first question, before any stage. */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {DISPOSITIONS.map(d => {
          const count = rows.filter(a => a.disposition === d.key).length
          return (
            <button key={d.key} className={`btn btn--sm ${view === d.key ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => { setView(d.key); setStage('all') }} title={d.hint}>
              {d.label} ({count})
            </button>
          )
        })}
        <button className={`btn btn--sm ${view === 'all' ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => { setView('all'); setStage('all') }}>
          All ({rows.length})
        </button>
      </div>

      {/* Then where in the funnel, within that group. */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={`btn btn--sm ${stage === 'all' ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setStage('all')}>
          Every stage ({byDisposition.length})
        </button>
        {PIPELINE_STAGES.map(s => {
          const count = byDisposition.filter(a => a.stage === s.key).length
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
          const stageInfo = PIPELINE_STAGES.find(s => s.key === app.stage) || { label: stageLabel(app.stage), color: 'var(--g500)' }
          const waiting = daysInStage(app)
          const late = isOverdue(app)
          const waitingOn = nextAction(app)
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
                  {late && (
                    <span style={{ padding: '4px 10px', borderRadius: 14, fontSize: '.72rem', fontWeight: 700, background: '#8B2A2A15', color: '#8B2A2A' }}>
                      {app.disposition === 'parked' ? 'Review overdue' : `Waiting ${waiting}d`}
                    </span>
                  )}
                  <span style={{ padding: '4px 10px', borderRadius: 14, fontSize: '.72rem', fontWeight: 700, background: stageInfo.color + '15', color: stageInfo.color }}>
                    {stageInfo.label}
                  </span>
                  <span style={{ padding: '4px 10px', borderRadius: 14, fontSize: '.72rem', fontWeight: 700, background: dispositionColor(app.disposition) + '18', color: dispositionColor(app.disposition) }}>
                    {app.disposition === 'closed' ? closureLabel(app.closure_reason) : dispositionLabel(app.disposition)}
                  </span>
                  {app.funding_route !== 'undetermined' && (
                    <span style={{ padding: '4px 10px', borderRadius: 14, fontSize: '.72rem', fontWeight: 700, background: fundingColor(app.funding_route) + '18', color: fundingColor(app.funding_route) }}>
                      {fundingLabel(app.funding_route)}
                    </span>
                  )}
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
                {waitingOn && (
                  <span style={{ color: 'var(--blue)', fontWeight: 600 }}>Next: {waitingOn}</span>
                )}
                {app.disposition === 'parked' && app.parked_until && (
                  <span style={{ color: late ? '#8B2A2A' : 'var(--g500)' }}>
                    Review {new Date(app.parked_until).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  </span>
                )}
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
            Nothing here. Try another group above.
          </div>
        )}
      </div>
    </div>
  )
}
