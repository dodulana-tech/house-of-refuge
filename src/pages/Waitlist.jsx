import React, { useState, useEffect } from 'react'
import { useNotif } from '../App'
import { pay, ref, fmt } from '../utils/paystack'
import { saveApplication } from '../utils/store'
import { submitApplication, isSupabaseReady } from '../utils/supabase'
import styles from './Waitlist.module.css'

const DRAFT_KEY = 'hor_apply_draft'

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveDraft(step, form) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, form })) } catch {}
}

function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY) } catch {}
}

const STEPS = [
  { key: 1, label: 'Pathway & Willingness' },
  { key: 2, label: 'Patient Info' },
  { key: 3, label: 'Clinical History' },
  { key: 4, label: 'Insight & Readiness' },
  { key: 5, label: 'Support & Family' },
  { key: 6, label: 'Next of Kin' },
  { key: 7, label: 'Review & Pay' },
]

const INITIAL = {
  // Pathway & Willingness
  pathway: '', willingnessConfirm: '', seekingVoluntarily: '',
  // Patient info
  fn: '', ln: '', dob: '', gender: '', phone: '', email: '', state: '', address: '', occupation: '', maritalStatus: '',
  // Clinical
  substance: '', substanceOther: '', duration: '', frequency: '', routeOfUse: '',
  coSubstances: '', abstinenceDuration: '', prevTx: '', prevTxDetails: '', medConditions: '', medications: '',
  mentalHealth: '', suicideHistory: '',
  // Exclusion screening
  activePsychosis: 'no', antipsychoticNeed: 'no', severeCognitive: 'no', legalDetention: 'no', childrenCohabitation: 'no',
  // Insight & Readiness
  insightLevel: '', motivationSource: '', treatmentGoals: '',
  changeReadiness: '', triggerAwareness: '', previousRecoveryLength: '',
  // Support & Family
  familyAwareness: '', familySupport: '', primaryCaregiver: '', caregiverPhone: '', caregiverRelationship: '',
  householdType: '', dependents: '', enablersPresent: '', supportGroupAccess: '',
  familyTherapyWilling: '', financialStability: '', housingAftercare: '',
  // Pathway A specifics
  pfspName: '', pfspPhone: '', pfspRelationship: '', familyConsentGiven: '',
  // Pathway B specifics
  sponsorType: '', communityPartner: '', churchConnection: '',
  // Next of kin
  nokName: '', nokRel: '', nokPhone: '', nokEmail: '', nokAddress: '',
  // Referral
  referral: '', referralDetails: '',
  // Consent acknowledgements
  consentAdmission: false, consentDetox: false, consentConfidentiality: false, consentRights: false, consentFinancial: false,
}

const INSIGHT_LEVELS = [
  { value: 'denial', label: 'Denial', desc: 'Does not believe there is a problem' },
  { value: 'precontemplation', label: 'Pre-contemplation', desc: 'Aware of problem but not considering change' },
  { value: 'contemplation', label: 'Contemplation', desc: 'Thinking about making changes' },
  { value: 'preparation', label: 'Preparation', desc: 'Actively planning to change' },
  { value: 'action', label: 'Action', desc: 'Currently taking steps toward recovery' },
]

const EXCLUSIONS = [
  { key: 'activePsychosis', label: 'Active psychosis or drug-induced psychosis', referral: 'Referral to Yaba Psychiatric Hospital or nearest psychiatric facility' },
  { key: 'antipsychoticNeed', label: 'Requires initiation/titration of antipsychotic medication', referral: 'Referral to psychiatrist; re-assessment upon stabilization' },
  { key: 'severeCognitive', label: 'Severe cognitive impairment (cannot participate in group therapy)', referral: 'Referral to neurological or cognitive rehabilitation specialist' },
  { key: 'legalDetention', label: 'Currently under court order or legal detention', referral: 'Liaise with legal authority; offer outpatient engagement' },
  { key: 'childrenCohabitation', label: 'Requires children or family to live on-site', referral: 'Refer to family-inclusive outpatient services' },
]

// Substance intelligence maps
const SUBSTANCE_ROUTES = {
  'Alcohol': ['Oral'],
  'Cannabis / Marijuana': ['Smoking / Inhalation', 'Oral'],
  'Heroin / Opioids': ['Injection', 'Smoking / Inhalation', 'Nasal / Snorting'],
  'Cocaine / Crack': ['Nasal / Snorting', 'Smoking / Inhalation', 'Injection'],
  'Tramadol / Codeine': ['Oral'],
  'Methamphetamine': ['Smoking / Inhalation', 'Nasal / Snorting', 'Injection'],
  'Codeine Syrup': ['Oral'],
  'Prescription sedatives': ['Oral'],
  'Inhalants / Solvents': ['Smoking / Inhalation'],
}

const SUBSTANCE_CO_USE = {
  'Alcohol': ['Cannabis', 'Tramadol', 'Codeine syrup', 'Benzodiazepines'],
  'Cannabis / Marijuana': ['Alcohol', 'Codeine syrup', 'Tramadol'],
  'Heroin / Opioids': ['Cannabis', 'Alcohol', 'Benzodiazepines', 'Cocaine'],
  'Cocaine / Crack': ['Alcohol', 'Cannabis', 'Heroin', 'Benzodiazepines'],
  'Tramadol / Codeine': ['Alcohol', 'Cannabis', 'Codeine syrup'],
  'Methamphetamine': ['Cannabis', 'Alcohol', 'Benzodiazepines'],
  'Codeine Syrup': ['Cannabis', 'Tramadol', 'Alcohol'],
  'Prescription sedatives': ['Alcohol', 'Cannabis', 'Opioids'],
  'Inhalants / Solvents': ['Cannabis', 'Alcohol'],
}

const SUBSTANCE_MEDICAL_FLAGS = {
  'Alcohol': ['Liver disease / cirrhosis', 'Seizure risk during withdrawal', 'Gastritis / pancreatitis', 'Hypertension'],
  'Heroin / Opioids': ['Hepatitis B/C', 'HIV (if injecting)', 'Endocarditis', 'Respiratory depression risk'],
  'Cocaine / Crack': ['Cardiac arrhythmias', 'Hypertension', 'Stroke risk', 'Nasal septum damage'],
  'Tramadol / Codeine': ['Seizure risk', 'Liver damage', 'Respiratory depression'],
  'Methamphetamine': ['Dental deterioration', 'Cardiac issues', 'Psychosis risk', 'Skin infections'],
  'Codeine Syrup': ['Liver damage', 'Respiratory depression', 'Constipation / GI issues'],
  'Cannabis / Marijuana': ['Respiratory issues (if smoked)', 'Cannabis hyperemesis syndrome'],
  'Prescription sedatives': ['Seizure risk during withdrawal', 'Respiratory depression', 'Falls / injury risk'],
  'Inhalants / Solvents': ['Neurological damage', 'Liver / kidney damage', 'Cardiac arrhythmia (sudden sniffing death)'],
}

