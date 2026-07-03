import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseReady, getPatients, getAssessments, addAssessment } from '../../utils/supabase'
import { activeBriefs, initialsFromName } from '../../utils/patients'

/*
  Clinical Outcomes — Validated clinical instruments, tracked over time per patient.
  AUDIT, DAST-10, PHQ-9, GAD-7 — persisted to the `assessments` table (one type per instrument).
  Baseline (oldest row) vs Current (newest row) comparison.
  HIPAA: initials only. ALL fields are selects — ZERO free text.
*/

/* ───── AUDIT (Alcohol Use Disorders Identification Test) ───── */
const AUDIT_QUESTIONS = [
  { q: 'How often do you have a drink containing alcohol?', opts: ['Never', 'Monthly or less', '2-4 times a month', '2-3 times a week', '4+ times a week'] },
  { q: 'How many standard drinks on a typical day when drinking?', opts: ['1-2', '3-4', '5-6', '7-9', '10+'] },
  { q: 'How often do you have 6 or more drinks on one occasion?', opts: ['Never', 'Less than monthly', 'Monthly', 'Weekly', 'Daily or almost daily'] },
  { q: 'How often in the last year have you found you were unable to stop drinking once started?', opts: ['Never', 'Less than monthly', 'Monthly', 'Weekly', 'Daily or almost daily'] },
  { q: 'How often in the last year have you failed to do what was expected because of drinking?', opts: ['Never', 'Less than monthly', 'Monthly', 'Weekly', 'Daily or almost daily'] },
  { q: 'How often in the last year have you needed a morning drink to get going after a heavy session?', opts: ['Never', 'Less than monthly', 'Monthly', 'Weekly', 'Daily or almost daily'] },
  { q: 'How often in the last year have you felt guilt or remorse after drinking?', opts: ['Never', 'Less than monthly', 'Monthly', 'Weekly', 'Daily or almost daily'] },
  { q: 'How often in the last year have you been unable to remember what happened while drinking?', opts: ['Never', 'Less than monthly', 'Monthly', 'Weekly', 'Daily or almost daily'] },
  { q: 'Have you or someone else been injured as a result of your drinking?', opts: ['No', '', 'Yes, but not in the last year', '', 'Yes, during the last year'] },
  { q: 'Has a relative, friend, doctor, or health worker been concerned about your drinking or suggested you cut down?', opts: ['No', '', 'Yes, but not in the last year', '', 'Yes, during the last year'] },
]

const auditRisk = (score) => {
  if (score <= 7) return { label: 'Low Risk', color: '#1A7A4A' }
  if (score <= 15) return { label: 'Hazardous', color: '#DD6B20' }
  if (score <= 19) return { label: 'Harmful', color: '#E53E3E' }
  return { label: 'Possible Dependence', color: '#742A2A' }
}

/* ───── DAST-10 (Drug Abuse Screening Test) ───── */
const DAST_QUESTIONS = [
  'Have you used drugs other than those required for medical reasons?',
  'Do you abuse more than one drug at a time?',
  'Are you unable to stop using drugs when you want to?',
  'Have you ever had blackouts or flashbacks as a result of drug use?',
  'Do you ever feel bad or guilty about your drug use?',
  'Does your spouse or parents ever complain about your involvement with drugs?',
  'Have you neglected your family because of your use of drugs?',
  'Have you engaged in illegal activities to obtain drugs?',
  'Have you ever experienced withdrawal symptoms when you stopped taking drugs?',
  'Have you had medical problems as a result of drug use?',
]

const dastRisk = (score) => {
  if (score === 0) return { label: 'No Problems', color: '#1A7A4A' }
  if (score <= 2) return { label: 'Low Level', color: '#2B6CB0' }
  if (score <= 5) return { label: 'Moderate', color: '#DD6B20' }
  if (score <= 8) return { label: 'Substantial', color: '#E53E3E' }
  return { label: 'Severe', color: '#742A2A' }
}

/* ───── PHQ-9 (Patient Health Questionnaire — Depression) ───── */
const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself or that you are a failure',
  'Trouble concentrating on things',
  'Moving or speaking so slowly that others noticed, or being fidgety/restless',
  'Thoughts that you would be better off dead, or of hurting yourself',
]
const PHQ_OPTS = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day']

const phq9Risk = (score) => {
  if (score <= 4) return { label: 'Minimal', color: '#1A7A4A' }
  if (score <= 9) return { label: 'Mild', color: '#2B6CB0' }
  if (score <= 14) return { label: 'Moderate', color: '#DD6B20' }
  if (score <= 19) return { label: 'Moderately Severe', color: '#E53E3E' }
  return { label: 'Severe', color: '#742A2A' }
}

