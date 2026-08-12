// House of Refuge — send-notification
//
// Receives an insert event from a Postgres trigger (via pg_net) and sends the
// staff alert and, where enabled, the applicant confirmation over Zoho SMTP.
// Every attempt is written to `notification_log` so a missed email is
// diagnosable after the fact rather than invisible.
//
// This function is deployed WITHOUT JWT verification because pg_net calls it
// from the database with no user session. Authorisation is the shared secret in
// the x-notify-secret header, which only the trigger config table holds.
//
// Required env vars:
//   ZOHO_SMTP_USER, ZOHO_SMTP_PASSWORD  — see _shared/mailer.ts
//   NOTIFY_WEBHOOK_SECRET               — must match private.notification_config.webhook_secret
//   NOTIFY_STAFF_EMAILS                 — comma-separated internal recipients
//   PUBLIC_APP_URL                      — dashboard link base, e.g. https://www.houseofrefugeng.org
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-injected
//
// Deploy with:
//   supabase functions deploy send-notification --no-verify-jwt

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { sendMail } from '../_shared/mailer.ts'
import { EVENTS } from '../_shared/templates.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Constant-ish comparison; the secret is high-entropy so length-leak is moot.
  const expected = Deno.env.get('NOTIFY_WEBHOOK_SECRET') || ''
  if (!expected) return json({ error: 'NOTIFY_WEBHOOK_SECRET is not configured on the function' }, 500)
  if (req.headers.get('x-notify-secret') !== expected) return json({ error: 'Unauthorized' }, 401)

  let payload: { event?: string; record_id?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const eventKey = String(payload.event || '')
  const recordId = String(payload.record_id || '')
  const def = EVENTS[eventKey]
  if (!def) return json({ error: `Unknown event "${eventKey}"` }, 400)
  if (!recordId) return json({ error: 'record_id is required' }, 400)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // The trigger sends only the row id, so the row body never sits in pg_net's
  // queue. Read it here with the service role.
  const { data: record, error: readErr } = await admin
    .from(def.table).select('*').eq('id', recordId).single()
  if (readErr || !record) {
    return json({ error: `Could not read ${def.table}/${recordId}`, detail: readErr?.message }, 404)
  }

  const dashboardUrl = (Deno.env.get('PUBLIC_APP_URL') || 'https://www.houseofrefugeng.org').replace(/\/$/, '')
  const staffTo = (Deno.env.get('NOTIFY_STAFF_EMAILS') || '')
    .split(',').map(s => s.trim()).filter(s => s.includes('@'))

  const built = def.build(record as Record<string, unknown>, dashboardUrl)
  const results: Array<Record<string, unknown>> = []

  // sendMail throws when the SMTP secrets are missing. Convert that into a
  // logged failure so a misconfiguration is visible in notification_log rather
  // than an opaque 500 with no trace of who should have been emailed.
  const safeSend = async (args: Parameters<typeof sendMail>[0]) => {
    try {
      return await sendMail(args)
    } catch (err) {
      return { ok: false, accepted: [], error: String((err as Error)?.message || err) }
    }
  }

  const log = async (kind: string, to: string[], ok: boolean, error?: string) => {
    results.push({ kind, to, ok, error })
    // A logging failure must never turn a delivered email into a 500.
    try {
      await admin.from('notification_log').insert({
        event: eventKey,
        source_table: def.table,
        record_id: recordId,
        kind,
        recipients: to,
        status: ok ? 'sent' : 'failed',
        error: error || null,
      })
    } catch { /* ignore */ }
  }

  // Staff alert.
  if (def.staffAlert && built.staff) {
    if (staffTo.length === 0) {
      await log('staff', [], false, 'NOTIFY_STAFF_EMAILS is empty — nobody to alert')
    } else {
      const r = await safeSend({ to: staffTo, ...built.staff })
      await log('staff', staffTo, r.ok, r.error)
    }
  }

  // Applicant confirmation, only where the event opts in.
  if (def.applicantConfirm && built.applicant) {
    const to = built.applicant.to
    if (!to || !to.includes('@')) {
      await log('applicant', [], false, 'No usable applicant address on the record')
    } else {
      const r = await safeSend({ to, ...built.applicant.msg })
      await log('applicant', [to], r.ok, r.error)
    }
  }

  // Always 200 when the payload was understood: pg_net does not retry, and a
  // non-2xx here just produces noise in net._http_response. The log table and
  // the `ok` field below are the real signal.
  return json({ ok: results.every(r => r.ok !== false), event: eventKey, results })
})
