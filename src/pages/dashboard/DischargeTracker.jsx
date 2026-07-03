import React, { useState, useEffect, useCallback } from 'react'
import {
  getPatients,
  getDischarges,
  getDischargeByPatient,
  addDischarge,
  updateDischarge,
  isSupabaseReady,
} from '../../utils/supabase'
import { activeBriefs, mapPatientRow, initialsFromName } from '../../utils/patients'
import { POPULATION_PATHWAY_LABELS } from '../../data/clinicalConstants'

/*
  Discharge Tracker — tracks 6 graduation criteria per patient
  plus 4 discharge types as reference.
  Live `discharges` table (criteria checklist + aftercare in `data` JSONB,
  re-admissions in `readmission` JSONB). Initials only (HIPAA).
*/

const GRADUATION_CRITERIA = [
  {
    key: 'clinical-stability',
    label: 'Clinical Stability',
    description: 'No withdrawal symptoms, stable vitals, sustained abstinence',
  },
  {
    key: 'behavioral-compliance',
    label: 'Behavioral Compliance',
    description: 'Rule compliance last 4 weeks, positive community participation',
  },
  {
    key: 'psychological-readiness',
    label: 'Psychological Readiness',
    description: 'Insight into addiction, articulates PRPP',
  },
  {
    key: 'relapse-prevention',
    label: 'Relapse Prevention Competence',
    description: 'Written PRPP, 5+ coping strategies, named support network',
  },
  {
    key: 'christian-growth',
    label: 'Christian Growth',
    description: 'Authentic spiritual formation, values transformation, chaplain sign-off',
  },
  {
    key: 'reintegration-readiness',
    label: 'Reintegration Readiness',
    description: 'Safe placement confirmed, family/community meeting done, aftercare finalized',
  },
]

const DISCHARGE_TYPES = [
  {
    key: 'planned',
    label: 'Planned (Graduation)',
    color: '#1A7A4A',
    description: 'All 6 criteria met. Patient completes full programme and graduates with ceremony.',
  },
  {
    key: 'administrative',
    label: 'Administrative (Behavioral)',
    color: '#DD6B20',
    description: 'Discharge due to repeated rule violations, violence, or drug use on premises after warnings.',
  },
  {
    key: 'clinical',
    label: 'Clinical (Medical/Psychiatric)',
    color: '#805AD5',
    description: 'Transfer to higher-level care for acute medical or psychiatric needs beyond HOR capacity.',
  },
  {
    key: 'self-discharge',
    label: 'Self-Discharge (AMA)',
    color: '#E53E3E',
    description: 'Patient leaves Against Medical Advice. AMA form signed, risks documented, aftercare offered.',
  },
]

// Step-down pathway recommendations (Section 21)
const STEP_DOWN_PATHWAYS = {
  residential: {
    standard: 'Residential → Alumni Programme (Section 17) with 24-month aftercare monitoring (SOP-015)',
    highSeverity: 'Residential (12 wks) → IOP (8-12 wks) → Outpatient (12-24 wks) → Alumni. Total: 8-14 months structured contact',
  },
  iop: {
    stepDown: 'IOP → Outpatient (Level 1) when: 4+ weeks negative UDS, PHQ-9/GAD-7 stable, PRPP completed, stable environment',
  },
}

// Substance-specific aftercare guidance (Section 20 + Section 17)
const AFTERCARE_BY_SUBSTANCE = {
  AUD: ['AA/recovery fellowship placement', 'LFT follow-up monitoring', 'Alcohol-free social network identified', 'Family ongoing psychoeducation on alcohol-specific enabling'],
  OUD: ['NA fellowship placement', 'Non-opioid pain management follow-up', 'Overdose risk education for family', 'OTC medication vigilance plan (tramadol/codeine)'],
  CUD: ['Peer accountability partnerships', 'Structured evening/weekend activities', 'Cognitive function recovery monitoring (3-6 months)', 'Peer network restructuring follow-up'],
  Stimulant: ['NA/CA fellowship placement', 'Extended mood monitoring (anhedonia/depression)', 'Financial accountability partner confirmed', 'Structured evening/weekend activities'],
  Polysubstance: ['Multi-fellowship engagement', 'Substitution risk awareness in aftercare', 'Extended monitoring recommended (36 months vs 24)', 'Comprehensive PRPP covering all substances'],
}

