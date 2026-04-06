import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../utils/paystack'
import { POPULATION_PATHWAY_LABELS } from '../../data/clinicalConstants'

/*
  Discharge Tracker — tracks 6 graduation criteria per patient
  plus 4 discharge types as reference.
  Initials only (HIPAA).
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

const PATIENTS = [
  {
    id: 'P001', initials: 'CO', pathway: 'A', day: 23, phase: 'Foundation', substancePathway: 'AUD', populationPathway: 'standard', careLevel: 'residential',
    criteria: {
      'clinical-stability': { met: true, notes: 'Vitals stable, no withdrawal since day 14' },
      'behavioral-compliance': { met: false, notes: 'Minor infractions week 2, improving' },
      'psychological-readiness': { met: false, notes: 'Building insight, early stages' },
      'relapse-prevention': { met: false, notes: 'PRPP draft started, 2 coping strategies identified' },
      'christian-growth': { met: false, notes: 'Attending chapel, engaged in devotionals' },
      'reintegration-readiness': { met: false, notes: 'Family meeting scheduled' },
    },
  },
  {
    id: 'P002', initials: 'AN', pathway: 'A', day: 45, phase: 'Deepening', substancePathway: 'OUD', populationPathway: 'womens', careLevel: 'residential',
    criteria: {
      'clinical-stability': { met: true, notes: 'Fully stable, abstinent 45 days' },
      'behavioral-compliance': { met: true, notes: 'Exemplary conduct, peer mentor role' },
      'psychological-readiness': { met: true, notes: 'Strong insight, articulates triggers well' },
      'relapse-prevention': { met: false, notes: 'PRPP in progress, 4 coping strategies' },
      'christian-growth': { met: false, notes: 'Growing in faith, chaplain reports progress' },
      'reintegration-readiness': { met: false, notes: 'Aftercare options being evaluated' },
    },
  },
  {
    id: 'P003', initials: 'KA', pathway: 'B', day: 74, phase: 'Reintegration', substancePathway: 'CUD', populationPathway: 'standard', careLevel: 'residential',
    criteria: {
      'clinical-stability': { met: true, notes: 'No withdrawal, vitals normal, 74-day abstinence' },
      'behavioral-compliance': { met: true, notes: 'Zero infractions last 4 weeks, active community leader' },
      'psychological-readiness': { met: true, notes: 'Deep insight into addiction patterns, PRPP articulated' },
      'relapse-prevention': { met: true, notes: 'Written PRPP complete, 7 coping strategies, support network named' },
      'christian-growth': { met: true, notes: 'Authentic spiritual formation, chaplain sign-off obtained' },
      'reintegration-readiness': { met: false, notes: 'Safe placement confirmed, family meeting pending final date' },
    },
  },
  {
    id: 'P004', initials: 'IM', pathway: 'A', day: 8, phase: 'Stabilization', substancePathway: 'OUD', populationPathway: 'adolescent', careLevel: 'residential',
    criteria: {
      'clinical-stability': { met: false, notes: 'Active withdrawal management, vitals monitored q4h' },
      'behavioral-compliance': { met: false, notes: 'Adjustment period, orientation ongoing' },
      'psychological-readiness': { met: false, notes: 'Precontemplation stage, minimal insight' },
      'relapse-prevention': { met: false, notes: 'Not yet started' },
      'christian-growth': { met: false, notes: 'Introduced to chapel programme' },
      'reintegration-readiness': { met: false, notes: 'Too early to assess' },
    },
  },
]

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

const SAMPLE_READMISSION_LOG = [
  { id: 'RA001', initials: 'OT', previousDischarge: 'Self-Discharge (AMA)', dischargeDate: '2025-11-12', requestDate: '2026-01-20', status: 'Approved', notes: 'URICA score improved, strong relapse reflection' },
  { id: 'RA002', initials: 'DA', previousDischarge: 'Administrative (Behavioral)', dischargeDate: '2025-12-01', requestDate: '2026-02-15', status: 'Pending Review', notes: '30-day gap met, awaiting Program Director interview' },
]

export default function DischargeTracker() {
  const { user } = useAuth()
  const [expandedPatient, setExpandedPatient] = useState(null)
  const [patients, setPatients] = useState(PATIENTS)
  const [dischargeModal, setDischargeModal] = useState(null) // patient id
  const [dischargeForm, setDischargeForm] = useState({
    type: '', date: '', notes: '',
  })
  const [dischargeChecklist, setDischargeChecklist] = useState({})
  const [nonNegotiableChecklist, setNonNegotiableChecklist] = useState({})
  const [activeTab, setActiveTab] = useState('tracker') // 'tracker' | 'readmissions'
  const [readmissionLog, setReadmissionLog] = useState(SAMPLE_READMISSION_LOG)
  const [readmissionForm, setReadmissionForm] = useState({
    initials: '', previousDischarge: '', dischargeDate: '', notes: '',
  })
  const [readmissionChecklist, setReadmissionChecklist] = useState({})
  const [showReadmissionForm, setShowReadmissionForm] = useState(false)

  const currentTypeChecklist = DISCHARGE_CHECKLISTS[dischargeForm.type] || []
  const allTypeChecked = currentTypeChecklist.length > 0 && currentTypeChecklist.every(item => dischargeChecklist[item.key])
  const allNonNegChecked = NON_NEGOTIABLE_ITEMS.every(item => nonNegotiableChecklist[item.key])

  const handleDischargeConfirm = () => {
    if (!dischargeForm.type || !dischargeForm.date) return
    if (!allTypeChecked || !allNonNegChecked) return
    setPatients(prev => prev.map(p => p.id === dischargeModal ? { ...p, discharged: true, dischargeType: dischargeForm.type, dischargeDate: dischargeForm.date } : p))
    setDischargeModal(null)
    setDischargeForm({ type: '', date: '', notes: '' })
    setDischargeChecklist({})
    setNonNegotiableChecklist({})
  }

  const resetDischargeModal = () => {
    setDischargeModal(null)
    setDischargeForm({ type: '', date: '', notes: '' })
    setDischargeChecklist({})
    setNonNegotiableChecklist({})
  }

  const allReadmissionCriteriaMet = READMISSION_CRITERIA.every(item => readmissionChecklist[item.key])
  const handleReadmissionSubmit = () => {
    if (!readmissionForm.initials || !readmissionForm.previousDischarge || !readmissionForm.dischargeDate || !allReadmissionCriteriaMet) return
    setReadmissionLog(prev => [...prev, {
      id: `RA${String(prev.length + 1).padStart(3, '0')}`,
      initials: readmissionForm.initials,
      previousDischarge: readmissionForm.previousDischarge,
      dischargeDate: readmissionForm.dischargeDate,
      requestDate: new Date().toISOString().split('T')[0],
      status: 'Pending Review',
      notes: readmissionForm.notes,
    }])
    setReadmissionForm({ initials: '', previousDischarge: '', dischargeDate: '', notes: '' })
    setReadmissionChecklist({})
    setShowReadmissionForm(false)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Discharge Tracker</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
          6 graduation criteria &middot; {patients.filter(p => !p.discharged).length} current residents &middot; All criteria must be met for planned discharge
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

      {/* Discharge Modal */}
      {dischargeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="card" style={{ padding: '24px', maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: 16 }}>
              Initiate Discharge — {patients.find(p => p.id === dischargeModal)?.initials}
            </h3>

            {/* Discharge Type */}
            <div className="fg" style={{ marginBottom: 12 }}>
              <label className="flabel">Discharge Type *</label>
              <select className="fi" value={dischargeForm.type} onChange={e => { setDischargeForm(p => ({ ...p, type: e.target.value })); setDischargeChecklist({}); }}>
                <option value="">Select...</option>
                {DISCHARGE_TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* Type description */}
            {dischargeForm.type && (
              <div style={{
                padding: '10px 14px', borderRadius: 6, marginBottom: 14,
                background: dischargeForm.type === 'Planned (Graduation)' ? 'rgba(26,122,74,.06)' :
                  dischargeForm.type === 'Administrative (Behavioral)' ? 'rgba(221,107,32,.06)' :
                  dischargeForm.type === 'Clinical (Medical Referral)' ? 'rgba(128,90,213,.06)' :
                  'rgba(229,62,62,.06)',
                border: `1px solid ${dischargeForm.type === 'Planned (Graduation)' ? 'rgba(26,122,74,.15)' :
                  dischargeForm.type === 'Administrative (Behavioral)' ? 'rgba(221,107,32,.15)' :
                  dischargeForm.type === 'Clinical (Medical Referral)' ? 'rgba(128,90,213,.15)' :
                  'rgba(229,62,62,.15)'}`,
                fontSize: '.78rem', color: 'var(--g700, #4a5568)', lineHeight: 1.5,
              }}>
                {DISCHARGE_TYPES.find(dt => dt.label === dischargeForm.type.replace('Medical Referral', 'Medical/Psychiatric'))?.description ||
                 DISCHARGE_TYPES.find(dt => dischargeForm.type.includes(dt.key.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')))?.description ||
                 ''}
              </div>
            )}

            {/* Discharge Date */}
            <div className="fg" style={{ marginBottom: 14 }}>
              <label className="flabel">Discharge Date *</label>
              <input className="fi" type="date" value={dischargeForm.date} onChange={e => setDischargeForm(p => ({ ...p, date: e.target.value }))} />
            </div>

            {/* Type-Specific Checklist */}
            {dischargeForm.type && currentTypeChecklist.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label className="flabel" style={{ marginBottom: 8, display: 'block' }}>
                  Type-Specific Checklist — {dischargeForm.type}
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

            {/* Non-Negotiable Items (All Types) */}
            {dischargeForm.type && (
              <div style={{ marginBottom: 14 }}>
                <label className="flabel" style={{ marginBottom: 8, display: 'block', color: '#E53E3E' }}>
                  Non-Negotiable (All Discharge Types) *
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
            )}

            {/* Notes */}
            <div className="fg" style={{ marginBottom: 14 }}>
              <label className="flabel">Discharge Notes</label>
              <textarea className="fi" rows={3} value={dischargeForm.notes} onChange={e => setDischargeForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." style={{ resize: 'vertical' }} />
            </div>

            {/* Validation message */}
            {dischargeForm.type && (!allTypeChecked || !allNonNegChecked) && (
              <p style={{ fontSize: '.76rem', color: '#E53E3E', margin: '0 0 12px' }}>
                All checklist items must be completed before confirming discharge.
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn--primary btn--sm" onClick={handleDischargeConfirm} disabled={!dischargeForm.type || !dischargeForm.date || !allTypeChecked || !allNonNegChecked} style={{ opacity: (!dischargeForm.type || !dischargeForm.date || !allTypeChecked || !allNonNegChecked) ? 0.5 : 1 }}>Confirm Discharge</button>
              <button className="btn btn--secondary btn--sm" onClick={resetDischargeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tracker' && (<>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 28 }}>
        {patients.filter(p => !p.discharged).map(p => {
          const metCount = Object.values(p.criteria).filter(c => c.met).length
          const total = GRADUATION_CRITERIA.length
          const pct = Math.round((metCount / total) * 100)
          const isExpanded = expandedPatient === p.id
          const readyToGraduate = metCount === total

          return (
            <div key={p.id} className="card" style={{ padding: '20px 22px' }}>
              {/* Patient header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--blue), var(--blue-dk))',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.82rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {p.initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--charcoal)' }}>{p.initials}</div>
                    <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>
                      Pathway {p.pathway} &middot; Day {p.day} &middot; {p.phase}
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
              <div style={{
                width: '100%', height: 6, borderRadius: 3,
                background: 'var(--g200, #e2e8f0)', marginBottom: 14, overflow: 'hidden',
              }}>
                <div style={{
                  width: `${pct}%`, height: '100%', borderRadius: 3,
                  background: readyToGraduate ? '#1A7A4A' : pct >= 50 ? '#D69E2E' : '#E53E3E',
                  transition: 'width .3s ease',
                }} />
              </div>

              {/* Criteria checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {GRADUATION_CRITERIA.map(gc => {
                  const c = p.criteria[gc.key]
                  return (
                    <div
                      key={gc.key}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '8px 10px', borderRadius: 6,
                        background: c.met ? 'rgba(26,122,74,.05)' : 'var(--g50, #f9fafb)',
                        border: `1px solid ${c.met ? 'rgba(26,122,74,.15)' : 'var(--g200, #e2e8f0)'}`,
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
                        background: c.met ? '#1A7A4A' : 'white',
                        border: c.met ? 'none' : '2px solid var(--g300, #cbd5e0)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '.7rem', fontWeight: 700,
                      }}>
                        {c.met && '\u2713'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '.8rem', fontWeight: 600,
                          color: c.met ? '#1A7A4A' : 'var(--charcoal)',
                          textDecoration: c.met ? 'none' : 'none',
                        }}>
                          {gc.label}
                        </div>
                        {isExpanded && (
                          <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 2 }}>
                            {c.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pathway-Specific Aftercare Guidance (Sections 20-22 + SOP-010/015) */}
              {isExpanded && (
                <div style={{ marginTop: 14, padding: 14, background: '#FAFAFE', borderRadius: 8, border: '1px solid #805AD520' }}>
                  <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#805AD5', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    Pathway-Specific Aftercare Plan
                  </div>

                  {/* Step-down pathway */}
                  <div style={{ fontSize: '.78rem', color: 'var(--g700)', marginBottom: 10, padding: '6px 8px', background: '#fff', borderRadius: 6, border: '1px solid var(--g100)' }}>
                    <strong>Step-Down:</strong> {STEP_DOWN_PATHWAYS[p.careLevel || 'residential']?.standard || STEP_DOWN_PATHWAYS.residential.standard}
                  </div>

                  {/* Substance-specific aftercare */}
                  {p.substancePathway && AFTERCARE_BY_SUBSTANCE[p.substancePathway] && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}>{p.substancePathway} Aftercare (Section 20):</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {AFTERCARE_BY_SUBSTANCE[p.substancePathway].map((item, i) => (
                          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: '.76rem', color: 'var(--g600)' }}>
                            <span style={{ color: '#805AD5', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Population-specific aftercare */}
                  {p.populationPathway && p.populationPathway !== 'standard' && AFTERCARE_BY_POPULATION[p.populationPathway] && (
                    <div>
                      <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}>
                        {POPULATION_PATHWAY_LABELS[p.populationPathway] || p.populationPathway} Aftercare (Section 22):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {AFTERCARE_BY_POPULATION[p.populationPathway].map((item, i) => (
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

              {/* Expand / Graduate / Discharge buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  className="btn btn--secondary btn--sm"
                  style={{ flex: 1, fontSize: '.76rem', minWidth: 120 }}
                  onClick={() => setExpandedPatient(isExpanded ? null : p.id)}
                >
                  {isExpanded ? 'Hide Details' : 'Show Details'}
                </button>
                {readyToGraduate && (
                  <button className="btn btn--primary btn--sm" style={{ flex: 1, fontSize: '.76rem', minWidth: 120 }} onClick={() => { setDischargeForm({ type: 'Planned (Graduation)', date: '', notes: '' }); setDischargeChecklist({}); setNonNegotiableChecklist({}); setDischargeModal(p.id) }}>
                    Initiate Graduation
                  </button>
                )}
                {metCount >= 4 && !readyToGraduate && (
                  <button
                    className="btn btn--sm"
                    style={{ flex: 1, fontSize: '.76rem', minWidth: 120, background: '#DD6B2015', color: '#DD6B20', border: '1px solid #DD6B2030', fontWeight: 600 }}
                    onClick={() => setDischargeModal(p.id)}
                  >
                    Initiate Discharge
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

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
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', background: dt.color, flexShrink: 0,
                }} />
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
            <button className="btn btn--primary btn--sm" onClick={() => setShowReadmissionForm(!showReadmissionForm)}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div className="fg">
                  <label className="flabel">Patient Initials *</label>
                  <input className="fi" type="text" maxLength={3} placeholder="e.g. AB" value={readmissionForm.initials} onChange={e => setReadmissionForm(p => ({ ...p, initials: e.target.value.toUpperCase() }))} />
                </div>
                <div className="fg">
                  <label className="flabel">Previous Discharge Type *</label>
                  <select className="fi" value={readmissionForm.previousDischarge} onChange={e => setReadmissionForm(p => ({ ...p, previousDischarge: e.target.value }))}>
                    <option value="">Select...</option>
                    {DISCHARGE_TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="flabel">Previous Discharge Date *</label>
                  <input className="fi" type="date" value={readmissionForm.dischargeDate} onChange={e => setReadmissionForm(p => ({ ...p, dischargeDate: e.target.value }))} />
                </div>
              </div>

              {/* 30-day gap warning for Administrative */}
              {readmissionForm.previousDischarge === 'Administrative (Behavioral)' && readmissionForm.dischargeDate && (
                (() => {
                  const gap = Math.floor((new Date() - new Date(readmissionForm.dischargeDate)) / (1000 * 60 * 60 * 24))
                  return gap < 30 ? (
                    <div style={{
                      padding: '10px 14px', borderRadius: 6, marginBottom: 14,
                      background: 'rgba(221,107,32,.08)', border: '1px solid rgba(221,107,32,.2)',
                      fontSize: '.8rem', color: '#DD6B20', fontWeight: 500,
                    }}>
                      Warning: Only {gap} days since administrative discharge. 30-day minimum required. ({30 - gap} days remaining)
                    </div>
                  ) : null
                })()
              )}

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
                <textarea className="fi" rows={3} value={readmissionForm.notes} onChange={e => setReadmissionForm(p => ({ ...p, notes: e.target.value }))} placeholder="Relapse reflection, URICA score, interview notes..." style={{ resize: 'vertical' }} />
              </div>

              {!allReadmissionCriteriaMet && (
                <p style={{ fontSize: '.76rem', color: '#E53E3E', margin: '0 0 12px' }}>
                  All 6 re-admission criteria must be checked before submitting.
                </p>
              )}

              <button className="btn btn--primary btn--sm" onClick={handleReadmissionSubmit} disabled={!readmissionForm.initials || !readmissionForm.previousDischarge || !readmissionForm.dischargeDate || !allReadmissionCriteriaMet} style={{ opacity: (!readmissionForm.initials || !readmissionForm.previousDischarge || !readmissionForm.dischargeDate || !allReadmissionCriteriaMet) ? 0.5 : 1 }}>
                Submit Re-Admission Request
              </button>
            </div>
          )}

          {/* Re-admission history log */}
          <div className="card" style={{ padding: '18px 22px' }}>
            <h3 style={{ fontSize: '.92rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 14px' }}>
              Re-Admission History
            </h3>
            {readmissionLog.length === 0 ? (
              <p style={{ fontSize: '.82rem', color: 'var(--g500)', margin: 0 }}>No re-admission requests yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--g200, #e2e8f0)' }}>
                      {['ID', 'Initials', 'Previous Discharge', 'Discharged', 'Requested', 'Status', 'Notes'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--g500)', fontSize: '.75rem', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {readmissionLog.map(ra => (
                      <tr key={ra.id} style={{ borderBottom: '1px solid var(--g100, #f0f0f0)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--charcoal)' }}>{ra.id}</td>
                        <td style={{ padding: '8px 10px' }}>{ra.initials}</td>
                        <td style={{ padding: '8px 10px' }}>{ra.previousDischarge}</td>
                        <td style={{ padding: '8px 10px' }}>{ra.dischargeDate}</td>
                        <td style={{ padding: '8px 10px' }}>{ra.requestDate}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            fontSize: '.72rem', padding: '3px 8px', borderRadius: 10, fontWeight: 600,
                            background: ra.status === 'Approved' ? 'rgba(26,122,74,.1)' : ra.status === 'Denied' ? 'rgba(229,62,62,.1)' : 'rgba(214,158,46,.1)',
                            color: ra.status === 'Approved' ? '#1A7A4A' : ra.status === 'Denied' ? '#E53E3E' : '#D69E2E',
                          }}>
                            {ra.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '.75rem', color: 'var(--g500)', maxWidth: 200 }}>{ra.notes}</td>
                      </tr>
                    ))}
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
