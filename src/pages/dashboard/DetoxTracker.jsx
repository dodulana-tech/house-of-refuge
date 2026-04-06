import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Detox Tracker — Detoxification completion criteria per Treatment Protocol
  Sections 7.2-7.4 + Section 20 (Substance-Specific Clinical Pathways) + SOP-002.
  Tracks consecutive hours below threshold for completion.
  Initials only (HIPAA). All fields are selects — zero free text except notes.
*/

const PATIENTS = [
  { id: 'P001', initials: 'CO' },
  { id: 'P002', initials: 'AN' },
  { id: 'P003', initials: 'KA' },
  { id: 'P004', initials: 'IM' },
]

const STAFF_OPTIONS = [
  { value: 'AI', label: 'AI — Clinical Lead' },
  { value: 'FA', label: 'FA — Nurse' },
  { value: 'PK', label: 'PK — Chaplain' },
  { value: 'SN', label: 'SN — Social Worker' },
  { value: 'MO', label: 'MO — Support Staff' },
  { value: 'TA', label: 'TA — Counsellor' },
  { value: 'HM', label: 'HM — Nurse' },
]

const SUBSTANCE_OPTIONS = ['Alcohol', 'Opioid', 'Cannabis', 'Stimulant', 'Polysubstance']

const PROTOCOL_MAP = {
  Alcohol: 'CIWA-Ar Guided',
  Opioid: 'COWS Guided',
  Cannabis: 'Supportive',
  Stimulant: 'Supportive',
  Polysubstance: 'CIWA-Ar Guided',
}

const THRESHOLD_MAP = {
  'CIWA-Ar Guided': { threshold: 8, label: 'CIWA-Ar', unit: '' },
  'COWS Guided': { threshold: 5, label: 'COWS', unit: '' },
  Supportive: { threshold: null, label: 'Clinical Observation', unit: '' },
}

// Substance-Specific Clinical Guidance (Section 20 + SOP-002)
const PATHWAY_GUIDANCE = {
  Alcohol: {
    pathway: 'AUD Pathway (Section 20.2)',
    medication: 'Symptom-triggered benzodiazepine (Chlordiazepoxide/Diazepam) when CIWA-Ar > 8. Thiamine 100mg IM/IV x 3-5 days then oral. B-complex, Folate.',
    monitoring: 'CIWA-Ar q4h (q2h if >15, q1h if >20). LFTs at admission, Week 4, discharge. Seizure precautions if CIWA-Ar > 15 or history.',
    escalation: 'CIWA-Ar > 20: IMMEDIATE physician review. Consider transfer if not stabilising within 24 hours.',
    sopRef: 'SOP-002 Steps 1-10 (Alcohol)',
  },
  Opioid: {
    pathway: 'OUD Pathway (Section 20.3)',
    medication: 'Clonidine for autonomic symptoms (monitor BP, hold if systolic < 90). Loperamide for GI. NSAIDs for musculoskeletal pain. Promethazine for nausea. NO opioid-containing medications.',
    monitoring: 'COWS per clinical schedule. BP critical with clonidine. Sleep assessment daily. PAWS tracking post-acute.',
    escalation: 'COWS > 36: IMMEDIATE physician review. Assess for transfer if not stabilising.',
    sopRef: 'SOP-002 Steps 1-8 (Opioid)',
  },
  Cannabis: {
    pathway: 'CUD Pathway (Section 20.4)',
    medication: 'No validated pharmacological protocol. Supportive care: sleep hygiene, anxiolytics if indicated, nutritional support. PHQ-9 if depressive symptoms emerge.',
    monitoring: 'Daily clinical review. Mood, sleep, appetite, agitation monitoring. Withdrawal is real but not medically dangerous.',
    escalation: 'Depression or suicidal ideation: administer C-SSRS, escalate per SOP-006.',
    sopRef: 'Clinical observation protocol',
  },
  Stimulant: {
    pathway: 'Stimulant Pathway (Section 20.5)',
    medication: 'No medically dangerous withdrawal. Manage crash: rest, nutrition, hydration. Antipsychotic if DIP symptoms. PHQ-9 for post-stimulant depression.',
    monitoring: 'DIP monitoring q4h first 72-96 hours. C-SSRS assessment (depression common post-cessation). Cardiovascular: ECG if indicated.',
    escalation: 'DIP: follow SOP-007 immediately. Suicidal ideation: follow SOP-006.',
    sopRef: 'SOP-007 (DIP), SOP-006 (Suicide Risk)',
  },
  Polysubstance: {
    pathway: 'Polysubstance Pathway (Section 20.6)',
    medication: 'Sequential detox per risk hierarchy: Alcohol (seizure/DT risk) first, then opioid, then others. Coordinate all medications centrally.',
    monitoring: 'CIWA-Ar AND COWS if alcohol + opioid co-use. Enhanced medical monitoring across all withdrawal types.',
    escalation: 'Multiple withdrawal syndromes: physician must coordinate. Strong candidate for programme extension.',
    sopRef: 'SOP-002 (combined protocols)',
  },
}

