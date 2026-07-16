import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { profile_id, tenant_id } = await req.json()

    if (!profile_id || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'profile_id and tenant_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the caller's user ID from the JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const caller_id = user.id

    // Verify caller is master-admin of the TARGET tenant
    // Master-admin = role='admin' AND tenant_id = target tenant_id
    const { data: callerProfile, error: callerError } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', caller_id)
      .single()

    if (callerError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Caller profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (callerProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Caller is not an admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (callerProfile.tenant_id !== tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Caller is not master-admin of target tenant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify target tenant exists and is active
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_devotional')
      .select('id, is_active')
      .eq('id', tenant_id)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Target tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tenant.is_active) {
      return new Response(
        JSON.stringify({ error: 'Target tenant is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call the SECURITY DEFINER function that bypasses the immutability trigger
    // This function validates master-admin context again and performs the assignment
    const { error: assignError } = await supabase.rpc('assign_tenant_to_profile', {
      p_profile_id: profile_id,
      p_tenant_id: tenant_id,
      p_caller_id: caller_id
    })

    if (assignError) {
      return new Response(
        JSON.stringify({ error: assignError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, profile_id, tenant_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
