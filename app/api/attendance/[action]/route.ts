/**
 * Attendance API — Session Management + Mark Attendance + Reports
 * ================================================================
 * Endpoints:
 *   POST /api/attendance/mark           — { session_id, enrollment_id, attendance_status, notes? }
 *   POST /api/attendance/start-session  — { session_id }
 *   POST /api/attendance/end-session    — { session_id, recording_url? }
 *   GET  /api/attendance/report?report_type=student&enrollment_id={uuid}
 *   GET  /api/attendance/report?report_type=course&course_id={uuid}
 *
 * @module app/api/attendance/[action]
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// ══════════════════════════════════════════════════════════════════════════════
// TYPESCRIPT INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

interface MarkAttendancePayload {
  session_id: string;
  enrollment_id: string;
  attendance_status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

interface StartSessionPayload {
  session_id: string;
}

interface EndSessionPayload {
  session_id: string;
  recording_url?: string;
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

async function getAuthenticatedUser(
  supabase: ReturnType<typeof createClient>,
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { user: null, error: 'Unauthorized' };
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, organization_id, role')
    .eq('id', session.user.id)
    .single();

  if (userError || !user) {
    return { user: null, error: 'User not found' };
  }

  return { user, error: null };
}

// ══════════════════════════════════════════════════════════════════════════════
// POST HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/attendance/mark
 *
 * Body: { session_id, enrollment_id, attendance_status, notes? }
 *
 * Marks or updates a student's attendance for a class session.
 * Creates new record if none exists, updates if already present.
 * Syncs attendance counts to student_enrollments.
 */