const PHASE_OPTIONS = ['Active Detox', 'Monitoring', 'Complete', 'Not Required']

const VITALS_OPTIONS = ['Stable', 'Unstable']

const COMPLETION_CRITERIA = {
  Alcohol: [
    'CIWA-Ar < 8 for 24 consecutive hours',
    'Vital signs stable',
    'No seizure risk',
  ],
  Opioid: [
    'COWS < 5 for 24 consecutive hours',
    'Vital signs stable',
    'Adequate oral intake',
  ],
  Cannabis: [
    'Clinical observation stable',
    'Mood normalized',
    'Sleep normalized',
    'Appetite normalized',
  ],
  Stimulant: [
    'Clinical observation stable',
    'Mood normalized',
    'Sleep normalized',
    'Appetite normalized',
  ],
  Polysubstance: [
    'CIWA-Ar < 8 for 24 consecutive hours',
    'Vital signs stable',
    'No seizure risk',
  ],
}

// Demo data — score logs with timestamps
const INITIAL_DETOX_DATA = {
  CO: {
    substance: 'Alcohol',
    protocol: 'CIWA-Ar Guided',
    startDate: '2026-03-01',
    phase: 'Complete',
    scores: [
      { id: 1, datetime: '2026-03-01T08:00', score: 28, assessor: 'FA', vitals: 'Unstable', notes: '' },
      { id: 2, datetime: '2026-03-01T14:00', score: 24, assessor: 'FA', vitals: 'Unstable', notes: '' },
      { id: 3, datetime: '2026-03-01T20:00', score: 22, assessor: 'HM', vitals: 'Unstable', notes: '' },
      { id: 4, datetime: '2026-03-02T08:00', score: 18, assessor: 'FA', vitals: 'Unstable', notes: '' },
      { id: 5, datetime: '2026-03-02T14:00', score: 15, assessor: 'FA', vitals: 'Stable', notes: '' },
      { id: 6, datetime: '2026-03-02T20:00', score: 12, assessor: 'HM', vitals: 'Stable', notes: '' },
      { id: 7, datetime: '2026-03-03T08:00', score: 10, assessor: 'FA', vitals: 'Stable', notes: '' },
      { id: 8, datetime: '2026-03-03T14:00', score: 8, assessor: 'FA', vitals: 'Stable', notes: '' },
      { id: 9, datetime: '2026-03-03T20:00', score: 7, assessor: 'HM', vitals: 'Stable', notes: '' },
      { id: 10, datetime: '2026-03-04T08:00', score: 5, assessor: 'FA', vitals: 'Stable', notes: '' },
      { id: 11, datetime: '2026-03-04T14:00', score: 4, assessor: 'FA', vitals: 'Stable', notes: '' },
      { id: 12, datetime: '2026-03-04T20:00', score: 3, assessor: 'HM', vitals: 'Stable', notes: '' },
      { id: 13, datetime: '2026-03-05T08:00', score: 3, assessor: 'FA', vitals: 'Stable', notes: '' },
      { id: 14, datetime: '2026-03-05T14:00', score: 2, assessor: 'FA', vitals: 'Stable', notes: '' },
      { id: 15, datetime: '2026-03-05T20:00', score: 2, assessor: 'HM', vitals: 'Stable', notes: '' },
    ],
    checklist: {
      'CIWA-Ar < 8 for 24 consecutive hours': true,
      'Vital signs stable': true,
      'No seizure risk': true,
    },
  },
  AN: {
    substance: 'Opioid',
    protocol: 'COWS Guided',
    startDate: '2026-03-02',
    phase: 'Active Detox',
    scores: [
      { id: 16, datetime: '2026-03-02T08:00', score: 32, assessor: 'FA', vitals: 'Unstable', notes: '' },
      { id: 17, datetime: '2026-03-02T14:00', score: 28, assessor: 'FA', vitals: 'Unstable', notes: '' },
      { id: 18, datetime: '2026-03-02T20:00', score: 24, assessor: 'HM', vitals: 'Unstable', notes: '' },
      { id: 19, datetime: '2026-03-03T08:00', score: 18, assessor: 'FA', vitals: 'Unstable', notes: '' },
      { id: 20, datetime: '2026-03-03T14:00', score: 14, assessor: 'FA', vitals: 'Stable', notes: '' },
      { id: 21, datetime: '2026-03-03T20:00', score: 10, assessor: 'HM', vitals: 'Stable', notes: '' },
      { id: 22, datetime: '2026-03-04T08:00', score: 7, assessor: 'FA', vitals: 'Stable', notes: '' },
      { id: 23, datetime: '2026-03-04T14:00', score: 5, assessor: 'FA', vitals: 'Stable', notes: '' },
      { id: 24, datetime: '2026-03-04T20:00', score: 4, assessor: 'HM', vitals: 'Stable', notes: '' },
      { id: 25, datetime: '2026-03-05T02:00', score: 4, assessor: 'HM', vitals: 'Stable', notes: '' },
      { id: 26, datetime: '2026-03-05T08:00', score: 3, assessor: 'FA', vitals: 'Stable', notes: '' },
    ],
    checklist: {
      'COWS < 5 for 24 consecutive hours': false,
      'Vital signs stable': true,
      'Adequate oral intake': false,
    },
  },
  KA: {
    substance: 'Cannabis',
    protocol: 'Supportive',
    startDate: '2026-03-01',
    phase: 'Complete',
    scores: [
      { id: 27, datetime: '2026-03-01T08:00', score: null, assessor: 'FA', vitals: 'Stable', notes: '' },
      { id: 28, datetime: '2026-03-02T08:00', score: null, assessor: 'FA', vitals: 'Stable', notes: '' },
      { id: 29, datetime: '2026-03-03T08:00', score: null, assessor: 'FA', vitals: 'Stable', notes: '' },
      { id: 30, datetime: '2026-03-04T08:00', score: null, assessor: 'FA', vitals: 'Stable', notes: '' },
    ],
    checklist: {
      'Clinical observation stable': true,
      'Mood normalized': true,
      'Sleep normalized': true,
      'Appetite normalized': true,
    },
  },
  IM: {
    substance: 'Alcohol',
    protocol: 'CIWA-Ar Guided',
    startDate: '2026-03-04',
    phase: 'Active Detox',
    scores: [
      { id: 31, datetime: '2026-03-04T08:00', score: 26, assessor: 'FA', vitals: 'Unstable', notes: '' },
      { id: 32, datetime: '2026-03-04T14:00', score: 22, assessor: 'FA', vitals: 'Unstable', notes: '' },
      { id: 33, datetime: '2026-03-04T20:00', score: 19, assessor: 'HM', vitals: 'Unstable', notes: '' },
      { id: 34, datetime: '2026-03-05T08:00', score: 16, assessor: 'FA', vitals: 'Stable', notes: '' },
      { id: 35, datetime: '2026-03-05T14:00', score: 12, assessor: 'FA', vitals: 'Stable', notes: '' },
    ],
    checklist: {
      'CIWA-Ar < 8 for 24 consecutive hours': false,
      'Vital signs stable': false,
      'No seizure risk': false,
    },
  },
}

