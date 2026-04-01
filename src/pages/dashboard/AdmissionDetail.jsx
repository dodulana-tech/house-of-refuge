import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../utils/paystack'

/*
  Admission Detail — full view of a single application (APP001)
  Visible to admin when clicking an application in the pipeline.
  Uses initials only (HIPAA). 8-step pipeline stepper.
*/

const PIPELINE_STEPS = [
  { key: 'initial-contact', label: 'Initial Contact' },
  { key: 'pre-screening', label: 'Pre-Screening' },
  { key: 'clinical-assessment', label: 'Clinical Assessment' },
  { key: 'admission-decision', label: 'Admission Decision' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'intake', label: 'Intake' },
  { key: 'treatment-planning', label: 'Treatment Planning' },
  { key: 'admitted', label: 'Admitted' },
]

const MOCK_APP = {
  id: 'APP001',
  initials: 'TB',
  pathway: 'A',
  substance: 'Cocaine',
  substanceDuration: '4 years',
  frequency: 'Daily',
  route: 'Intranasal',
  insight: 'contemplation',
  status: 'pre-screening',
  depositPaid: true,
  depositAmount: 1000000,
  dateApplied: '2026-03-28',
  mentalHealth: 'Moderate anxiety, mild depression',
  suicideRisk: 'Low — no active ideation, no prior attempts',
  exclusionScreening: 'Cleared — no acute psychosis, no active seizure disorder, no violent behavior',
  stageOfChange: 'Contemplation',
  motivation: 'Self-referred, expresses desire to change but ambivalent',
  voluntary: true,
  treatmentGoals: 'Achieve sustained abstinence, restore family relationships, develop vocational skills',
  twelveWeekCommitment: true,
  familyAwareness: 'Yes — family supportive and involved',
  pfspDetails: 'Spouse enrolled in PFSP; two sessions completed',
  household: '4-member household — spouse, 2 children',
  enablers: 'Identified: peer group, nightlife environment',
  aftercareHousing: 'Return to family home — safe environment confirmed',
}

const insightColors = {
  denial: '#E53E3E',
  precontemplation: '#DD6B20',
  contemplation: '#D69E2E',
  preparation: '#38A169',
  action: '#2B6CB0',
}

