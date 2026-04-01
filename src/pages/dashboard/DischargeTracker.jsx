import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../utils/paystack'

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

const PATIENTS = [
  {
    id: 'P001', initials: 'CO', pathway: 'A', day: 23, phase: 'Foundation',
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
    id: 'P002', initials: 'AN', pathway: 'A', day: 45, phase: 'Deepening',
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
    id: 'P003', initials: 'KA', pathway: 'B', day: 74, phase: 'Reintegration',
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
    id: 'P004', initials: 'IM', pathway: 'A', day: 8, phase: 'Stabilization',
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

export default function DischargeTracker() {
  const { user } = useAuth()
  const [expandedPatient, setExpandedPatient] = useState(null)
  const [patients, setPatients] = useState(PATIENTS)
  const [dischargeModal, setDischargeModal] = useState(null) // patient id
  const [dischargeForm, setDischargeForm] = useState({
    type: '', date: '', aftercare: '', church: '', alumni: '', safetyPlan: '', harmReduction: '',
  })

  const isAMA = dischargeForm.type === 'Self-Discharge (AMA)'

  const handleDischargeConfirm = () => {
    if (!dischargeForm.type || !dischargeForm.date || !dischargeForm.aftercare || !dischargeForm.church || !dischargeForm.alumni) return
    if (isAMA && (!dischargeForm.safetyPlan || !dischargeForm.harmReduction)) return
    setPatients(prev => prev.map(p => p.id === dischargeModal ? { ...p, discharged: true } : p))
    setDischargeModal(null)
    setDischargeForm({ type: '', date: '', aftercare: '', church: '', alumni: '', safetyPlan: '', harmReduction: '' })
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Discharge Tracker</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
          6 graduation criteria &middot; {patients.filter(p => !p.discharged).length} current residents &middot; All criteria must be met for planned discharge
        </p>
      </div>

      {/* Patient checklist cards */}
      {/* Discharge Modal */}
      {dischargeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="card" style={{ padding: '24px', maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: 16 }}>
              Initiate Discharge — {patients.find(p => p.id === dischargeModal)?.initials}
            </h3>
            <div className="fg" style={{ marginBottom: 12 }}>
              <label className="flabel">Discharge Type *</label>
              <select className="fi" value={dischargeForm.type} onChange={e => setDischargeForm(p => ({ ...p, type: e.target.value }))}>
                <option value="">Select...</option>
                {DISCHARGE_TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="fg" style={{ marginBottom: 12 }}>
              <label className="flabel">Discharge Date *</label>
              <input className="fi" type="date" value={dischargeForm.date} onChange={e => setDischargeForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="fg" style={{ marginBottom: 12 }}>
              <label className="flabel">Aftercare Plan Confirmed *</label>
              <select className="fi" value={dischargeForm.aftercare} onChange={e => setDischargeForm(p => ({ ...p, aftercare: e.target.value }))}>
                <option value="">Select...</option>
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
            <div className="fg" style={{ marginBottom: 12 }}>
              <label className="flabel">Church Placement Confirmed *</label>
              <select className="fi" value={dischargeForm.church} onChange={e => setDischargeForm(p => ({ ...p, church: e.target.value }))}>
                <option value="">Select...</option>
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
            <div className="fg" style={{ marginBottom: 12 }}>
              <label className="flabel">Alumni Programme Enrolled *</label>
              <select className="fi" value={dischargeForm.alumni} onChange={e => setDischargeForm(p => ({ ...p, alumni: e.target.value }))}>
                <option value="">Select...</option>
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
            {isAMA && (
              <>
                <div className="fg" style={{ marginBottom: 12 }}>
                  <label className="flabel">Safety Plan Provided *</label>
                  <select className="fi" value={dischargeForm.safetyPlan} onChange={e => setDischargeForm(p => ({ ...p, safetyPlan: e.target.value }))}>
                    <option value="">Select...</option>
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </div>
                <div className="fg" style={{ marginBottom: 12 }}>
                  <label className="flabel">Harm Reduction Info Provided *</label>
                  <select className="fi" value={dischargeForm.harmReduction} onChange={e => setDischargeForm(p => ({ ...p, harmReduction: e.target.value }))}>
                    <option value="">Select...</option>
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn--primary btn--sm" onClick={handleDischargeConfirm}>Confirm Discharge</button>
              <button className="btn btn--secondary btn--sm" onClick={() => { setDischargeModal(null); setDischargeForm({ type: '', date: '', aftercare: '', church: '', alumni: '', safetyPlan: '', harmReduction: '' }) }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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
                  <button className="btn btn--primary btn--sm" style={{ flex: 1, fontSize: '.76rem', minWidth: 120 }} onClick={() => { setDischargeForm(prev => ({ ...prev, type: 'Planned (Graduation)' })); setDischargeModal(p.id) }}>
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
        {DISCHARGE_TYPES.map(dt => (
          <div key={dt.key} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', background: dt.color, flexShrink: 0,
              }} />
              <h3 style={{ fontSize: '.88rem', fontWeight: 700, color: dt.color, margin: 0 }}>
                {dt.label}
              </h3>
            </div>
            <p style={{ fontSize: '.8rem', color: 'var(--g700, #4a5568)', margin: 0, lineHeight: 1.5 }}>
              {dt.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
