import React, { useState, useEffect, useCallback } from 'react'
import {
  getPatients, getAllMedications, getAllMedAdministrations,
  addMedication, addMedAdministration, addDetoxRecord, isSupabaseReady,
} from '../../utils/supabase'
import { mapPatientRow } from '../../utils/patients'
import { requireFields } from '../../utils/formGuard'

/*
  Medication Administration Record (MAR) + Withdrawal Monitoring
  Live tables: medications, medication_administrations, detox_records.
  CIWA-Ar (alcohol): 10 items, max 67, scored 0-7 per item (orientation 0-4)
  COWS (opioid): 11 items, max 47+

  Per SOP:
  - All meds surrendered to nursing on admission
  - All meds administered by licensed nursing staff only
  - No opioid-containing medications permitted
  - Documented in MAR
  - Nursing rounds: 6 AM, 12 PM, 6 PM, 10:30 PM
*/

const STAFF_OPTIONS = [
  { value: 'AI', label: 'AI — Clinical Lead' },
  { value: 'FA', label: 'FA — Nurse' },
  { value: 'HM', label: 'HM — Nurse' },
  { value: 'SN', label: 'SN — Social Worker' },
  { value: 'TA', label: 'TA — Counsellor' },
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

const isAlcoholSub = (s) => /alcohol/i.test(s || '')
const isOpioidSub = (s) => /heroin|tramadol|codeine|opioid|morphine|fentanyl/i.test(s || '')
const TODAY = new Date().toISOString().slice(0, 10)

export default function MedicationMAR() {
  const [tab, setTab] = useState('mar')
  const [patients, setPatients] = useState([]) // [{id, initials, substance, phase, day}]
  const [meds, setMeds] = useState([]) // active medications
  const [adminsToday, setAdminsToday] = useState({}) // medication_id -> { round: {code,status} }
  const [loading, setLoading] = useState(true)
  const [staffCode, setStaffCode] = useState('FA')
  const [selectedPatient, setSelectedPatient] = useState('')
  const [ciwaScores, setCiwaScores] = useState({})
  const [cowsScores, setCowsScores] = useState({})
  const [savingDetox, setSavingDetox] = useState(false)
  const [medForm, setMedForm] = useState({ patient: '', medication: '', category: '', route: '', dose: '', frequency: '', prescriber: '' })
  const [savingMed, setSavingMed] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseReady()) { setLoading(false); return }
    const [{ data: rows }, { data: medRows }, { data: adminRows }] = await Promise.all([
      getPatients(), getAllMedications(), getAllMedAdministrations(),
    ])
    const active = (rows || []).filter(p => ['admitted', 'on-pass', 'suspended'].includes(p.status))
    const mapped = active.map(r => {
      const m = mapPatientRow(r)
      return { id: r.id, initials: m.initials, substance: m.substance, phase: m.phase, day: m.day }
    })
    setPatients(mapped)
    const activeIds = new Set(mapped.map(p => p.id))
    const activeMeds = (medRows || [])
      .filter(m => m.status === 'active' && activeIds.has(m.patient_id))
      .map(m => {
        const p = mapped.find(x => x.id === m.patient_id)
        return { id: m.id, patient_id: m.patient_id, initials: p?.initials || '—', name: m.name + (m.dose ? ` ${m.dose}` : ''), category: m.notes || '', route: m.route || '' }
      })
    setMeds(activeMeds)
    const today = {}
    for (const a of (adminRows || [])) {
      if (!a.administered_at || a.administered_at.slice(0, 10) !== TODAY) continue
      ;(today[a.medication_id] = today[a.medication_id] || {})[a.notes] = { code: a.administered_by_code, status: a.status }
    }
    setAdminsToday(today)
    setSelectedPatient(prev => prev || mapped.find(p => p.phase === 'stabilization')?.id || mapped[0]?.id || '')
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const patient = patients.find(p => p.id === selectedPatient)
  const isAlcohol = isAlcoholSub(patient?.substance)
  const isOpioid = isOpioidSub(patient?.substance)
  const scaleItems = isAlcohol ? CIWA_ITEMS : COWS_ITEMS
  const scores = isAlcohol ? ciwaScores : cowsScores
  const setScores = isAlcohol ? setCiwaScores : setCowsScores
  const totalScore = Object.values(scores).reduce((s, v) => s + v, 0)
  const severity = isAlcohol ? getCIWASeverity(totalScore) : getCOWSSeverity(totalScore)

  const recordRound = async (medId, patientId, round) => {
    if (adminsToday[medId]?.[round]) return // already recorded — locked
    const { error } = await addMedAdministration({
      medication_id: medId,
      patient_id: patientId,
      administered_by_code: staffCode,
      status: 'given',
      notes: round,
    })
    if (error) { alert(`Could not record administration: ${error.message}`); return }
    await load()
  }

  const handleSaveDetox = async () => {
    if (!requireFields([[selectedPatient, 'Patient']])) return
    setSavingDetox(true)
    const { error } = await addDetoxRecord({
      patient_id: selectedPatient,
      scale: isAlcohol ? 'CIWA-Ar' : 'COWS',
      score: totalScore,
      day: patient?.day || null,
      symptoms: { ...scores },
      recorded_by_code: staffCode,
    })
    setSavingDetox(false)
    if (error) { alert(`Could not save assessment: ${error.message}`); return }
    setScores({})
    alert('Withdrawal assessment saved.')
  }

  const handleAddMed = async () => {
    if (!requireFields([
      [medForm.patient, 'Patient'],
      [medForm.medication, 'Medication'],
      [medForm.category, 'Category'],
      [medForm.route, 'Route'],
      [medForm.frequency, 'Frequency'],
    ])) return
    setSavingMed(true)
    const { error } = await addMedication({
      patient_id: medForm.patient,
      name: medForm.medication,
      route: medForm.route,
      frequency: medForm.frequency,
      prescriber_code: medForm.prescriber || null,
      notes: medForm.category,
      status: 'active',
    })
    setSavingMed(false)
    if (error) { alert(`Could not add medication: ${error.message}`); return }
    setMedForm({ patient: '', medication: '', category: '', route: '', dose: '', frequency: '', prescriber: '' })
    setTab('mar')
    await load()
  }

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

      {/* Administering-staff selector (shared) */}
      <div className="fg" style={{ maxWidth: 280, marginBottom: 16 }}>
        <label className="flabel">Administering / Recording Staff</label>
        <select className="fi" value={staffCode} onChange={e => setStaffCode(e.target.value)}>
          {STAFF_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* MAR Tab */}
      {tab === 'mar' && (
        <div>
          <div style={{ fontSize: '.78rem', padding: '10px 14px', background: 'rgba(229,62,62,.06)', borderRadius: 8, border: '1px solid rgba(229,62,62,.15)', color: '#C53030', marginBottom: 16, fontWeight: 600 }}>
            No opioid-containing medications permitted in the facility under any circumstances (SOP 5.6)
          </div>

          {loading ? (
            <p style={{ color: 'var(--g500)', fontSize: '.9rem' }}>Loading…</p>
          ) : meds.length === 0 ? (
            <p style={{ color: 'var(--g500)', fontSize: '.9rem' }}>No active medication orders recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 700 }}>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 80px repeat(4, 70px)', gap: 8, padding: '8px 12px', fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  <span>Patient</span><span>Medication</span><span>Category</span><span>Route</span>
                  {NURSING_ROUNDS.map(r => <span key={r} style={{ textAlign: 'center' }}>{r}</span>)}
                </div>
                {meds.map((med) => (
                  <div key={med.id} className="card" style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 80px repeat(4, 70px)', gap: 8, padding: '12px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{med.initials}</span>
                    <span style={{ fontSize: '.86rem', fontWeight: 600 }}>{med.name}</span>
                    <span style={{ fontSize: '.74rem', color: 'var(--g500)' }}>{med.category}</span>
                    <span style={{ fontSize: '.74rem', color: 'var(--g500)' }}>{med.route}</span>
                    {NURSING_ROUNDS.map(r => {
                      const given = adminsToday[med.id]?.[r]
                      return (
                        <div key={r} title={given ? `Given by ${given.code}` : 'Tap to record'} style={{ textAlign: 'center', cursor: given ? 'default' : 'pointer', userSelect: 'none' }} onClick={() => recordRound(med.id, med.patient_id, r)}>
                          {given ? <span style={{ color: '#1A7A4A', fontWeight: 700 }}>✓</span> : <span style={{ color: 'var(--g300)' }}>·</span>}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '.72rem', color: 'var(--g400)', marginTop: 12 }}>A recorded round is an add-only audit entry and cannot be undone. Ticks reset each day.</p>
            </div>
          )}
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
                {patients.length === 0 && <option value="">No active patients</option>}
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.initials} — {p.substance} (Day {p.day})</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="flabel">Assessment Tool</label>
              <div className="fi" style={{ background: 'var(--off)', fontWeight: 600 }}>
                {isAlcohol ? 'CIWA-Ar (Alcohol Withdrawal)' : isOpioid ? 'COWS (Opioid Withdrawal)' : 'COWS (default)'}
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
              {!isAlcohol && totalScore >= 25 && 'Severe withdrawal. Consider comfort medications.'}
              {!isAlcohol && totalScore >= 13 && totalScore < 25 && 'Moderate withdrawal. Monitor closely.'}
              {!isAlcohol && totalScore < 13 && 'Mild withdrawal. Continue supportive care.'}
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

          <button className="btn btn--primary" style={{ marginTop: 16 }} disabled={savingDetox} onClick={handleSaveDetox}>
            {savingDetox ? 'Saving…' : 'Save Assessment'}
          </button>
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
              {patients.map(p => <option key={p.id} value={p.id}>{p.initials} — {p.substance} (Day {p.day})</option>)}
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
          <div className="fg"><label className="flabel">Prescriber</label>
            <select className="fi" value={medForm.prescriber} onChange={e => setMedForm(p => ({ ...p, prescriber: e.target.value }))}>
              <option value="">Select prescriber...</option>
              {STAFF_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <button className="btn btn--primary btn--sm" disabled={savingMed} onClick={handleAddMed}>
            {savingMed ? 'Saving…' : 'Submit Medication Order'}
          </button>
        </div>
      )}
    </div>
  )
}
