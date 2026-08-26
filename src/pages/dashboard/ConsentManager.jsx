import React, { useEffect, useState } from 'react'
import { isSupabaseReady, getPatients, getConsents, upsertConsent } from '../../utils/supabase'
import { activeBriefs } from '../../utils/patients'
import { requireFields } from '../../utils/formGuard'

/*
  Consent Manager — tracks the consent forms per SOP for each patient.
  Live data: one `consents` row per (patient_id, consent_type). Types with no
  row show as "Not recorded" — status is never fabricated.
  Initials only (HIPAA).
*/

// Static catalog of consent types + descriptions (unchanged).
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
  pending: { background: '#D69E2E15', color: '#D69E2E', label: 'Recorded' },
  'not-recorded': { background: 'var(--g100, #f7fafc)', color: 'var(--g500)', label: 'Not recorded' },
}

export default function ConsentManager() {
  const ready = isSupabaseReady()
  const [patients, setPatients] = useState([]) // [{ id, initials, full_name }]
  const [selectedPatient, setSelectedPatient] = useState('')
  const [consentMap, setConsentMap] = useState({}) // consent_type -> row
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [loadingConsents, setLoadingConsents] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load active patients for the selector.
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoadingPatients(true)
      const { data, error } = await getPatients()
      if (!alive) return
      if (error) {
        console.error('Failed to load patients', error)
        setPatients([])
      } else {
        const briefs = activeBriefs(data)
        setPatients(briefs)
        setSelectedPatient(prev => prev || briefs[0]?.id || '')
      }
      setLoadingPatients(false)
    })()
    return () => { alive = false }
  }, [])

  // Load consents for the selected patient.
  const loadConsents = async (patientId) => {
    if (!patientId) { setConsentMap({}); return }
    setLoadingConsents(true)
    const { data, error } = await getConsents(patientId)
    if (error) {
      console.error('Failed to load consents', error)
      setConsentMap({})
    } else {
      const map = {}
      for (const row of data || []) map[row.consent_type] = row
      setConsentMap(map)
    }
    setLoadingConsents(false)
  }

  useEffect(() => {
    loadConsents(selectedPatient)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient])

  const statusFor = (formKey) => {
    const row = consentMap[formKey]
    if (!row) return 'not-recorded'
    return row.granted ? 'signed' : 'pending'
  }

  const toggleConsent = async (formKey) => {
    if (saving) return
    if (!requireFields([[selectedPatient, 'Patient']])) return
    const currentlyGranted = statusFor(formKey) === 'signed'
    const granted = !currentlyGranted
    setSaving(true)
    const { error } = await upsertConsent(
      selectedPatient,
      formKey,
      { granted, signed_date: granted ? new Date().toISOString().slice(0, 10) : null },
      'SN',
    )
    if (error) {
      alert(`Could not update consent: ${error.message || 'unknown error'}`)
    } else {
      await loadConsents(selectedPatient)
    }
    setSaving(false)
  }

  const activePatient = patients.find(p => p.id === selectedPatient)
  const signedCount = CONSENT_FORMS.filter(f => statusFor(f.key) === 'signed').length
  const recordedCount = CONSENT_FORMS.filter(f => statusFor(f.key) === 'pending').length
  const missingCount = CONSENT_FORMS.filter(f => statusFor(f.key) === 'not-recorded').length

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Consent Manager</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
          Digital consent tracking &middot; {CONSENT_FORMS.length} forms per patient
          {activePatient && ` · ${signedCount}/${CONSENT_FORMS.length} signed`}
        </p>
      </div>

      {!ready && (
        <div className="card" style={{ padding: '20px 22px', marginBottom: 16 }}>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
            Supabase is not configured. Consent records are unavailable.
          </p>
        </div>
      )}

      {/* Patient selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <label style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--g700, #4a5568)' }}>
          Patient
        </label>
        <select
          value={selectedPatient}
          onChange={e => setSelectedPatient(e.target.value)}
          disabled={loadingPatients || patients.length === 0}
          style={{
            padding: '8px 12px', borderRadius: 8, fontSize: '.85rem',
            border: '1px solid var(--g200, #e2e8f0)', minWidth: 160,
          }}
        >
          {patients.length === 0 && <option value="">No active patients</option>}
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.initials}</option>
          ))}
        </select>
      </div>

      {/* Loading / empty states */}
      {loadingPatients ? (
        <div className="card" style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Loading patients…</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="card" style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>No active patients to display.</p>
        </div>
      ) : !activePatient ? null : (
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
                  {loadingConsents ? 'Loading consents…' : `${signedCount} of ${CONSENT_FORMS.length} signed`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CONSENT_FORMS.map(f => {
                const status = statusFor(f.key)
                const s = STATUS_STYLES[status]
                const row = consentMap[f.key]
                const granted = status === 'signed'
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
                      {row?.signed_date && (
                        <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 2 }}>
                          Signed {row.signed_date}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          padding: '4px 12px', borderRadius: 12, fontSize: '.72rem',
                          fontWeight: 700, background: s.background, color: s.color,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.label}
                      </span>
                      <button
                        className={`btn btn--sm ${granted ? 'btn--secondary' : 'btn--primary'}`}
                        onClick={() => toggleConsent(f.key)}
                        disabled={saving || loadingConsents}
                      >
                        {granted ? 'Revoke' : 'Grant'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary stats for selected patient */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="card" style={{ padding: '14px 18px', flex: 1, minWidth: 120, textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1A7A4A' }}>{signedCount}</div>
              <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>Signed</div>
            </div>
            <div className="card" style={{ padding: '14px 18px', flex: 1, minWidth: 120, textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#D69E2E' }}>{recordedCount}</div>
              <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>Recorded</div>
            </div>
            <div className="card" style={{ padding: '14px 18px', flex: 1, minWidth: 120, textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--g500)' }}>{missingCount}</div>
              <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>Not recorded</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
