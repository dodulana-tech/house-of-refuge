// House of Refuge — notification email templates
//
// One entry per public submission event. Each entry decides who hears about a
// submission and what they read.
//
//   staffAlert       — internal alert to NOTIFY_STAFF_EMAILS. On for everything:
//                      no public submission should land silently.
//   applicantConfirm — automated acknowledgement to the person who submitted.
//                      Deliberately OFF for financial assistance and donations
//                      (see the note on each). Flip the flag to turn one on;
//                      the template underneath is already written.

import { BRAND, detailRows, detailText, esc, shell } from './mailer.ts'

export interface Message { subject: string; html: string; text: string }
export interface Built { staff?: Message; applicant?: { to: string; msg: Message } }

const money = (n: unknown) => {
  const v = Number(n)
  return Number.isFinite(v) && v > 0 ? `₦${v.toLocaleString('en-NG')}` : ''
}

const when = (iso: unknown) => {
  if (!iso) return ''
  const d = new Date(String(iso))
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('en-NG', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Lagos' })
}

const name = (r: Record<string, unknown>, first = 'first_name', last = 'last_name') =>
  [r[first], r[last]].filter(Boolean).join(' ').trim()

const cta = (href: string, label: string) =>
  `<div style="margin:18px 0 4px 0"><a href="${href}" style="display:inline-block;background:${BRAND.blue};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:6px">${label}</a></div>`

const signoff = `<p style="font-size:14px;line-height:1.6;color:#333;margin:18px 0 4px 0">If you have questions in the meantime, call us on <a href="tel:${BRAND.phoneHref}" style="color:${BRAND.blue}">${BRAND.phone}</a>.</p>
<p style="font-size:14px;line-height:1.6;color:#333;margin:14px 0 0 0">Warm regards,<br/><strong>The Admissions Team</strong><br/><span style="color:#666;font-size:13px">House of Refuge</span></p>`

const signoffText = `\nIf you have questions in the meantime, call us on ${BRAND.phone}.\n\nWarm regards,\nThe Admissions Team\nHouse of Refuge`

export interface EventDef {
  table: string
  label: string
  staffAlert: boolean
  applicantConfirm: boolean
  /** Which column holds the address the confirmation goes to. */
  applicantEmailFields: string[]
  build: (r: Record<string, unknown>, dashboardUrl: string) => Built
}

export const EVENTS: Record<string, EventDef> = {
  // ── Residential application / waitlist ──────────────────
  application_submitted: {
    table: 'applications',
    label: 'Residential application',
    staffAlert: true,
    applicantConfirm: true,
    applicantEmailFields: ['email'],
    build: (r, dashboardUrl) => {
      const who = name(r) || 'Applicant'
      const ref = String(r.id || '').slice(0, 8).toUpperCase()
      const rows: Array<[string, unknown]> = [
        ['Applicant', who],
        ['Email', r.email],
        ['Phone', r.phone],
        ['Pathway', r.pathway],
        ['Primary substance', r.substance_other || r.substance],
        ['Duration', r.duration],
        ['Seeking voluntarily', r.seeking_voluntarily],
        ['Previous treatment', r.prev_treatment],
        ['Submitted', when(r.created_at) || 'just now'],
      ]
      return {
        staff: {
          subject: `New residential application — ${who} (${ref})`,
          html: shell({
            heading: 'New residential application',
            subhead: `Reference ${ref}`,
            body: `${detailRows(rows)}${cta(`${dashboardUrl}/dashboard/admissions`, 'Open in dashboard')}
              <p style="font-size:13px;color:#666;margin-top:14px">Clinical detail is deliberately not included in this alert. Open the dashboard for the full submission.</p>`,
          }),
          text: `New residential application\n\n${detailText(rows)}\n\nOpen: ${dashboardUrl}/dashboard/admissions\n\nClinical detail is deliberately not included in this alert.`,
        },
        applicant: {
          to: String(r.email || ''),
          msg: {
            subject: `We have received your application — House of Refuge (${ref})`,
            html: shell({
              heading: 'Your application has been received',
              subhead: `Reference ${ref}`,
              body: `<p style="font-size:15px;line-height:1.6;color:#333">Dear ${esc(who)},</p>
                <p style="font-size:15px;line-height:1.6;color:#333">Thank you for reaching out to House of Refuge. Your application has reached our admissions team and is now in review.</p>
                <div style="background:${BRAND.blueLight};border:1px solid ${BRAND.blueBorder};border-radius:8px;padding:16px 20px;margin:16px 0">
                  <div style="font-size:13px;font-weight:700;color:${BRAND.blue};text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">What happens next</div>
                  <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#333">
                    <li>A member of our admissions team reviews your submission.</li>
                    <li>We call you to talk through suitability and answer your questions.</li>
                    <li>If residential care is the right fit, we invite you to clinical assessment.</li>
                  </ol>
                </div>
                <p style="font-size:15px;line-height:1.6;color:#333">Please keep reference <strong>${ref}</strong> to hand when you speak to us. Nothing is committed at this stage, and there is no charge for the review.</p>
                ${signoff}`,
            }),
            text: `Dear ${who},\n\nThank you for reaching out to House of Refuge. Your application has reached our admissions team and is now in review.\n\nWHAT HAPPENS NEXT\n1. A member of our admissions team reviews your submission.\n2. We call you to talk through suitability and answer your questions.\n3. If residential care is the right fit, we invite you to clinical assessment.\n\nPlease keep reference ${ref} to hand when you speak to us. Nothing is committed at this stage, and there is no charge for the review.\n${signoffText}`,
          },
        },
      }
    },
  },

  // ── Outpatient booking ──────────────────────────────────
  outpatient_booked: {
    table: 'outpatient_bookings',
    label: 'Outpatient booking',
    staffAlert: true,
    applicantConfirm: true,
    applicantEmailFields: ['booker_email', 'patient_email'],
    build: (r, dashboardUrl) => {
      const who = String(r.booker_name || r.patient_name || 'there')
      const ref = String(r.reference_code || '')
      const slot = when(r.scheduled_at)
      const rows: Array<[string, unknown]> = [
        ['Reference', ref],
        ['Patient', r.patient_name],
        ['Booked by', r.booker_name ? `${r.booker_name} (${r.booker_relationship || 'relationship not given'})` : 'Self'],
        ['Email', r.booker_email || r.patient_email],
        ['Phone', r.booker_phone || r.patient_phone],
        ['Appointment', slot],
        ['Status', r.status],
        ['Payment', r.payment_status],
        ['Amount', money(r.amount_paid_ngn)],
        ['Notes', r.notes_from_booker],
      ]
      return {
        staff: {
          subject: `New outpatient booking — ${r.patient_name || 'patient'} (${ref})`,
          html: shell({
            heading: 'New outpatient booking',
            subhead: slot ? `Requested for ${slot}` : `Reference ${ref}`,
            body: `${detailRows(rows)}${cta(`${dashboardUrl}/dashboard/outpatient-bookings`, 'Open in dashboard')}`,
          }),
          text: `New outpatient booking\n\n${detailText(rows)}\n\nOpen: ${dashboardUrl}/dashboard/outpatient-bookings`,
        },
        applicant: {
          to: String(r.booker_email || r.patient_email || ''),
          msg: {
            subject: `Your outpatient appointment request — House of Refuge (${ref})`,
            html: shell({
              heading: 'We have received your booking',
              subhead: `Reference ${ref}`,
              body: `<p style="font-size:15px;line-height:1.6;color:#333">Dear ${esc(who)},</p>
                <p style="font-size:15px;line-height:1.6;color:#333">Thank you for booking with House of Refuge Outpatient Services. Here is what we have recorded:</p>
                ${detailRows([['Reference', ref], ['Patient', r.patient_name], ['Requested slot', slot], ['Status', r.status]])}
                <p style="font-size:15px;line-height:1.6;color:#333;margin-top:16px">Our team will confirm the appointment by phone. ${r.payment_status === 'unpaid' ? 'Your slot is held once payment is received.' : ''}</p>
                ${signoff}`,
            }),
            text: `Dear ${who},\n\nThank you for booking with House of Refuge Outpatient Services. Here is what we have recorded:\n\n${detailText([['Reference', ref], ['Patient', r.patient_name], ['Requested slot', slot], ['Status', r.status]])}\n\nOur team will confirm the appointment by phone.${r.payment_status === 'unpaid' ? ' Your slot is held once payment is received.' : ''}\n${signoffText}`,
          },
        },
      }
    },
  },

  // ── Financial assistance ────────────────────────────────
  // Applicant confirmation is OFF by design. A need-based assistance request is
  // sensitive, and an automated email can land in a shared family inbox and out
  // someone's circumstances. Admissions acknowledges these by phone instead.
  financial_assistance_submitted: {
    table: 'financial_assistance_applications',
    label: 'Financial assistance request',
    staffAlert: true,
    applicantConfirm: false,
    applicantEmailFields: ['applicant_email'],
    build: (r, dashboardUrl) => {
      const ref = String(r.reference_code || '')
      const rows: Array<[string, unknown]> = [
        ['Reference', ref],
        ['Applicant', r.applicant_name],
        ['Relationship', r.applicant_relationship],
        ['Email', r.applicant_email],
        ['Phone', r.applicant_phone],
        ['Patient', r.patient_name],
        ['Household size', r.household_size],
        ['Income band', r.monthly_income_band],
        ['Referrer', r.pastoral_referrer_name ? `${r.pastoral_referrer_name} (${r.pastoral_referrer_org || 'org not given'})` : ''],
        ['Documents', Array.isArray(r.documents) ? `${(r.documents as unknown[]).length} attached` : ''],
        ['Status', r.status],
      ]
      return {
        staff: {
          subject: `New financial assistance request — ${r.applicant_name || 'applicant'} (${ref})`,
          html: shell({
            heading: 'New financial assistance request',
            subhead: `Reference ${ref}`,
            body: `${detailRows(rows)}${cta(`${dashboardUrl}/dashboard/financial-assistance`, 'Review request')}
              <p style="font-size:13px;color:#666;margin-top:14px">Handle in confidence. The applicant has not been sent an automated acknowledgement; please follow up by phone.</p>`,
            footnote: 'Confidential — Freedom Foundation need-based assistance. Do not forward.',
          }),
          text: `New financial assistance request\n\n${detailText(rows)}\n\nReview: ${dashboardUrl}/dashboard/financial-assistance\n\nHandle in confidence. The applicant has NOT been sent an automated acknowledgement; follow up by phone.`,
        },
        applicant: {
          to: String(r.applicant_email || ''),
          msg: {
            subject: `We have received your request — House of Refuge (${ref})`,
            html: shell({
              heading: 'Your request has been received',
              subhead: `Reference ${ref}`,
              body: `<p style="font-size:15px;line-height:1.6;color:#333">Dear ${esc(String(r.applicant_name || 'there'))},</p>
                <p style="font-size:15px;line-height:1.6;color:#333">Thank you for your submission. It has reached our team and is being reviewed in confidence. We will contact you by phone to discuss the next steps.</p>
                <p style="font-size:15px;line-height:1.6;color:#333">Please keep reference <strong>${ref}</strong> to hand when we speak.</p>
                ${signoff}`,
            }),
            text: `Dear ${r.applicant_name || 'there'},\n\nThank you for your submission. It has reached our team and is being reviewed in confidence. We will contact you by phone to discuss the next steps.\n\nPlease keep reference ${ref} to hand when we speak.\n${signoffText}`,
          },
        },
      }
    },
  },

  // ── Donation pledge ─────────────────────────────────────
  // Applicant (donor) confirmation is OFF by design: `donations` rows start as
  // an unverified 'pledged' intent, so an automatic "thank you for your gift"
  // would acknowledge money that has not arrived. Turn on once pledges are
  // reconciled against Paystack.
  donation_pledged: {
    table: 'donations',
    label: 'Donation pledge',
    staffAlert: true,
    applicantConfirm: false,
    applicantEmailFields: ['email'],
    build: (r, dashboardUrl) => {
      const who = name(r) || 'Donor'
      const rows: Array<[string, unknown]> = [
        ['Donor', who],
        ['Email', r.email],
        ['Phone', r.phone],
        ['Amount pledged', money(r.amount) || 'Not specified'],
        ['Message', r.message],
        ['Status', r.status],
        ['Received', when(r.created_at) || 'just now'],
      ]
      return {
        staff: {
          subject: `New donation pledge — ${who}${money(r.amount) ? ` (${money(r.amount)})` : ''}`,
          html: shell({
            heading: 'New donation pledge',
            body: `${detailRows(rows)}${cta(`${dashboardUrl}/dashboard/donations`, 'Open donations')}
              <p style="font-size:13px;color:#666;margin-top:14px">This is a pledge, not a confirmed payment. No acknowledgement has been sent to the donor.</p>`,
          }),
          text: `New donation pledge\n\n${detailText(rows)}\n\nOpen: ${dashboardUrl}/dashboard/donations\n\nThis is a pledge, not a confirmed payment. No acknowledgement has been sent to the donor.`,
        },
        applicant: {
          to: String(r.email || ''),
          msg: {
            subject: 'Thank you for supporting House of Refuge',
            html: shell({
              heading: 'Thank you',
              body: `<p style="font-size:15px;line-height:1.6;color:#333">Dear ${esc(who)},</p>
                <p style="font-size:15px;line-height:1.6;color:#333">Thank you for standing with House of Refuge. Your support helps a family in Lagos find their way back.</p>
                ${signoff}`,
            }),
            text: `Dear ${who},\n\nThank you for standing with House of Refuge. Your support helps a family in Lagos find their way back.\n${signoffText}`,
          },
        },
      }
    },
  },
}
