// Email template for the deposit-request flow.
// Sent to the family once the application has been reviewed and shortlisted.

// Used to charge the deposit on the secure payment page. The figure is not
// quoted in the invitation email or on any public page — the family sees it
// at the point of payment, on the page this link leads to.
export const DEFAULT_DEPOSIT_AMOUNT = 1000000 // NGN
export const DEFAULT_REPLY_TO = 'admissions@houseofrefugeng.org'
export const DEFAULT_PHONE = '0911 277 7600'

// Everything the assessment fee covers, in full, with no additional charge to
// the family. Listed so families know exactly what the clinical assessment
// stage includes before they pay for it.
export const DEFAULT_ASSESSMENT_LINE_ITEMS = [
  { label: 'Clinical psychiatric assessment' },
  { label: 'Psychosocial / addiction severity assessment (ASI, ASSIST)' },
  { label: 'Full Blood Count (CBC)' },
  { label: 'Fasting Blood Sugar (FBS)' },
  { label: 'Liver Function Test' },
  { label: 'Renal Function Test' },
  { label: 'Toxicology Screen (Drug of Abuse)' },
  { label: 'Blood Alcohol' },
  { label: 'Urinalysis' },
  { label: 'Serology (Hepatitis B)' },
  { label: 'Serology (Hepatitis C)' },
  { label: 'Serology (HIV)' },
  { label: 'Multidisciplinary case review + written admission decision' },
  { label: 'Referral to an appropriate setting if admission is declined' },
]

export function buildDepositEmail({
  patientName = '',
  applicationId = '',
  pathway = '',
  reviewerName = 'House of Refuge Admissions',
  reviewerTitle = 'Admissions Coordinator',
  paymentLink = '',
  expiryDays = 7,
} = {}) {
  const nameLine = patientName ? `Dear ${patientName} family,` : 'Dear family,'
  const pathwayLine = pathway ? `\n\nYour application has been reviewed under the **${pathway}** pathway.` : ''

  const subject = `House of Refuge — Deposit invitation${applicationId ? ` (Ref ${applicationId})` : ''}`

  const text = `${nameLine}

Thank you for completing the House of Refuge self-assessment.${pathwayLine}

We are now able to invite you to proceed to the clinical assessment stage. This is secured by an admission deposit, which is split into two parts:

  • A clinical assessment fee, which covers the visiting psychiatrist consult, ten pre-admission lab tests, MDT review, a written admission decision, and a referral if we decline. This part is consumed once the psychiatrist begins your file.

  • A balance held toward Month 1 fees, which reserves your place on the active waitlist. This part is refundable if you withdraw or we decline.

The amount for each part, the full fee schedule, and the refund policy are set out on the secure page below. Please read them before you pay anything. If you would rather we walk you through the figures on a call first, say the word and we will arrange it.

Continue here: ${paymentLink || '[secure payment link]'}

This invitation expires ${expiryDays} days from issue. If you need an alternative payment method (bank transfer / invoice), reply to this email or call ${DEFAULT_PHONE}.

Best regards,
${reviewerName}
${reviewerTitle}
House of Refuge — Lekki, Lagos`

  return { subject, text }
}
