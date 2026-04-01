import React, { useState } from 'react'

/*
  Medication Administration Record (MAR) + Withdrawal Monitoring
  CIWA-Ar (alcohol): 10 items, max 67, scored 0-7 per item (orientation 0-4)
  COWS (opioid): 11 items, max 47+

  Per SOP:
  - All meds surrendered to nursing on admission
  - All meds administered by licensed nursing staff only
  - No opioid-containing medications permitted
  - Documented in MAR
  - Nursing rounds: 6 AM, 12 PM, 6 PM, 10:30 PM
*/

const PATIENTS = [
  { id: 'P001', initials: 'CO', substance: 'Alcohol', phase: 'foundation', day: 23 },
  { id: 'P002', initials: 'AN', substance: 'Tramadol', phase: 'deepening', day: 45 },
  { id: 'P003', initials: 'KA', substance: 'Cannabis', phase: 'reintegration', day: 74 },
  { id: 'P004', initials: 'IM', substance: 'Heroin', phase: 'stabilization', day: 8 },
]

const NURSING_ROUNDS = ['06:00', '12:00', '18:00', '22:30']

const MEDICATION_CATEGORIES = [
  'Detox support', 'Vitamin supplement', 'Psychiatric (non-opioid)', 'Anticonvulsant',
  'Antihypertensive', 'Antiemetic', 'Analgesic (non-opioid)', 'Antimalarial',
  'Antibiotic', 'Other (doctor-approved)',
]

const ROUTES = ['Oral', 'Intramuscular (IM)', 'Intravenous (IV)', 'Sublingual', 'Topical']

// CIWA-Ar: 10 items per clinical standard
const CIWA_ITEMS = [
  { key: 'nausea', label: 'Nausea and Vomiting', max: 7, options: ['0 — None', '1 — Mild nausea, no vomiting', '4 — Intermittent nausea, dry heaves', '7 — Constant nausea, frequent dry heaves/vomiting'] },
  { key: 'tremor', label: 'Tremor (arms extended, fingers spread)', max: 7, options: ['0 — No tremor', '1 — Not visible, can be felt', '4 — Moderate, with arms extended', '7 — Severe, even with arms not extended'] },
  { key: 'sweats', label: 'Paroxysmal Sweats', max: 7, options: ['0 — No sweat visible', '1 — Barely perceptible sweating, moist palms', '4 — Beads of sweat obvious on forehead', '7 — Drenching sweats'] },
  { key: 'anxiety', label: 'Anxiety', max: 7, options: ['0 — No anxiety, at ease', '1 — Mildly anxious', '4 — Moderately anxious, guarded', '7 — Equivalent to acute panic states'] },
  { key: 'agitation', label: 'Agitation', max: 7, options: ['0 — Normal activity', '1 — Somewhat more than normal', '4 — Moderately fidgety and restless', '7 — Paces or constantly thrashes'] },
  { key: 'tactile', label: 'Tactile Disturbances', max: 7, options: ['0 — None', '1 — Mild itching, burning, numbness', '2 — Mild itching/burning/numbness sensations', '3 — Moderate hallucinations', '4 — Moderately severe hallucinations', '5 — Severe hallucinations', '7 — Continuous hallucinations'] },
  { key: 'auditory', label: 'Auditory Disturbances', max: 7, options: ['0 — Not present', '1 — Very mild harshness', '2 — Mild harshness', '3 — Moderate harshness', '4 — Moderately severe hallucinations', '5 — Severe hallucinations', '7 — Continuous hallucinations'] },
  { key: 'visual', label: 'Visual Disturbances', max: 7, options: ['0 — Not present', '1 — Very mild sensitivity', '2 — Mild sensitivity', '3 — Moderate sensitivity', '4 — Moderately severe hallucinations', '5 — Severe hallucinations', '7 — Continuous hallucinations'] },
  { key: 'headache', label: 'Headache, Fullness in Head', max: 7, options: ['0 — Not present', '1 — Very mild', '2 — Mild', '3 — Moderate', '4 — Moderately severe', '5 — Severe', '7 — Extremely severe'] },
  { key: 'orientation', label: 'Orientation and Clouding', max: 4, options: ['0 — Oriented, can do serial additions', '1 — Uncertain about date', '2 — Date uncertain by more than 2 days', '3 — Disoriented for date by more than 2 days', '4 — Disoriented for place and/or person'] },
]