/* ───── GAD-7 (Generalised Anxiety Disorder) ───── */
const GAD7_QUESTIONS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen',
]

const gad7Risk = (score) => {
  if (score <= 4) return { label: 'Minimal', color: '#1A7A4A' }
  if (score <= 9) return { label: 'Mild', color: '#2B6CB0' }
  if (score <= 14) return { label: 'Moderate', color: '#DD6B20' }
  return { label: 'Severe', color: '#742A2A' }
}

/* ───── Instrument registry ─────
   Each instrument persists to `assessments` under its own `type`.
   `options(idx)` returns the { label, value } choices for a given question. */
const INSTRUMENTS = [
  {
    key: 'audit', type: 'audit', label: 'AUDIT', full: 'Alcohol Use Disorders Identification Test',
    max: 40, riskFn: auditRisk, count: AUDIT_QUESTIONS.length,
    questionText: (i) => AUDIT_QUESTIONS[i].q,
    options: (i) => AUDIT_QUESTIONS[i].opts.map((o, v) => ({ label: o, value: v })).filter(o => o.label !== ''),
  },
  {
    key: 'dast', type: 'dast', label: 'DAST-10', full: 'Drug Abuse Screening Test',
    max: 10, riskFn: dastRisk, count: DAST_QUESTIONS.length,
    questionText: (i) => DAST_QUESTIONS[i],
    options: () => [{ label: 'No', value: 0 }, { label: 'Yes', value: 1 }],
  },
  {
    key: 'phq9', type: 'phq9', label: 'PHQ-9', full: 'Patient Health Questionnaire — Depression',
    max: 27, riskFn: phq9Risk, count: PHQ9_QUESTIONS.length,
    questionText: (i) => PHQ9_QUESTIONS[i],
    options: () => PHQ_OPTS.map((o, v) => ({ label: o, value: v })),
  },
  {
    key: 'gad7', type: 'gad7', label: 'GAD-7', full: 'Generalised Anxiety Disorder',
    max: 21, riskFn: gad7Risk, count: GAD7_QUESTIONS.length,
    questionText: (i) => GAD7_QUESTIONS[i],
    options: () => PHQ_OPTS.map((o, v) => ({ label: o, value: v })),
  },
]

const emptyDraft = () => Object.fromEntries(INSTRUMENTS.map(i => [i.key, Array(i.count).fill(0)]))

const selectS = { padding: '6px 8px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.78rem', width: '100%' }
const labelS = { fontSize: '.72rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 2 }

function sumArr(arr) { return arr.reduce((a, b) => a + b, 0) }

function ScoreBar({ score, max, riskFn }) {
  const risk = riskFn(score)
  const pct = Math.round((score / max) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--g100)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: risk.color, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: '.82rem', fontWeight: 700, color: risk.color, minWidth: 30, textAlign: 'right' }}>{score}</span>
      <span style={{ fontSize: '.72rem', padding: '2px 8px', borderRadius: 10, background: risk.color + '18', color: risk.color, fontWeight: 600, whiteSpace: 'nowrap' }}>{risk.label}</span>
    </div>
  )
}

function ImprovementBadge({ admScore, curScore }) {
  if (admScore === 0) return <span style={{ fontSize: '.75rem', color: 'var(--g400)' }}>N/A</span>
  const pct = Math.round(((admScore - curScore) / admScore) * 100)
  const color = pct > 0 ? '#1A7A4A' : pct < 0 ? '#E53E3E' : 'var(--g500)'
  return <span style={{ fontSize: '.82rem', fontWeight: 700, color }}>{pct > 0 ? '+' : ''}{pct}% improvement</span>
}

