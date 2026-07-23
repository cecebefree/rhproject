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

  // Verify caller has LMS access via tenant scope
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ success: false, error: 'Profile not found' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Only LMS-accessible roles can use AI tutor
  const allowedRoles = ['student', 'learner', 'teacher', 'admin', 'office']
  if (!allowedRoles.includes(profile.role)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Role not authorized for AI tutor' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { message, content_id, model } = await req.json()

    // Validate required inputs
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!content_id || typeof content_id !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid content_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate content_id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(content_id)) {
      return new Response(
        JSON.stringify({ success: false, error: 'content_id must be a valid UUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check AI provider secret is configured (env binding, NOT hardcoded)
    const aiEndpoint = Deno.env.get('NEMOTRON_ENDPOINT')
    const aiKey = Deno.env.get('NEMOTRON_KEY')

    if (!aiEndpoint || !aiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI provider not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the content belongs to the caller's tenant
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, tenant_id')
      .eq('id', content_id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (courseError || !course) {
      return new Response(
        JSON.stringify({ success: false, error: 'Content not found or not in your tenant' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enforce content scope: student must be enrolled in the course
    if (profile.role === 'student' || profile.role === 'learner') {
      const { data: enrollment } = await supabase
        .from('student_class')
        .select('student_id')
        .eq('student_id', user.id)
        .eq('class_id', content_id)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .single()

      if (!enrollment) {
        return new Response(
          JSON.stringify({ success: false, error: 'Not enrolled in this course' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Forward to AI provider (env secret, never hardcoded)
    const selectedModel = model || 'default'
    const aiResponse = await fetch(aiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiKey}`,
      },
      body: JSON.stringify({
        message,
        content_id,
        tenant_id: profile.tenant_id,
        model: selectedModel,
      }),
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      return new Response(
        JSON.stringify({ success: false, error: `AI provider error: ${aiResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiData = await aiResponse.json()

    return new Response(
      JSON.stringify({ success: true, response: aiData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
