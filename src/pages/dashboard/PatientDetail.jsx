import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, getCheckins, isSupabaseReady } from '../../utils/supabase'
import { mapPatientRow, PROGRAMME_DAYS } from '../../utils/patients'
import {
  ENCOUNTER_TYPES, RISK_FLAGS, colorOf, labelOf,
  getOutpatientHistoryForPatient,
} from '../../utils/outpatientClinical'

/*
  Patient Detail — tabbed view for a single patient record (live data).
  Demographics, check-ins and behavioral incidents come from Supabase.
  Treatment plan shows the standard Columbia 4-phase template; vitals,
  clinical notes, passes and MDT reviews populate in later wiring waves.
  Initials only — no full names surfaced in the roster header (HIPAA).
*/

const PHASES = {
  stabilization: { label: 'Stabilization', color: '#E53E3E', weeks: '1-2' },
  foundation: { label: 'Foundation', color: '#DD6B20', weeks: '3-6' },
  deepening: { label: 'Deepening', color: '#D69E2E', weeks: '7-10' },
  reintegration: { label: 'Reintegration', color: '#1A7A4A', weeks: '11-12' },
}

// Standard programme plan (SOP) — a template, not per-patient data.
const COLUMBIA_PHASES = [
  { name: 'Phase 1 — Stabilization', weeks: 'Week 1-2', color: '#E53E3E', goals: ['Medical detox assessment complete', 'Baseline vitals established', 'Orientation to programme rules', 'Initial psychosocial assessment', 'Spiritual readiness conversation'] },
  { name: 'Phase 2 — Foundation', weeks: 'Week 3-6', color: '#DD6B20', goals: ['Individual CBT sessions (2x/week)', 'Group therapy engagement', 'Identify core triggers and coping strategies', 'Life skills module: anger management', 'Family psychoeducation session scheduled', 'Pastoral care: faith journey mapping'] },
  { name: 'Phase 3 — Deepening', weeks: 'Week 7-10', color: '#D69E2E', goals: ['Trauma processing (EMDR/narrative)', 'Relapse prevention plan drafted', 'Vocational assessment complete', 'Supervised community outing', 'Forgiveness and reconciliation work'] },
  { name: 'Phase 4 — Reintegration', weeks: 'Week 11-12', color: '#1A7A4A', goals: ['Aftercare plan finalized', 'Family reintegration meeting', 'Support group connection established', 'Exit interview and testimonial', 'Discharge summary completed'] },
]

const tierConfig = {
  1: { label: 'Tier 1 — Minor', color: '#D69E2E', bg: 'rgba(214,158,46,.1)' },
  2: { label: 'Tier 2 — Major', color: '#DD6B20', bg: 'rgba(221,107,32,.1)' },
  3: { label: 'Tier 3 — Motivational', color: '#E53E3E', bg: 'rgba(229,62,62,.1)' },
}

const moodColors = ['', '#E53E3E', '#DD6B20', '#D69E2E', '#38A169', '#2B6CB0']

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'treatment', label: 'Treatment Plan' },
  { key: 'checkins', label: 'Check-ins' },
  { key: 'notes', label: 'Clinical Notes' },
  { key: 'behavioral', label: 'Behavioral' },
  { key: 'passes', label: 'Passes' },
]

function EmptyState({ children }) {
  return (
    <div className="card" style={{ padding: '32px 22px', textAlign: 'center' }}>
      <p style={{ fontSize: '.9rem', color: 'var(--g500)' }}>{children}</p>
    </div>
  )
}