export default function AdmissionDetail() {
  const { user } = useAuth()
  const [app] = useState(MOCK_APP)
  const [confirm, setConfirm] = useState(null)

  const currentStepIdx = PIPELINE_STEPS.findIndex(s => s.key === app.status)

  const handleAction = (action) => {
    setConfirm(action)
  }

  const confirmAction = () => {
    // In production this would call supabase/API
    setConfirm(null)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--blue), var(--blue-dk))',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 700, flexShrink: 0,
          }}>
            {app.initials}
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 2 }}>
              Application {app.id}
            </h1>
            <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
              Initials: <strong>{app.initials}</strong> &middot; Applied: {new Date(app.dateApplied).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <span style={{ padding: '4px 12px', borderRadius: 14, fontSize: '.74rem', fontWeight: 700, background: '#DD6B2015', color: '#DD6B20' }}>
            {PIPELINE_STEPS.find(s => s.key === app.status)?.label || app.status}
          </span>
          <span style={{ padding: '4px 12px', borderRadius: 14, fontSize: '.74rem', fontWeight: 700, background: 'rgba(26,95,173,.08)', color: 'var(--blue)' }}>
            Pathway {app.pathway}
          </span>
          {app.depositPaid && (
            <span style={{ padding: '4px 12px', borderRadius: 14, fontSize: '.74rem', fontWeight: 700, background: 'rgba(26,122,74,.1)', color: '#1A7A4A' }}>
              Deposit: {fmt(app.depositAmount)} Paid
            </span>
          )}
        </div>
      </div>

      {/* 8-Step Pipeline Progress */}
      <div className="card" style={{ padding: '22px 24px', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 16, color: 'var(--charcoal)' }}>
          8-Step Admission Pipeline
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
          {PIPELINE_STEPS.map((step, i) => {
            const isCompleted = i < currentStepIdx
            const isCurrent = i === currentStepIdx
            const isFuture = i > currentStepIdx
            return (
              <React.Fragment key={step.key}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90, flex: 1 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: isCompleted ? '#1A7A4A' : isCurrent ? 'var(--blue)' : 'var(--g200, #e2e8f0)',
                    color: isCompleted || isCurrent ? 'white' : 'var(--g500)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.75rem', fontWeight: 700, flexShrink: 0,
                    border: isCurrent ? '3px solid rgba(26,95,173,.3)' : 'none',
                    boxSizing: 'border-box',
                  }}>
                    {isCompleted ? '\u2713' : i + 1}
                  </div>
                  <span style={{
                    fontSize: '.68rem', marginTop: 6, textAlign: 'center',
                    color: isCurrent ? 'var(--blue)' : isCompleted ? '#1A7A4A' : 'var(--g500)',
                    fontWeight: isCurrent ? 700 : 400,
                  }}>
                    {step.label}
                  </span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div style={{
                    flex: '0 0 auto', width: 24, height: 2, marginTop: -16,
                    background: i < currentStepIdx ? '#1A7A4A' : 'var(--g200, #e2e8f0)',
                  }} />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Clinical Summary */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14, color: 'var(--charcoal)' }}>
            Clinical Summary
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '.85rem', color: 'var(--g700, #4a5568)' }}>
            <div><span style={{ color: 'var(--g500)' }}>Substance:</span> <strong>{app.substance}</strong></div>
            <div><span style={{ color: 'var(--g500)' }}>Duration:</span> <strong>{app.substanceDuration}</strong></div>
            <div><span style={{ color: 'var(--g500)' }}>Frequency:</span> <strong>{app.frequency}</strong></div>
            <div><span style={{ color: 'var(--g500)' }}>Route:</span> <strong>{app.route}</strong></div>
            <div style={{ borderTop: '1px solid var(--g200, #e2e8f0)', paddingTop: 10 }}>
              <span style={{ color: 'var(--g500)' }}>Mental Health:</span> <strong>{app.mentalHealth}</strong>
            </div>
            <div><span style={{ color: 'var(--g500)' }}>Suicide Risk:</span> <strong>{app.suicideRisk}</strong></div>
            <div><span style={{ color: 'var(--g500)' }}>Exclusion Screening:</span> <strong>{app.exclusionScreening}</strong></div>
          </div>
        </div>

        {/* Insight & Readiness */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14, color: 'var(--charcoal)' }}>
            Insight & Readiness
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '.85rem', color: 'var(--g700, #4a5568)' }}>
            <div>
              <span style={{ color: 'var(--g500)' }}>Stage of Change:</span>{' '}
              <strong style={{ color: insightColors[app.insight] || 'var(--g500)' }}>{app.stageOfChange}</strong>
            </div>
            <div><span style={{ color: 'var(--g500)' }}>Motivation:</span> <strong>{app.motivation}</strong></div>
            <div>
              <span style={{ color: 'var(--g500)' }}>Voluntary:</span>{' '}
              <strong style={{ color: app.voluntary ? '#1A7A4A' : '#E53E3E' }}>{app.voluntary ? 'Yes' : 'No'}</strong>
            </div>
            <div style={{ borderTop: '1px solid var(--g200, #e2e8f0)', paddingTop: 10 }}>
              <span style={{ color: 'var(--g500)' }}>Treatment Goals:</span> <strong>{app.treatmentGoals}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--g500)' }}>12-Week Commitment:</span>{' '}
              <strong style={{ color: app.twelveWeekCommitment ? '#1A7A4A' : '#E53E3E' }}>
                {app.twelveWeekCommitment ? 'Confirmed' : 'Not Confirmed'}
              </strong>
            </div>
          </div>
        </div>

        {/* Support & Family */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14, color: 'var(--charcoal)' }}>
            Support & Family
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '.85rem', color: 'var(--g700, #4a5568)' }}>
            <div><span style={{ color: 'var(--g500)' }}>Family Awareness:</span> <strong>{app.familyAwareness}</strong></div>
            <div><span style={{ color: 'var(--g500)' }}>PFSP Details:</span> <strong>{app.pfspDetails}</strong></div>
            <div><span style={{ color: 'var(--g500)' }}>Household:</span> <strong>{app.household}</strong></div>
            <div style={{ borderTop: '1px solid var(--g200, #e2e8f0)', paddingTop: 10 }}>
              <span style={{ color: 'var(--g500)' }}>Enablers Identified:</span> <strong>{app.enablers}</strong>
            </div>
            <div><span style={{ color: 'var(--g500)' }}>Aftercare Housing:</span> <strong>{app.aftercareHousing}</strong></div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card" style={{ padding: '20px 22px' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14, color: 'var(--charcoal)' }}>
          Actions
        </h2>
        {confirm ? (
          <div style={{ padding: 16, background: 'var(--g100, #f7fafc)', borderRadius: 8 }}>
            <p style={{ fontSize: '.88rem', marginBottom: 12, color: 'var(--charcoal)' }}>
              <strong>Confirm:</strong> Are you sure you want to <strong>{confirm}</strong> application {app.id} ({app.initials})?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--primary btn--sm" onClick={confirmAction}>
                Yes, {confirm}
              </button>
              <button className="btn btn--secondary btn--sm" onClick={() => setConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn--primary btn--sm" onClick={() => handleAction('Advance to Next Stage')}>
              Advance to Next Stage
            </button>
            <button className="btn btn--secondary btn--sm" onClick={() => handleAction('Refer to Outpatient')}>
              Refer to Outpatient
            </button>
            <button
              className="btn btn--sm"
              style={{ background: '#D69E2E15', color: '#D69E2E', border: '1px solid #D69E2E30', fontWeight: 600 }}
              onClick={() => handleAction('Defer')}
            >
              Defer
            </button>
            <button
              className="btn btn--sm"
              style={{ background: '#E53E3E12', color: '#E53E3E', border: '1px solid #E53E3E30', fontWeight: 600 }}
              onClick={() => handleAction('Decline')}
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