// COWS: 11 items per clinical standard
const COWS_ITEMS = [
  { key: 'pulse', label: 'Resting Pulse Rate', options: ['0 — ≤80 bpm', '1 — 81–100 bpm', '2 — 101–120 bpm', '4 — >120 bpm'] },
  { key: 'sweating', label: 'Sweating', options: ['0 — No report of chills or flushing', '1 — Subjective report of chills or flushing', '2 — Flushed or observable moisture on face', '3 — Beads of sweat on brow or face', '4 — Sweat streaming off face'] },
  { key: 'restlessness', label: 'Restlessness', options: ['0 — Able to sit still', '1 — Reports difficulty sitting still', '3 — Frequent shifting or extraneous movements', '5 — Unable to sit still for more than a few seconds'] },
  { key: 'pupils', label: 'Pupil Size', options: ['0 — Pupils pinned or normal for room light', '1 — Possibly larger than normal', '2 — Moderately dilated', '5 — So dilated that only rim of iris visible'] },
  { key: 'bone_pain', label: 'Bone or Joint Aches', options: ['0 — Not present', '1 — Mild diffuse discomfort', '2 — Patient reports severe diffuse aching', '4 — Rubbing joints or muscles, unable to sit still'] },
  { key: 'runny_nose', label: 'Runny Nose or Tearing', options: ['0 — Not present', '1 — Nasal stuffiness or unusually moist eyes', '2 — Nose running or tearing', '4 — Nose constantly running or tears streaming'] },
  { key: 'gi', label: 'GI Upset', options: ['0 — No GI symptoms', '1 — Stomach cramps', '2 — Nausea or loose stool', '3 — Vomiting or diarrhea', '5 — Multiple episodes of diarrhea or vomiting'] },
  { key: 'tremor_cows', label: 'Tremor (outstretched hands)', options: ['0 — No tremor', '1 — Tremor can be felt but not observed', '2 — Slight tremor observable', '4 — Gross tremor or muscle twitching'] },
  { key: 'yawning', label: 'Yawning', options: ['0 — No yawning', '1 — Yawning once or twice', '2 — Yawning three or more times', '4 — Yawning several times per minute'] },
  { key: 'anxiety_cows', label: 'Anxiety or Irritability', options: ['0 — None', '1 — Patient reports increasing irritability', '2 — Patient obviously irritable/anxious', '4 — Patient so irritable/anxious admission is difficult'] },
  { key: 'gooseflesh', label: 'Gooseflesh Skin', options: ['0 — Skin is smooth', '3 — Piloerection of skin can be felt', '5 — Prominent piloerection'] },
]

function getCIWASeverity(score) {
  if (score <= 8) return { label: 'Mild', color: '#38A169' }
  if (score <= 15) return { label: 'Moderate', color: '#D69E2E' }
  if (score <= 20) return { label: 'Severe', color: '#DD6B20' }
  return { label: 'Very Severe / DT Risk', color: '#E53E3E' }
}

function getCOWSSeverity(score) {
  if (score <= 5) return { label: 'Minimal', color: '#38A169' }
  if (score <= 12) return { label: 'Mild', color: '#D69E2E' }
  if (score <= 24) return { label: 'Moderate', color: '#DD6B20' }
  if (score <= 36) return { label: 'Moderately Severe', color: '#E53E3E' }
  return { label: 'Severe', color: '#E53E3E' }
}

