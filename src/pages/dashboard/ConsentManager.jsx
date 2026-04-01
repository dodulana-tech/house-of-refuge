import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../utils/paystack'

/*
  Consent Manager — tracks all 7 consent forms per SOP for each patient.
  Bulk view (all patients) and per-patient view toggle.
  Initials only (HIPAA).
*/

const CONSENT_FORMS = [
  { key: 'admission-agreement', label: 'Admission Agreement' },
  { key: 'informed-consent', label: 'Informed Consent for Treatment' },
  { key: 'detox-consent', label: 'Detoxification Consent' },
  { key: 'confidentiality', label: 'Confidentiality Agreement' },
  { key: 'family-confidentiality', label: 'Family Confidentiality (Pathway A)' },
  { key: 'belongings-receipt', label: 'Belongings Receipt' },
  { key: 'financial-agreement', label: 'Financial Agreement' },
  { key: 'rights-charter', label: 'Rights & Responsibilities Charter' },
]

const STATUS_STYLES = {
  signed: { background: 'rgba(26,122,74,.1)', color: '#1A7A4A', label: 'Signed' },
  pending: { background: '#D69E2E15', color: '#D69E2E', label: 'Pending' },
  'not-required': { background: 'var(--g100, #f7fafc)', color: 'var(--g500)', label: 'Not Required' },
}

const PATIENTS = [
  {
    id: 'P001', initials: 'CO', pathway: 'A', day: 23,
    consents: {
      'admission-agreement': 'signed',
      'informed-consent': 'signed',
      'detox-consent': 'signed',
      'confidentiality': 'signed',
      'family-confidentiality': 'signed',
      'belongings-receipt': 'signed',
      'financial-agreement': 'signed',
      'rights-charter': 'pending',
    },
  },
  {
    id: 'P002', initials: 'AN', pathway: 'A', day: 45,
    consents: {
      'admission-agreement': 'signed',
      'informed-consent': 'signed',
      'detox-consent': 'signed',
      'confidentiality': 'signed',
      'family-confidentiality': 'signed',
      'belongings-receipt': 'signed',
      'financial-agreement': 'signed',
      'rights-charter': 'signed',
    },
  },
  {
    id: 'P003', initials: 'KA', pathway: 'B', day: 74,
    consents: {
      'admission-agreement': 'signed',
      'informed-consent': 'signed',
      'detox-consent': 'signed',
      'confidentiality': 'signed',
      'family-confidentiality': 'not-required',
      'belongings-receipt': 'signed',
      'financial-agreement': 'signed',
      'rights-charter': 'signed',
    },
  },
  {
    id: 'P004', initials: 'IM', pathway: 'A', day: 8,
    consents: {
      'admission-agreement': 'signed',
      'informed-consent': 'signed',
      'detox-consent': 'pending',
      'confidentiality': 'signed',
      'family-confidentiality': 'pending',
      'belongings-receipt': 'pending',
      'financial-agreement': 'pending',
      'rights-charter': 'pending',
    },
  },
]

