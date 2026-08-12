// House of Refuge — shared outbound mail transport (Zoho Mail SMTP)
//
// Every email the platform sends goes through this module. It replaces the
// previous Resend HTTP API integration so that all mail leaves from the
// organisation's own Zoho mailbox rather than a third-party sending domain.
//
// Required env vars (set as Supabase function secrets, never committed):
//   ZOHO_SMTP_USER      — full mailbox address, e.g. "contact@houseofrefugeng.org"
//   ZOHO_SMTP_PASSWORD  — Zoho app-specific password (NOT the account password)
//
// Optional env vars:
//   ZOHO_SMTP_HOST      — default "smtp.zoho.com". Use smtp.zoho.eu / smtp.zoho.in
//                         / smtp.zoho.com.au if the account lives in that region.
//   ZOHO_SMTP_PORT      — default 465 (implicit TLS). 587 also works (STARTTLS).
//   MAIL_FROM_NAME      — display name, default "House of Refuge".
//   MAIL_REPLY_TO       — Reply-To, defaults to ZOHO_SMTP_USER.
//
// Zoho will reject any message whose From address is not the authenticated
// mailbox or one of its configured aliases, so `from` is always derived from
// ZOHO_SMTP_USER rather than taken from the caller.

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

export interface SendOptions {
  to: string | string[]
  subject: string
  html: string
  text: string
  bcc?: string | string[]
  replyTo?: string
}

export interface SendResult {
  ok: boolean
  accepted: string[]
  error?: string
}

const env = (k: string) => Deno.env.get(k) || ''

function asList(v: string | string[] | undefined): string[] {
  if (!v) return []
  const arr = Array.isArray(v) ? v : [v]
  return arr.flatMap(s => String(s).split(',')).map(s => s.trim()).filter(s => s.includes('@'))
}

/** Throws if the transport is not configured, so callers fail loudly at the edge. */
export function assertMailerConfigured(): void {
  if (!env('ZOHO_SMTP_USER') || !env('ZOHO_SMTP_PASSWORD')) {
    throw new Error(
      'Zoho SMTP is not configured. Run: supabase secrets set ' +
      'ZOHO_SMTP_USER=contact@houseofrefugeng.org ZOHO_SMTP_PASSWORD=<app-password>',
    )
  }
}

/**
 * Sends one message over Zoho SMTP.
 *
 * A fresh connection is opened per message and closed afterwards. Edge function
 * instances are short-lived and Zoho drops idle sessions, so pooling a client
 * across invocations reliably produces "connection closed" on the second send.
 * One retry covers transient handshake or greylisting failures.
 */
export async function sendMail(opts: SendOptions): Promise<SendResult> {
  assertMailerConfigured()

  const user = env('ZOHO_SMTP_USER')
  const fromName = env('MAIL_FROM_NAME') || 'House of Refuge'
  const to = asList(opts.to)
  const bcc = asList(opts.bcc)

  if (to.length === 0) return { ok: false, accepted: [], error: 'No valid recipient address' }

  const attempt = async (): Promise<void> => {
    const client = new SMTPClient({
      connection: {
        hostname: env('ZOHO_SMTP_HOST') || 'smtp.zoho.com',
        port: Number(env('ZOHO_SMTP_PORT') || 465),
        tls: (env('ZOHO_SMTP_PORT') || '465') === '465',
        auth: { username: user, password: env('ZOHO_SMTP_PASSWORD') },
      },
    })
    try {
      await client.send({
        from: `${fromName} <${user}>`,
        to,
        bcc: bcc.length ? bcc : undefined,
        replyTo: opts.replyTo || env('MAIL_REPLY_TO') || user,
        subject: opts.subject,
        content: opts.text,
        html: opts.html,
      })
    } finally {
      // close() can throw on an already-dropped socket; the send has happened by
      // then, so a failure here must not mask a successful delivery.
      try { await client.close() } catch { /* ignore */ }
    }
  }

  try {
    await attempt()
    return { ok: true, accepted: to }
  } catch (first) {
    try {
      await new Promise(r => setTimeout(r, 1200))
      await attempt()
      return { ok: true, accepted: to }
    } catch (second) {
      return {
        ok: false,
        accepted: [],
        error: `SMTP send failed (attempt 1: ${String((first as Error)?.message || first)}; ` +
               `attempt 2: ${String((second as Error)?.message || second)})`,
      }
    }
  }
}

// ── Shared branded shell ──────────────────────────────────
// Keeps every notification visually identical to the deposit-request email
// families already receive.

export const BRAND = {
  blue: '#1A5FAD',
  blueLight: '#F4F8FD',
  blueBorder: '#D9E5F2',
  phone: '0911 277 7600',
  phoneHref: '+2349112777600',
  site: 'https://www.houseofrefugeng.org',
}

/** Wraps body HTML in the House of Refuge masthead/footer table shell. */
export function shell(opts: { heading: string; subhead?: string; body: string; footnote?: string }): string {
  const { heading, subhead = '', body, footnote = '' } = opts
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f7f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#222">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f5;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <tr><td style="background:${BRAND.blue};padding:22px 28px;color:#fff">
          <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;letter-spacing:.3px">House of Refuge</div>
          <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-top:4px">A Freedom Foundation Initiative</div>
        </td></tr>
        <tr><td style="padding:28px 32px 8px 32px">
          <h1 style="font-family:Georgia,serif;font-size:22px;color:${BRAND.blue};margin:0 0 6px 0">${heading}</h1>
          ${subhead ? `<p style="font-size:14px;color:#666;margin:0 0 18px 0">${subhead}</p>` : ''}
        </td></tr>
        <tr><td style="padding:0 32px 24px 32px">${body}</td></tr>
        <tr><td style="padding:14px 32px;background:#f4f4f2;font-size:11.5px;color:#888;line-height:1.55">
          ${footnote || `This email is confidential and intended only for the named recipient. House of Refuge, Lekki, Lagos &middot; <a href="tel:${BRAND.phoneHref}" style="color:#888">${BRAND.phone}</a> &middot; <a href="${BRAND.site}" style="color:#888">houseofrefugeng.org</a>`}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

/** Renders a label/value table used by the internal staff alerts. */
export function detailRows(rows: Array<[string, unknown]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:6px;overflow:hidden">
    ${rows
      .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
      .map(([k, v]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#666;width:40%">${k}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#222;font-weight:600">${esc(String(v))}</td></tr>`)
      .join('')}
  </table>`
}

export function detailText(rows: Array<[string, unknown]>): string {
  return rows
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n')
}

/** Escapes user-supplied values before they land in an HTML email body. */
export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