function getScoreColor(score, threshold) {
  if (score === null) return '#718096'
  if (threshold === null) return '#38A169'
  if (score >= threshold * 2) return '#9B2C2C'
  if (score >= threshold) return '#E53E3E'
  return '#38A169'
}

function getScoreSeverityLabel(score, threshold) {
  if (score === null) return 'N/A'
  if (threshold === null) return 'Supportive'
  if (score >= threshold * 2) return 'Severe'
  if (score >= threshold) return 'Above Threshold'
  return 'Below Threshold'
}

function calculateConsecutiveHours(scores, threshold) {
  if (!scores.length || threshold === null) return null
  // Walk backwards from the latest score to find how many consecutive hours below threshold
  const sorted = [...scores].sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
  let lastAboveIdx = -1
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].score >= threshold) {
      lastAboveIdx = i
      break
    }
  }
  // If the latest score is above threshold, consecutive = 0
  if (lastAboveIdx === sorted.length - 1) return 0
  // If all scores are below threshold, use full span
  if (lastAboveIdx === -1) {
    const first = new Date(sorted[0].datetime)
    const last = new Date(sorted[sorted.length - 1].datetime)
    return Math.round((last - first) / (1000 * 60 * 60))
  }
  // Hours from the score after the last above-threshold to the latest
  const startTime = new Date(sorted[lastAboveIdx + 1].datetime)
  const endTime = new Date(sorted[sorted.length - 1].datetime)
  return Math.round((endTime - startTime) / (1000 * 60 * 60))
}

