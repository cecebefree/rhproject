// DEPLOY-BLOCKED: requires leads table migration (ITEM-23-DEP, see rows 40-41 spec)
// ITEM-23 — verify-turnstile Edge Function
// Server-side Turnstile verification for Front Desk web intake (Lovable-built forms).
// POST-only. Validates Cloudflare Turnstile token, writes lead row on success.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { failLoud } from '../_shared/error-envelope.ts'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
  }

  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) {
    return failLoud('TURNSTILE_SECRET_KEY not configured', undefined, 500)
  }

  try {
    const { token, name, email, phone, notes } = await req.json()

    if (!token || typeof token !== 'string') {
      return jsonResponse({ success: false, error: 'Missing or invalid token' }, 400)
    }

    const formData = new FormData()
    formData.append('secret', secret)
    formData.append('response', token)

    const result = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData,
    })

    const outcome = await result.json()

    if (!outcome.success) {
      return jsonResponse({ success: false, error: 'Turnstile verification failed' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { error: insertError } = await supabase.from('leads').insert({
      name: name || null,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
    })

    if (insertError) {
      return failLoud('lead_write_failed', insertError.message, 500)
    }

    return jsonResponse({ success: true })
  } catch (err) {
    return failLoud('Internal error', err instanceof Error ? err.message : String(err), 500)
  }
})
