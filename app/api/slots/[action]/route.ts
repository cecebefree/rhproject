/**
 * Slot Booking API — Calendar + Booking Engine
 * =============================================
 * Endpoints:
 *   GET  /api/slots/available?grade=10&from_date=...&to_date=...
 *   GET  /api/slots/bookings?student_id={uuid}
 *   POST /api/slots/book       — { calendar_id, student_id }
 *   POST /api/slots/generate   — { grade, num_slots, start_date, slot_time, duration_minutes, capacity }
 *   DELETE /api/slots/cancel    — { booking_id, cancellation_reason }
 *
 * @module app/api/slots/[action]
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// ══════════════════════════════════════════════════════════════════════════════
// TYPESCRIPT INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

interface AvailableSlotsQuery {
  grade: string;
  from_date?: string;
  to_date?: string;
}

interface BookSlotBody {
  calendar_id: string;
  student_id?: string;
}

interface CancelSlotBody {
  booking_id: string;
  cancellation_reason?: string;
}

interface GenerateSlotsBody {
  grade: string;
  num_slots: number;
  start_date: string;
  slot_time?: string;
  duration_minutes?: number;
  capacity?: number;
}

interface SlotResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

async function getAuthenticatedUser(supabase: ReturnType<typeof createClient>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { user: null, error: 'Unauthorized' };
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, organization_id')
    .eq('id', session.user.id)
    .single();

  if (userError || !user) {
    return { user: null, error: 'User not found' };
  }

  return { user, error: null };
}

// ══════════════════════════════════════════════════════════════════════════════
// GET HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/slots/available?grade=10&from_date=2026-08-25&to_date=2026-09-05
 *
 * Returns available calendar slots for a grade within a date range.
 * Defaults: from_date = today, to_date = today + 30 days.
 */