function getDetoxStatus(phase, scores, threshold) {
  if (phase === 'Complete') {
    return { label: 'Detox Complete', color: '#38A169', bg: '#F0FFF4', border: '#C6F6D5' }
  }
  if (phase === 'Not Required') {
    return { label: 'Detox Not Required', color: '#718096', bg: '#F7FAFC', border: '#E2E8F0' }
  }
  if (threshold === null) {
    return { label: 'Active Detox — Supportive Protocol', color: '#D69E2E', bg: '#FFFFF0', border: '#FEFCBF' }
  }
  const sorted = [...scores].sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null
  if (latest && latest.score >= threshold) {
    return { label: 'Active Detox — Above Threshold', color: '#E53E3E', bg: '#FFF5F5', border: '#FED7D7' }
  }
  const hours = calculateConsecutiveHours(scores, threshold)
  if (hours !== null && hours >= 24) {
    return { label: 'Detox Complete', color: '#38A169', bg: '#F0FFF4', border: '#C6F6D5' }
  }
  return {
    label: `Active Detox — ${hours !== null ? hours : 0} hours below threshold (need 24)`,
    color: '#D69E2E',
    bg: '#FFFFF0',
    border: '#FEFCBF',
  }
}

function formatDatetime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function DetoxTracker() {
  const { user } = useAuth()
  const [selectedPatient, setSelectedPatient] = useState('CO')
  const [detoxData, setDetoxData] = useState(INITIAL_DETOX_DATA)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    datetime: '',
    score: '',
    assessor: '',
    vitals: '',
    notes: '',
  })

  const data = detoxData[selectedPatient]
  const protocolInfo = THRESHOLD_MAP[data.protocol]
  const threshold = protocolInfo.threshold
  const scores = data.scores
  const sortedScores = [...scores].sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
  const consecutiveHours = calculateConsecutiveHours(scores, threshold)
  const status = getDetoxStatus(data.phase, scores, threshold)
  const criteria = COMPLETION_CRITERIA[data.substance] || []

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const resetForm = () => {
    setForm({ datetime: '', score: '', assessor: '', vitals: '', notes: '' })
  }

  const handleSubmit = () => {
    if (!form.datetime || !form.assessor || !form.vitals) return
    if (threshold !== null && form.score === '') return

    const newEntry = {
      id: Date.now(),
      datetime: form.datetime,
      score: threshold !== null ? parseInt(form.score, 10) : null,
      assessor: form.assessor,
      vitals: form.vitals,
      notes: form.notes,
    }

    setDetoxData((prev) => ({
      ...prev,
      [selectedPatient]: {
        ...prev[selectedPatient],
        scores: [...prev[selectedPatient].scores, newEntry],
      },
    }))
    setShowForm(false)
    resetForm()
  }

  const handleSubstanceChange = (substance) => {
    const protocol = PROTOCOL_MAP[substance]
    const newCriteria = COMPLETION_CRITERIA[substance] || []
    const checklist = {}
    newCriteria.forEach((c) => { checklist[c] = false })
    setDetoxData((prev) => ({
      ...prev,
      [selectedPatient]: {
        ...prev[selectedPatient],
        substance,
        protocol,
        checklist,
      },
    }))
  }

  const handlePhaseChange = (phase) => {
    setDetoxData((prev) => ({
      ...prev,
      [selectedPatient]: { ...prev[selectedPatient], phase },
    }))
  }

  const handleChecklistToggle = (criterion) => {
    setDetoxData((prev) => ({
      ...prev,
      [selectedPatient]: {
        ...prev[selectedPatient],
        checklist: {
          ...prev[selectedPatient].checklist,
          [criterion]: !prev[selectedPatient].checklist[criterion],
        },
      },
    }))
  }

  // Chart calculations
  const maxScore = sortedScores.reduce((max, s) => (s.score !== null && s.score > max ? s.score : max), 0)
  const chartMax = Math.max(maxScore, threshold ? threshold + 4 : 10)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            Detox Tracker
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            Detoxification Monitoring (Protocol 7.2-7.4 + Section 20 + SOP-002)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>Patient:</label>
          <select
            value={selectedPatient}
            onChange={(e) => { setSelectedPatient(e.target.value); setShowForm(false) }}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E0',
              fontSize: 14,
              fontWeight: 600,
              background: '#fff',
            }}
          >
            {PATIENTS.map((p) => (
              <option key={p.id} value={p.initials}>{p.initials}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. Current Detox Status Card */}
      <div
        className="card"
        style={{
          padding: 20,
          marginBottom: 20,
          borderRadius: 12,
          border: `1px solid ${status.border}`,
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: 0 }}>
            Detox Status — {selectedPatient}
          </h2>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
              color: status.color,
              background: status.bg,
              border: `1px solid ${status.border}`,
            }}
          >
            {status.label}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#4A5568', marginBottom: 16 }}>
          <span><strong>Substance:</strong> {data.substance}</span>
          <span><strong>Protocol:</strong> {data.protocol}</span>
          <span><strong>Start Date:</strong> {data.startDate}</span>
          <span><strong>Phase:</strong> {data.phase}</span>
          {threshold !== null && (
            <span><strong>Threshold:</strong> {protocolInfo.label} &lt; {threshold}</span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ fontWeight: 600, fontSize: 13, color: '#2D3748', display: 'block', marginBottom: 4 }}>
              Primary Substance
            </label>
            <select
              value={data.substance}
              onChange={(e) => handleSubstanceChange(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #CBD5E0',
                fontSize: 13,
                width: '100%',
                background: '#fff',
              }}
            >
              {SUBSTANCE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 600, fontSize: 13, color: '#2D3748', display: 'block', marginBottom: 4 }}>
              Detox Protocol
            </label>
            <div style={{ padding: '6px 10px', fontSize: 13, color: '#4A5568' }}>
              {data.protocol}
            </div>
          </div>
          <div>
            <label style={{ fontWeight: 600, fontSize: 13, color: '#2D3748', display: 'block', marginBottom: 4 }}>
              Current Phase
            </label>
            <select
              value={data.phase}
              onChange={(e) => handlePhaseChange(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #CBD5E0',
                fontSize: 13,
                width: '100%',
                background: '#fff',
              }}
            >
              {PHASE_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 1b. Substance Pathway Clinical Guidance (Section 20 + SOP-002) */}
      {PATHWAY_GUIDANCE[data.substance] && (
        <div
          className="card"
          style={{
            padding: 20,
            marginBottom: 20,
            borderRadius: 12,
            border: '1px solid #805AD520',
            background: '#FAFAFE',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#805AD5', margin: 0 }}>
              {PATHWAY_GUIDANCE[data.substance].pathway}
            </h2>
            <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#805AD510', color: '#805AD5' }}>
              {PATHWAY_GUIDANCE[data.substance].sopRef}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, fontSize: 13, color: '#4A5568' }}>
            <div style={{ padding: 10, background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ fontWeight: 700, color: '#2D3748', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>Medication Protocol</div>
              <div style={{ lineHeight: 1.5 }}>{PATHWAY_GUIDANCE[data.substance].medication}</div>
            </div>
            <div style={{ padding: 10, background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ fontWeight: 700, color: '#2D3748', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>Monitoring Schedule</div>
              <div style={{ lineHeight: 1.5 }}>{PATHWAY_GUIDANCE[data.substance].monitoring}</div>
            </div>
            <div style={{ padding: 10, background: '#FFF5F5', borderRadius: 8, border: '1px solid #FED7D7' }}>
              <div style={{ fontWeight: 700, color: '#E53E3E', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>Escalation Criteria</div>
              <div style={{ lineHeight: 1.5 }}>{PATHWAY_GUIDANCE[data.substance].escalation}</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Score Trend Visualization */}
      {threshold !== null && sortedScores.length > 0 && (
        <div
          className="card"
          style={{
            padding: 20,
            marginBottom: 20,
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            background: '#fff',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: '0 0 16px' }}>
            {protocolInfo.label} Score Trend
          </h2>
          <div style={{ position: 'relative', height: 200, display: 'flex', alignItems: 'flex-end', gap: 2, paddingBottom: 24, paddingLeft: 40 }}>
            {/* Y-axis labels */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 24, width: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 11, color: '#718096', textAlign: 'right' }}>
              <span>{chartMax}</span>
              <span>{Math.round(chartMax / 2)}</span>
              <span>0</span>
            </div>
            {/* Threshold line */}
            <div
              style={{
                position: 'absolute',
                left: 40,
                right: 0,
                bottom: 24 + ((threshold / chartMax) * 176),
                height: 2,
                background: '#E53E3E',
                zIndex: 2,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 40,
                bottom: 24 + ((threshold / chartMax) * 176) + 4,
                fontSize: 10,
                color: '#E53E3E',
                fontWeight: 700,
                zIndex: 3,
              }}
            >
              Threshold: {threshold}
            </div>
            {/* Bars */}
            {sortedScores.map((s, i) => {
              const height = s.score !== null ? Math.max((s.score / chartMax) * 176, 4) : 4
              const barColor = getScoreColor(s.score, threshold)
              return (
                <div
                  key={s.id}
                  style={{
                    flex: 1,
                    maxWidth: 40,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: '80%',
                      height,
                      background: barColor,
                      borderRadius: '4px 4px 0 0',
                      position: 'relative',
                    }}
                    title={`${formatDatetime(s.datetime)}: ${s.score !== null ? s.score : 'N/A'}`}
                  />
                  <div style={{ fontSize: 9, color: '#718096', marginTop: 4, textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.score !== null ? s.score : '-'}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#718096', paddingLeft: 40 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#38A169', display: 'inline-block' }} />
              Below threshold
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#E53E3E', display: 'inline-block' }} />
              Above threshold
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#9B2C2C', display: 'inline-block' }} />
              Severe
            </span>
          </div>
        </div>
      )}

      {/* 3. Consecutive Hours Tracker */}
      {threshold !== null && (
        <div
          className="card"
          style={{
            padding: 20,
            marginBottom: 20,
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            background: '#fff',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: '0 0 12px' }}>
            Consecutive Hours Below Threshold
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1, height: 28, background: '#EDF2F7', borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(((consecutiveHours || 0) / 24) * 100, 100)}%`,
                  background: consecutiveHours >= 24 ? '#38A169' : '#D69E2E',
                  borderRadius: 14,
                  transition: 'width 0.3s ease',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#2D3748',
                }}
              >
                {consecutiveHours !== null ? consecutiveHours : 0} / 24 hours
              </div>
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: consecutiveHours >= 24 ? '#38A169' : '#D69E2E',
              }}
            >
              {consecutiveHours >= 24 ? 'COMPLETE' : 'IN PROGRESS'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#718096', margin: '8px 0 0' }}>
            Requires {protocolInfo.label} &lt; {threshold} for 24 consecutive hours to meet completion criteria.
          </p>
        </div>
      )}

      {/* 4. Score Log Table */}
      <div
        className="card"
        style={{
          padding: 20,
          marginBottom: 20,
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: 0 }}>
            Score Log
          </h2>
          <button
            onClick={() => { setShowForm(!showForm); resetForm() }}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: '#2B6CB0',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {showForm ? 'Cancel' : 'Add Score'}
          </button>
        </div>

        {scores.length === 0 && !showForm && (
          <p style={{ color: '#A0AEC0', fontSize: 14 }}>No scores recorded.</p>
        )}

        {scores.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Date/Time</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>
                    {threshold !== null ? protocolInfo.label + ' Score' : 'Observation'}
                  </th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Severity</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Assessor</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#4A5568', fontWeight: 600 }}>Vital Signs</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#4A5568', fontWeight: 600 }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...sortedScores].reverse().map((s) => {
                  const severityLabel = getScoreSeverityLabel(s.score, threshold)
                  const sevColor = getScoreColor(s.score, threshold)
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                      <td style={{ padding: '8px 10px' }}>{formatDatetime(s.datetime)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: sevColor }}>
                        {s.score !== null ? s.score : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            color: sevColor,
                            background: sevColor === '#38A169' ? '#F0FFF4' : sevColor === '#E53E3E' ? '#FFF5F5' : sevColor === '#9B2C2C' ? '#FFF5F5' : '#F7FAFC',
                            border: `1px solid ${sevColor === '#38A169' ? '#C6F6D5' : sevColor === '#E53E3E' ? '#FED7D7' : sevColor === '#9B2C2C' ? '#FC8181' : '#E2E8F0'}`,
                          }}
                        >
                          {severityLabel}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{s.assessor}</td>
                      <td
                        style={{
                          padding: '8px 10px',
                          textAlign: 'center',
                          color: s.vitals === 'Stable' ? '#38A169' : '#E53E3E',
                          fontWeight: 600,
                        }}
                      >
                        {s.vitals}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 12, color: '#718096' }}>{s.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Quick-Add Score Form */}
      {showForm && (
        <div
          className="card"
          style={{
            padding: 24,
            marginBottom: 20,
            borderRadius: 12,
            border: '2px solid #2B6CB0',
            background: '#fff',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: '0 0 8px' }}>
            Add Score — {selectedPatient}
          </h2>
          <p style={{ fontSize: 13, color: '#718096', margin: '0 0 20px' }}>
            Record {protocolInfo.label} score with vital signs status.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Datetime */}
            <div>
              <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                Date/Time
              </label>
              <input
                type="datetime-local"
                value={form.datetime}
                onChange={(e) => updateForm('datetime', e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E0',
                  fontSize: 14,
                  width: '100%',
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Score */}
            {threshold !== null && (
              <div>
                <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                  {protocolInfo.label} Score
                </label>
                <input
                  type="number"
                  min="0"
                  max="67"
                  value={form.score}
                  onChange={(e) => updateForm('score', e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E0',
                    fontSize: 14,
                    width: '100%',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {/* Assessor */}
            <div>
              <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                Assessor
              </label>
              <select
                value={form.assessor}
                onChange={(e) => updateForm('assessor', e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E0',
                  fontSize: 14,
                  width: '100%',
                  background: '#fff',
                }}
              >
                <option value="">-- Select Assessor --</option>
                {STAFF_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Vitals Status */}
            <div>
              <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
                Vital Signs Status
              </label>
              <select
                value={form.vitals}
                onChange={(e) => updateForm('vitals', e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E0',
                  fontSize: 14,
                  width: '100%',
                  background: '#fff',
                }}
              >
                <option value="">-- Select --</option>
                {VITALS_OPTIONS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 6 }}>
              Notes
            </label>
            <select
              value={form.notes}
              onChange={(e) => updateForm('notes', e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E0',
                fontSize: 14,
                width: '100%',
                background: '#fff',
              }}
            >
              <option value="">-- None --</option>
              <option value="PRN medication administered">PRN medication administered</option>
              <option value="Seizure precautions in place">Seizure precautions in place</option>
              <option value="Patient resting comfortably">Patient resting comfortably</option>
              <option value="Tremors observed">Tremors observed</option>
              <option value="Nausea/vomiting present">Nausea/vomiting present</option>
              <option value="Anxiety/agitation noted">Anxiety/agitation noted</option>
              <option value="Sleep disturbance reported">Sleep disturbance reported</option>
              <option value="Appetite improving">Appetite improving</option>
              <option value="Mood stabilizing">Mood stabilizing</option>
              <option value="Transferred to monitoring phase">Transferred to monitoring phase</option>
            </select>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleSubmit}
              disabled={!form.datetime || !form.assessor || !form.vitals || (threshold !== null && form.score === '')}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: (!form.datetime || !form.assessor || !form.vitals || (threshold !== null && form.score === '')) ? '#CBD5E0' : '#2B6CB0',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: (!form.datetime || !form.assessor || !form.vitals || (threshold !== null && form.score === '')) ? 'not-allowed' : 'pointer',
              }}
            >
              Submit Score
            </button>
            <button
              onClick={() => { setShowForm(false); resetForm() }}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: '1px solid #CBD5E0',
                background: '#fff',
                color: '#4A5568',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 6. Completion Criteria Checklist */}
      <div
        className="card"
        style={{
          padding: 20,
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          background: '#fff',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: '0 0 16px' }}>
          Completion Criteria — {data.substance} Detox
        </h2>
        <div>
          {criteria.map((c) => {
            const checked = data.checklist[c] || false
            return (
              <div
                key={c}
                onClick={() => handleChecklistToggle(c)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  marginBottom: 8,
                  borderRadius: 8,
                  border: `1px solid ${checked ? '#C6F6D5' : '#E2E8F0'}`,
                  background: checked ? '#F0FFF4' : '#FAFAFA',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: `2px solid ${checked ? '#38A169' : '#CBD5E0'}`,
                    background: checked ? '#38A169' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 14,
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  {checked ? '\u2713' : ''}
                </div>
                <span
                  style={{
                    fontSize: 14,
                    color: checked ? '#38A169' : '#4A5568',
                    fontWeight: checked ? 600 : 400,
                    textDecoration: checked ? 'line-through' : 'none',
                  }}
                >
                  {c}
                </span>
              </div>
            )
          })}
        </div>
        {criteria.length > 0 && criteria.every((c) => data.checklist[c]) && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              background: '#F0FFF4',
              border: '1px solid #C6F6D5',
              fontSize: 14,
              fontWeight: 700,
              color: '#38A169',
              textAlign: 'center',
            }}
          >
            All completion criteria met — Patient eligible for transition to therapeutic programming
          </div>
        )}
      </div>
    </div>
  )
}