export default function PatientDetail() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('overview')
  const [p, setP] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [incidents, setIncidents] = useState([])
  const [outpatient, setOutpatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true); setNotFound(false)
      if (!isSupabaseReady()) { if (active) { setNotFound(true); setLoading(false) } return }
      const { data: row, error } = await supabase.from('patients').select('*').eq('id', id).single()
      if (!active) return
      if (error || !row) { setNotFound(true); setLoading(false); return }
      setP(mapPatientRow(row))
      const [{ data: ci }, { data: inc }, { data: op }] = await Promise.all([
        getCheckins(id),
        supabase.from('incidents').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
        getOutpatientHistoryForPatient(id),
      ])
      if (!active) return
      setCheckins(ci || [])
      setIncidents(inc || [])
      setOutpatient(op)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [id])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--g500)' }}>Loading patient…</div>
  if (notFound || !p) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--g500)' }}>
        <p style={{ marginBottom: 12 }}>Patient record not found.</p>
        <Link to="/dashboard/patients" className="btn btn--secondary btn--sm">← Back to Patient Records</Link>
      </div>
    )
  }

  const phase = PHASES[p.phase] || PHASES.stabilization
  const progress = Math.round((p.day / PROGRAMME_DAYS) * 100)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--blue), var(--blue-dk))',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', fontWeight: 700, flexShrink: 0,
          }}>
            {p.initials}
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 2 }}>{p.initials}</h1>
            <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
              {p.gender}{p.age ? `, ${p.age}y` : ''}{p.bed ? ` · Bed ${p.bed}` : ''}{p.pathway ? ` · Pathway ${p.pathway}` : ''} · Day {p.day}/{PROGRAMME_DAYS}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ padding: '5px 14px', borderRadius: 14, fontSize: '.78rem', fontWeight: 700, background: phase.color + '15', color: phase.color }}>
            {phase.label} (Wk {phase.weeks})
          </span>
          <span style={{ padding: '5px 14px', borderRadius: 14, fontSize: '.78rem', fontWeight: 700, background: 'rgba(26,122,74,.1)', color: '#1A7A4A' }}>
            {p.status}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', color: 'var(--g500)', marginBottom: 6 }}>
          <span>Programme Progress</span>
          <span>{progress}% complete — Day {p.day} of {PROGRAMME_DAYS}</span>
        </div>
        <div className="pbar"><div className="pfill" style={{ width: `${progress}%`, background: phase.color }} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.68rem', color: 'var(--g500)', marginTop: 4 }}>
          {Object.entries(PHASES).map(([key, ph]) => (
            <span key={key} style={{ color: key === p.phase ? ph.color : undefined, fontWeight: key === p.phase ? 700 : 400 }}>
              {ph.label}
            </span>
          ))}
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap', borderBottom: '2px solid var(--g200)', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px', fontSize: '.84rem', fontWeight: 600,
              border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === tab.key ? 'var(--blue)' : 'var(--g500)',
              borderBottom: activeTab === tab.key ? '2px solid var(--blue)' : '2px solid transparent',
              marginBottom: '-2px', transition: 'all .2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <>
          {outpatient?.encounters?.length > 0 && (
            <div className="card" style={{ padding: '14px 20px', marginBottom: 16, borderLeft: '4px solid var(--blue)' }}>
              <div style={{ fontSize: '.88rem', color: 'var(--charcoal)' }}>
                <strong>Seen as an outpatient before admission.</strong>{' '}
                {outpatient.encounters.length} signed session{outpatient.encounters.length === 1 ? '' : 's'} on record
                {' '}(<Link to={`/dashboard/outpatient/clients/${outpatient.client.id}`}>{outpatient.client.client_code}</Link>).
                {' '}<button onClick={() => setActiveTab('notes')}
                  style={{ border: 'none', background: 'none', padding: 0, color: 'var(--blue)', fontWeight: 600, cursor: 'pointer', fontSize: '.88rem', fontFamily: 'inherit' }}>
                  Read the history →
                </button>
              </div>
            </div>
          )}
          <OverviewTab p={p} checkins={checkins} phase={phase} />
        </>
      )}
      {activeTab === 'treatment' && <TreatmentTab />}
      {activeTab === 'checkins' && <CheckinsTab checkins={checkins} />}
      {activeTab === 'notes' && (
        outpatient?.encounters?.length
          ? <OutpatientHistory op={outpatient} initials={p.initials} />
          : <EmptyState>No clinical notes recorded yet for {p.initials}.</EmptyState>
      )}
      {activeTab === 'behavioral' && <BehavioralTab incidents={incidents} initials={p.initials} />}
      {activeTab === 'passes' && <EmptyState>No passes on record yet for {p.initials}.</EmptyState>}
    </div>
  )
}