// Population-specific aftercare (Section 22)
const AFTERCARE_BY_POPULATION = {
  womens: ['IPV safety plan (if applicable)', 'Transitional housing referral if home unsafe', 'Parenting support continuation', 'Financial independence vocational follow-up'],
  adolescent: ['School/university re-entry plan confirmed', 'Family aftercare contract (6+ months ongoing family sessions)', 'Youth church programme placement', 'Extended monitoring: 36 months (vs 24 for adults)'],
  'dual-diagnosis': ['Psychiatric follow-up confirmed', 'Medication adherence monitoring', 'Mental health relapse indicators in PRPP', 'Dual-focus aftercare counselling'],
}

const DISCHARGE_TYPE_OPTIONS = [
  'Planned (Graduation)',
  'Administrative (Behavioral)',
  'Clinical (Medical Referral)',
  'Self-Discharge (AMA)',
]

const DISCHARGE_CHECKLISTS = {
  'Planned (Graduation)': [
    { key: 'grad-criteria', label: 'All 6 graduation criteria met (MDT confirmed)' },
    { key: 'grad-predischarge', label: 'Pre-discharge family/community meeting completed' },
    { key: 'grad-prpp', label: 'PRPP finalised and printed (copy to client, copy to file)' },
    { key: 'grad-aftercare', label: 'Aftercare plan completed (first follow-up within 7 days — SOP-015)' },
    { key: 'grad-assessments', label: 'Discharge assessments completed (AUDIT, DAST-10, PHQ-9, GAD-7, URICA, C-SSRS)' },
    { key: 'grad-summary', label: 'Discharge summary written (SOP-010 Step 6)' },
    { key: 'grad-meds', label: 'Continuing medications prescribed (14-day supply + referral)' },
    { key: 'grad-stepdown', label: 'Step-down pathway confirmed (Level 2.1 IOP or Level 1 Outpatient or Alumni)' },
    { key: 'grad-church', label: 'Church placement confirmed' },
    { key: 'grad-alumni', label: 'Alumni Programme enrolled' },
    { key: 'grad-ceremony', label: 'Graduation ceremony scheduled' },
  ],
  'Administrative (Behavioral)': [
    { key: 'admin-violations', label: 'Violations documented' },
    { key: 'admin-conversation', label: 'Compassionate conversation done' },
    { key: 'admin-family', label: 'Family contacted' },
    { key: 'admin-safety', label: 'Safety plan provided' },
    { key: 'admin-30day', label: '30-day re-admission minimum noted' },
  ],
  'Clinical (Medical Referral)': [
    { key: 'clin-referral', label: 'Referral letter prepared (ASAM level-of-care transfer)' },
    { key: 'clin-transport', label: 'Accompanied transport arranged' },
    { key: 'clin-facility', label: 'Receiving facility contacted' },
    { key: 'clin-family', label: 'Family notified' },
  ],
  'Self-Discharge (AMA)': [
    { key: 'ama-form', label: 'AMA form signed' },
    { key: 'ama-harm', label: 'Harm reduction counselling done' },
    { key: 'ama-safety', label: 'Safety plan provided' },
    { key: 'ama-contact', label: 'HOR contact number given' },
  ],
}

const NON_NEGOTIABLE_ITEMS = [
  { key: 'nn-safety', label: 'Basic safety plan provided' },
  { key: 'nn-harm', label: 'Harm reduction info given' },
  { key: 'nn-referral', label: 'Written referral provided' },
  { key: 'nn-contact', label: 'HOR contact number given' },
  { key: 'nn-prayer', label: 'Prayer offered' },
]

