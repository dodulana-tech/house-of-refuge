// House of Refuge — Admission Deposit Request Email Template
// Triggered by admin from the Admission Detail screen after the application
// has been reviewed and the candidate is being progressed to clinical assessment.
//
// Premise of the email:
//   1. The ₦1,000,000 deposit is FULLY REFUNDABLE.
//   2. Admission is conditional on the completion AND results of the clinical
//      assessments and diagnostic investigations.
//   3. Assessment / investigation costs are billed AGAINST the deposit ONLY
//      with the client's explicit consent — and only AFTER the client has been
//      selected for admission and has decided to proceed.
//   4. Until that consent is given, every Naira of the deposit remains
//      refundable on request.

const fmtNaira = (n) => `₦${Number(n).toLocaleString('en-NG')}`

export const DEPOSIT_AMOUNT_NAIRA = 1000000

// Indicative ranges only — finalised after the clinical interview decides
// which investigations apply. Listed for transparency, NOT to be auto-billed.
export const DEFAULT_ASSESSMENT_LINE_ITEMS = [
  { label: 'Clinical psychiatric assessment', range: '₦80,000 – ₦150,000' },
  { label: 'Psychosocial / addiction severity assessment (ASI, ASSIST)', range: '₦40,000 – ₦80,000' },
  { label: 'Full Blood Count (FBC)', range: '₦8,000 – ₦15,000' },
  { label: 'Liver Function Tests (LFT)', range: '₦15,000 – ₦25,000' },
  { label: 'Urea, Creatinine & Electrolytes', range: '₦12,000 – ₦20,000' },
  { label: 'Urine Drug Screen (multi-panel)', range: '₦15,000 – ₦30,000' },
  { label: 'HIV, Hepatitis B & C screening', range: '₦15,000 – ₦25,000' },
  { label: 'Malaria parasite & Widal', range: '₦5,000 – ₦10,000' },
  { label: 'Chest X-ray', range: '₦15,000 – ₦25,000' },
  { label: 'ECG (where indicated)', range: '₦10,000 – ₦20,000' },
]

