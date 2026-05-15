// House of Refuge — get-deposit-application
//
// Public, no-auth endpoint. Returns ONLY the fields the /deposit/:appId page
// needs to render and gate the Paystack flow. Uses the service-role key
// server-side so we can drop the permissive anon SELECT policy on the
// applications table.
//
// Returned fields (whitelist — never expand without review):
//   id, first_name, email, pathway, deposit_paid, status, deposit_request_sent_at
//
// `email` is required so the Paystack checkout can be initiated from the
// browser. The link was sent to that email already, so a legitimate recipient
// learns nothing new. A malicious actor holding the UUID would already have
// the email if they intercepted the link.
//
// Notably NOT returned: last_name, phone, address, date_of_birth, clinical
// history, mental health, NOK, family info, etc. Anyone hitting the endpoint
// with a UUID gets only enough to know "is this a valid open application I
// can pay for, and what email should Paystack bill to?".
//
// Required env vars (auto-injected by Supabase):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy get-deposit-application --no-verify-jwt

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  // Accept either POST {applicationId} or GET ?id=
  let applicationId = ''
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      applicationId = String(body?.applicationId || body?.id || '').trim()
    } catch { /* fall through */ }
  } else if (req.method === 'GET') {
    const url = new URL(req.url)
    applicationId = (url.searchParams.get('id') || '').trim()
  } else {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (!applicationId || !UUID_RE.test(applicationId)) {
    return new Response(JSON.stringify({ error: 'Valid applicationId (UUID) required' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Whitelist — only the columns the deposit page renders + needs to gate.
  // first_name only (no last_name) so a leaked UUID doesn't reveal full identity.
  const { data, error } = await admin
    .from('applications')
    .select('id, first_name, email, pathway, deposit_paid, status, deposit_request_sent_at')
    .eq('id', applicationId)
    .maybeSingle()

  if (error) {
    return new Response(JSON.stringify({ error: 'Lookup failed' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (!data) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Don't leak applications that are in a state where deposit isn't expected.
  // Closed states return 404 too, so a leaked UUID for a declined application
  // gives no signal back.
  if (['declined', 'withdrawn', 'outpatient-pathway'].includes(data.status)) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
})
