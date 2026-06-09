// Email template for the deposit-request flow.
// Sent to the family once the application has been reviewed and shortlisted.

export const DEFAULT_DEPOSIT_AMOUNT = 1000000 // NGN
export const DEFAULT_DEPOSIT_LABEL = 'NGN 1,000,000'
export const DEFAULT_REPLY_TO = 'admissions@houseofrefugeng.org'
export const DEFAULT_PHONE = '0911 277 7600'

// The assessment fee covers psychiatrist consultation, MDT review, written
// admission decision, and a ten-test pre-admission lab panel. Indicative
// market ranges below — published for transparency. The 400k assessment fee
// covers this in full; no additional charge to the family.
export const DEFAULT_ASSESSMENT_LINE_ITEMS = [
  { label: 'Clinical psychiatric assessment', range: '₦80,000 – ₦150,000' },
  { label: 'Psychosocial / addiction severity assessment (ASI, ASSIST)', range: '₦40,000 – ₦80,000' },
  { label: 'Full Blood Count (CBC)', range: '₦8,000 – ₦15,000' },
  { label: 'Fasting Blood Sugar (FBS)', range: '₦5,000 – ₦10,000' },
  { label: 'Liver Function Test', range: '₦15,000 – ₦25,000' },
  { label: 'Renal Function Test', range: '₦12,000 – ₦20,000' },
  { label: 'Toxicology Screen (Drug of Abuse)', range: '₦15,000 – ₦30,000' },
  { label: 'Blood Alcohol', range: '₦5,000 – ₦10,000' },
  { label: 'Urinalysis', range: '₦5,000 – ₦10,000' },
  { label: 'Serology (Hepatitis B)', range: '₦8,000 – ₦15,000' },
  { label: 'Serology (Hepatitis C)', range: '₦8,000 – ₦15,000' },
  { label: 'Serology (HIV)', range: '₦8,000 – ₦15,000' },
]

export function buildDepositEmail({
  patientName = '',
  applicationId = '',
  pathway = '',
  reviewerName = 'House of Refuge Admissions',
  reviewerTitle = 'Admissions Coordinator',
  depositLabel = DEFAULT_DEPOSIT_LABEL,
  paymentLink = '',
  expiryDays = 7,
} = {}) {
  const nameLine = patientName ? `Dear ${patientName} family,` : 'Dear family,'
  const pathwayLine = pathway ? `\n\nYour application has been reviewed under the **${pathway}** pathway.` : ''

  const subject = `House of Refuge — Deposit invitation${applicationId ? ` (Ref ${applicationId})` : ''}`

  const text = `${nameLine}

Thank you for completing the House of Refuge self-assessment.${pathwayLine}

We are now able to invite you to pay the ${depositLabel} admission deposit. The deposit is split:

  • NGN 400,000 — clinical assessment fee (covers visiting psychiatrist consult, ten pre-admission lab tests, MDT review, written admission decision, and a referral if declined). Consumed once the psychiatrist begins your file.

  • NGN 600,000 — held toward Month 1 fees. Reserves your place on the active waitlist. Refundable if you withdraw or we decline.

Pay securely online: ${paymentLink || '[secure payment link]'}

This invitation expires ${expiryDays} days from issue. If you need an alternative payment method (bank transfer / invoice), reply to this email or call ${DEFAULT_PHONE}.

Best regards,
${reviewerName}
${reviewerTitle}
House of Refuge — Lekki, Lagos`

  return { subject, text }
}