function getClinicalSeverity(form) {
  let score = 0
  // Duration scoring
  const durations = { 'Less than 6 months': 1, '6 months – 2 years': 2, '2–5 years': 3, '5–10 years': 4, 'Over 10 years': 5 }
  score += durations[form.duration] || 0
  // Frequency scoring
  const freqs = { 'Currently abstinent': 0, 'Occasional / Binge': 1, 'Weekly': 2, 'Several times a week': 3, 'Daily': 4 }
  score += freqs[form.frequency] || 0
  // High-risk substances
  const highRisk = ['Heroin / Opioids', 'Methamphetamine', 'Cocaine / Crack']
  if (highRisk.includes(form.substance)) score += 2
  // Co-use
  if (form.coSubstances?.trim()) score += 1
  // Previous treatment history
  if (form.prevTx === '4 or more') score += 2
  else if (form.prevTx === '2–3 attempts') score += 1
  // Mental health
  if (form.mentalHealth && form.mentalHealth !== 'None known') score += 1
  // Suicide history
  if (form.suicideHistory === 'current') score += 3
  else if (form.suicideHistory === 'recent') score += 2
  else if (form.suicideHistory === 'past') score += 1

  if (score <= 3) return { level: 'mild', label: 'Low Complexity', color: '#38A169', pct: Math.min(score / 18 * 100, 100) }
  if (score <= 7) return { level: 'moderate', label: 'Moderate Complexity', color: '#D69E2E', pct: Math.min(score / 18 * 100, 100) }
  if (score <= 12) return { level: 'high', label: 'High Complexity', color: '#DD6B20', pct: Math.min(score / 18 * 100, 100) }
  return { level: 'severe', label: 'Very High Complexity', color: '#E53E3E', pct: Math.min(score / 18 * 100, 100) }
}

