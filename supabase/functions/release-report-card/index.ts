import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Gate contracts v1: release-report-card EF transition rules
specifies:
  - Status transitions: draft → released → visible (one step at a time)
  - Authority: office/admin roles only
  - Tenant: issuer must match JWT tenant_id
  - Immutability: content editable only in draft state
  version: "1.0"

// List of valid report card statuses for validation
const VALID_STATUSES = ['draft', 'released', 'visible']

// Minimum granted role level to authorize report card operations
const AUTHORIZED_ROLES = ['admin', 'office']

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
    const { report_card_id, target_status } = await req.json()

    if (!report_card_id || typeof report_card_id !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid report_card_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!target_status || typeof target_status !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid target_status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!VALID_STATUSES.includes(target_status)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid target_status. Must be one of: ${VALID_STATUSES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(report_card_id)) {
      return new Response(
        JSON.stringify({ success: false, error: 'report_card_id must be a valid UUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'No valid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Caller profile not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate caller has required role
    if (!AUTHORIZED_ROLES.includes(profile.role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Caller role not authorized for report card transitions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find the report card to validate and transition
    const { data: reportCard, error: cardError } = await supabase
      .from('report_cards')
      .select('id, student_id, status, tenant_id, released_by')
      .eq('id', report_card_id)
      .single()

    if (cardError || !reportCard) {
      return new Response(
        JSON.stringify({ success: false, error: 'Report card not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate tenant scoping - issuer must match
    if (reportCard.tenant_id !== profile.tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Caller tenant does not match report card tenant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate transition rules from Gate contracts v1
    // Status transitions must be one step at a time
    const currentStatusIndex = VALID_STATUSES.indexOf(reportCard.status)
    const targetStatusIndex = VALID_STATUSES.indexOf(target_status)

    if (currentStatusIndex === -1) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid current status: ${reportCard.status}` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (targetStatusIndex === -1) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid target status: ${target_status}` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const diff = targetStatusIndex - currentStatusIndex
    if (diff !== 1) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid transition. Must advance exactly one status' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enforce immutability guard - content editable only in draft state
    if (reportCard.status !== 'draft' && target_status !== reportCard.status) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot modify report card content. Immutable beyond draft state' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enforce role-specific transition authority
    if (target_status === 'released' && profile.role !== 'admin' && profile.role !== 'office') {
      return new Response(
        JSON.stringify({ success: false, error: 'Only admin or office can release report cards' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (target_status === 'visible' && profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Only admin can make report cards visible' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (target_status === 'released') {
      // Record who released the card
      const { error: updateError } = await supabase
        .from('report_cards')
        .update({ status: 'released', released_by: profile.id, released_at: new Date().toISOString() })
        .eq('id', report_card_id)

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to release report card' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Report card released successfully',
          new_status: 'released',
          released_by: profile.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (target_status === 'visible') {
      // Validate all required fields before making visible
      if (!reportCard.term || !reportCard.subject || !reportCard.grade) {
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot make visible. Term, subject, and grade are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: updateError } = await supabase
        .from('report_cards')
        .update({ status: 'visible', visible_at: new Date().toISOString() })
        .eq('id', report_card_id)

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to make report card visible' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Report card made visible successfully',
          new_status: 'visible',
          visible_at: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid target status' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})