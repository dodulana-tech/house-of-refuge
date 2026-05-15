// House of Refuge — send-deposit-request
//
// Triggered by admin from the Admission Detail screen. Sends the refundable-
// deposit request email to the applicant via Resend, then stamps the
// applications row so the admin UI can show "deposit request sent <date>".
//
// Required env vars (set in Supabase → Project Settings → Edge Functions):
//   RESEND_API_KEY            — Resend API key
//   DEPOSIT_FROM_EMAIL        — verified sender, e.g. "House of Refuge <admissions@houseofrefuge.org>"
//   DEPOSIT_BCC_EMAIL         — optional, e.g. "admin@..." (so admin keeps a copy)
//   PUBLIC_APP_URL            — site root, e.g. "https://houseofrefuge.org" (used to build payment link)
//   SUPABASE_URL              — auto-injected
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected
//
// Deploy with:
//   supabase functions deploy send-deposit-request --no-verify-jwt=false

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  applicationId: string
  recipientEmail: string
  recipientName?: string
  pathway?: string
  paymentLink?: string
  reviewerName?: string
  reviewerTitle?: string
  amountNaira?: number
}

const DEPOSIT_LINE_ITEMS = [
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

const fmt = (n: number) => `₦${n.toLocaleString('en-NG')}`

function buildEmail(opts: {
  patientName: string
  applicationId: string
  pathway: string
  paymentLink: string
  reviewerName: string
  reviewerTitle: string
  amount: number
  contactPhone: string
  contactEmail: string
}) {
  const { patientName, applicationId, pathway, paymentLink, reviewerName, reviewerTitle, amount, contactPhone, contactEmail } = opts

  const subject = `House of Refuge — Next Step: Refundable Admission Deposit (Application ${applicationId})`

  const lineItemsHtml = DEPOSIT_LINE_ITEMS
    .map(i => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-size:13px;color:#333">${i.label}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;font-size:13px;color:#666;text-align:right;white-space:nowrap">${i.range}</td></tr>`)
    .join('')

  const lineItemsText = DEPOSIT_LINE_ITEMS.map(i => `  • ${i.label} — ${i.range}`).join('\n')

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
          <p style="font-size:14px;color:#666;margin:0 0 18px 0">Application reference: <strong>${applicationId}</strong>${pathway ? ` &middot; Pathway ${pathway}` : ''}</p>
          <p style="font-size:15px;line-height:1.6;color:#333">Dear ${patientName || 'Applicant'},</p>
          <p style="font-size:15px;line-height:1.6;color:#333">
            Thank you for submitting an application to the House of Refuge 12-week residential rehabilitation programme. Your application has been received and reviewed by our admissions team, and we are inviting you to proceed to the next stage: <strong>clinical assessment and diagnostic investigations</strong>.
          </p>
          <p style="font-size:15px;line-height:1.6;color:#333">
            To reserve your assessment slot we ask for a <strong>fully refundable booking deposit of ${fmt(amount)}</strong>. <strong>The clinical assessment cannot begin until this deposit is received.</strong> Please read the terms below carefully — they are designed to protect you.
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
            <tr><td style="font-size:14px;line-height:1.7;color:#333;padding:6px 0"><strong>1. Deposit received</strong> — your assessment slot is reserved.</td></tr>
            <tr><td style="font-size:14px;line-height:1.7;color:#333;padding:6px 0"><strong>2. Clinical assessment</strong> — psychiatric, psychosocial, and medical evaluations.</td></tr>
            <tr><td style="font-size:14px;line-height:1.7;color:#333;padding:6px 0"><strong>3. Admission decision</strong> — Admit / Refer / Defer, with a clear cost breakdown.</td></tr>
            <tr><td style="font-size:14px;line-height:1.7;color:#333;padding:6px 0"><strong>4. Your decision</strong> — only if you choose to proceed and give written consent are assessment costs deducted from the deposit; the balance is applied to treatment fees. If you decline, the deposit is returned in full minus only the costs you have explicitly authorised.</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px">
          <div style="font-size:13px;font-weight:700;color:#1A5FAD;text-transform:uppercase;letter-spacing:.08em;margin:14px 0 8px 0">Indicative assessment & investigation costs</div>
          <p style="font-size:13px;color:#666;margin:0 0 10px 0;line-height:1.6">
            For full transparency, here is the typical cost range. The actual list will depend on your clinical profile and will be agreed with you in writing before anything is billed against your deposit. <strong>Nothing is charged without your consent.</strong>
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
          <a href="${paymentLink}" style="display:inline-block;background:#1A5FAD;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:6px">Pay refundable deposit (${fmt(amount)})</a>
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

Application reference: ${applicationId}${pathway ? ` (Pathway ${pathway})` : ''}

To reserve your assessment slot we ask for a fully refundable booking deposit of ${fmt(amount)}. The clinical assessment cannot begin until this deposit is received.

HOW THE DEPOSIT WORKS
1. The deposit is fully refundable. It does not commit you to anything beyond the assessment stage.
2. Admission is not yet confirmed. Final admission is conditional on the completion AND the results of the clinical assessments and diagnostic investigations.
3. Assessment costs are only billed against the deposit with your written consent — and only after you have been selected for admission and confirmed you wish to proceed.
4. If you are not selected, or you choose not to proceed, the unused balance is refunded in full within 7 working days.

WHAT HAPPENS NEXT
1. Deposit received — your assessment slot is reserved.
2. Clinical assessment — psychiatric, psychosocial, and medical evaluations.
3. Admission decision — Admit / Refer / Defer, with a clear cost breakdown.
4. Your decision — only if you choose to proceed and give written consent are assessment costs deducted from the deposit; the balance is applied to treatment fees.

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  try {
    const body = await req.json() as RequestBody
    const {
      applicationId,
      recipientEmail,
      recipientName = '',
      pathway = '',
      paymentLink: clientPaymentLink = '',
      reviewerName = 'House of Refuge Admissions',
      reviewerTitle = 'Admissions Coordinator',
      amountNaira = 1_000_000,
    } = body

    if (!applicationId || !recipientEmail || !recipientEmail.includes('@')) {
      return new Response(JSON.stringify({ error: 'applicationId and a valid recipientEmail are required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Authenticate the caller via the JWT forwarded by the Supabase client.
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') || ''
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userRes } = await userClient.auth.getUser()
    const caller = userRes?.user
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // Confirm caller is staff/admin.
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: profile } = await admin.from('profiles').select('role').eq('id', caller.id).single()
    if (!profile || !['staff', 'admin'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // Build payment link. Prefer admin override, otherwise auto-generate.
    // PUBLIC_APP_URL must be set as a function secret — without it we cannot
    // produce a working link, and an email without a link defeats the purpose.
    const publicAppUrl = Deno.env.get('PUBLIC_APP_URL') || ''
    if (!clientPaymentLink && !publicAppUrl) {
      return new Response(JSON.stringify({ error: 'PUBLIC_APP_URL is not configured on the function. Run: supabase secrets set PUBLIC_APP_URL=https://www.houseofrefugeng.org' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const paymentLink = clientPaymentLink || `${publicAppUrl.replace(/\/$/, '')}/deposit/${applicationId}`

    const { subject, html, text } = buildEmail({
      patientName: recipientName,
      applicationId,
      pathway,
      paymentLink,
      reviewerName,
      reviewerTitle,
      amount: amountNaira,
      contactPhone: '09011277600',
      contactEmail: 'e.abutu@freedomfoundationng.org',
    })

    // Send via Resend.
    const fromEmail = Deno.env.get('DEPOSIT_FROM_EMAIL') || 'House of Refuge <admissions@houseofrefuge.org>'
    const bccEmail = Deno.env.get('DEPOSIT_BCC_EMAIL') || ''
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not configured on the function' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        bcc: bccEmail ? [bccEmail] : undefined,
        subject,
        html,
        text,
        tags: [{ name: 'category', value: 'deposit-request' }, { name: 'application_id', value: applicationId }],
      }),
    })

    if (!resendRes.ok) {
      const errText = await resendRes.text()
      return new Response(JSON.stringify({ error: 'Resend failed', detail: errText }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const resend = await resendRes.json()

    // Stamp the application row.
    const sentAt = new Date().toISOString()
    const { data: existing } = await admin
      .from('applications')
      .select('deposit_request_count')
      .eq('id', applicationId)
      .single()
    const nextCount = (existing?.deposit_request_count ?? 0) + 1
    await admin.from('applications').update({
      deposit_request_sent_at: sentAt,
      deposit_request_sent_by: caller.id,
      deposit_request_recipient_email: recipientEmail,
      deposit_request_count: nextCount,
    }).eq('id', applicationId)

    return new Response(JSON.stringify({ ok: true, sentAt, resendId: resend.id }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error', detail: String(err?.message || err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