async function handleGetAvailableSlots(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createSupabaseClient();
    const { searchParams } = new URL(req.url);

    const grade = searchParams.get('grade');
    const from_date =
      searchParams.get('from_date') || new Date().toISOString().split('T')[0];
    const to_date =
      searchParams.get('to_date') ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

    if (!grade) {
      return NextResponse.json(
        { success: false, error: 'grade parameter required' },
        { status: 400 },
      );
    }

    const { user, error: authError } = await getAuthenticatedUser(supabase);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: authError || 'Unauthorized' },
        { status: 401 },
      );
    }

    const { data: slots, error } = await supabase.rpc('get_available_slots', {
      p_org_id: user.organization_id,
      p_grade: grade,
      p_from_date: from_date,
      p_to_date: to_date,
    });

    if (error) {
      console.error('[Slots] RPC error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, data: { slots } },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Slots] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/slots/bookings?student_id={uuid}
 *
 * Returns bookings for a student. Defaults to current session user.
 */
async function handleGetMyBookings(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createSupabaseClient();
    const { searchParams } = new URL(req.url);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const student_id = searchParams.get('student_id') || session.user.id;

    const { data: bookings, error } = await supabase
      .from('slot_bookings')
      .select(
        'id, calendar_id, booking_status, booked_at, cancelled_at, cancellation_reason, notes',
      )
      .eq('student_id', student_id)
      .order('booked_at', { ascending: false });

    if (error) {
      console.error('[Slots] DB error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, data: { bookings } },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Slots] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POST HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/slots/book
 *
 * Body: { calendar_id: string, student_id: string }
 *
 * Books a slot for a student. Checks availability + conflict detection
 * before inserting. Returns 409 on conflict or double-booking.
 */
async function handleBookSlot(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createSupabaseClient();
    const body: BookSlotBody = await req.json();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { calendar_id, student_id } = body;
    if (!calendar_id || !student_id) {
      return NextResponse.json(
        { success: false, error: 'calendar_id and student_id required' },
        { status: 400 },
      );
    }

    // Get calendar details
    const { data: calendar, error: calError } = await supabase
      .from('calendar')
      .select('slot_date, slot_time, duration_minutes, available_slots, status')
      .eq('id', calendar_id)
      .single();

    if (calError || !calendar) {
      return NextResponse.json(
        { success: false, error: 'Calendar slot not found' },
        { status: 404 },
      );
    }

    if (calendar.status !== 'active' || calendar.available_slots <= 0) {
      return NextResponse.json(
        { success: false, error: 'Slot unavailable' },
        { status: 409 },
      );
    }

    // Check conflict
    const { data: conflict, error: conflictError } = await supabase.rpc(
      'check_booking_conflict',
      {
        p_student_id: student_id,
        p_slot_date: calendar.slot_date,
        p_slot_time: calendar.slot_time,
        p_duration_minutes: calendar.duration_minutes,
      },
    );

    if (conflictError) {
      console.error('[Slots] Conflict check error:', conflictError);
      return NextResponse.json(
        { success: false, error: 'Failed to check booking conflict' },
        { status: 500 },
      );
    }

    if (conflict) {
      return NextResponse.json(
        { success: false, error: 'Booking conflict detected' },
        { status: 400 },
      );
    }

    // Insert booking
    const { data: booking, error: bookError } = await supabase
      .from('slot_bookings')
      .insert({
        student_id,
        calendar_id,
        booking_status: 'confirmed',
        booked_by: session.user.id,
      })
      .select('id')
      .single();

    if (bookError) {
      if (bookError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Student already booked this slot' },
          { status: 409 },
        );
      }
      console.error('[Slots] Insert error:', bookError);
      return NextResponse.json(
        { success: false, error: 'Failed to book slot' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, data: { booking_id: booking.id } },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Slots] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/slots/generate
 *
 * Body: { grade, num_slots, start_date, slot_time?, duration_minutes?, capacity? }
 *
 * Bulk-generates calendar slots via RPC. Requires office_desk_admin role.
 */
async function handleGenerateSlots(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createSupabaseClient();
    const body: GenerateSlotsBody = await req.json();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const {
      grade,
      num_slots,
      start_date,
      slot_time = '14:00',
      duration_minutes = 60,
      capacity = 5,
    } = body;

    if (!grade || !num_slots || !start_date) {
      return NextResponse.json(
        { success: false, error: 'grade, num_slots, start_date required' },
        { status: 400 },
      );
    }

    const { user, error: authError } = await getAuthenticatedUser(supabase);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: authError || 'User not found' },
        { status: 404 },
      );
    }

    const { data: slots, error } = await supabase.rpc(
      'generate_calendar_slots',
      {
        p_org_id: user.organization_id,
        p_grade: grade,
        p_num_slots: num_slots,
        p_start_date: start_date,
        p_slot_time: slot_time,
        p_duration_minutes: duration_minutes,
        p_capacity: capacity,
      },
    );

    if (error) {
      console.error('[Slots] RPC error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { slots_created: slots?.length || 0, slots },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Slots] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DELETE HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/slots/cancel
 *
 * Body: { booking_id: string, cancellation_reason?: string }
 *
 * Cancels a confirmed booking. Only confirmed bookings can be cancelled.
 * The update trigger restores capacity and fires audit + realtime.
 */
async function handleCancelSlot(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createSupabaseClient();
    const body: CancelSlotBody = await req.json();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { booking_id, cancellation_reason } = body;
    if (!booking_id) {
      return NextResponse.json(
        { success: false, error: 'booking_id required' },
        { status: 400 },
      );
    }

    // Check booking exists
    const { data: booking, error: getError } = await supabase
      .from('slot_bookings')
      .select('id, booking_status, student_id')
      .eq('id', booking_id)
      .single();

    if (getError || !booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 },
      );
    }

    if (booking.booking_status !== 'confirmed') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only confirmed bookings can be cancelled',
        },
        { status: 400 },
      );
    }

    // Update to cancelled — triggers handle capacity restore + audit
    const { error: updateError } = await supabase
      .from('slot_bookings')
      .update({
        booking_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: session.user.id,
        cancellation_reason,
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('[Slots] Update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to cancel booking' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, data: { message: 'Booking cancelled' } },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Slots] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS — Next.js App Router
// ══════════════════════════════════════════════════════════════════════════════

export async function GET(
  req: NextRequest,
  { params }: { params: { action: string } },
) {
  switch (params.action) {
    case 'available':
      return handleGetAvailableSlots(req);
    case 'bookings':
      return handleGetMyBookings(req);
    default:
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 },
      );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { action: string } },
) {
  switch (params.action) {
    case 'book':
      return handleBookSlot(req);
    case 'generate':
      return handleGenerateSlots(req);
    default:
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 },
      );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { action: string } },
) {
  switch (params.action) {
    case 'cancel':
      return handleCancelSlot(req);
    default:
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 },
      );
  }
}
