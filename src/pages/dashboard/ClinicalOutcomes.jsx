import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Clinical Outcomes — Validated clinical instruments for admission vs discharge comparison.
  AUDIT, DAST-10, PHQ-9, GAD-7.
  REPLACES OutcomeTracking.jsx with proper clinical measurement.
  HIPAA: initials only. ALL fields are selects — ZERO free text.
*/

const PATIENTS = [
  { initials: 'CO', id: 'P001', day: 23, phase: 'foundation' },
  { initials: 'AN', id: 'P002', day: 45, phase: 'deepening' },
  { initials: 'KA', id: 'P003', day: 74, phase: 'reintegration' },
  { initials: 'IM', id: 'P004', day: 8, phase: 'stabilization' },
]

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

/* ───── Mock data ───── */
const buildInitial = () => ({
  CO: {
    audit: { adm: [4,3,3,3,2,2,3,2,2,4], cur: [1,1,1,1,0,0,1,0,0,0] },
    dast:  { adm: [1,1,0,1,1,1,1,0,1,1], cur: [0,0,0,0,0,0,0,0,0,0] },
    phq9:  { adm: [2,3,2,2,1,2,2,1,1], cur: [1,1,1,1,0,1,1,0,0] },
    gad7:  { adm: [2,2,3,2,1,2,2], cur: [1,1,1,1,0,1,0] },
  },
  AN: {
    audit: { adm: [4,4,4,4,3,3,4,3,4,4], cur: [0,0,0,0,0,0,0,0,0,0] },
    dast:  { adm: [1,1,1,1,1,1,1,1,1,1], cur: [0,0,0,0,0,0,0,0,0,0] },
    phq9:  { adm: [3,3,3,3,2,3,2,2,2], cur: [1,1,0,1,0,0,0,0,0] },
    gad7:  { adm: [3,3,3,2,2,3,3], cur: [0,1,0,0,0,0,0] },
  },
  KA: {
    audit: { adm: [3,3,3,2,2,2,3,2,2,2], cur: [0,0,0,0,0,0,0,0,0,0] },
    dast:  { adm: [0,0,0,0,0,0,0,0,0,0], cur: [0,0,0,0,0,0,0,0,0,0] },
    phq9:  { adm: [2,2,2,2,1,2,1,1,0], cur: [0,0,0,0,0,0,0,0,0] },
    gad7:  { adm: [2,2,2,1,1,2,1], cur: [0,0,0,0,0,0,0] },
  },
  IM: {
    audit: { adm: [4,4,4,4,4,4,4,4,4,4], cur: [4,4,4,4,3,3,4,3,4,4] },
    dast:  { adm: [1,1,1,1,1,1,1,1,1,1], cur: [1,1,1,1,1,1,1,0,1,1] },
    phq9:  { adm: [3,3,3,3,3,3,3,3,3], cur: [3,3,3,2,2,3,2,2,2] },
    gad7:  { adm: [3,3,3,3,3,3,3], cur: [3,3,2,2,2,3,2] },
  },
})

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
  const [data, setData] = useState(buildInitial)
  const [selected, setSelected] = useState('CO')
  const [expandedInstrument, setExpandedInstrument] = useState('audit')

  const d = data[selected]

  const updateScore = (instrument, timing, idx, val) => {
    setData(prev => {
      const copy = { ...prev }
      const patientCopy = { ...copy[selected] }
      const instCopy = { ...patientCopy[instrument] }
      const arrCopy = [...instCopy[timing]]
      arrCopy[idx] = parseInt(val)
      instCopy[timing] = arrCopy
      patientCopy[instrument] = instCopy
      copy[selected] = patientCopy
      return copy
    })
  }

  const auditAdm = sumArr(d.audit.adm)
  const auditCur = sumArr(d.audit.cur)
  const dastAdm = sumArr(d.dast.adm)
  const dastCur = sumArr(d.dast.cur)
  const phq9Adm = sumArr(d.phq9.adm)
  const phq9Cur = sumArr(d.phq9.cur)
  const gad7Adm = sumArr(d.gad7.adm)
  const gad7Cur = sumArr(d.gad7.cur)

  const instruments = [
    { key: 'audit', label: 'AUDIT', full: 'Alcohol Use Disorders Identification Test', admScore: auditAdm, curScore: auditCur, max: 40, riskFn: auditRisk },
    { key: 'dast', label: 'DAST-10', full: 'Drug Abuse Screening Test', admScore: dastAdm, curScore: dastCur, max: 10, riskFn: dastRisk },
    { key: 'phq9', label: 'PHQ-9', full: 'Patient Health Questionnaire — Depression', admScore: phq9Adm, curScore: phq9Cur, max: 27, riskFn: phq9Risk },
    { key: 'gad7', label: 'GAD-7', full: 'Generalised Anxiety Disorder', admScore: gad7Adm, curScore: gad7Cur, max: 21, riskFn: gad7Risk },
  ]

  const renderQuestions = (instKey) => {
    if (instKey === 'audit') {
      return AUDIT_QUESTIONS.map((q, idx) => {
        const validOpts = q.opts.map((o, i) => ({ label: o, value: i })).filter(o => o.label !== '')
        return (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 170px 170px', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--g100)' }}>
            <div style={{ fontSize: '.8rem', color: 'var(--g700)' }}><strong>Q{idx + 1}:</strong> {q.q}</div>
            <div>
              <label style={labelS}>Admission</label>
              <select value={d.audit.adm[idx]} onChange={e => updateScore('audit', 'adm', idx, e.target.value)} style={selectS}>
                {validOpts.map(o => <option key={o.value} value={o.value}>{o.label} ({o.value})</option>)}
              </select>
            </div>
            <div>
              <label style={labelS}>Current</label>
              <select value={d.audit.cur[idx]} onChange={e => updateScore('audit', 'cur', idx, e.target.value)} style={selectS}>
                {validOpts.map(o => <option key={o.value} value={o.value}>{o.label} ({o.value})</option>)}
              </select>
            </div>
          </div>
        )
      })
    }
    if (instKey === 'dast') {
      return DAST_QUESTIONS.map((q, idx) => (
        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 170px 170px', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--g100)' }}>
          <div style={{ fontSize: '.8rem', color: 'var(--g700)' }}><strong>Q{idx + 1}:</strong> {q}</div>
          <div>
            <label style={labelS}>Admission</label>
            <select value={d.dast.adm[idx]} onChange={e => updateScore('dast', 'adm', idx, e.target.value)} style={selectS}>
              <option value={0}>No (0)</option>
              <option value={1}>Yes (1)</option>
            </select>
          </div>
          <div>
            <label style={labelS}>Current</label>
            <select value={d.dast.cur[idx]} onChange={e => updateScore('dast', 'cur', idx, e.target.value)} style={selectS}>
              <option value={0}>No (0)</option>
              <option value={1}>Yes (1)</option>
            </select>
          </div>
        </div>
      ))
    }
    if (instKey === 'phq9') {
      return PHQ9_QUESTIONS.map((q, idx) => (
        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 170px 170px', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--g100)' }}>
          <div style={{ fontSize: '.8rem', color: 'var(--g700)' }}><strong>Q{idx + 1}:</strong> {q}</div>
          <div>
            <label style={labelS}>Admission</label>
            <select value={d.phq9.adm[idx]} onChange={e => updateScore('phq9', 'adm', idx, e.target.value)} style={selectS}>
              {PHQ_OPTS.map((o, i) => <option key={i} value={i}>{o} ({i})</option>)}
            </select>
          </div>
          <div>
            <label style={labelS}>Current</label>
            <select value={d.phq9.cur[idx]} onChange={e => updateScore('phq9', 'cur', idx, e.target.value)} style={selectS}>
              {PHQ_OPTS.map((o, i) => <option key={i} value={i}>{o} ({i})</option>)}
            </select>
          </div>
        </div>
      ))
    }
    if (instKey === 'gad7') {
      return GAD7_QUESTIONS.map((q, idx) => (
        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 170px 170px', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--g100)' }}>
          <div style={{ fontSize: '.8rem', color: 'var(--g700)' }}><strong>Q{idx + 1}:</strong> {q}</div>
          <div>
            <label style={labelS}>Admission</label>
            <select value={d.gad7.adm[idx]} onChange={e => updateScore('gad7', 'adm', idx, e.target.value)} style={selectS}>
              {PHQ_OPTS.map((o, i) => <option key={i} value={i}>{o} ({i})</option>)}
            </select>
          </div>
          <div>
            <label style={labelS}>Current</label>
            <select value={d.gad7.cur[idx]} onChange={e => updateScore('gad7', 'cur', idx, e.target.value)} style={selectS}>
              {PHQ_OPTS.map((o, i) => <option key={i} value={i}>{o} ({i})</option>)}
            </select>
          </div>
        </div>
      ))
    }
    return null
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Clinical Outcomes</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Validated clinical instruments — Admission vs Current/Discharge comparison</p>
      </div>

      {/* Patient Selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {PATIENTS.map(pt => (
          <button key={pt.initials} onClick={() => setSelected(pt.initials)}
            style={{
              padding: '10px 20px', borderRadius: 8, border: selected === pt.initials ? '2px solid var(--blue)' : '1px solid var(--g200)',
              background: selected === pt.initials ? 'var(--blue)' : '#fff', color: selected === pt.initials ? '#fff' : 'var(--g700)',
              cursor: 'pointer', fontWeight: 600, fontSize: '.9rem',
            }}>
            {pt.initials} <span style={{ fontSize: '.75rem', opacity: .8 }}>Day {PATIENTS.find(p => p.initials === pt.initials).day}</span>
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        {instruments.map(inst => (
          <div className="card" key={inst.key} style={{ padding: 16, cursor: 'pointer', border: expandedInstrument === inst.key ? '2px solid var(--blue)' : '1px solid var(--g200)' }}
            onClick={() => setExpandedInstrument(inst.key)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1rem' }}>{inst.label}</h4>
              <ImprovementBadge admScore={inst.admScore} curScore={inst.curScore} />
            </div>
            <p style={{ fontSize: '.72rem', color: 'var(--g500)', marginBottom: 10 }}>{inst.full}</p>
            <div style={{ marginBottom: 6 }}>
              <label style={{ fontSize: '.7rem', color: 'var(--g400)' }}>Admission ({inst.admScore}/{inst.max})</label>
              <ScoreBar score={inst.admScore} max={inst.max} riskFn={inst.riskFn} />
            </div>
            <div>
              <label style={{ fontSize: '.7rem', color: 'var(--g400)' }}>Current ({inst.curScore}/{inst.max})</label>
              <ScoreBar score={inst.curScore} max={inst.max} riskFn={inst.riskFn} />
            </div>
          </div>
        ))}
      </div>

      {/* Clinical Outcomes Summary */}
      <div className="card" style={{ padding: 20, marginBottom: 24, background: '#F7FAFC' }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 12 }}>Clinical Outcomes Summary — {selected}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {instruments.map(inst => {
            const admRisk = inst.riskFn(inst.admScore)
            const curRisk = inst.riskFn(inst.curScore)
            const improved = inst.admScore > inst.curScore
            return (
              <div key={inst.key} style={{ padding: 12, borderRadius: 8, background: '#fff', border: '1px solid var(--g200)' }}>
                <div style={{ fontSize: '.82rem', fontWeight: 700, marginBottom: 6 }}>{inst.label}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--g600)', marginBottom: 4 }}>
                  Admission: <span style={{ color: admRisk.color, fontWeight: 600 }}>{admRisk.label} ({inst.admScore})</span>
                </div>
                <div style={{ fontSize: '.78rem', color: 'var(--g600)', marginBottom: 4 }}>
                  Current: <span style={{ color: curRisk.color, fontWeight: 600 }}>{curRisk.label} ({inst.curScore})</span>
                </div>
                <div style={{ fontSize: '.78rem', color: improved ? '#1A7A4A' : '#E53E3E', fontWeight: 600 }}>
                  {improved ? 'Improved' : inst.admScore === inst.curScore ? 'No change' : 'Worsened'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Expanded Instrument Detail */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 4 }}>
          {instruments.find(i => i.key === expandedInstrument)?.label} — Question-by-Question
        </h3>
        <p style={{ fontSize: '.8rem', color: 'var(--g500)', marginBottom: 16 }}>
          {instruments.find(i => i.key === expandedInstrument)?.full}
        </p>
        <div style={{ overflowX: 'auto' }}>
          {renderQuestions(expandedInstrument)}
        </div>
      </div>
    </div>
  )
}
