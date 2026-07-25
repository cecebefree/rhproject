// ROW 28a SET_HANDLE EF
// Edge Function implementing set_handle: sets/updates a user's handle with server-side authority

// Specification: validates and applies handle changes with server-side authority enforcement

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Contract: docs/governance/entry-for-set_handle-rules.md (authority matrix, validation table, reserved-name list, versioned v1)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Reserved handle names DENY-LIST (admin, office, system, support, root, api, redhouse + variants)
const RESERVED_HANDLES = [
  'admin',
  'admin1', 'admin2', 'admin3',
  'admin_main',
  'office',
  'office_admin',
  'system',
  'support',
  'support1', 'support2',
  'root',
  'api',
  'apigateway',
  'api-gateway',
  'redhouse',
  'redhouse1', 'redhouse2',
  'redhouse_dev',
  'sys',
  'sysadmin',
  'system_admin',
  'system_service',
]

// Contract: universal format CHECK (CHAR_LENGTH 3-20, no whitespace)
const HANDLE_REGEX = /^[a-z0-9_-]+$/
const MIN_HANDLE_LENGTH = 3
const MAX_HANDLE_LENGTH = 20

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

  try {
    const { profile_id, handle } = await req.json()
    if (!profile_id || typeof profile_id !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid profile_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (handle === undefined || typeof handle !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid handle' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('authorization')
    const jwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'No valid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: callerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, tenant_id')
      .eq('id', user.id)
      .single()
    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Caller profile not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // D-15 fail-loud: caller tenant_id must not be null
    if (!callerProfile.tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'D-15: caller tenant_id is null — refusing operation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('id, tenant_id, handle')
      .eq('id', profile_id)
      .single()
    if (targetError || !targetProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Target profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!AUTHORIZED({ caller: callerProfile, target: targetProfile })) {
      return new Response(
        JSON.stringify({ success: false, error: 'Caller is not authorized to set target handle' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!VALIDATE({ handle, caller: callerProfile })) {
      return new Response(
        JSON.stringify({ success: false, error: 'Handle validation failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!(await UNIQUE({ handle, targetProfile, supabase }))) {
      return new Response(
        JSON.stringify({ success: false, error: 'Handle is already in use' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const previous_handle = targetProfile.handle
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ handle })
      .eq('id', profile_id)
    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update handle' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Audit is handled by migration 062's trg_audit_profile_handle_change trigger (SECURITY DEFINER).
    // No manual INSERT into handle_changes — the trigger is the sole audit path.

    return new Response(
      JSON.stringify({
        success: true,
        profile_id,
        handle,
        previous_handle,
        changed_by: callerProfile.id,
        changed_at: new Date().toISOString()
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

function AUTHORIZED({ caller, target }) {
  if (caller.tenant_id !== target.tenant_id) return false
  if (caller.id === target.id) return true
  return ['admin', 'office'].includes(caller.role)
}

function VALIDATE({ handle, caller }) {
  if (RESERVED_HANDLES.includes(handle.toLowerCase())) {
    return false
  }
  if (handle.length < MIN_HANDLE_LENGTH || handle.length > MAX_HANDLE_LENGTH) {
    return false
  }
  if (!HANDLE_REGEX.test(handle)) {
    return false
  }
  return true
}

async function UNIQUE({ handle, targetProfile, supabase }) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('tenant_id', targetProfile.tenant_id)
    .eq('handle', handle)
    .limit(1)
  if (error) {
    throw error
  }
  if (data && data.length > 0 && data[0].id !== targetProfile.id) {
    return false
  }
  return true
}
