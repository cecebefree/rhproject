import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_MAX_LENGTH = 28
const TRUNCATION_THRESHOLD = 26

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Require authenticated user
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)
  if (userError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Service-role client for data operations (bypasses RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { text, feature_key, enabled } = await req.json()

    // Validate text input
    if (text === undefined || text === null || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid text field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Truncation logic: 26 chars + ellipsis if over 28
    const maxLen = DEFAULT_MAX_LENGTH
    let truncated = text
    let was_truncated = false

    if (text.length > maxLen) {
      was_truncated = true
      truncated = text.slice(0, TRUNCATION_THRESHOLD) + '...'
    }

    // Feature toggle validation (if feature_key provided)
    let toggle_valid = true
    let toggle_message = 'no toggle checked'

    if (feature_key && typeof feature_key === 'string') {
      if (typeof enabled !== 'boolean') {
        return new Response(
          JSON.stringify({ success: false, error: 'enabled must be a boolean when feature_key is provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate feature_key format (alphanumeric + underscores/hyphens, 3-50 chars)
      const featureKeyRegex = /^[a-zA-Z0-9_-]{3,50}$/
      if (!featureKeyRegex.test(feature_key)) {
        toggle_valid = false
        toggle_message = 'Invalid feature_key format'
      } else {
        toggle_valid = true
        toggle_message = `Feature "${feature_key}" set to ${enabled}`
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        text: truncated,
        original_length: text.length,
        truncated: was_truncated,
        toggle_valid,
        toggle_message,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