export default function ClinicalOutcomes() {
  const { user } = useAuth()
  const [patients, setPatients] = useState([])
  const [selected, setSelected] = useState('') // patient_id
  const [results, setResults] = useState({}) // keyed by instrument key
  const [draft, setDraft] = useState(emptyDraft) // new-assessment answers, keyed by instrument key
  const [expandedInstrument, setExpandedInstrument] = useState('audit')
  const [loading, setLoading] = useState(true)
  const [loadingResults, setLoadingResults] = useState(false)
  const [saving, setSaving] = useState(false)

  const selectedInitials = patients.find(p => p.id === selected)?.initials || ''

  // Load the active-resident roster once.
  const loadPatients = useCallback(async () => {
    if (!isSupabaseReady()) { setLoading(false); return }
    setLoading(true)
    const { data: rows } = await getPatients()
    const briefs = activeBriefs(rows)
    setPatients(briefs)
    setSelected(prev => prev || briefs[0]?.id || '')
    setLoading(false)
  }, [])

  useEffect(() => { loadPatients() }, [loadPatients])

  // Load every instrument's assessment history for the selected patient.
  // getAssessments returns rows newest-first: newest = Current, oldest = Baseline.
  const loadResults = useCallback(async (pid) => {
    if (!pid || !isSupabaseReady()) { setResults({}); return }
    setLoadingResults(true)
    const entries = await Promise.all(INSTRUMENTS.map(async (inst) => {
      const { data } = await getAssessments(pid, inst.type)
      const rows = data || []
      const cur = rows[0] || null
      const adm = rows.length ? rows[rows.length - 1] : null
      return [inst.key, {
        assessed: rows.length > 0,
        count: rows.length,
        admScore: adm?.score ?? 0,
        curScore: cur?.score ?? 0,
        admResponses: adm?.responses || null,
        curResponses: cur?.responses || null,
        curAt: cur?.created_at || null,
        curBy: cur?.assessed_by_code || null,
      }]
    }))
    setResults(Object.fromEntries(entries))
    setDraft(emptyDraft())
    setLoadingResults(false)
  }, [])

  useEffect(() => { if (selected) loadResults(selected) }, [selected, loadResults])

  const updateDraft = (instKey, idx, val) => {
    setDraft(prev => {
      const arr = [...prev[instKey]]
      arr[idx] = parseInt(val)
      return { ...prev, [instKey]: arr }
    })
  }

  const handleSubmit = async (inst) => {
    if (!selected || saving) return
    const answers = draft[inst.key]
    const score = sumArr(answers)
    const level = inst.riskFn(score).label
    const code = user?.name ? initialsFromName(user.name) : 'ST'
    setSaving(true)
    const { error } = await addAssessment({
      patient_id: selected,
      type: inst.type,
      score,
      level,
      responses: answers,
      assessed_by_code: code,
    })
    setSaving(false)
    if (error) { alert(`Could not save ${inst.label}: ${error.message}`); return }
    await loadResults(selected)
  }

  const inst = INSTRUMENTS.find(i => i.key === expandedInstrument)
  const detail = results[expandedInstrument] || {}
  const draftScore = sumArr(draft[expandedInstrument] || [])
  const draftRisk = inst.riskFn(draftScore)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Clinical Outcomes</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Validated clinical instruments — Baseline vs Current comparison, tracked over time</p>
      </div>

      {!isSupabaseReady() && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <p style={{ fontSize: '.85rem', color: 'var(--g500)' }}>Supabase is not configured — clinical outcomes are unavailable.</p>
        </div>
      )}

      {isSupabaseReady() && loading && (
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: '.85rem', color: 'var(--g500)' }}>Loading residents…</p>
        </div>
      )}

      {isSupabaseReady() && !loading && patients.length === 0 && (
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: '.85rem', color: 'var(--g500)' }}>No active residents to assess.</p>
        </div>
      )}

      {isSupabaseReady() && !loading && patients.length > 0 && (
        <>
          {/* Patient Selector */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
            {patients.map(pt => (
              <button key={pt.id} onClick={() => setSelected(pt.id)}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: selected === pt.id ? '2px solid var(--blue)' : '1px solid var(--g200)',
                  background: selected === pt.id ? 'var(--blue)' : '#fff', color: selected === pt.id ? '#fff' : 'var(--g700)',
                  cursor: 'pointer', fontWeight: 600, fontSize: '.9rem',
                }}>
                {pt.initials}
              </button>
            ))}
          </div>

          {loadingResults && (
            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
              <p style={{ fontSize: '.85rem', color: 'var(--g500)' }}>Loading assessments…</p>
            </div>
          )}

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
            {INSTRUMENTS.map(i => {
              const r = results[i.key] || {}
              return (
                <div className="card" key={i.key} style={{ padding: 16, cursor: 'pointer', border: expandedInstrument === i.key ? '2px solid var(--blue)' : '1px solid var(--g200)' }}
                  onClick={() => setExpandedInstrument(i.key)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1rem' }}>{i.label}</h4>
                    {r.assessed && r.count > 1 && <ImprovementBadge admScore={r.admScore} curScore={r.curScore} />}
                  </div>
                  <p style={{ fontSize: '.72rem', color: 'var(--g500)', marginBottom: 10 }}>{i.full}</p>
                  {!r.assessed ? (
                    <p style={{ fontSize: '.78rem', color: 'var(--g400)', fontStyle: 'italic' }}>Not assessed</p>
                  ) : (
                    <>
                      {r.count > 1 && (
                        <div style={{ marginBottom: 6 }}>
                          <label style={{ fontSize: '.7rem', color: 'var(--g400)' }}>Baseline ({r.admScore}/{i.max})</label>
                          <ScoreBar score={r.admScore} max={i.max} riskFn={i.riskFn} />
                        </div>
                      )}
                      <div>
                        <label style={{ fontSize: '.7rem', color: 'var(--g400)' }}>{r.count > 1 ? 'Current' : 'Latest'} ({r.curScore}/{i.max})</label>
                        <ScoreBar score={r.curScore} max={i.max} riskFn={i.riskFn} />
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Clinical Outcomes Summary */}
          <div className="card" style={{ padding: 20, marginBottom: 24, background: '#F7FAFC' }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 12 }}>Clinical Outcomes Summary — {selectedInitials}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {INSTRUMENTS.map(i => {
                const r = results[i.key] || {}
                if (!r.assessed) {
                  return (
                    <div key={i.key} style={{ padding: 12, borderRadius: 8, background: '#fff', border: '1px solid var(--g200)' }}>
                      <div style={{ fontSize: '.82rem', fontWeight: 700, marginBottom: 6 }}>{i.label}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--g400)', fontStyle: 'italic' }}>Not assessed</div>
                    </div>
                  )
                }
                const admRisk = i.riskFn(r.admScore)
                const curRisk = i.riskFn(r.curScore)
                const improved = r.admScore > r.curScore
                return (
                  <div key={i.key} style={{ padding: 12, borderRadius: 8, background: '#fff', border: '1px solid var(--g200)' }}>
                    <div style={{ fontSize: '.82rem', fontWeight: 700, marginBottom: 6 }}>{i.label}</div>
                    {r.count > 1 && (
                      <div style={{ fontSize: '.78rem', color: 'var(--g600)', marginBottom: 4 }}>
                        Baseline: <span style={{ color: admRisk.color, fontWeight: 600 }}>{admRisk.label} ({r.admScore})</span>
                      </div>
                    )}
                    <div style={{ fontSize: '.78rem', color: 'var(--g600)', marginBottom: 4 }}>
                      {r.count > 1 ? 'Current' : 'Latest'}: <span style={{ color: curRisk.color, fontWeight: 600 }}>{curRisk.label} ({r.curScore})</span>
                    </div>
                    {r.count > 1 && (
                      <div style={{ fontSize: '.78rem', color: improved ? '#1A7A4A' : '#E53E3E', fontWeight: 600 }}>
                        {improved ? 'Improved' : r.admScore === r.curScore ? 'No change' : 'Worsened'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Expanded Instrument — record a new assessment */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 4 }}>
              {inst.label} — Record Assessment
            </h3>
            <p style={{ fontSize: '.8rem', color: 'var(--g500)', marginBottom: 16 }}>
              {inst.full}
              {detail.assessed
                ? ` · Latest recorded ${detail.curAt ? detail.curAt.slice(0, 10) : ''}${detail.curBy ? ` by ${detail.curBy}` : ''}`
                : ' · Not yet assessed'}
            </p>
            <div style={{ overflowX: 'auto' }}>
              {Array.from({ length: inst.count }).map((_, idx) => {
                const opts = inst.options(idx)
                const latestVal = detail.curResponses ? detail.curResponses[idx] : null
                const latestLabel = latestVal != null ? (opts.find(o => o.value === latestVal)?.label ?? '—') : '—'
                return (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 170px 170px', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--g100)' }}>
                    <div style={{ fontSize: '.8rem', color: 'var(--g700)' }}><strong>Q{idx + 1}:</strong> {inst.questionText(idx)}</div>
                    <div>
                      <label style={labelS}>Latest recorded</label>
                      <div style={{ ...selectS, background: 'var(--g100)', color: 'var(--g600)' }}>{latestLabel}</div>
                    </div>
                    <div>
                      <label style={labelS}>New entry</label>
                      <select value={draft[inst.key][idx]} onChange={e => updateDraft(inst.key, idx, e.target.value)} style={selectS}>
                        {opts.map(o => <option key={o.value} value={o.value}>{o.label} ({o.value})</option>)}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '.82rem' }}>
                New entry score: <span style={{ fontWeight: 700, color: draftRisk.color }}>{draftScore}/{inst.max}</span>
                <span style={{ fontSize: '.72rem', padding: '2px 8px', borderRadius: 10, marginLeft: 8, background: draftRisk.color + '18', color: draftRisk.color, fontWeight: 600 }}>{draftRisk.label}</span>
              </div>
              <button onClick={() => handleSubmit(inst)} disabled={saving || !selected}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: saving ? 'var(--g300)' : 'var(--blue)', color: '#fff',
                  cursor: saving ? 'default' : 'pointer', fontWeight: 600, fontSize: '.85rem',
                }}>
                {saving ? 'Saving…' : `Record ${inst.label}`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