/* ─── Outpatient history (pre-admission) ─── */
/*
  Signed outpatient notes from before this person was admitted. They live on the
  outpatient client record; this reads them through outpatient_clients.patient_id
  so an assessing clinician does not have to know the outpatient side exists.
*/
function OutpatientHistory({ op, initials }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', marginBottom: 6 }}>Pre-admission Outpatient Notes</h2>
      <p style={{ fontSize: '.85rem', color: 'var(--g500)', marginBottom: 16 }}>
        {op.encounters.length} signed session{op.encounters.length === 1 ? '' : 's'} recorded for {initials} before admission, on outpatient record{' '}
        <Link to={`/dashboard/outpatient/clients/${op.client.id}`}>{op.client.client_code}</Link>. Read-only here.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {op.encounters.map(e => (
          <div key={e.id} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
              <strong style={{ fontSize: '.92rem' }}>{labelOf(ENCOUNTER_TYPES, e.encounter_type)}</strong>
              {e.risk_flag !== 'none' && (
                <span style={{
                  fontSize: '.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  color: colorOf(RISK_FLAGS, e.risk_flag), background: colorOf(RISK_FLAGS, e.risk_flag) + '18',
                }}>Risk: {labelOf(RISK_FLAGS, e.risk_flag)}</span>
              )}
              <span style={{ fontSize: '.78rem', color: 'var(--g500)' }}>
                {new Date(e.encounter_date).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                {e.signed_by_name ? ` · ${e.signed_by_name}` : ''}
                {e.outpatient_services?.name ? ` · ${e.outpatient_services.name}` : ''}
              </span>
            </div>
            <NoteField k="Presenting complaint" v={e.presenting_complaint} />
            <NoteField k="S — Subjective" v={e.subjective} />
            <NoteField k="O — Objective" v={e.objective} />
            <NoteField k="A — Assessment" v={e.assessment} />
            <NoteField k="P — Plan" v={e.plan} />
            <NoteField k="Working diagnosis" v={e.diagnosis} />
            <NoteField k="Medication" v={e.medications} />
            {e.risk_flag !== 'none' && <NoteField k="Risk" v={e.risk_notes} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function NoteField({ k, v }) {
  if (!v) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--g500)', fontWeight: 700 }}>{k}</div>
      <div style={{ fontSize: '.87rem', color: 'var(--charcoal)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{v}</div>
    </div>
  )
}

/* ─── Overview Tab ─── */
function OverviewTab({ p, checkins, phase }) {
  const latest = checkins[0]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
      {/* Demographics */}
      <div className="card" style={{ padding: '18px 22px' }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14, color: 'var(--charcoal)' }}>Demographics</h3>
        {[
          ['Initials', p.initials],
          ['Gender', p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : (p.gender || '—')],
          ['Age', p.age ? `${p.age} years` : '—'],
          ['Admitted', p.admittedAt ? new Date(p.admittedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'],
          ['Bed', p.bed || '—'],
          ['Pathway', p.pathway ? `Pathway ${p.pathway}` : '—'],
          ['Phase', `${phase.label} (Week ${phase.weeks})`],
          ['Day', `${p.day} of ${PROGRAMME_DAYS}`],
          ['Counselor', p.counselor || '—'],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--g100)' }}>
            <span style={{ fontSize: '.82rem', color: 'var(--g500)', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: '.82rem', color: 'var(--charcoal)', fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Substance Profile */}
      <div className="card" style={{ padding: '18px 22px' }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14, color: 'var(--charcoal)' }}>Substance Profile</h3>
        {[
          ['Primary Substance', p.substance],
          ['Stage of Change', p.insight || '—'],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--g100)' }}>
            <span style={{ fontSize: '.82rem', color: 'var(--g500)', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: '.82rem', color: 'var(--charcoal)', fontWeight: 600, textTransform: 'capitalize' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Latest check-in */}
      <div className="card" style={{ padding: '18px 22px' }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14, color: 'var(--charcoal)' }}>Latest Check-in</h3>
        {!latest ? (
          <p style={{ fontSize: '.85rem', color: 'var(--g500)' }}>No check-ins recorded yet.</p>
        ) : (
          [
            ['Date', (latest.created_at || '').slice(0, 10)],
            ['Mood', latest.mood != null ? `${latest.mood}/5` : '—'],
            ['Cravings', latest.cravings != null ? `${latest.cravings}/5` : '—'],
            ['Sleep', latest.sleep || '—'],
            ['Anxiety', latest.anxiety != null ? `${latest.anxiety}/5` : '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--g100)' }}>
              <span style={{ fontSize: '.82rem', color: 'var(--g500)', fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: '.82rem', color: 'var(--charcoal)', fontWeight: 600 }}>{value}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ─── Treatment Plan Tab (standard programme template) ─── */
function TreatmentTab() {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', marginBottom: 6 }}>Columbia Model — 4-Phase Treatment Plan</h2>
      <p style={{ fontSize: '.84rem', color: 'var(--g500)', marginBottom: 20 }}>12-week structured rehabilitation with MDT oversight (standard programme plan)</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {COLUMBIA_PHASES.map((ph, i) => (
          <div key={i} className="card" style={{ padding: '18px 22px', borderLeft: `4px solid ${ph.color}` }}>
            <div style={{ marginBottom: 12 }}>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', color: ph.color }}>{ph.name}</h3>
              <span style={{ fontSize: '.76rem', color: 'var(--g500)' }}>{ph.weeks}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ph.goals.map((goal, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: ph.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '.84rem', color: 'var(--charcoal)' }}>{goal}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Check-ins Tab ─── */
function CheckinsTab({ checkins }) {
  if (!checkins.length) {
    return <EmptyState>No daily check-ins recorded yet.</EmptyState>
  }
  const recent = checkins.slice(0, 7)
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', marginBottom: 6 }}>Daily Check-ins</h2>
      <p style={{ fontSize: '.84rem', color: 'var(--g500)', marginBottom: 20 }}>Most recent {recent.length} self-reported entries</p>

      {/* Trend mini-chart */}
      <div className="card" style={{ padding: '18px 22px', marginBottom: 20 }}>
        <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', marginBottom: 10 }}>Mood & Cravings Trend</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80, marginBottom: 6 }}>
          {[...recent].reverse().map((c, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', justifyContent: 'center' }}>
                <div style={{ width: 10, height: (c.mood || 0) * 14, background: moodColors[c.mood] || 'var(--g300)', borderRadius: '3px 3px 0 0', opacity: 0.8 }} title={`Mood: ${c.mood}`} />
                <div style={{ width: 10, height: (c.cravings || 0) * 14, background: c.cravings >= 4 ? '#E53E3E' : '#DD6B20', borderRadius: '3px 3px 0 0', opacity: 0.5 }} title={`Cravings: ${c.cravings}`} />
              </div>
              <span style={{ fontSize: '.6rem', color: 'var(--g500)' }}>{(c.created_at || '').slice(8, 10)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: '.7rem', color: 'var(--g500)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#38A169', display: 'inline-block' }} /> Mood</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#DD6B20', opacity: 0.5, display: 'inline-block' }} /> Cravings</span>
        </div>
      </div>

      {/* Daily entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {checkins.map((c, i) => (
          <div key={c.id || i} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--charcoal)' }}>{(c.created_at || '').slice(0, 10)}</span>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: '.78rem', fontWeight: 700, color: moodColors[c.mood] || 'var(--g500)' }}>Mood {c.mood ?? '—'}/5</span>
                <span style={{ fontSize: '.78rem', fontWeight: 700, color: c.cravings >= 4 ? '#E53E3E' : 'var(--g700)' }}>Cravings {c.cravings ?? '—'}/5</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
              {[
                ['Sleep', c.sleep],
                ['Anxiety', c.anxiety != null ? `${c.anxiety}/5` : null],
                ['Triggers', c.triggers],
                ['Gratitude', c.gratitude],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--charcoal)', marginTop: 2 }}>{value || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Behavioral Tab ─── */
function BehavioralTab({ incidents, initials }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', marginBottom: 6 }}>Behavioral Incident Log</h2>
      <p style={{ fontSize: '.84rem', color: 'var(--g500)', marginBottom: 20 }}>{incidents.length} incident{incidents.length === 1 ? '' : 's'} recorded for {initials}</p>

      {incidents.length === 0 ? (
        <EmptyState>No behavioral incidents recorded.</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {incidents.map(inc => {
            const cfg = tierConfig[inc.tier] || tierConfig[1]
            return (
              <div key={inc.id} className="card" style={{ padding: '16px 20px', borderLeft: `4px solid ${cfg.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--charcoal)' }}>{inc.type || 'Incident'}</div>
                    {inc.description && <div style={{ fontSize: '.8rem', color: 'var(--g700)', marginTop: 4 }}>{inc.description}</div>}
                    {inc.response && <div style={{ fontSize: '.78rem', color: 'var(--g500)', marginTop: 4 }}>Response: {inc.response}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: '.68rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    <span style={{
                      padding: '3px 8px', borderRadius: 10, fontSize: '.68rem', fontWeight: 700,
                      background: inc.status === 'resolved' ? 'rgba(26,122,74,.1)' : 'rgba(221,107,32,.1)',
                      color: inc.status === 'resolved' ? '#1A7A4A' : '#DD6B20',
                    }}>
                      {inc.status}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '.76rem', color: 'var(--g500)', marginTop: 8 }}>
                  {(inc.created_at || '').slice(0, 10)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
