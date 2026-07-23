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

  try {
    const { slot_id } = await req.json()

    if (!slot_id || typeof slot_id !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid slot_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(slot_id)) {
      return new Response(
        JSON.stringify({ success: false, error: 'slot_id must be a valid UUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Look up the schedule slot
    const { data: slot, error: slotError } = await supabase
      .from('schedule_slot')
      .select('id, tenant_id, course_id, start_time')
      .eq('id', slot_id)
      .single()

    if (slotError || !slot) {
      return new Response(
        JSON.stringify({ success: false, error: 'Schedule slot not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find enrolled students for this course
    const { data: enrollments, error: enrollError } = await supabase
      .from('student_class')
      .select('student_id')
      .eq('class_id', slot.course_id)
      .eq('tenant_id', slot.tenant_id)
      .is('deleted_at', null)

    if (enrollError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch enrollments' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!enrollments || enrollments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No students enrolled', notified: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create notification records for each enrolled student
    // Idempotent: notifications table should have a unique constraint or we check existence
    const notifications = enrollments.map((e) => ({
      user_id: e.student_id,
      tenant_id: slot.tenant_id,
      title: 'Class Starting',
      body: 'Your class session is starting now.',
      type: 'class_start',
      metadata: { slot_id: slot.id, course_id: slot.course_id },
    }))

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (notifError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create notifications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, notified: notifications.length, slot_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