export default function Waitlist() {
  const showNotif = useNotif()
  const [step, setStep] = useState(() => loadDraft()?.step || 1)
  const [form, setForm] = useState(() => { const d = loadDraft(); return d?.form ? { ...INITIAL, ...d.form } : INITIAL })
  const [loading, setLoading] = useState(false)

  // Persist form state on every change
  useEffect(() => { saveDraft(step, form) }, [step, form])

  // Scroll to top of form on step change
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [step])

  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })
  const fc = k => ({ checked: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.checked })) })

  const hasExclusion = EXCLUSIONS.some(ex => form[ex.key] === 'yes')
  const activeExclusions = EXCLUSIONS.filter(ex => form[ex.key] === 'yes')
  const severity = getClinicalSeverity(form)

  function getInsightColor(level) {
    const colors = { denial: '#E53E3E', precontemplation: '#DD6B20', contemplation: '#D69E2E', preparation: '#38A169', action: '#2B6CB0' }
    return colors[level] || 'var(--g300)'
  }

  function validateStep() {
    switch (step) {
      case 1:
        if (!form.pathway) { showNotif('Required', 'Please select an admission pathway.'); return false }
        if (!form.willingnessConfirm) { showNotif('Required', 'Please confirm willingness status.'); return false }
        if (form.willingnessConfirm === 'no') {
          showNotif('Outpatient Pathway', 'Clients who are not yet willing are enrolled in our Outpatient Engagement Pathway. Please call 09011277600 for a confidential assessment.')
          return false
        }
        return true
      case 2:
        if (!form.fn || !form.ln) { showNotif('Name required', "Please enter the patient's full name."); return false }
        if (!form.email?.includes('@')) { showNotif('Email required', 'Please enter a valid email.'); return false }
        if (!form.phone) { showNotif('Phone required', 'Please enter a contact phone.'); return false }
        if (!form.dob) { showNotif('DOB required', 'Please enter date of birth.'); return false }
        if (!form.gender) { showNotif('Gender required', 'Please select gender.'); return false }
        return true
      case 3:
        if (!form.substance) { showNotif('Substance required', 'Please select primary substance.'); return false }
        if (!form.duration) { showNotif('Duration required', 'Please select duration of use.'); return false }
        if (hasExclusion) {
          showNotif('Referral Required', 'Based on the screening, a referral to an appropriate service is recommended. Our team will contact you with referral details. Please call 09011277600.')
          return false
        }
        return true
      case 4:
        if (!form.insightLevel) { showNotif('Required', "Please assess the patient's insight level."); return false }
        return true
      case 5:
        if (!form.familyAwareness) { showNotif('Required', 'Please indicate if family is aware.'); return false }
        if (form.pathway === 'A' && !form.pfspName) { showNotif('Required', 'Pathway A requires a Primary Family Support Person.'); return false }
        return true
      case 6:
        if (!form.nokName) { showNotif('Required', 'Please enter next of kin name.'); return false }
        if (!form.nokPhone) { showNotif('Required', 'Please enter next of kin phone.'); return false }
        return true
      default: return true
    }
  }

  function next() { if (validateStep()) setStep(s => Math.min(s + 1, 7)) }
  function prev() { setStep(s => Math.max(s - 1, 1)) }

  function handleSubmit() {
    if (!form.consentAdmission || !form.consentDetox || !form.consentConfidentiality || !form.consentRights || !form.consentFinancial) {
      showNotif('Consent required', 'Please acknowledge all consent forms before proceeding.')
      return
    }
    setLoading(true)
    const app = {
      id: `APP_${Date.now()}`,
      ...form,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      insightScore: INSIGHT_LEVELS.findIndex(l => l.value === form.insightLevel) + 1,
    }

    pay({
      email: form.email,
      amount: 100000000,
      ref: ref('HOR_WL'),
      fields: [
        { display_name: 'Patient', variable_name: 'patient', value: `${form.fn} ${form.ln}` },
        { display_name: 'Type', variable_name: 'type', value: 'Admission Booking Deposit' },
        { display_name: 'Pathway', variable_name: 'pathway', value: `Pathway ${form.pathway}` },
        { display_name: 'Insight Level', variable_name: 'insight', value: form.insightLevel },
      ],
      onSuccess: async (r) => {
        app.paymentRef = r.reference
        app.depositPaid = true
        saveApplication(app)
        // Persist to Supabase
        if (isSupabaseReady()) {
          await submitApplication({
            pathway: form.pathway, willingness_confirm: form.willingnessConfirm,
            first_name: form.fn, last_name: form.ln, date_of_birth: form.dob || null,
            gender: form.gender, phone: form.phone, email: form.email,
            address: form.address, state: form.state, occupation: form.occupation,
            marital_status: form.maritalStatus, substance: form.substance,
            substance_other: form.substanceOther, co_substances: form.coSubstances,
            duration: form.duration, frequency: form.frequency, route_of_use: form.routeOfUse,
            prev_treatment: form.prevTx, medical_conditions: form.medConditions,
            medications: form.medications, mental_health: form.mentalHealth,
            suicide_history: form.suicideHistory, insight_level: form.insightLevel,
            insight_score: INSIGHT_LEVELS.findIndex(l => l.value === form.insightLevel) + 1,
            motivation_source: form.motivationSource, treatment_goals: form.treatmentGoals,
            change_readiness: form.changeReadiness, trigger_awareness: form.triggerAwareness,
            family_awareness: form.familyAwareness, family_support: form.familySupport,
            household_type: form.householdType, dependents: form.dependents,
            enablers_present: form.enablersPresent, family_therapy_willing: form.familyTherapyWilling,
            housing_aftercare: form.housingAftercare, pfsp_name: form.pfspName,
            pfsp_phone: form.pfspPhone, sponsor_type: form.sponsorType,
            nok_name: form.nokName, nok_relationship: form.nokRel, nok_phone: form.nokPhone,
            nok_email: form.nokEmail, referral_source: form.referral,
            consent_admission: form.consentAdmission, consent_detox: form.consentDetox,
            consent_confidentiality: form.consentConfidentiality, consent_rights: form.consentRights,
            consent_financial: form.consentFinancial,
            deposit_paid: true, payment_ref: r.reference, status: 'submitted',
          })
        }
        setLoading(false)
        showNotif('Application received!', `Booking deposit paid for ${form.fn}. Ref: ${r.reference}. Our admissions team will contact you within 48 hours.`, 'ok')
        clearDraft()
        setForm(INITIAL)
        setStep(1)
      },
      onClose: async () => {
        app.depositPaid = false
        saveApplication(app)
        if (isSupabaseReady()) {
          await submitApplication({
            pathway: form.pathway, willingness_confirm: form.willingnessConfirm,
            first_name: form.fn, last_name: form.ln, date_of_birth: form.dob || null,
            gender: form.gender, phone: form.phone, email: form.email,
            substance: form.substance, duration: form.duration,
            insight_level: form.insightLevel,
            insight_score: INSIGHT_LEVELS.findIndex(l => l.value === form.insightLevel) + 1,
            nok_name: form.nokName, nok_phone: form.nokPhone,
            deposit_paid: false, status: 'submitted',
          })
        }
        setLoading(false)
        showNotif('Application saved', 'Your application was saved. You can complete payment later.', 'ok')
      },
      onError: (msg) => {
        setLoading(false)
        showNotif('Payment Error', msg)
      },
    })
  }

  return (
    <>
      <div className="ph"><div className="container">
        <h1>Apply for Admission</h1>
        <p>12-week residential rehabilitation programme: Evidence-Based, Christ-Centered, Trauma-Informed</p>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:16 }}><div style={{ width:32, height:2, background:'rgba(255,255,255,.5)' }} /><span style={{ fontSize:'.72rem', letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.7)', fontWeight:700 }}>A Freedom Foundation Initiative</span></div>
      </div></div>

      <section className="section">
        <div className="container">
          <div className={styles.stepper}>
            {STEPS.map(s => (
              <div key={s.key} className={`${styles.stepDot} ${step === s.key ? styles.stepActive : ''} ${step > s.key ? styles.stepDone : ''}`}>
                <div className={styles.stepCircle}>{step > s.key ? '✓' : s.key}</div>
                <div className={styles.stepLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className={styles.grid}>
            <div className="card">
              <h3 style={{ marginBottom: 4, fontSize: '1.5rem' }}>{STEPS[step - 1].label}</h3>
              <p style={{ fontSize: '.82rem', color: 'var(--g500)', marginBottom: 24 }}>Step {step} of {STEPS.length}. All information is strictly confidential</p>

              {/* Step 1: Pathway & Willingness */}
              {step === 1 && <>
                <div className={styles.willingnessBox}>
                  <div className={styles.willingnessTitle}>The Willingness Criterion</div>
                  <p className={styles.willingnessText}>
                    Admission to House of Refuge requires demonstrated, voluntary willingness to participate in recovery. This is the single most critical requirement. Evidence consistently shows that client motivation is the strongest predictor of treatment engagement and long-term outcomes.
                  </p>
                  <p className={styles.willingnessText} style={{ fontWeight: 600 }}>
                    Clients who are not yet willing are NOT turned away. They are enrolled in our Outpatient Engagement Pathway with Motivational Interviewing, psychoeducation, and family counseling.
                  </p>
                </div>

                <div className="fg"><label className="flabel">Is the client voluntarily seeking treatment? *</label>
                  <select className="fi" {...f('willingnessConfirm')}>
                    <option value="">Select...</option>
                    <option value="yes">Yes: client demonstrates voluntary willingness to engage</option>
                    <option value="family_persuaded">Partially: family has persuaded the client, showing some willingness</option>
                    <option value="no">No: client denies the problem or resists structured care</option>
                  </select>
                </div>

                {form.willingnessConfirm === 'no' && (
                  <div className={styles.outpatientBox}>
                    <div className={styles.outpatientTitle}>Outpatient Engagement Pathway</div>
                    <p style={{ fontSize: '.84rem', color: 'var(--g700)', marginBottom: 10 }}>
                      This client qualifies for our evidence-based Outpatient Engagement Pathway, which includes:
                    </p>
                    <ul className={styles.outpatientList}>
                      <li>Motivational Interviewing (MI): weekly 45–60 min individual sessions</li>
                      <li>Psychoeducation about addiction as a brain disorder</li>
                      <li>Family Counseling (with consent)</li>
                      <li>Harm Reduction Guidance</li>
                      <li>Spiritual Engagement (optional, open door)</li>
                      <li>Reassessment every 2–4 weeks for residential readiness</li>
                    </ul>
                    <p style={{ fontSize: '.84rem', fontWeight: 600, color: 'var(--blue)', marginTop: 10 }}>
                      Call 09011277600 to schedule an outpatient assessment.
                    </p>
                  </div>
                )}

                {(form.willingnessConfirm === 'yes' || form.willingnessConfirm === 'family_persuaded') && <>
                  <div className={styles.sectionHead}>Select Admission Pathway</div>
                  <div className={styles.pathwayGrid}>
                    <button type="button" className={`${styles.pathwayCard} ${form.pathway === 'A' ? styles.pathwaySelected : ''}`}
                      onClick={() => setForm(p => ({ ...p, pathway: 'A' }))}>
                      <div className={styles.pathwayLabel}>Pathway A</div>
                      <div className={styles.pathwayTitle}>Family-Supported Admission</div>
                      <div className={styles.pathwayDesc}>For clients with an active, functional family system willing to participate in recovery. Family is a co-partner in treatment.</div>
                      <ul className={styles.pathwayReqs}>
                        <li>Family consent & active engagement</li>
                        <li>Primary Family Support Person (PFSP) identified</li>
                        <li>Min 2 family therapy sessions + pre-discharge meeting</li>
                        <li>Financial agreement signed</li>
                      </ul>
                    </button>
                    <button type="button" className={`${styles.pathwayCard} ${form.pathway === 'B' ? styles.pathwaySelected : ''}`}
                      onClick={() => setForm(p => ({ ...p, pathway: 'B' }))}>
                      <div className={styles.pathwayLabel}>Pathway B</div>
                      <div className={styles.pathwayTitle}>Community-Supported Admission</div>
                      <div className={styles.pathwayDesc}>For clients who are abandoned, neglected, homeless, or without viable family support. Community provides the recovery ecosystem.</div>
                      <ul className={styles.pathwayReqs}>
                        <li>Vulnerability & Needs Assessment (VNA)</li>
                        <li>Sponsorship or HOR compassion fund placement</li>
                        <li>Social Worker as primary case manager</li>
                        <li>Church/NGO support identified</li>
                      </ul>
                    </button>
                  </div>
                </>}

                {form.willingnessConfirm === 'family_persuaded' && (
                  <div className="fg"><label className="flabel">Additional context about the client's willingness</label>
                    <textarea className="fi" {...f('seekingVoluntarily')} rows={2} placeholder="What has the family communicated? Is the client showing any signs of readiness?" />
                  </div>
                )}
              </>}

              {/* Step 2: Patient Info */}
              {step === 2 && <>
                <div className="frow">
                  <div className="fg"><label className="flabel">First Name *</label><input className="fi" {...f('fn')} placeholder="First name" /></div>
                  <div className="fg"><label className="flabel">Last Name *</label><input className="fi" {...f('ln')} placeholder="Last name" /></div>
                </div>
                <div className="frow">
                  <div className="fg"><label className="flabel">Date of Birth *</label><input className="fi" type="date" {...f('dob')} /></div>
                  <div className="fg"><label className="flabel">Gender *</label>
                    <select className="fi" {...f('gender')}><option value="">Select...</option><option>Male</option><option>Female</option></select>
                  </div>
                </div>
                <div className="frow">
                  <div className="fg"><label className="flabel">Phone *</label><input className="fi" type="tel" {...f('phone')} placeholder="+234 801 000 0000" /></div>
                  <div className="fg"><label className="flabel">Email *</label><input className="fi" type="email" {...f('email')} placeholder="email@example.com" /></div>
                </div>
                <div className="fg"><label className="flabel">Address</label><input className="fi" {...f('address')} placeholder="Full residential address" /></div>
                <div className="frow">
                  <div className="fg"><label className="flabel">State of Residence</label>
                    <select className="fi" {...f('state')}>
                      <option value="">Select state...</option>
                      {['Lagos', 'Abuja (FCT)', 'Rivers', 'Ogun', 'Oyo', 'Delta', 'Edo', 'Anambra', 'Kano', 'Other'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label className="flabel">Marital Status</label>
                    <select className="fi" {...f('maritalStatus')}>
                      <option value="">Select...</option>
                      {['Single', 'Married', 'Separated', 'Divorced', 'Widowed'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="fg"><label className="flabel">Occupation</label><input className="fi" {...f('occupation')} placeholder="Current or most recent" /></div>
              </>}

              {/* Step 3: Clinical History & Exclusion Screening */}
              {step === 3 && <>
                <div className="fg"><label className="flabel">Primary Substance of Concern *</label>
                  <select className="fi" value={form.substance} onChange={e => {
                    const val = e.target.value
                    const updates = { substance: val }
                    // Auto-suggest route of administration based on substance
                    const routes = SUBSTANCE_ROUTES[val]
                    if (routes) updates.routeOfUse = routes[0]
                    else if (!val) updates.routeOfUse = ''
                    // Clear "Other" text when switching away from Other
                    if (val !== 'Other') updates.substanceOther = ''
                    setForm(p => ({ ...p, ...updates }))
                  }}>
                    <option value="">Select primary substance...</option>
                    {['Alcohol', 'Cannabis / Marijuana', 'Heroin / Opioids', 'Cocaine / Crack', 'Tramadol / Codeine', 'Methamphetamine', 'Codeine Syrup', 'Prescription sedatives', 'Inhalants / Solvents', 'Multiple substances', 'Other'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {form.substance === 'Other' && (
                  <div className="fg"><label className="flabel">Specify substance</label><input className="fi" {...f('substanceOther')} placeholder="Please specify" /></div>
                )}

                {/* Smart co-substance suggestions */}
                <div className="fg"><label className="flabel">Other substances used concurrently</label>
                  <input className="fi" {...f('coSubstances')} placeholder="e.g. Alcohol + Tramadol, Cannabis + Codeine" />
                  {form.substance && SUBSTANCE_CO_USE[form.substance] && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      <span style={{ fontSize: '.72rem', color: 'var(--g500)', lineHeight: '26px' }}>Common with {form.substance.split(' / ')[0]}:</span>
                      {SUBSTANCE_CO_USE[form.substance].map(s => {
                        const items = (form.coSubstances || '').split(/,\s*/).map(i => i.trim().toLowerCase()).filter(Boolean)
                        const already = items.some(i => i === s.toLowerCase())
                        return <button key={s} type="button" onClick={() => {
                          if (already) return
                          setForm(p => ({ ...p, coSubstances: p.coSubstances ? `${p.coSubstances}, ${s}` : s }))
                        }} style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: '.74rem', fontWeight: 600,
                          border: '1px solid', cursor: already ? 'default' : 'pointer', transition: 'all .15s',
                          background: already ? 'var(--blue)' : 'rgba(26,95,173,.06)',
                          color: already ? 'white' : 'var(--blue)',
                          borderColor: already ? 'var(--blue)' : 'rgba(26,95,173,.2)',
                          opacity: already ? .7 : 1,
                        }}>{already ? `✓ ${s}` : `+ ${s}`}</button>
                      })}
                    </div>
                  )}
                </div>

                <div className="frow">
                  <div className="fg"><label className="flabel">Duration of use *</label>
                    <select className="fi" {...f('duration')}>
                      <option value="">Select...</option>
                      {['Less than 6 months', '6 months – 2 years', '2–5 years', '5–10 years', 'Over 10 years'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label className="flabel">Frequency of use</label>
                    <select className="fi" value={form.frequency} onChange={e => {
                      const val = e.target.value
                      const updates = { frequency: val }
                      // Clear abstinence duration when switching away from abstinent
                      if (val !== 'Currently abstinent') updates.abstinenceDuration = ''
                      setForm(p => ({ ...p, ...updates }))
                    }}>
                      <option value="">Select...</option>
                      {['Daily', 'Several times a week', 'Weekly', 'Occasional / Binge', 'Currently abstinent'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Conditional abstinence duration */}
                {form.frequency === 'Currently abstinent' && (
                  <div className="fg"><label className="flabel">How long abstinent?</label>
                    <select className="fi" {...f('abstinenceDuration')}>
                      <option value="">Select...</option>
                      {['Less than 1 week', '1–4 weeks', '1–3 months', '3–6 months', 'Over 6 months'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                <div className="fg"><label className="flabel">Route of administration {form.substance && SUBSTANCE_ROUTES[form.substance] ? '(auto-suggested)' : ''}</label>
                  <select className="fi" {...f('routeOfUse')}>
                    <option value="">Select...</option>
                    {['Oral', 'Smoking / Inhalation', 'Injection', 'Nasal / Snorting', 'Multiple routes'].map(s => <option key={s}>{s}</option>)}
                  </select>
                  {form.substance && SUBSTANCE_ROUTES[form.substance] && (
                    <span style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 4, display: 'block' }}>
                      Typical for {form.substance.split(' / ')[0]}: {SUBSTANCE_ROUTES[form.substance].join(', ')}
                    </span>
                  )}
                </div>

                {/* Clinical Severity Indicator */}
                {form.substance && form.duration && <div style={{
                  background: 'var(--off)', border: '1px solid var(--g100)', borderRadius: 10,
                  padding: '14px 16px', marginBottom: 18,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--charcoal)' }}>Clinical Complexity Estimate</span>
                    <span style={{ fontSize: '.74rem', fontWeight: 700, color: severity.color, background: `${severity.color}15`, padding: '2px 10px', borderRadius: 12 }}>{severity.label}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--g100)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(severity.pct, 8)}%`, background: severity.color, borderRadius: 3, transition: 'all .4s ease' }} />
                  </div>
                  <p style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 6 }}>
                    This estimate helps our clinical team prepare appropriate resources. It updates as you complete the form.
                  </p>
                </div>}

                <div className="frow">
                  <div className="fg"><label className="flabel">Previous treatment attempts</label>
                    <select className="fi" value={form.prevTx} onChange={e => {
                      const val = e.target.value
                      const updates = { prevTx: val }
                      if (!val || val === 'None') updates.prevTxDetails = ''
                      setForm(p => ({ ...p, ...updates }))
                    }}>
                      <option value="">Select...</option>
                      {['None', '1 attempt', '2–3 attempts', '4 or more'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label className="flabel">Longest period of sobriety</label>
                    <select className="fi" {...f('previousRecoveryLength')}>
                      <option value="">Select...</option>
                      {['Never been sober', 'Less than 1 month', '1–3 months', '3–6 months', '6–12 months', 'Over 1 year'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                {form.prevTx && form.prevTx !== 'None' && (
                  <div className="fg"><label className="flabel">Details of previous treatment</label>
                    <textarea className="fi" {...f('prevTxDetails')} rows={3} placeholder="Where, when, type of programme, reason for discharge/relapse" />
                  </div>
                )}

                {/* Substance-specific medical risk flags */}
                {form.substance && SUBSTANCE_MEDICAL_FLAGS[form.substance] && (
                  <div style={{
                    background: 'rgba(26,95,173,.04)', border: '1px solid rgba(26,95,173,.12)',
                    borderRadius: 10, padding: '12px 16px', marginBottom: 14,
                  }}>
                    <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--blue)', marginBottom: 6 }}>
                      Medical conditions to screen for ({form.substance.split(' / ')[0]} use)
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {SUBSTANCE_MEDICAL_FLAGS[form.substance].map(flag => (
                        <span key={flag} style={{
                          fontSize: '.72rem', padding: '3px 10px', borderRadius: 12,
                          background: 'rgba(26,95,173,.08)', color: 'var(--blue)', fontWeight: 500,
                        }}>{flag}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="fg"><label className="flabel">Known medical conditions</label>
                  <textarea className="fi" {...f('medConditions')} rows={2} placeholder="Diabetes, hypertension, hepatitis, HIV, seizures, etc." />
                </div>
                <div className="fg"><label className="flabel">Current medications</label>
                  <input className="fi" {...f('medications')} placeholder="List all current medications" />
                </div>
                <div className="frow">
                  <div className="fg"><label className="flabel">Mental health conditions</label>
                    <select className="fi" {...f('mentalHealth')}>
                      <option value="">Select...</option>
                      {['None known', 'Depression', 'Anxiety', 'Bipolar disorder', 'Schizophrenia', 'PTSD', 'Multiple conditions', 'Undiagnosed / Suspected'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label className="flabel">History of self-harm or suicidal ideation</label>
                    <select className="fi" {...f('suicideHistory')}>
                      <option value="">Select...</option>
                      <option value="no">No</option>
                      <option value="past">Yes, in the past</option>
                      <option value="recent">Yes, within the last 3 months</option>
                      <option value="current">Yes, currently</option>
                    </select>
                  </div>
                </div>
                {(form.suicideHistory === 'recent' || form.suicideHistory === 'current') && (
                  <div className={styles.alertBox}>
                    <strong>Immediate attention needed:</strong> If the patient is currently at risk, please contact emergency services or call our crisis line at <a href="tel:09011277600" style={{ color: 'var(--blue)', fontWeight: 700 }}>09011277600</a> immediately. HOR cannot admit clients with active suicidal/homicidal risk but will provide an immediate referral.
                  </div>
                )}

                <div className={styles.sectionHead}>Exclusion Screening</div>
                <p style={{ fontSize: '.84rem', color: 'var(--g700)', marginBottom: 14 }}>
                  The following conditions require referral to a more appropriate service before residential admission. Please answer honestly. No client is turned away empty-handed.
                </p>
                {EXCLUSIONS.map(ex => (
                  <div key={ex.key} className="fg">
                    <label className="flabel">{ex.label}</label>
                    <select className="fi" value={form[ex.key]} onChange={e => setForm(p => ({ ...p, [ex.key]: e.target.value }))}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                ))}
                {hasExclusion && (
                  <div className={styles.alertBox}>
                    <strong>Referral Required:</strong> Based on this screening, the client requires referral before residential admission:
                    <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                      {activeExclusions.map(ex => <li key={ex.key} style={{ fontSize: '.82rem', marginBottom: 4 }}>{ex.referral}</li>)}
                    </ul>
                    <p style={{ marginTop: 8, fontWeight: 600 }}>Every client leaves with a written referral, a compassionate conversation, and HOR's contact number for when they are ready. Call 09011277600.</p>
                  </div>
                )}
              </>}

              {/* Step 4: Insight & Readiness */}
              {step === 4 && <>
                <p style={{ fontSize: '.88rem', color: 'var(--g700)', marginBottom: 18, lineHeight: 1.7 }}>
                  Understanding insight and readiness is crucial for treatment planning. This assessment aligns with the URICA Stage of Change model used in the clinical pre-screening interview.
                </p>
                <div className="fg">
                  <label className="flabel">Patient's Insight Level (Stage of Change) *</label>
                  <div className={styles.insightGrid}>
                    {INSIGHT_LEVELS.map(level => (
                      <button key={level.value} type="button"
                        className={`${styles.insightCard} ${form.insightLevel === level.value ? styles.insightSelected : ''}`}
                        onClick={() => setForm(p => ({ ...p, insightLevel: level.value }))}
                        style={form.insightLevel === level.value ? { borderColor: getInsightColor(level.value), background: getInsightColor(level.value) + '10' } : {}}>
                        <div className={styles.insightDot} style={{ background: getInsightColor(level.value) }} />
                        <div>
                          <div className={styles.insightLabel}>{level.label}</div>
                          <div className={styles.insightDesc}>{level.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="fg"><label className="flabel">Primary motivation for seeking treatment</label>
                  <select className="fi" {...f('motivationSource')}>
                    <option value="">Select...</option>
                    {['Self-motivated', 'Family pressure', 'Employer / Work issues', 'Legal / Court ordered', 'Health crisis', 'Financial consequences', 'Relationship breakdown', 'Spiritual conviction', 'Other'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div className="fg"><label className="flabel">What does the patient hope to achieve from treatment?</label>
                  <textarea className="fi" {...f('treatmentGoals')} rows={3} placeholder="In the patient's own words, what are they hoping for?" />
                </div>

                <div className="fg"><label className="flabel">Readiness to commit to 12-week residential programme</label>
                  <select className="fi" {...f('changeReadiness')}>
                    <option value="">Select...</option>
                    <option value="fully">Fully committed: understands and accepts 12 weeks</option>
                    <option value="mostly">Mostly committed: some reservations</option>
                    <option value="uncertain">Uncertain: needs more information</option>
                    <option value="resistant">Resistant: does not want to stay 12 weeks</option>
                  </select>
                </div>

                <div className="fg"><label className="flabel">Can the patient identify their triggers?</label>
                  <select className="fi" {...f('triggerAwareness')}>
                    <option value="">Select...</option>
                    <option value="yes">Yes: can name specific people, places, feelings</option>
                    <option value="some">Somewhat: vague awareness</option>
                    <option value="no">No: no awareness of triggers</option>
                  </select>
                </div>
              </>}

              {/* Step 5: Support & Family */}
              {step === 5 && <>
                <p style={{ fontSize: '.88rem', color: 'var(--g700)', marginBottom: 18, lineHeight: 1.7 }}>
                  Family and community support is one of the strongest predictors of sustained recovery.
                </p>

                <div className={styles.sectionHead}>Family Awareness & Support</div>
                <div className="frow">
                  <div className="fg"><label className="flabel">Is family aware of the addiction? *</label>
                    <select className="fi" {...f('familyAwareness')}>
                      <option value="">Select...</option>
                      <option value="fully">Fully aware and supportive</option>
                      <option value="aware_unsupportive">Aware but not supportive</option>
                      <option value="partially">Partially aware</option>
                      <option value="unaware">Family does not know</option>
                      <option value="no_family">No family / Estranged</option>
                    </select>
                  </div>
                  <div className="fg"><label className="flabel">Level of family support available</label>
                    <select className="fi" {...f('familySupport')}>
                      <option value="">Select...</option>
                      <option value="strong">Strong: active involvement expected</option>
                      <option value="moderate">Moderate: willing but limited availability</option>
                      <option value="weak">Weak: minimal engagement</option>
                      <option value="none">None: no family support available</option>
                      <option value="toxic">Toxic: family may be an enabler or trigger</option>
                    </select>
                  </div>
                </div>

                {form.pathway === 'A' && <>
                  <div className={styles.sectionHead}>Pathway A: Primary Family Support Person (PFSP)</div>
                  <div className="frow">
                    <div className="fg"><label className="flabel">PFSP Full Name *</label><input className="fi" {...f('pfspName')} placeholder="Name of primary family support person" /></div>
                    <div className="fg"><label className="flabel">PFSP Phone *</label><input className="fi" type="tel" {...f('pfspPhone')} placeholder="+234 801 000 0000" /></div>
                  </div>
                  <div className="frow">
                    <div className="fg"><label className="flabel">Relationship to patient</label>
                      <select className="fi" {...f('pfspRelationship')}>
                        <option value="">Select...</option>
                        {['Spouse', 'Parent', 'Sibling', 'Child (adult)', 'Extended family', 'Friend', 'Pastor', 'Employer', 'Other'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="fg"><label className="flabel">Has the family given consent for admission?</label>
                      <select className="fi" {...f('familyConsentGiven')}>
                        <option value="">Select...</option>
                        <option value="yes">Yes: consent documented</option>
                        <option value="verbal">Verbal consent: written to follow</option>
                        <option value="pending">Not yet: to be discussed</option>
                      </select>
                    </div>
                  </div>
                </>}

                {form.pathway === 'B' && <>
                  <div className={styles.sectionHead}>Pathway B: Community Support</div>
                  <div className="fg"><label className="flabel">Funding / Sponsorship type</label>
                    <select className="fi" {...f('sponsorType')}>
                      <option value="">Select...</option>
                      <option value="self">Self-funding</option>
                      <option value="community">Community / Church sponsorship</option>
                      <option value="ngo">NGO funding</option>
                      <option value="compassion">HOR Compassion Fund application</option>
                    </select>
                  </div>
                  <div className="frow">
                    <div className="fg"><label className="flabel">Community or Church partner</label>
                      <input className="fi" {...f('communityPartner')} placeholder="Name of supporting organisation" />
                    </div>
                    <div className="fg"><label className="flabel">Church connection</label>
                      <input className="fi" {...f('churchConnection')} placeholder="Church name or Life Center" />
                    </div>
                  </div>
                </>}

                <div className={styles.sectionHead}>Household & Post-Treatment</div>
                <div className="frow">
                  <div className="fg"><label className="flabel">Current household type</label>
                    <select className="fi" {...f('householdType')}>
                      <option value="">Select...</option>
                      <option value="alone">Lives alone</option>
                      <option value="spouse">Lives with spouse / partner</option>
                      <option value="parents">Lives with parents</option>
                      <option value="family">Lives with extended family</option>
                      <option value="friends">Lives with friends / roommates</option>
                      <option value="homeless">Homeless / No stable housing</option>
                      <option value="institution">Currently in another institution</option>
                    </select>
                  </div>
                  <div className="fg"><label className="flabel">Number of dependents</label>
                    <select className="fi" {...f('dependents')}>
                      <option value="">Select...</option>
                      {['None', '1', '2', '3', '4 or more'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="fg"><label className="flabel">Are there enablers in the patient's environment?</label>
                  <select className="fi" {...f('enablersPresent')}>
                    <option value="">Select...</option>
                    <option value="no">No known enablers</option>
                    <option value="family">Yes: family members who enable use</option>
                    <option value="friends">Yes: friends or associates who use</option>
                    <option value="both">Yes: both family and friends</option>
                    <option value="environment">Yes: neighbourhood / environment is high-risk</option>
                  </select>
                </div>
                <div className="frow">
                  <div className="fg"><label className="flabel">Willingness to participate in family therapy</label>
                    <select className="fi" {...f('familyTherapyWilling')}>
                      <option value="">Select...</option>
                      <option value="yes">Yes: family is willing</option>
                      <option value="patient_only">Patient only: family not willing</option>
                      <option value="unknown">Not yet discussed</option>
                      <option value="no_family">No family available</option>
                    </select>
                  </div>
                  <div className="fg"><label className="flabel">Stable housing available after discharge</label>
                    <select className="fi" {...f('housingAftercare')}>
                      <option value="">Select...</option>
                      <option value="yes">Yes: safe, stable environment</option>
                      <option value="conditional">Conditional: depends on behaviour</option>
                      <option value="no">No: will need transitional housing</option>
                      <option value="unknown">Unknown at this time</option>
                    </select>
                  </div>
                </div>
              </>}

              {/* Step 6: Next of Kin */}
              {step === 6 && <>
                <p style={{ fontSize: '.88rem', color: 'var(--g700)', marginBottom: 18, lineHeight: 1.7 }}>
                  This person will be contacted in case of emergency and will receive progress updates (with consent).
                </p>
                <div className="frow">
                  <div className="fg"><label className="flabel">Full Name *</label><input className="fi" {...f('nokName')} placeholder="Full name" /></div>
                  <div className="fg"><label className="flabel">Relationship *</label>
                    <select className="fi" {...f('nokRel')}>
                      <option value="">Select...</option>
                      {['Parent', 'Spouse', 'Sibling', 'Child', 'Friend', 'Pastor', 'Employer', 'Other'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="frow">
                  <div className="fg"><label className="flabel">Phone *</label><input className="fi" type="tel" {...f('nokPhone')} placeholder="+234 801 000 0000" /></div>
                  <div className="fg"><label className="flabel">Email</label><input className="fi" type="email" {...f('nokEmail')} placeholder="email@example.com" /></div>
                </div>
                <div className="fg"><label className="flabel">Address</label><input className="fi" {...f('nokAddress')} placeholder="Full address" /></div>

                <div className={styles.sectionHead} style={{ marginTop: 28 }}>How did you hear about us?</div>
                <div className="fg">
                  <select className="fi" {...f('referral')}>
                    <option value="">Select...</option>
                    {['Church / Religious organisation', 'Family member', 'Friend / Colleague', 'Social media', 'Healthcare professional', 'NDLEA', 'Yaba Psychiatric Hospital', 'Google search', 'Other'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {form.referral && (
                  <div className="fg"><label className="flabel">Additional referral details</label>
                    <input className="fi" {...f('referralDetails')} placeholder="Name of person, organisation, or platform" />
                  </div>
                )}
              </>}

              {/* Step 7: Review & Pay */}
              {step === 7 && <>
                <div className={styles.reviewGrid}>
                  <div className={styles.reviewBlock}>
                    <div className={styles.reviewTitle}>Pathway</div>
                    <div className={styles.reviewValue}>Pathway {form.pathway}: {form.pathway === 'A' ? 'Family-Supported' : 'Community-Supported'}</div>
                    <div className={styles.reviewSub}>Willingness: {form.willingnessConfirm === 'yes' ? 'Voluntary' : 'Family-persuaded'}</div>
                  </div>
                  <div className={styles.reviewBlock}>
                    <div className={styles.reviewTitle}>Patient</div>
                    <div className={styles.reviewValue}>{form.fn} {form.ln}</div>
                    <div className={styles.reviewSub}>{form.gender}, DOB: {form.dob} · {form.phone}</div>
                  </div>
                  <div className={styles.reviewBlock}>
                    <div className={styles.reviewTitle}>Primary Substance</div>
                    <div className={styles.reviewValue}>{form.substance === 'Other' ? form.substanceOther || 'Other' : form.substance}</div>
                    <div className={styles.reviewSub}>
                      Duration: {form.duration} · {form.frequency || 'Frequency N/A'}{form.abstinenceDuration ? ` (${form.abstinenceDuration})` : ''}
                      {form.routeOfUse ? ` · ${form.routeOfUse}` : ''}
                    </div>
                    {form.coSubstances && <div className={styles.reviewSub}>Co-use: {form.coSubstances}</div>}
                  </div>
                  <div className={styles.reviewBlock}>
                    <div className={styles.reviewTitle}>Clinical Profile</div>
                    <div className={styles.reviewValue} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: severity.color, flexShrink: 0 }} />
                      {severity.label}
                    </div>
                    <div className={styles.reviewSub}>
                      Mental health: {form.mentalHealth || 'Not specified'}
                      {form.suicideHistory && form.suicideHistory !== 'no' ? ` · Self-harm: ${form.suicideHistory}` : ''}
                    </div>
                    {form.medConditions && <div className={styles.reviewSub}>Medical: {form.medConditions}</div>}
                    {form.medications && <div className={styles.reviewSub}>Medications: {form.medications}</div>}
                  </div>
                  <div className={styles.reviewBlock}>
                    <div className={styles.reviewTitle}>Insight Level</div>
                    <div className={styles.reviewValue} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={styles.insightDotSm} style={{ background: getInsightColor(form.insightLevel) }} />
                      {INSIGHT_LEVELS.find(l => l.value === form.insightLevel)?.label || 'Not assessed'}
                    </div>
                    <div className={styles.reviewSub}>Commitment: {form.changeReadiness || 'Not specified'}</div>
                  </div>
                  <div className={styles.reviewBlock}>
                    <div className={styles.reviewTitle}>Family Support</div>
                    <div className={styles.reviewValue}>{form.familyAwareness === 'fully' ? 'Fully aware & supportive' : form.familyAwareness || 'Not specified'}</div>
                    <div className={styles.reviewSub}>{form.pathway === 'A' ? `PFSP: ${form.pfspName || 'Not set'}` : `Sponsor: ${form.sponsorType || 'Not set'}`}</div>
                  </div>
                  <div className={styles.reviewBlock}>
                    <div className={styles.reviewTitle}>Next of Kin</div>
                    <div className={styles.reviewValue}>{form.nokName}</div>
                    <div className={styles.reviewSub}>{form.nokRel} · {form.nokPhone}</div>
                  </div>
                </div>

                {/* Consent Forms */}
                <div className={styles.sectionHead}>Consent & Agreements</div>
                <p style={{ fontSize: '.84rem', color: 'var(--g700)', marginBottom: 14 }}>
                  By proceeding, the client (or authorised representative) acknowledges the following. Full forms will be signed at admission.
                </p>
                <div className={styles.consentList}>
                  {[
                    ['consentAdmission', 'Admission Agreement: I understand and accept the programme rules, expectations, and my rights and responsibilities at HOR.'],
                    ['consentDetox', 'Detoxification Consent: I understand the detoxification process, possible withdrawal symptoms, and that medical support will be provided.'],
                    ['consentConfidentiality', 'Confidentiality Agreement: I commit to protecting the privacy of fellow residents and understand HOR protects mine.'],
                    ['consentRights', 'Rights & Responsibilities Charter: I have been informed of my rights as an HOR resident including the right to leave at any time.'],
                    ['consentFinancial', 'Financial Agreement: I understand the fee structure, deposit terms, and payment obligations.'],
                  ].map(([key, text]) => (
                    <label key={key} className={styles.consentItem}>
                      <input type="checkbox" {...fc(key)} />
                      <span>{text}</span>
                    </label>
                  ))}
                </div>

                <div className={styles.paynote}>
                  <div className={styles.payTitle}>Booking Deposit: {fmt(1000000)}</div>
                  <p className={styles.payText}>
                    A refundable {fmt(1000000)} booking deposit secures your position. It is fully applied to treatment fees on admission. If your application is unsuccessful or no bed is available, you will be fully refunded.
                  </p>
                  <div className={styles.payBreakdown}>
                    <div><span>Booking deposit</span><span>{fmt(1000000)}</span></div>
                    <div><span>12-week residential programme</span><span>Applied 100%</span></div>
                    <div><span>Refundable if not admitted</span><span>Yes</span></div>
                  </div>
                </div>

                <div className={styles.medTestNote}>
                  <div className={styles.medTestTitle}>Pre-Admission Medical Tests (within 48 hours)</div>
                  <p style={{ fontSize: '.8rem', color: 'var(--g700)' }}>
                    The following tests are mandatory and will be arranged upon admission: HIV Screening, Hepatitis A & B, Urine Drug Screen, Full Blood Count, Liver Function Tests, Malaria Parasite, Widal Test, Chest X-Ray, Blood Glucose.
                  </p>
                </div>

                <button className="btn btn--primary btn--full" style={{ marginTop: 18 }} onClick={handleSubmit} disabled={loading}>
                  {loading ? <span className="spin" /> : `Submit Application & Pay ${fmt(1000000)} Deposit`}
                </button>
                <p style={{ fontSize: '.72rem', color: 'var(--g500)', textAlign: 'center', marginTop: 9 }}>
                  Your information is fully confidential · Secured by Paystack
                </p>
              </>}

              {/* Navigation */}
              {step < 7 && (
                <div className={styles.navBtns}>
                  {step > 1 && <button className="btn btn--secondary btn--sm" onClick={prev}>Back</button>}
                  <button className="btn btn--primary btn--sm" onClick={next} style={{ marginLeft: 'auto' }}>Continue</button>
                </div>
              )}
              {step === 7 && (
                <div className={styles.navBtns} style={{ marginTop: 12 }}>
                  <button className="btn btn--secondary btn--sm" onClick={prev}>Back to edit</button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 16 }}>Admission Process</h4>
                <div className={styles.psteps}>
                  {[
                    ['1', 'Initial Contact & Pre-Screening', 'ASI and ASSIST tools administered. Willingness assessed via URICA.'],
                    ['2', 'Clinical Assessment', 'Full medical evaluation, psychiatric screening, psychosocial assessment. Medical tests ordered.'],
                    ['3', 'Admission Decision', 'Admit / Refer / Defer. Family engaged (Pathway A) or Social Worker activated (Pathway B).'],
                    ['4', 'Documentation & Intake', 'Consent forms signed. Property inspection. Bed and counselor assigned. Full orientation.'],
                    ['5', 'Treatment Planning', 'Columbia Model treatment plan developed within 72 hours. Client participates in goal-setting.'],
                    ['6', 'Medical Detoxification', 'Doctor-supervised detox with 24/7 nursing monitoring (Weeks 1–2).'],
                  ].map(([n, t, d]) => (
                    <div key={n} className={styles.ps}>
                      <div className={styles.psN}>{n}</div>
                      <div>
                        <div className={styles.psT}>{t}</div>
                        <p className={styles.psD}>{d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 8 }}>Selection Criteria</h4>
                <p style={{ fontSize: '.82rem', color: 'var(--g700)', marginBottom: 12 }}>All five must be met for residential admission:</p>
                <div className={styles.criteriaList}>
                  {[
                    ['Willingness', 'Voluntary readiness to engage, assessed via clinical interview and URICA'],
                    ['SUD Diagnosis', 'Moderate-to-severe Substance Use Disorder (DSM-5 criteria)'],
                    ['Medical Stability', 'Stable or manageable within HOR\'s 24/7 nursing clinical scope'],
                    ['Functional Capacity', 'Cognitive capacity to participate in group therapy and counseling'],
                    ['No Immediate Risk', 'No active psychosis, suicidal intent with plan, or homicidal intent'],
                  ].map(([t, d]) => (
                    <div key={t} className={styles.criteriaItem}>
                      <div className={styles.criteriaTitle}>{t}</div>
                      <div className={styles.criteriaDesc}>{d}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 8 }}>12-Week Programme</h4>
                <div className={styles.phaseList}>
                  {[
                    ['Wks 1–2', 'Medical Stabilization', 'Detox, vitals, nutritional recovery'],
                    ['Wks 3–6', 'Therapeutic Foundation', 'CBT, MI, psychoeducation, life skills'],
                    ['Wks 7–10', 'Deepening & Skills', 'Trauma work, vocational training, PRPP'],
                    ['Wks 11–12', 'Reintegration', 'Family meeting, aftercare, graduation'],
                  ].map(([w, t, d]) => (
                    <div key={w} className={styles.phaseItem}>
                      <div className={styles.phaseWeeks}>{w}</div>
                      <div>
                        <div className={styles.phaseTitle}>{t}</div>
                        <div className={styles.phaseDesc}>{d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h4 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: 10 }}>Questions?</h4>
                <p style={{ fontSize: '.83rem', color: 'var(--g700)', marginBottom: 12 }}>Our admissions team is available Monday–Saturday, 8am–6pm.</p>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  <a href="tel:09011277600" style={{ color: 'var(--blue)' }}>09011277600</a>
                </div>
                <div style={{ fontSize: '.82rem' }}>
                  <a href="mailto:e.abutu@freedomfoundationng.org" style={{ color: 'var(--blue)' }}>e.abutu@freedomfoundationng.org</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