const READMISSION_CRITERIA = [
  { key: 'ra-willingness', label: 'Willingness re-established (URICA re-assessment)' },
  { key: 'ra-reflection', label: 'Relapse reflection articulated' },
  { key: 'ra-exclusion', label: 'Exclusion criteria absent' },
  { key: 'ra-gap', label: 'Administrative discharge gap met (30-day minimum if Type 2)' },
  { key: 'ra-plan', label: 'Modified treatment plan prepared (new, not repeat)' },
  { key: 'ra-interview', label: 'Re-admission interview by Program Director completed' },
]

const TODAY = new Date().toISOString().slice(0, 10)

const emptyCriteria = () =>
  GRADUATION_CRITERIA.reduce((acc, gc) => ({ ...acc, [gc.key]: { met: false, notes: '' } }), {})

export default function DischargeTracker() {
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState([]) // active briefs for selector
  const [patientMetaById, setPatientMetaById] = useState({}) // mapped patient (aftercare fields)
  const [initialsById, setInitialsById] = useState({}) // all patients -> initials
  const [discharges, setDischarges] = useState([]) // all discharge rows
  const [activeTab, setActiveTab] = useState('tracker') // 'tracker' | 'readmissions'

  // ── Tracker editor state (single selected patient) ──
  const [selectedPatient, setSelectedPatient] = useState('') // patient_id
  const [dischargeRowId, setDischargeRowId] = useState(null)
  const [savedStatus, setSavedStatus] = useState(null)
  const [criteria, setCriteria] = useState(emptyCriteria())
  const [dischargeType, setDischargeType] = useState('')
  const [dischargeDate, setDischargeDate] = useState('')
  const [dischargeChecklist, setDischargeChecklist] = useState({})
  const [nonNegotiableChecklist, setNonNegotiableChecklist] = useState({})
  const [dischargeNotes, setDischargeNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Re-admission state ──
  const [showReadmissionForm, setShowReadmissionForm] = useState(false)
  const [readmissionDischargeId, setReadmissionDischargeId] = useState('')
  const [readmissionNotes, setReadmissionNotes] = useState('')
  const [readmissionChecklist, setReadmissionChecklist] = useState({})
  const [submittingReadmission, setSubmittingReadmission] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseReady()) { setLoading(false); return }
    setLoading(true)
    const [{ data: rows }, { data: dischargeRows }] = await Promise.all([getPatients(), getDischarges()])
    setPatients(activeBriefs(rows))
    setPatientMetaById(Object.fromEntries((rows || []).map(r => [r.id, mapPatientRow(r)])))
    setInitialsById(Object.fromEntries((rows || []).map(r => [r.id, initialsFromName(r.full_name)])))
    setDischarges(dischargeRows || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const selectedMeta = patientMetaById[selectedPatient] || null
  const currentTypeChecklist = DISCHARGE_CHECKLISTS[dischargeType] || []
  const metCount = GRADUATION_CRITERIA.filter(gc => criteria[gc.key]?.met).length
  const total = GRADUATION_CRITERIA.length
  const pct = Math.round((metCount / total) * 100)
  const readyToGraduate = metCount === total

  const handleSelectPatient = async (id) => {
    setSelectedPatient(id)
    if (!id) {
      setDischargeRowId(null); setSavedStatus(null)
      setCriteria(emptyCriteria()); setDischargeType(''); setDischargeDate('')
      setDischargeChecklist({}); setNonNegotiableChecklist({}); setDischargeNotes('')
      return
    }
    const { data: row } = await getDischargeByPatient(id)
    if (row) {
      const d = row.data || {}
      setDischargeRowId(row.id)
      setSavedStatus(row.status || null)
      setCriteria({ ...emptyCriteria(), ...(d.criteria || {}) })
      setDischargeType(row.discharge_type || '')
      setDischargeDate(row.discharge_date || '')
      setDischargeChecklist(d.dischargeChecklist || {})
      setNonNegotiableChecklist(d.nonNegotiableChecklist || {})
      setDischargeNotes(d.notes || '')
    } else {
      setDischargeRowId(null)
      setSavedStatus(null)
      setCriteria(emptyCriteria())
      setDischargeType('')
      setDischargeDate('')
      setDischargeChecklist({})
      setNonNegotiableChecklist({})
      setDischargeNotes('')
    }
  }

  const toggleCriterion = (key) =>
    setCriteria(prev => ({ ...prev, [key]: { ...prev[key], met: !prev[key]?.met } }))
  const setCriterionNotes = (key, notes) =>
    setCriteria(prev => ({ ...prev, [key]: { ...prev[key], notes } }))

  const handleSave = async (markComplete = false) => {
    if (!selectedPatient) return
    setSaving(true)
    const status = markComplete ? 'completed' : (savedStatus === 'completed' ? 'completed' : 'in-progress')
    const payload = {
      discharge_date: dischargeDate || null,
      discharge_type: dischargeType || null,
      status,
      data: { criteria, dischargeChecklist, nonNegotiableChecklist, notes: dischargeNotes },
    }
    let error
    if (dischargeRowId) {
      ;({ error } = await updateDischarge(dischargeRowId, payload))
    } else {
      const res = await addDischarge({ patient_id: selectedPatient, ...payload })
      error = res.error
      if (res.data?.id) setDischargeRowId(res.data.id)
    }
    setSaving(false)
    if (error) { alert(`Could not save discharge: ${error.message || 'Unknown error'}`); return }
    setSavedStatus(status)
    await load()
  }

  // ── Re-admission derived data ──
  const allReadmissionCriteriaMet = READMISSION_CRITERIA.every(item => readmissionChecklist[item.key])
  const readmissionLog = discharges.filter(
    d => d.readmission && typeof d.readmission === 'object' && Object.keys(d.readmission).length > 0
  )
  const readmissionCandidates = discharges.filter(
    d => !(d.readmission && typeof d.readmission === 'object' && Object.keys(d.readmission).length > 0)
  )

  const handleReadmissionSubmit = async () => {
    if (!readmissionDischargeId || !allReadmissionCriteriaMet) return
    setSubmittingReadmission(true)
    const { error } = await updateDischarge(readmissionDischargeId, {
      readmission: {
        requestDate: TODAY,
        status: 'Pending Review',
        notes: readmissionNotes,
        criteria: { ...readmissionChecklist },
      },
    })
    setSubmittingReadmission(false)
    if (error) { alert(`Could not submit re-admission: ${error.message || 'Unknown error'}`); return }
    setReadmissionDischargeId('')
    setReadmissionNotes('')
    setReadmissionChecklist({})
    setShowReadmissionForm(false)
    await load()
  }

  const activeCount = patients.length

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Discharge Tracker</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
          6 graduation criteria &middot; {activeCount} active resident{activeCount === 1 ? '' : 's'} &middot; All criteria must be met for planned discharge
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--g200, #e2e8f0)' }}>
        {[
          { key: 'tracker', label: 'Discharge Tracker' },
          { key: 'readmissions', label: 'Re-Admissions' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px', fontSize: '.85rem', fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.key ? 'var(--blue)' : 'var(--g500)',
              borderBottom: activeTab === tab.key ? '2px solid var(--blue)' : '2px solid transparent',
              marginBottom: -2, transition: 'all .2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'tracker' && (<>
        {/* Patient selector */}
        <div className="fg" style={{ marginBottom: 20, maxWidth: 360 }}>
          <label className="flabel">Resident</label>
          <select className="fi" value={selectedPatient} onChange={e => handleSelectPatient(e.target.value)} disabled={loading || patients.length === 0}>
            <option value="">Select a resident...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.initials}</option>)}
          </select>
        </div>

        {loading ? (
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Loading residents…</p>
        ) : patients.length === 0 ? (
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>No active patients on record yet.</p>
        ) : !selectedPatient ? (
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Select a resident to review discharge readiness.</p>
        ) : (
          <div className="card" style={{ padding: '20px 22px', marginBottom: 28 }}>
            {/* Patient header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--blue), var(--blue-dk))',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '.82rem', fontWeight: 700, flexShrink: 0,
                }}>
                  {selectedMeta?.initials || initialsById[selectedPatient] || '—'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--charcoal)' }}>{selectedMeta?.initials || '—'}</div>
                  <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>
                    {selectedMeta ? `Pathway ${selectedMeta.pathway || '—'} · Day ${selectedMeta.day} · ${selectedMeta.phase}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: readyToGraduate ? '#1A7A4A' : 'var(--charcoal)' }}>
                  {metCount}/{total}
                </div>
                <div style={{ fontSize: '.7rem', color: 'var(--g500)' }}>criteria met</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'var(--g200, #e2e8f0)', marginBottom: 6, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%', borderRadius: 3,
                background: readyToGraduate ? '#1A7A4A' : pct >= 50 ? '#D69E2E' : '#E53E3E',
                transition: 'width .3s ease',
              }} />
            </div>
            {savedStatus && (
              <div style={{ marginBottom: 12, fontSize: '.72rem' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                  background: savedStatus === 'completed' ? 'rgba(26,122,74,.1)' : 'rgba(214,158,46,.1)',
                  color: savedStatus === 'completed' ? '#1A7A4A' : '#D69E2E',
                }}>
                  {savedStatus === 'completed' ? 'Discharge completed' : 'Discharge in progress'}
                </span>
              </div>
            )}

            {/* Graduation criteria (editable) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {GRADUATION_CRITERIA.map(gc => {
                const c = criteria[gc.key] || { met: false, notes: '' }
                return (
                  <div key={gc.key} style={{
                    padding: '10px 12px', borderRadius: 6,
                    background: c.met ? 'rgba(26,122,74,.05)' : 'var(--g50, #f9fafb)',
                    border: `1px solid ${c.met ? 'rgba(26,122,74,.15)' : 'var(--g200, #e2e8f0)'}`,
                  }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!c.met}
                        onChange={() => toggleCriterion(gc.key)}
                        style={{ accentColor: '#1A7A4A', marginTop: 2 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '.8rem', fontWeight: 600, color: c.met ? '#1A7A4A' : 'var(--charcoal)' }}>{gc.label}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 2 }}>{gc.description}</div>
                      </div>
                    </label>
                    <input
                      className="fi"
                      type="text"
                      value={c.notes || ''}
                      onChange={e => setCriterionNotes(gc.key, e.target.value)}
                      placeholder="Notes…"
                      style={{ marginTop: 8, fontSize: '.76rem', padding: '6px 8px' }}
                    />
                  </div>
                )
              })}
            </div>

            {/* Discharge Type */}
            <div className="fg" style={{ marginBottom: 12 }}>
              <label className="flabel">Discharge Type</label>
              <select className="fi" value={dischargeType} onChange={e => setDischargeType(e.target.value)}>
                <option value="">Select...</option>
                {DISCHARGE_TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* Discharge Date */}
            <div className="fg" style={{ marginBottom: 14 }}>
              <label className="flabel">Discharge Date</label>
              <input className="fi" type="date" value={dischargeDate || ''} onChange={e => setDischargeDate(e.target.value)} />
            </div>

            {/* Type-specific checklist */}
            {dischargeType && currentTypeChecklist.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label className="flabel" style={{ marginBottom: 8, display: 'block' }}>
                  Type-Specific Checklist — {dischargeType}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {currentTypeChecklist.map(item => (
                    <label key={item.key} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      borderRadius: 6, cursor: 'pointer',
                      background: dischargeChecklist[item.key] ? 'rgba(26,122,74,.05)' : 'var(--g50, #f9fafb)',
                      border: `1px solid ${dischargeChecklist[item.key] ? 'rgba(26,122,74,.15)' : 'var(--g200, #e2e8f0)'}`,
                    }}>
                      <input
                        type="checkbox"
                        checked={!!dischargeChecklist[item.key]}
                        onChange={e => setDischargeChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        style={{ accentColor: '#1A7A4A' }}
                      />
                      <span style={{ fontSize: '.8rem', color: dischargeChecklist[item.key] ? '#1A7A4A' : 'var(--charcoal)', fontWeight: 500 }}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Non-negotiable items */}
            <div style={{ marginBottom: 14 }}>
              <label className="flabel" style={{ marginBottom: 8, display: 'block', color: '#E53E3E' }}>
                Non-Negotiable (All Discharge Types)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {NON_NEGOTIABLE_ITEMS.map(item => (
                  <label key={item.key} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    borderRadius: 6, cursor: 'pointer',
                    background: nonNegotiableChecklist[item.key] ? 'rgba(229,62,62,.05)' : 'var(--g50, #f9fafb)',
                    border: `1px solid ${nonNegotiableChecklist[item.key] ? 'rgba(229,62,62,.15)' : 'var(--g200, #e2e8f0)'}`,
                  }}>
                    <input
                      type="checkbox"
                      checked={!!nonNegotiableChecklist[item.key]}
                      onChange={e => setNonNegotiableChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      style={{ accentColor: '#E53E3E' }}
                    />
                    <span style={{ fontSize: '.8rem', color: nonNegotiableChecklist[item.key] ? '#E53E3E' : 'var(--charcoal)', fontWeight: 500 }}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="fg" style={{ marginBottom: 14 }}>
              <label className="flabel">Discharge Notes</label>
              <textarea className="fi" rows={3} value={dischargeNotes} onChange={e => setDischargeNotes(e.target.value)} placeholder="Additional notes..." style={{ resize: 'vertical' }} />
            </div>

            {/* Pathway-Specific Aftercare Guidance (Sections 20-22 + SOP-010/015) */}
            {selectedMeta && (
              <div style={{ marginBottom: 16, padding: 14, background: '#FAFAFE', borderRadius: 8, border: '1px solid #805AD520' }}>
                <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#805AD5', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Pathway-Specific Aftercare Plan
                </div>
                <div style={{ fontSize: '.78rem', color: 'var(--g700)', marginBottom: 10, padding: '6px 8px', background: '#fff', borderRadius: 6, border: '1px solid var(--g100)' }}>
                  <strong>Step-Down:</strong> {STEP_DOWN_PATHWAYS[selectedMeta.careLevel || 'residential']?.standard || STEP_DOWN_PATHWAYS.residential.standard}
                </div>
                {selectedMeta.substancePathway && AFTERCARE_BY_SUBSTANCE[selectedMeta.substancePathway] && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}>{selectedMeta.substancePathway} Aftercare (Section 20):</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {AFTERCARE_BY_SUBSTANCE[selectedMeta.substancePathway].map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: '.76rem', color: 'var(--g600)' }}>
                          <span style={{ color: '#805AD5', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedMeta.populationPathway && selectedMeta.populationPathway !== 'standard' && AFTERCARE_BY_POPULATION[selectedMeta.populationPathway] && (
                  <div>
                    <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}>
                      {POPULATION_PATHWAY_LABELS[selectedMeta.populationPathway] || selectedMeta.populationPathway} Aftercare (Section 22):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {AFTERCARE_BY_POPULATION[selectedMeta.populationPathway].map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: '.76rem', color: 'var(--g600)' }}>
                          <span style={{ color: '#D69E2E', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Save actions */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn--secondary btn--sm" onClick={() => handleSave(false)} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn--primary btn--sm" onClick={() => handleSave(true)} disabled={saving}>
                {saving ? 'Saving…' : 'Save & Mark Discharge Complete'}
              </button>
            </div>
          </div>
        )}

        {/* Discharge Types Reference */}
        <div style={{ marginBottom: 8 }}>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', marginBottom: 14, color: 'var(--charcoal)' }}>
            Discharge Types
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {DISCHARGE_TYPES.map(dt => {
            const checklistKey = dt.label === 'Clinical (Medical/Psychiatric)' ? 'Clinical (Medical Referral)' : dt.label
            const checklist = DISCHARGE_CHECKLISTS[checklistKey] || []
            return (
              <div key={dt.key} className="card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: dt.color, flexShrink: 0 }} />
                  <h3 style={{ fontSize: '.88rem', fontWeight: 700, color: dt.color, margin: 0 }}>
                    {dt.label}
                  </h3>
                </div>
                <p style={{ fontSize: '.8rem', color: 'var(--g700, #4a5568)', margin: '0 0 10px', lineHeight: 1.5 }}>
                  {dt.description}
                </p>
                <div style={{ fontSize: '.75rem', color: 'var(--g500)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Required checklist:</div>
                  {checklist.map(item => (
                    <div key={item.key} style={{ paddingLeft: 8, marginBottom: 2 }}>- {item.label}</div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Non-negotiable reference */}
        <div style={{ marginTop: 20 }}>
          <div className="card" style={{ padding: '16px 20px', background: 'rgba(229,62,62,.03)', border: '1px solid rgba(229,62,62,.12)' }}>
            <h3 style={{ fontSize: '.88rem', fontWeight: 700, color: '#E53E3E', margin: '0 0 8px' }}>
              Non-Negotiable (All Discharge Types)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {NON_NEGOTIABLE_ITEMS.map(item => (
                <span key={item.key} style={{
                  fontSize: '.75rem', padding: '4px 10px', borderRadius: 12,
                  background: 'rgba(229,62,62,.08)', color: '#E53E3E', fontWeight: 500,
                }}>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </>)}

      {/* Re-Admissions Tab */}
      {activeTab === 'readmissions' && (
        <div>
          {/* Header with action button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', margin: '0 0 4px', color: 'var(--charcoal)' }}>
                Re-Admission Workflow
              </h2>
              <p style={{ fontSize: '.82rem', color: 'var(--g500)', margin: 0 }}>
                Section 16.5 — All 6 re-admission criteria must be met before approval
              </p>
            </div>
            <button
              className="btn btn--primary btn--sm"
              onClick={() => setShowReadmissionForm(!showReadmissionForm)}
              disabled={readmissionCandidates.length === 0 && !showReadmissionForm}
            >
              {showReadmissionForm ? 'Cancel' : 'New Re-Admission Request'}
            </button>
          </div>

          {/* Re-admission criteria reference */}
          <div className="card" style={{ padding: '18px 22px', marginBottom: 20 }}>
            <h3 style={{ fontSize: '.92rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 12px' }}>
              Re-Admission Criteria (All Required)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
              {READMISSION_CRITERIA.map((item, i) => (
                <div key={item.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 6, background: 'var(--g50, #f9fafb)', border: '1px solid var(--g200, #e2e8f0)',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--blue)', color: 'white', fontSize: '.7rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: '.8rem', color: 'var(--charcoal)', fontWeight: 500 }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Re-admission request form */}
          {showReadmissionForm && (
            <div className="card" style={{ padding: '22px 24px', marginBottom: 20 }}>
              <h3 style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 16px' }}>
                New Re-Admission Request
              </h3>
              {readmissionCandidates.length === 0 ? (
                <p style={{ fontSize: '.82rem', color: 'var(--g500)', margin: 0 }}>
                  No prior discharges available to record a re-admission against.
                </p>
              ) : (<>
                <div className="fg" style={{ marginBottom: 16, maxWidth: 460 }}>
                  <label className="flabel">Previous Discharge *</label>
                  <select className="fi" value={readmissionDischargeId} onChange={e => setReadmissionDischargeId(e.target.value)}>
                    <option value="">Select a prior discharge...</option>
                    {readmissionCandidates.map(d => (
                      <option key={d.id} value={d.id}>
                        {(initialsById[d.patient_id] || '—')} — {d.discharge_type || 'Unspecified'}{d.discharge_date ? ` (${d.discharge_date})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 30-day gap warning for Administrative */}
                {(() => {
                  const d = readmissionCandidates.find(x => x.id === readmissionDischargeId)
                  if (!d || d.discharge_type !== 'Administrative (Behavioral)' || !d.discharge_date) return null
                  const gap = Math.floor((new Date() - new Date(d.discharge_date)) / (1000 * 60 * 60 * 24))
                  return gap < 30 ? (
                    <div style={{
                      padding: '10px 14px', borderRadius: 6, marginBottom: 14,
                      background: 'rgba(221,107,32,.08)', border: '1px solid rgba(221,107,32,.2)',
                      fontSize: '.8rem', color: '#DD6B20', fontWeight: 500,
                    }}>
                      Warning: Only {gap} days since administrative discharge. 30-day minimum required. ({30 - gap} days remaining)
                    </div>
                  ) : null
                })()}

                {/* Re-admission criteria checklist */}
                <div style={{ marginBottom: 16 }}>
                  <label className="flabel" style={{ marginBottom: 8, display: 'block' }}>Re-Admission Criteria Checklist *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {READMISSION_CRITERIA.map(item => (
                      <label key={item.key} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                        borderRadius: 6, cursor: 'pointer',
                        background: readmissionChecklist[item.key] ? 'rgba(26,122,74,.05)' : 'var(--g50, #f9fafb)',
                        border: `1px solid ${readmissionChecklist[item.key] ? 'rgba(26,122,74,.15)' : 'var(--g200, #e2e8f0)'}`,
                      }}>
                        <input
                          type="checkbox"
                          checked={!!readmissionChecklist[item.key]}
                          onChange={e => setReadmissionChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))}
                          style={{ accentColor: '#1A7A4A' }}
                        />
                        <span style={{ fontSize: '.8rem', color: readmissionChecklist[item.key] ? '#1A7A4A' : 'var(--charcoal)', fontWeight: 500 }}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="fg" style={{ marginBottom: 16 }}>
                  <label className="flabel">Notes</label>
                  <textarea className="fi" rows={3} value={readmissionNotes} onChange={e => setReadmissionNotes(e.target.value)} placeholder="Relapse reflection, URICA score, interview notes..." style={{ resize: 'vertical' }} />
                </div>

                {!allReadmissionCriteriaMet && (
                  <p style={{ fontSize: '.76rem', color: '#E53E3E', margin: '0 0 12px' }}>
                    All 6 re-admission criteria must be checked before submitting.
                  </p>
                )}

                <button
                  className="btn btn--primary btn--sm"
                  onClick={handleReadmissionSubmit}
                  disabled={!readmissionDischargeId || !allReadmissionCriteriaMet || submittingReadmission}
                  style={{ opacity: (!readmissionDischargeId || !allReadmissionCriteriaMet || submittingReadmission) ? 0.5 : 1 }}
                >
                  {submittingReadmission ? 'Submitting…' : 'Submit Re-Admission Request'}
                </button>
              </>)}
            </div>
          )}

          {/* Re-admission history log */}
          <div className="card" style={{ padding: '18px 22px' }}>
            <h3 style={{ fontSize: '.92rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 14px' }}>
              Re-Admission History
            </h3>
            {loading ? (
              <p style={{ fontSize: '.82rem', color: 'var(--g500)', margin: 0 }}>Loading…</p>
            ) : readmissionLog.length === 0 ? (
              <p style={{ fontSize: '.82rem', color: 'var(--g500)', margin: 0 }}>No readmissions recorded.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--g200, #e2e8f0)' }}>
                      {['Initials', 'Previous Discharge', 'Discharged', 'Requested', 'Status', 'Notes'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--g500)', fontSize: '.75rem', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {readmissionLog.map(d => {
                      const ra = d.readmission || {}
                      return (
                        <tr key={d.id} style={{ borderBottom: '1px solid var(--g100, #f0f0f0)' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--charcoal)' }}>{initialsById[d.patient_id] || '—'}</td>
                          <td style={{ padding: '8px 10px' }}>{d.discharge_type || '—'}</td>
                          <td style={{ padding: '8px 10px' }}>{d.discharge_date || '—'}</td>
                          <td style={{ padding: '8px 10px' }}>{ra.requestDate || '—'}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{
                              fontSize: '.72rem', padding: '3px 8px', borderRadius: 10, fontWeight: 600,
                              background: ra.status === 'Approved' ? 'rgba(26,122,74,.1)' : ra.status === 'Denied' ? 'rgba(229,62,62,.1)' : 'rgba(214,158,46,.1)',
                              color: ra.status === 'Approved' ? '#1A7A4A' : ra.status === 'Denied' ? '#E53E3E' : '#D69E2E',
                            }}>
                              {ra.status || 'Pending Review'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: '.75rem', color: 'var(--g500)', maxWidth: 200 }}>{ra.notes}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