export default function ConsentManager() {
  const { user } = useAuth()
  const [view, setView] = useState('bulk') // 'bulk' | patient id
  const [selectedPatient, setSelectedPatient] = useState(PATIENTS[0].id)
  const [consentOverrides, setConsentOverrides] = useState({})

  const getConsentStatus = (patientId, formKey) => {
    const overrideKey = `${patientId}_${formKey}`
    if (consentOverrides[overrideKey]) return consentOverrides[overrideKey]
    const patient = PATIENTS.find(p => p.id === patientId)
    return patient?.consents[formKey] || 'pending'
  }

  const toggleConsentStatus = (patientId, formKey) => {
    const current = getConsentStatus(patientId, formKey)
    if (current === 'not-required') return
    const next = current === 'pending' ? 'signed' : 'pending'
    setConsentOverrides(prev => ({ ...prev, [`${patientId}_${formKey}`]: next }))
  }

  const totalSigned = PATIENTS.reduce((sum, p) =>
    sum + CONSENT_FORMS.filter(f => getConsentStatus(p.id, f.key) === 'signed').length, 0
  )
  const totalForms = PATIENTS.reduce((sum, p) =>
    sum + CONSENT_FORMS.filter(f => getConsentStatus(p.id, f.key) !== 'not-required').length, 0
  )

  const activePatient = PATIENTS.find(p => p.id === selectedPatient)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Consent Manager</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
          Digital consent tracking &middot; {CONSENT_FORMS.length} forms per patient &middot; {totalSigned}/{totalForms} signed
        </p>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          className={`btn btn--sm ${view === 'bulk' ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => setView('bulk')}
        >
          Bulk View
        </button>
        <button
          className={`btn btn--sm ${view === 'patient' ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => setView('patient')}
        >
          Per-Patient View
        </button>
        {view === 'patient' && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
            {PATIENTS.map(p => (
              <button
                key={p.id}
                className={`btn btn--sm ${selectedPatient === p.id ? 'btn--primary' : 'btn--secondary'}`}
                onClick={() => setSelectedPatient(p.id)}
              >
                {p.initials}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bulk View — grid of all patients */}
      {view === 'bulk' && (
        <div className="card" style={{ padding: '20px 22px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead>
              <tr>
                <th style={thStyle}>Patient</th>
                <th style={thStyle}>Pathway</th>
                <th style={thStyle}>Day</th>
                {CONSENT_FORMS.map(f => (
                  <th key={f.key} style={{ ...thStyle, minWidth: 100 }}>{f.label}</th>
                ))}
                <th style={thStyle}>Completion</th>
              </tr>
            </thead>
            <tbody>
              {PATIENTS.map(p => {
                const signed = CONSENT_FORMS.filter(f => getConsentStatus(p.id, f.key) === 'signed').length
                const applicable = CONSENT_FORMS.filter(f => getConsentStatus(p.id, f.key) !== 'not-required').length
                const pct = applicable > 0 ? Math.round((signed / applicable) * 100) : 0
                return (
                  <tr key={p.id}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--blue), var(--blue-dk))',
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '.7rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {p.initials}
                        </div>
                        <strong>{p.initials}</strong>
                      </div>
                    </td>
                    <td style={tdStyle}>{p.pathway}</td>
                    <td style={tdStyle}>{p.day}</td>
                    {CONSENT_FORMS.map(f => {
                      const status = getConsentStatus(p.id, f.key)
                      const s = STATUS_STYLES[status]
                      const isClickable = status !== 'not-required'
                      return (
                        <td key={f.key} style={tdStyle}>
                          <span
                            onClick={isClickable ? () => toggleConsentStatus(p.id, f.key) : undefined}
                            style={{
                              padding: '3px 8px', borderRadius: 10, fontSize: '.7rem',
                              fontWeight: 600, background: s.background, color: s.color,
                              whiteSpace: 'nowrap',
                              cursor: isClickable ? 'pointer' : 'default',
                              transition: 'opacity .15s',
                            }}
                            title={isClickable ? 'Click to toggle status' : ''}
                            onMouseEnter={e => { if (isClickable) e.target.style.opacity = '0.7' }}
                            onMouseLeave={e => { if (isClickable) e.target.style.opacity = '1' }}
                          >
                            {s.label}
                          </span>
                        </td>
                      )
                    })}
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 60, height: 6, borderRadius: 3,
                          background: 'var(--g200, #e2e8f0)', overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${pct}%`, height: '100%', borderRadius: 3,
                            background: pct === 100 ? '#1A7A4A' : pct >= 50 ? '#D69E2E' : '#E53E3E',
                          }} />
                        </div>
                        <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--g700, #4a5568)' }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Per-Patient View */}
      {view === 'patient' && activePatient && (
        <div>
          <div className="card" style={{ padding: '20px 22px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--blue), var(--blue-dk))',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.9rem', fontWeight: 700, flexShrink: 0,
              }}>
                {activePatient.initials}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--charcoal)' }}>
                  {activePatient.initials}
                </div>
                <div style={{ fontSize: '.8rem', color: 'var(--g500)' }}>
                  Pathway {activePatient.pathway} &middot; Day {activePatient.day}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CONSENT_FORMS.map(f => {
                const status = getConsentStatus(activePatient.id, f.key)
                const s = STATUS_STYLES[status]
                const isClickable = status !== 'not-required'
                return (
                  <div
                    key={f.key}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 16px', borderRadius: 8,
                      background: 'var(--g50, #f9fafb)',
                      border: '1px solid var(--g200, #e2e8f0)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--charcoal)' }}>
                        {f.label}
                      </div>
                    </div>
                    <span
                      onClick={isClickable ? () => toggleConsentStatus(activePatient.id, f.key) : undefined}
                      style={{
                        padding: '4px 12px', borderRadius: 12, fontSize: '.72rem',
                        fontWeight: 700, background: s.background, color: s.color,
                        cursor: isClickable ? 'pointer' : 'default',
                        transition: 'opacity .15s',
                      }}
                      title={isClickable ? 'Click to toggle status' : ''}
                      onMouseEnter={e => { if (isClickable) e.target.style.opacity = '0.7' }}
                      onMouseLeave={e => { if (isClickable) e.target.style.opacity = '1' }}
                    >
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary stats for selected patient */}
          {(() => {
            const signed = CONSENT_FORMS.filter(f => getConsentStatus(activePatient.id, f.key) === 'signed').length
            const pending = CONSENT_FORMS.filter(f => getConsentStatus(activePatient.id, f.key) === 'pending').length
            const nr = CONSENT_FORMS.filter(f => getConsentStatus(activePatient.id, f.key) === 'not-required').length
            return (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div className="card" style={{ padding: '14px 18px', flex: 1, minWidth: 120, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1A7A4A' }}>{signed}</div>
                  <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>Signed</div>
                </div>
                <div className="card" style={{ padding: '14px 18px', flex: 1, minWidth: 120, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#D69E2E' }}>{pending}</div>
                  <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>Pending</div>
                </div>
                <div className="card" style={{ padding: '14px 18px', flex: 1, minWidth: 120, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--g500)' }}>{nr}</div>
                  <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>Not Required</div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

const thStyle = {
  textAlign: 'left', padding: '10px 8px', fontSize: '.74rem',
  fontWeight: 700, color: 'var(--g500)', borderBottom: '2px solid var(--g200, #e2e8f0)',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '10px 8px', borderBottom: '1px solid var(--g200, #e2e8f0)',
  verticalAlign: 'middle',
}