async function markAttendance(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createSupabaseClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body: MarkAttendancePayload = await req.json();
    const { session_id, enrollment_id, attendance_status, notes } = body;

    if (!session_id || !enrollment_id || !attendance_status) {
      return NextResponse.json(
        { success: false, error: 'session_id, enrollment_id, and attendance_status required' },
        { status: 400 },
      );
    }

    if (!['present', 'absent', 'late', 'excused'].includes(attendance_status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid attendance_status. Must be present, absent, late, or excused' },
        { status: 400 },
      );
    }

    const { data: result, error } = await supabase.rpc(
      'mark_student_attendance',
      {
        p_session_id: session_id,
        p_enrollment_id: enrollment_id,
        p_attendance_status: attendance_status,
        p_notes: notes || null,
        p_marked_by_user_id: session.user.id,
      },
    );

    if (error) {
      console.error('[Attendance] RPC error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    if (result?.[0]?.status === 'error') {
      return NextResponse.json(
        { success: false, error: result[0].message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          attendance_id: result?.[0]?.attendance_id,
          message: result?.[0]?.message,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Attendance] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/attendance/start-session
 *
 * Body: { session_id }
 *
 * Starts a class session — transitions from scheduled to in_progress
 * and initializes absent attendance for all enrolled students.
 */
async function startSession(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createSupabaseClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body: StartSessionPayload = await req.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        { success: false, error: 'session_id required' },
        { status: 400 },
      );
    }

    // Verify user is the host (teacher) for this session
    const { data: classSession, error: sessionError } = await supabase
      .from('class_sessions')
      .select('host_id, session_status')
      .eq('id', session_id)
      .single();

    if (sessionError || !classSession) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 },
      );
    }

    if (classSession.host_id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to start this session' },
        { status: 403 },
      );
    }

    if (classSession.session_status !== 'scheduled') {
      return NextResponse.json(
        { success: false, error: 'Session is not in scheduled status' },
        { status: 400 },
      );
    }

    const { data: result, error } = await supabase.rpc('start_class_session', {
      p_session_id: session_id,
    });

    if (error) {
      console.error('[Attendance] RPC error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          message: result?.[0]?.message,
          session_start: result?.[0]?.session_start,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Attendance] Start session error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/attendance/end-session
 *
 * Body: { session_id, recording_url? }
 *
 * Ends a class session — transitions to completed, builds attendance
 * summary, logs audit entry.
 */
async function endSession(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createSupabaseClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body: EndSessionPayload = await req.json();
    const { session_id, recording_url } = body;

    if (!session_id) {
      return NextResponse.json(
        { success: false, error: 'session_id required' },
        { status: 400 },
      );
    }

    // Verify user is the host (teacher) for this session
    const { data: classSession, error: sessionError } = await supabase
      .from('class_sessions')
      .select('host_id, session_status')
      .eq('id', session_id)
      .single();

    if (sessionError || !classSession) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 },
      );
    }

    if (classSession.host_id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to end this session' },
        { status: 403 },
      );
    }

    if (classSession.session_status !== 'in_progress') {
      return NextResponse.json(
        { success: false, error: 'Session is not in progress' },
        { status: 400 },
      );
    }

    const { data: result, error } = await supabase.rpc('end_class_session', {
      p_session_id: session_id,
      p_recording_url: recording_url || null,
    });

    if (error) {
      console.error('[Attendance] RPC error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          message: result?.[0]?.message,
          attendance_summary: result?.[0]?.attendance_summary,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Attendance] End session error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GET HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/attendance/report?report_type=student&enrollment_id={uuid}
 * GET /api/attendance/report?report_type=course&course_id={uuid}
 *
 * Returns attendance reports via RPC:
 *   - student: per-session attendance for a specific enrollment
 *   - course: aggregated attendance stats per student for a course
 */
async function getAttendanceReport(
  req: NextRequest,
): Promise<NextResponse> {
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

    const reportType = searchParams.get('report_type');
    if (!reportType || !['student', 'course'].includes(reportType)) {
      return NextResponse.json(
        { success: false, error: 'report_type required (student or course)' },
        { status: 400 },
      );
    }

    let data, error;

    if (reportType === 'student') {
      const enrollmentId = searchParams.get('enrollment_id');
      if (!enrollmentId) {
        return NextResponse.json(
          { success: false, error: 'enrollment_id required for student report' },
          { status: 400 },
        );
      }

      ({ data, error } = await supabase.rpc('get_student_attendance_report', {
        p_enrollment_id: enrollmentId,
      }));
    } else {
      const courseId = searchParams.get('course_id');
      if (!courseId) {
        return NextResponse.json(
          { success: false, error: 'course_id required for course report' },
          { status: 400 },
        );
      }

      ({ data, error } = await supabase.rpc('get_course_attendance_summary', {
        p_course_id: courseId,
      }));
    }

    if (error) {
      console.error('[Attendance] RPC error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, data },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Attendance] Report error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/attendance/sessions?course_id={uuid}&status=completed
 *
 * Returns class sessions for a course, optionally filtered by status.
 */
async function getSessions(req: NextRequest): Promise<NextResponse> {
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

    const courseId = searchParams.get('course_id');
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'course_id required' },
        { status: 400 },
      );
    }

    const status = searchParams.get('status');

    let query = supabase
      .from('class_sessions')
      .select('id, session_title, session_start, session_end, session_status, session_duration_minutes, host_id, notes, recording_url')
      .eq('course_id', courseId)
      .order('session_start', { ascending: false });

    if (status) {
      query = query.eq('session_status', status);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('[Attendance] DB error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, data: { sessions } },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Attendance] Sessions error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS — Next.js App Router
// ══════════════════════════════════════════════════════════════════════════════

export async function POST(
  req: NextRequest,
  { params }: { params: { action: string } },
) {
  switch (params.action) {
    case 'mark':
      return markAttendance(req);
    case 'start-session':
      return startSession(req);
    case 'end-session':
      return endSession(req);
    default:
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 },
      );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { action: string } },
) {
  switch (params.action) {
    case 'report':
      return getAttendanceReport(req);
    case 'sessions':
      return getSessions(req);
    default:
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 },
      );
  }
}

/**
 * ENDPOINTS:
 * POST /api/attendance/mark           — { session_id, enrollment_id, attendance_status, notes? }
 * POST /api/attendance/start-session  — { session_id }
 * POST /api/attendance/end-session    — { session_id, recording_url? }
 * GET  /api/attendance/report?report_type=student&enrollment_id={uuid}
 * GET  /api/attendance/report?report_type=course&course_id={uuid}
 * GET  /api/attendance/sessions?course_id={uuid}&status=completed
 */
