// House of Refuge — send-notification
//
// Called by Postgres (via pg_net) on every insert into a public submission
// table. Sends the internal staff alert and, where the event is configured for
// it, the applicant's confirmation. All mail goes out over Zoho SMTP.
//
// This function is deployed with --no-verify-jwt because the caller is the
// database, not a logged-in user. Authorisation is the shared secret in the
// x-notify-secret header, which is stored in private.notification_config and
// never leaves the server side.
//
// Required secrets:
//   ZOHO_SMTP_USER, ZOHO_SMTP_PASSWORD  — see _shared/mailer.ts
//   NOTIFY_WEBHOOK_SECRET               — must match private.notification_config
//   NOTIFY_STAFF_EMAILS                 — comma-separated internal recipients
//   PUBLIC_APP_URL                      — used to build dashboard deep links
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-injected

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { sendMail } from '../_shared/mailer.ts'
import { EVENTS } from '../_shared/templates.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const env = (k: string) => Deno.env.get(k) || ''

/** Length-independent comparison so a wrong secret can't be probed by timing. */
function secretMatches(given: string, expected: string): boolean {
  if (!expected) return false
  const a = new TextEncoder().encode(given)
  const b = new TextEncoder().encode(expected)
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return diff === 0
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  if (!secretMatches(req.headers.get('x-notify-secret') || '', env('NOTIFY_WEBHOOK_SECRET'))) {
    return json({ error: 'Unauthorized' }, 401)
  }

  let event = ''
  let record: Record<string, unknown> = {}
  try {
    const body = await req.json()
    event = String(body?.event || '')
    record = (body?.record || {}) as Record<string, unknown>
  } catch {
    return json({ error: 'Malformed JSON body' }, 400)
  }

  const def = EVENTS[event]
  if (!def) return json({ error: `Unknown event "${event}"` }, 400)

  const appUrl = (env('PUBLIC_APP_URL') || 'https://www.houseofrefugeng.org').replace(/\/$/, '')
  const built = def.build(record, appUrl)

  const admin = env('SUPABASE_SERVICE_ROLE_KEY')
    ? createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
    : null

  const results: Array<{ kind: string; to: string; ok: boolean; error?: string }> = []

  const record_id = typeof record.id === 'string' ? record.id : null

  const log = async (kind: string, to: string, ok: boolean, error?: string) => {
    results.push({ kind, to, ok, error })
    if (!admin) return
    // A logging failure must never turn a delivered email into a 500.
    try {
      await admin.from('notification_log').insert({
        event,
        source_table: def.table,
        record_id,
        recipient_kind: kind,
        recipient_email: to,
        status: ok ? 'sent' : 'failed',
        error: error ?? null,
      })
    } catch { /* ignore */ }
  }

  // ── Internal staff alert ────────────────────────────────
  if (def.staffAlert && built.staff) {
    const staff = env('NOTIFY_STAFF_EMAILS')
    if (!staff) {
      await log('staff', '', false, 'NOTIFY_STAFF_EMAILS is not configured')
    } else {
      const r = await sendMail({ to: staff, subject: built.staff.subject, html: built.staff.html, text: built.staff.text })
      await log('staff', staff, r.ok, r.error)
    }
  }

  // ── Applicant confirmation ──────────────────────────────
  if (def.applicantConfirm && built.applicant) {
    const to = built.applicant.to
    if (!to || !to.includes('@')) {
      await log('applicant', to || '', false, 'No usable applicant email on the record')
    } else {
      const m = built.applicant.msg
      const r = await sendMail({ to, subject: m.subject, html: m.html, text: m.text })
      await log('applicant', to, r.ok, r.error)
    }
  }

  const allOk = results.every(r => r.ok)
  // 502 on failure so the attempt is visible in net._http_response as well as
  // in notification_log; the row insert has already been committed regardless.
  return json({ ok: allOk, event, results }, allOk ? 200 : 502)
})
