import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useNotif } from '../App'
import {
  INCOME_BANDS,
  validateDocument,
  uploadFADocument,
  submitFinancialAssistance,
} from '../utils/financialAssistance'
import styles from './FinancialAssistanceApply.module.css'

const INITIAL = {
  applicant_name: '',
  applicant_phone: '',
  applicant_email: '',
  applicant_relationship: '',
  patient_name: '',
  patient_age: '',
  patient_gender: '',
  patient_substance: '',
  patient_substance_duration: '',
  patient_prior_treatment: '',
  patient_willingness: '',
  household_size: '',
  monthly_income_band: '',
  dependants: '',
  prior_medical_bills_estimate: '',
  financial_situation_narrative: '',
  pastoral_referrer_name: '',
  pastoral_referrer_org: '',
  pastoral_referrer_phone: '',
  pastoral_referrer_email: '',
  pastoral_referrer_relationship: '',
  consent_share_with_foundation: false,
  consent_accuracy: false,
}

export default function FinancialAssistanceApply() {
  const nav = useNavigate()
  const notify = useNotif()
  const [f, setF] = useState(INITIAL)
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleFiles = async (files) => {
    if (!f.applicant_email) {
      setError('Enter your email before uploading documents.')
      return
    }
    setError('')
    setUploading(true)
    for (const file of files) {
      const v = validateDocument(file)
      if (!v.ok) {
        setError(v.error)
        continue
      }
      const { data, error } = await uploadFADocument(file, f.applicant_email)
      if (error) {
        setError(`Upload failed: ${error.message || error}`)
        continue
      }
      setDocs(prev => [...prev, data])
    }
    setUploading(false)
  }

  const removeDoc = (idx) => {
    setDocs(prev => prev.filter((_, i) => i !== idx))
  }

  const validate = () => {
    const required = [
      ['applicant_name', 'Applicant name'],
      ['applicant_phone', 'Applicant phone'],
      ['applicant_email', 'Applicant email'],
      ['applicant_relationship', 'Relationship to patient'],
      ['patient_name', 'Patient name'],
      ['patient_substance', 'Primary substance'],
      ['patient_willingness', "Patient's willingness"],
      ['monthly_income_band', 'Monthly income band'],
      ['financial_situation_narrative', 'Financial situation summary'],
      ['pastoral_referrer_name', 'Pastoral / community referrer name'],
      ['pastoral_referrer_org', 'Referrer organisation'],
      ['pastoral_referrer_phone', 'Referrer phone'],
    ]
    for (const [k, label] of required) {
      if (!f[k] || !String(f[k]).trim()) return `${label} is required.`
    }
    if (!/^\S+@\S+\.\S+$/.test(f.applicant_email)) return 'Enter a valid applicant email.'
    if (!f.consent_share_with_foundation || !f.consent_accuracy) return 'Please confirm both consent statements.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const v = validate()
    if (v) {
      setError(v)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSubmitting(true)
    const payload = {
      applicant_name: f.applicant_name.trim(),
      applicant_phone: f.applicant_phone.trim(),
      applicant_email: f.applicant_email.trim().toLowerCase(),
      applicant_relationship: f.applicant_relationship.trim(),
      patient_name: f.patient_name.trim(),
      patient_age: f.patient_age ? parseInt(f.patient_age, 10) : null,
      patient_gender: f.patient_gender || null,
      patient_substance: f.patient_substance.trim(),
      patient_substance_duration: f.patient_substance_duration.trim() || null,
      patient_prior_treatment: f.patient_prior_treatment.trim() || null,
      patient_willingness: f.patient_willingness,
      household_size: f.household_size ? parseInt(f.household_size, 10) : null,
      monthly_income_band: f.monthly_income_band,
      dependants: f.dependants ? parseInt(f.dependants, 10) : null,
      prior_medical_bills_estimate: f.prior_medical_bills_estimate.trim() || null,
      financial_situation_narrative: f.financial_situation_narrative.trim(),
      pastoral_referrer_name: f.pastoral_referrer_name.trim(),
      pastoral_referrer_org: f.pastoral_referrer_org.trim(),
      pastoral_referrer_phone: f.pastoral_referrer_phone.trim(),
      pastoral_referrer_email: f.pastoral_referrer_email.trim().toLowerCase() || null,
      pastoral_referrer_relationship: f.pastoral_referrer_relationship.trim() || null,
      documents: docs,
    }
    const { data, error } = await submitFinancialAssistance(payload)
    setSubmitting(false)
    if (error) {
      setError(`Submission failed: ${error.message || error}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    notify?.('Application submitted', `Reference: ${data.reference_code}`, 'success')
    nav(`/assistance/submitted/${data.reference_code}`, { replace: true })
  }

  return (
    <>
      <Helmet>
        <title>Apply for Financial Assistance | House of Refuge</title>
      </Helmet>

      <div className="ph">
        <div className="container">
          <div className="ph__badge"><span className="badge">Need-based admission</span></div>
          <h1>Financial Support Form.</h1>
          <p>Routed in confidence to the Freedom Foundation Financial Assistance Committee.</p>
        </div>
      </div>

      <section className="section">
        <div className={`container ${styles.formWrap}`}>
          {error && (
            <div className={styles.errorBar}>
              <strong>Please fix:</strong> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionNum}>01</div>
                <div>
                  <h3 className={styles.sectionTitle}>About you (the applicant)</h3>
                  <p className={styles.sectionLead}>The person submitting this form. May be the patient or a family member acting on their behalf.</p>
                </div>
              </div>
              <div className={styles.grid2}>
                <Field label="Full name" required value={f.applicant_name} onChange={v => set('applicant_name', v)} />
                <Field label="Phone" required value={f.applicant_phone} onChange={v => set('applicant_phone', v)} placeholder="08012345678" />
                <Field label="Email" required type="email" value={f.applicant_email} onChange={v => set('applicant_email', v)} />
                <Field label="Your relationship to the patient" required value={f.applicant_relationship} onChange={v => set('applicant_relationship', v)} placeholder="Parent, spouse, sibling, self…" />
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionNum}>02</div>
                <div>
                  <h3 className={styles.sectionTitle}>About the patient</h3>
                  <p className={styles.sectionLead}>The person seeking treatment. Their willingness is the most important factor in clinical eligibility.</p>
                </div>
              </div>
              <div className={styles.grid2}>
                <Field label="Patient's full name" required value={f.patient_name} onChange={v => set('patient_name', v)} />
                <Field label="Age" type="number" value={f.patient_age} onChange={v => set('patient_age', v)} />
                <Select label="Gender" value={f.patient_gender} onChange={v => set('patient_gender', v)} options={['Male', 'Female']} />
                <Field label="Primary substance(s) of use" required value={f.patient_substance} onChange={v => set('patient_substance', v)} placeholder="Alcohol, cannabis, codeine, etc." />
                <Field label="How long has the substance use been ongoing?" value={f.patient_substance_duration} onChange={v => set('patient_substance_duration', v)} placeholder="e.g. ~3 years" />
                <Select label="Has the patient sought treatment before?" value={f.patient_prior_treatment} onChange={v => set('patient_prior_treatment', v)} options={['No', 'Yes — informally', 'Yes — formally (rehab/clinic)']} />
                <Select label="Is the patient willing to begin treatment?" required value={f.patient_willingness} onChange={v => set('patient_willingness', v)} options={['Yes, actively', 'Yes, with reservations', 'Unsure', 'No — currently unwilling']} />
              </div>
              <p className={styles.helpText}>If the patient is not yet willing, an application can still be reviewed — but treatment cannot begin without voluntary consent. We may suggest an Outpatient Engagement Pathway instead.</p>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionNum}>03</div>
                <div>
                  <h3 className={styles.sectionTitle}>Financial context</h3>
                  <p className={styles.sectionLead}>Reviewed only by the Freedom Foundation Financial Assistance Committee. Not visible to HOR clinical staff.</p>
                </div>
              </div>
              <div className={styles.grid2}>
                <Field label="Household size (people living with patient)" type="number" value={f.household_size} onChange={v => set('household_size', v)} />
                <Field label="Number of dependants in the household" type="number" value={f.dependants} onChange={v => set('dependants', v)} />
                <SelectFull label="Monthly household income band" required value={f.monthly_income_band} onChange={v => set('monthly_income_band', v)} options={INCOME_BANDS} />
                <Field label="Estimate of medical bills already incurred (NGN)" value={f.prior_medical_bills_estimate} onChange={v => set('prior_medical_bills_estimate', v)} placeholder="Optional — approximate" />
              </div>
              <TextArea label="A short note on the family's financial situation" required value={f.financial_situation_narrative} onChange={v => set('financial_situation_narrative', v)} rows={4} placeholder="In your own words: what makes the standard programme fee out of reach? Any context the Committee should understand?" />
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionNum}>04</div>
                <div>
                  <h3 className={styles.sectionTitle}>Pastoral or community referrer</h3>
                  <p className={styles.sectionLead}>A pastor, NGO, or recognised community body who knows the family and is willing to vouch for the application.</p>
                </div>
              </div>
              <div className={styles.grid2}>
                <Field label="Referrer's full name" required value={f.pastoral_referrer_name} onChange={v => set('pastoral_referrer_name', v)} />
                <Field label="Organisation / church / NGO" required value={f.pastoral_referrer_org} onChange={v => set('pastoral_referrer_org', v)} />
                <Field label="Referrer phone" required value={f.pastoral_referrer_phone} onChange={v => set('pastoral_referrer_phone', v)} />
                <Field label="Referrer email" type="email" value={f.pastoral_referrer_email} onChange={v => set('pastoral_referrer_email', v)} />
                <Field label="Referrer's relationship to the family" value={f.pastoral_referrer_relationship} onChange={v => set('pastoral_referrer_relationship', v)} placeholder="Pastor, social worker, community leader…" />
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionNum}>05</div>
                <div>
                  <h3 className={styles.sectionTitle}>Supporting documents</h3>
                  <p className={styles.sectionLead}>PDF, JPG, or PNG — up to 10MB each. Optional, but strongly recommended: pastoral letter, income documentation, recent medical bills.</p>
                </div>
              </div>
              <div className={styles.dropArea}>
                <input
                  type="file"
                  id="fa-files"
                  multiple
                  accept=".pdf,application/pdf,image/jpeg,image/png,image/jpg"
                  onChange={(e) => handleFiles(Array.from(e.target.files || []))}
                  style={{ display: 'none' }}
                />
                <label htmlFor="fa-files" className={styles.dropLabel}>
                  {uploading ? 'Uploading…' : 'Click to choose files'}
                  <div className={styles.dropHelp}>PDF, JPG, PNG · up to 10MB each</div>
                </label>
              </div>
              {docs.length > 0 && (
                <ul className={styles.docList}>
                  {docs.map((d, i) => (
                    <li key={d.path} className={styles.docItem}>
                      <span className={styles.docName}>{d.name}</span>
                      <span className={styles.docSize}>{(d.size / 1024).toFixed(0)} KB</span>
                      <button type="button" className={styles.docRemove} onClick={() => removeDoc(i)}>Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionNum}>06</div>
                <div>
                  <h3 className={styles.sectionTitle}>Consent &amp; submission</h3>
                  <p className={styles.sectionLead}>Both checkboxes are required for review.</p>
                </div>
              </div>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={f.consent_share_with_foundation} onChange={e => set('consent_share_with_foundation', e.target.checked)} />
                <span>I consent to my financial information being shared with the Freedom Foundation Financial Assistance Committee for the purposes of reviewing this application. I understand HOR's clinical team will not see financial details.</span>
              </label>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={f.consent_accuracy} onChange={e => set('consent_accuracy', e.target.checked)} />
                <span>I confirm that the information provided is accurate to the best of my knowledge. Misrepresentation may invalidate the application.</span>
              </label>
            </div>

            <div className={styles.submitRow}>
              <button type="submit" className="btn btn--primary" disabled={submitting || uploading}>
                {submitting ? 'Submitting…' : 'Submit application'}
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => nav('/assistance')} disabled={submitting}>Back to overview</button>
            </div>
          </form>
        </div>
      </section>
    </>
  )
}

function Field({ label, required, type = 'text', value, onChange, placeholder }) {
  return (
    <div className={styles.fg}>
      <label className={styles.flabel}>{label}{required && <span className={styles.req}> *</span>}</label>
      <input className={styles.fi} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function TextArea({ label, required, value, onChange, rows = 3, placeholder }) {
  return (
    <div className={styles.fg} style={{ marginTop: 14 }}>
      <label className={styles.flabel}>{label}{required && <span className={styles.req}> *</span>}</label>
      <textarea className={styles.fi} rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function Select({ label, required, value, onChange, options }) {
  return (
    <div className={styles.fg}>
      <label className={styles.flabel}>{label}{required && <span className={styles.req}> *</span>}</label>
      <select className={styles.fi} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function SelectFull({ label, required, value, onChange, options }) {
  return (
    <div className={styles.fg}>
      <label className={styles.flabel}>{label}{required && <span className={styles.req}> *</span>}</label>
      <select className={styles.fi} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select…</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