export default function MedicationMAR() {
  const [tab, setTab] = useState('mar')
  const [selectedPatient, setSelectedPatient] = useState('P004') // IM in detox
  const [ciwaScores, setCiwaScores] = useState({})
  const [cowsScores, setCowsScores] = useState({})
  const [medForm, setMedForm] = useState({ patient: '', medication: '', category: '', route: '', dose: '', frequency: '', round: '' })

  const patient = PATIENTS.find(p => p.id === selectedPatient)
  const isAlcohol = patient?.substance === 'Alcohol'
  const isOpioid = ['Heroin', 'Tramadol / Codeine', 'Codeine Syrup'].includes(patient?.substance)
  const scaleItems = isAlcohol ? CIWA_ITEMS : COWS_ITEMS
  const scores = isAlcohol ? ciwaScores : cowsScores
  const setScores = isAlcohol ? setCiwaScores : setCowsScores
  const totalScore = Object.values(scores).reduce((s, v) => s + v, 0)
  const severity = isAlcohol ? getCIWASeverity(totalScore) : getCOWSSeverity(totalScore)

  const MOCK_MEDS = [
    { patient: 'IM', medication: 'Diazepam 10mg', category: 'Detox support', route: 'Oral', frequency: 'TDS', rounds: { '06:00': true, '12:00': true, '18:00': false, '22:30': false } },
    { patient: 'IM', medication: 'Thiamine 100mg', category: 'Vitamin supplement', route: 'IM', frequency: 'OD', rounds: { '06:00': true, '12:00': false, '18:00': false, '22:30': false } },
    { patient: 'CO', medication: 'Multivitamin', category: 'Vitamin supplement', route: 'Oral', frequency: 'OD', rounds: { '06:00': true, '12:00': false, '18:00': false, '22:30': false } },
    { patient: 'AN', medication: 'Paracetamol 1g', category: 'Analgesic (non-opioid)', route: 'Oral', frequency: 'PRN', rounds: {} },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Medication & Withdrawal Monitoring</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>MAR + CIWA-Ar (alcohol) / COWS (opioid) · Nursing rounds: 6AM, 12PM, 6PM, 10:30PM</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--g100)' }}>
        {[['mar', 'Medication Record'], ['withdrawal', 'Withdrawal Assessment'], ['prescribe', 'Add Medication']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '10px 18px', border: 'none', background: 'none',
            fontSize: '.88rem', fontWeight: 600, cursor: 'pointer',
            color: tab === k ? 'var(--blue)' : 'var(--g500)',
            borderBottom: tab === k ? '2px solid var(--blue)' : '2px solid transparent',
            marginBottom: -2,
          }}>{l}</button>
        ))}
      </div>

      {/* MAR Tab */}
      {tab === 'mar' && (
        <div>
          <div style={{ fontSize: '.78rem', padding: '10px 14px', background: 'rgba(229,62,62,.06)', borderRadius: 8, border: '1px solid rgba(229,62,62,.15)', color: '#C53030', marginBottom: 16, fontWeight: 600 }}>
            No opioid-containing medications permitted in the facility under any circumstances (SOP 5.6)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 80px repeat(4, 70px)', gap: 8, padding: '8px 12px', fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              <span>Patient</span><span>Medication</span><span>Category</span><span>Route</span>
              {NURSING_ROUNDS.map(r => <span key={r} style={{ textAlign: 'center' }}>{r}</span>)}
            </div>
            {MOCK_MEDS.map((med, i) => (
              <div key={i} className="card" style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 80px repeat(4, 70px)', gap: 8, padding: '12px', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{med.patient}</span>
                <span style={{ fontSize: '.86rem', fontWeight: 600 }}>{med.medication}</span>
                <span style={{ fontSize: '.74rem', color: 'var(--g500)' }}>{med.category}</span>
                <span style={{ fontSize: '.74rem', color: 'var(--g500)' }}>{med.route}</span>
                {NURSING_ROUNDS.map(r => (
                  <div key={r} style={{ textAlign: 'center' }}>
                    {med.rounds[r] === true && <span style={{ color: '#1A7A4A', fontWeight: 700 }}>✓</span>}
                    {med.rounds[r] === false && <span style={{ color: '#E53E3E', fontWeight: 700 }}>—</span>}
                    {med.rounds[r] === undefined && <span style={{ color: 'var(--g300)' }}>·</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdrawal Assessment Tab */}
      {tab === 'withdrawal' && (
        <div>
          {/* Patient selector */}
          <div className="frow" style={{ marginBottom: 20 }}>
            <div className="fg">
              <label className="flabel">Patient</label>
              <select className="fi" value={selectedPatient} onChange={e => { setSelectedPatient(e.target.value); setScores({}) }}>
                {PATIENTS.filter(p => p.phase === 'stabilization').map(p => (
                  <option key={p.id} value={p.id}>{p.initials} — {p.substance} (Day {p.day})</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="flabel">Assessment Tool</label>
              <div className="fi" style={{ background: 'var(--off)', fontWeight: 600 }}>
                {isAlcohol ? 'CIWA-Ar (Alcohol Withdrawal)' : isOpioid ? 'COWS (Opioid Withdrawal)' : 'No standard scale for this substance'}
              </div>
            </div>
          </div>

          {/* Score summary */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '.72rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase' }}>Current Score</div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 700, color: severity.color }}>{totalScore}</div>
            </div>
            <div style={{ padding: '6px 14px', borderRadius: 14, background: severity.color + '15', color: severity.color, fontWeight: 700, fontSize: '.86rem' }}>
              {severity.label}
            </div>
            <div style={{ fontSize: '.82rem', color: 'var(--g500)', maxWidth: 300 }}>
              {isAlcohol && totalScore >= 15 && 'Consider symptom-triggered benzodiazepine protocol. Monitor q1h.'}
              {isAlcohol && totalScore >= 8 && totalScore < 15 && 'Start withdrawal medication. Monitor q2h.'}
              {isAlcohol && totalScore < 8 && 'Continue monitoring q4h. No medication indicated.'}
              {isOpioid && totalScore >= 25 && 'Severe withdrawal. Consider comfort medications.'}
              {isOpioid && totalScore >= 13 && totalScore < 25 && 'Moderate withdrawal. Monitor closely.'}
              {isOpioid && totalScore < 13 && 'Mild withdrawal. Continue supportive care.'}
            </div>
          </div>

          {/* Assessment items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scaleItems.map(item => (
              <div key={item.key} className="card" style={{ padding: '14px 18px' }}>
                <label className="flabel">{item.label}</label>
                <select className="fi" value={scores[item.key] || 0}
                  onChange={e => setScores(prev => ({ ...prev, [item.key]: parseInt(e.target.value) }))}>
                  {item.options.map(opt => {
                    const val = parseInt(opt)
                    return <option key={opt} value={val}>{opt}</option>
                  })}
                </select>
              </div>
            ))}
          </div>

          <button className="btn btn--primary" style={{ marginTop: 16 }}>Save Assessment</button>
        </div>
      )}

      {/* Add Medication Tab */}
      {tab === 'prescribe' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: 14 }}>Add Medication Order</h3>
          <div style={{ fontSize: '.78rem', padding: '8px 12px', background: 'rgba(229,62,62,.06)', borderRadius: 8, color: '#C53030', marginBottom: 14, fontWeight: 600 }}>
            No opioid-containing medications. All prescriptions require doctor authorization.
          </div>

          <div className="fg"><label className="flabel">Patient *</label>
            <select className="fi" value={medForm.patient} onChange={e => setMedForm(p => ({ ...p, patient: e.target.value }))}>
              <option value="">Select patient...</option>
              {PATIENTS.map(p => <option key={p.id} value={p.initials}>{p.initials} — {p.substance} (Day {p.day})</option>)}
            </select>
          </div>
          <div className="fg"><label className="flabel">Medication Category *</label>
            <select className="fi" value={medForm.category} onChange={e => setMedForm(p => ({ ...p, category: e.target.value }))}>
              <option value="">Select category...</option>
              {MEDICATION_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="fg"><label className="flabel">Medication Name & Strength *</label>
            <select className="fi" value={medForm.medication} onChange={e => setMedForm(p => ({ ...p, medication: e.target.value }))}>
              <option value="">Select medication...</option>
              {['Diazepam 5mg', 'Diazepam 10mg', 'Chlordiazepoxide 10mg', 'Chlordiazepoxide 25mg', 'Thiamine 100mg', 'Multivitamin', 'Paracetamol 500mg', 'Paracetamol 1g', 'Ibuprofen 400mg', 'Metoclopramide 10mg', 'Promethazine 25mg', 'Carbamazepine 200mg', 'Haloperidol 5mg (non-opioid)', 'Chlorpromazine 100mg', 'Amitriptyline 25mg', 'Fluoxetine 20mg', 'Risperidone 2mg', 'Lorazepam 1mg', 'Vitamin B Complex', 'Folic Acid 5mg', 'Ferrous Sulphate 200mg', 'Artemether-Lumefantrine (antimalarial)', 'Ciprofloxacin 500mg', 'Amoxicillin 500mg', 'Other (specify to doctor)'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="frow">
            <div className="fg"><label className="flabel">Route *</label>
              <select className="fi" value={medForm.route} onChange={e => setMedForm(p => ({ ...p, route: e.target.value }))}>
                <option value="">Select...</option>
                {ROUTES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="fg"><label className="flabel">Frequency *</label>
              <select className="fi" value={medForm.frequency} onChange={e => setMedForm(p => ({ ...p, frequency: e.target.value }))}>
                <option value="">Select...</option>
                {['OD (once daily)', 'BD (twice daily)', 'TDS (three times daily)', 'QDS (four times daily)', 'PRN (as needed)', 'STAT (immediately)'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn--primary btn--sm">Submit Medication Order</button>
        </div>
      )}
    </div>
  )
}