export function buildDepositEmail({
  patientName = '',
  applicationId = '',
  pathway = '',
  reviewerName = 'House of Refuge Admissions',
  reviewerTitle = 'Admissions Coordinator',
  contactPhone = '09112777600',
  contactEmail = 'e.abutu@freedomfoundationng.org',
  paymentLink = '',
  amount = DEPOSIT_AMOUNT_NAIRA,
} = {}) {
  // Always include a payment link in the email. If the caller didn't supply
  // one, build it from the current origin (preview) using the appId.
  if (!paymentLink && applicationId && typeof window !== 'undefined') {
    paymentLink = `${window.location.origin}/deposit/${applicationId}`
  }
  const subject = `House of Refuge — Next Step: Refundable Admission Deposit (Application ${applicationId || ''})`.trim()

  const lineItemsHtml = DEFAULT_ASSESSMENT_LINE_ITEMS
    .map(i => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-size:13px;color:#333">${i.label}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;font-size:13px;color:#666;text-align:right;white-space:nowrap">${i.range}</td></tr>`)
    .join('')

  const lineItemsText = DEFAULT_ASSESSMENT_LINE_ITEMS
    .map(i => `  • ${i.label} — ${i.range}`)
    .join('\n')

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f7f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#222">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f5;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <tr><td style="background:#1A5FAD;padding:22px 28px;color:#fff">
          <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;letter-spacing:.3px">House of Refuge</div>
          <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-top:4px">A Freedom Foundation Initiative</div>
        </td></tr>

        <tr><td style="padding:28px 32px 8px 32px">
          <h1 style="font-family:Georgia,serif;font-size:22px;color:#1A5FAD;margin:0 0 6px 0">Next step in your admission process</h1>
          <p style="font-size:14px;color:#666;margin:0 0 18px 0">Application reference: <strong>${applicationId || '—'}</strong>${pathway ? ` &middot; Pathway ${pathway}` : ''}</p>

          <p style="font-size:15px;line-height:1.6;color:#333">Dear ${patientName || 'Applicant'},</p>

          <p style="font-size:15px;line-height:1.6;color:#333">
            Thank you for submitting an application to the House of Refuge 12-week residential rehabilitation programme. Your application has been received and reviewed by our admissions team, and we are inviting you to proceed to the next stage: <strong>clinical assessment and diagnostic investigations</strong>.
          </p>

          <p style="font-size:15px;line-height:1.6;color:#333">
            To reserve your assessment slot we ask for a <strong>fully refundable booking deposit of ${fmtNaira(amount)}</strong>. <strong>The clinical assessment cannot begin until this deposit is received.</strong> Please read the terms below carefully — they are designed to protect you.
          </p>
        </td></tr>

        <tr><td style="padding:0 32px">
          <div style="background:#F4F8FD;border:1px solid #D9E5F2;border-radius:8px;padding:18px 20px;margin:8px 0 20px 0">
            <div style="font-size:13px;font-weight:700;color:#1A5FAD;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">How the deposit works</div>
            <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#333">
              <li><strong>The deposit is fully refundable.</strong> It does not commit you to anything beyond the assessment stage. You may withdraw your application at any time and receive a full refund.</li>
              <li><strong>Admission is not yet confirmed.</strong> Final admission is conditional on the completion <em>and</em> the results of the clinical assessments and diagnostic investigations described below.</li>
              <li><strong>Assessment costs are only billed against the deposit with your written consent</strong> — and only after you have been selected for admission and confirmed that you wish to proceed. Until you give that consent, the full deposit remains held in trust on your behalf.</li>
              <li><strong>If you are not selected, or you choose not to proceed, the unused balance is refunded in full</strong> within 7 working days of the decision.</li>
            </ol>
          </div>
        </td></tr>

        <tr><td style="padding:0 32px">
          <div style="font-size:13px;font-weight:700;color:#1A5FAD;text-transform:uppercase;letter-spacing:.08em;margin:8px 0 8px 0">What happens next</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
            <tr><td style="font-size:14px;line-height:1.7;color:#333;padding:6px 0"><strong>1. Deposit received</strong> — your assessment slot is reserved and held under your name.</td></tr>
            <tr><td style="font-size:14px;line-height:1.7;color:#333;padding:6px 0"><strong>2. Clinical assessment</strong> — our medical team conducts the psychiatric, psychosocial, and medical evaluations needed to determine clinical suitability for residential care.</td></tr>
            <tr><td style="font-size:14px;line-height:1.7;color:#333;padding:6px 0"><strong>3. Admission decision</strong> — you receive a written decision: <em>Admit</em>, <em>Refer</em>, or <em>Defer</em>. You are also given a clear breakdown of any assessment costs incurred.</td></tr>
            <tr><td style="font-size:14px;line-height:1.7;color:#333;padding:6px 0"><strong>4. Your decision</strong> — if admitted, you decide whether to proceed. Only at this point, and only with your written consent, are assessment costs deducted from the deposit and the balance applied to treatment fees. If you decline, the deposit is returned in full minus only the costs you have explicitly authorised.</td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 32px">
          <div style="font-size:13px;font-weight:700;color:#1A5FAD;text-transform:uppercase;letter-spacing:.08em;margin:14px 0 8px 0">Indicative assessment & investigation costs</div>
          <p style="font-size:13px;color:#666;margin:0 0 10px 0;line-height:1.6">
            For full transparency, here is the typical cost range of the assessments and investigations that may be required. The actual list will depend on your clinical profile and will be agreed with you in writing before anything is billed against your deposit. <strong>Nothing is charged without your consent.</strong>
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:6px;overflow:hidden;margin-bottom:16px">
            ${lineItemsHtml}
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 8px 32px">
          <div style="background:#FEF7E6;border:1px solid #F0D77A;border-radius:8px;padding:14px 18px;margin:6px 0 18px 0">
            <div style="font-size:13px;font-weight:700;color:#7A5A15;margin-bottom:4px">Your refund right</div>
            <div style="font-size:13.5px;line-height:1.6;color:#7A5A15">
              You may request a refund of any unused balance at any point before you have given written consent for assessment costs to be billed. Refunds are processed within 7 working days to the same account from which the deposit was paid.
            </div>
          </div>
        </td></tr>

        <tr><td align="center" style="padding:6px 32px 24px 32px">
          <a href="${paymentLink}" style="display:inline-block;background:#1A5FAD;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:6px">Pay refundable deposit (${fmtNaira(amount)})</a>
          <div style="font-size:12px;color:#666;margin-top:10px;word-break:break-all">Or copy this link: <a href="${paymentLink}" style="color:#1A5FAD">${paymentLink}</a></div>
          <div style="font-size:12px;color:#888;margin-top:6px">Secured by Paystack &middot; Bank transfer alternative available on request</div>
        </td></tr>

        <tr><td style="padding:8px 32px 28px 32px;border-top:1px solid #eee">
          <p style="font-size:14px;line-height:1.6;color:#333;margin:14px 0 6px 0">
            If you have any questions before paying, please call us on <a href="tel:${contactPhone}" style="color:#1A5FAD">${contactPhone}</a> or reply to this email at <a href="mailto:${contactEmail}" style="color:#1A5FAD">${contactEmail}</a>. We are happy to walk through the terms with you and your family.
          </p>
          <p style="font-size:14px;line-height:1.6;color:#333;margin:14px 0 4px 0">Warm regards,</p>
          <p style="font-size:14px;line-height:1.4;color:#333;margin:0">
            <strong>${reviewerName}</strong><br/>
            <span style="color:#666;font-size:13px">${reviewerTitle}, House of Refuge</span>
          </p>
        </td></tr>

        <tr><td style="padding:14px 32px;background:#f4f4f2;font-size:11.5px;color:#888;line-height:1.55">
          This email is confidential and intended only for the named recipient. The deposit terms above are part of the House of Refuge admission policy and supersede any prior verbal communication. They will be re-stated in the written Financial Agreement signed at intake.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  const text = `Dear ${patientName || 'Applicant'},

Thank you for submitting an application to the House of Refuge 12-week residential rehabilitation programme. Your application has been reviewed and we are inviting you to proceed to the next stage: clinical assessment and diagnostic investigations.

Application reference: ${applicationId || '—'}${pathway ? ` (Pathway ${pathway})` : ''}

To reserve your assessment slot we ask for a fully refundable booking deposit of ${fmtNaira(amount)}. The clinical assessment cannot begin until this deposit is received.

HOW THE DEPOSIT WORKS
1. The deposit is fully refundable. It does not commit you to anything beyond the assessment stage.
2. Admission is not yet confirmed. Final admission is conditional on the completion AND the results of the clinical assessments and diagnostic investigations.
3. Assessment costs are only billed against the deposit with your written consent — and only after you have been selected for admission and confirmed you wish to proceed.
4. If you are not selected, or you choose not to proceed, the unused balance is refunded in full within 7 working days.

WHAT HAPPENS NEXT
1. Deposit received — your assessment slot is reserved.
2. Clinical assessment — psychiatric, psychosocial, and medical evaluations.
3. Admission decision — Admit / Refer / Defer, with a clear cost breakdown.
4. Your decision — only if you choose to proceed and give written consent are assessment costs deducted from the deposit and the balance applied to treatment fees.

INDICATIVE ASSESSMENT & INVESTIGATION COSTS (illustrative — nothing is billed without your consent):
${lineItemsText}

YOUR REFUND RIGHT
You may request a refund of any unused balance at any point before you have given written consent for assessment costs to be billed. Refunds are processed within 7 working days.

PAY REFUNDABLE DEPOSIT
${paymentLink}

If you have any questions, call ${contactPhone} or reply to ${contactEmail}.

Warm regards,
${reviewerName}
${reviewerTitle}, House of Refuge`

  return { subject, html, text }
}
