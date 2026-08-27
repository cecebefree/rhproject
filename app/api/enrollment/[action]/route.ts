/**
 * Enrollment API — Course Enrollment + Progress Tracking + Reporting
 * ==================================================================
 * Endpoints:
 *   GET  /api/enrollment/courses?grade=10&status=active
 *   GET  /api/enrollment/student-courses?student_id={uuid}
 *   GET  /api/enrollment/progress?enrollment_id={uuid}
 *   GET  /api/enrollment/course-report?course_id={uuid}
 *   POST /api/enrollment/enroll     — { student_id, course_id }
 *   POST /api/enrollment/withdraw   — { enrollment_id, withdrawal_reason }
 *
 * @module app/api/enrollment/[action]
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// ══════════════════════════════════════════════════════════════════════════════
// TYPESCRIPT INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

interface EnrollStudentBody {
  student_id: string;
  course_id: string;
}

interface WithdrawStudentBody {
  enrollment_id: string;
  withdrawal_reason?: string;
}

interface StudentProgressQuery {
  enrollment_id: string;
}

interface CourseReportQuery {
  course_id: string;
}

interface EnrollmentResponse {
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
    .select('id, organization_id')
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
 * POST /api/enrollment/enroll
 *
 * Body: { student_id: string, course_id: string }
 *
 * Enrolls a student in a course via RPC. Checks capacity + duplicates.
 * Returns 409 on capacity full or duplicate enrollment.
 */
async function handleEnrollStudent(
  req: NextRequest,
): Promise<NextResponse> {
  try {
    const supabase = createSupabaseClient();
    const body: EnrollStudentBody = await req.json();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { student_id, course_id } = body;
    if (!student_id || !course_id) {
      return NextResponse.json(
        { success: false, error: 'student_id and course_id required' },
        { status: 400 },
      );
    }

    const { data: result, error } = await supabase.rpc(
      'enroll_student_in_course',
      {
        p_student_id: student_id,
        p_course_id: course_id,
        p_enrolled_by: session.user.id,
      },
    );

    if (error) {
      console.error('[Enrollment] RPC error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    if (result?.[0]?.status === 'error') {
      return NextResponse.json(
        { success: false, error: result[0].message },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          enrollment_id: result?.[0]?.enrollment_id,
          message: result?.[0]?.message,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Enrollment] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/enrollment/withdraw
 *
 * Body: { enrollment_id: string, withdrawal_reason?: string }
 *
 * Withdraws a student from a course via RPC. Decrements enrolled count.
 */
async function handleWithdrawStudent(
  req: NextRequest,
): Promise<NextResponse> {
  try {
    const supabase = createSupabaseClient();
    const body: WithdrawStudentBody = await req.json();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { enrollment_id, withdrawal_reason } = body;
    if (!enrollment_id) {
      return NextResponse.json(
        { success: false, error: 'enrollment_id required' },
        { status: 400 },
      );
    }

    const { data: result, error } = await supabase.rpc(
      'withdraw_student_from_course',
      {
        p_enrollment_id: enrollment_id,
        p_withdrawn_by: session.user.id,
        p_reason: withdrawal_reason || 'No reason provided',
      },
    );

    if (error) {
      console.error('[Enrollment] RPC error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    if (result?.[0]?.status === 'error') {
      return NextResponse.json(
        { success: false, error: result[0].message },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, data: { message: result?.[0]?.message } },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Enrollment] Unexpected error:', err);
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
 * GET /api/enrollment/courses?grade=10&status=active
 *
 * Returns courses for the authenticated user's organization.
 * Defaults: status = 'active'. Optional grade filter.
 */
async function handleListCourses(
  req: NextRequest,
): Promise<NextResponse> {
  try {
    const supabase = createSupabaseClient();
    const { searchParams } = new URL(req.url);

    const { user, error: authError } = await getAuthenticatedUser(supabase);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: authError || 'Unauthorized' },
        { status: 401 },
      );
    }

    const grade = searchParams.get('grade');
    const status = searchParams.get('status') || 'active';

    let query = supabase
      .from('courses')
      .select('*')
      .eq('organization_id', user.organization_id)
      .eq('status', status);

    if (grade) {
      query = query.eq('grade', grade);
    }

    const { data: courses, error } = await query.order('start_date', {
      ascending: true,
    });

    if (error) {
      console.error('[Enrollment] DB error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, data: { courses } },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Enrollment] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/enrollment/student-courses?student_id={uuid}
 *
 * Returns enrollments for a student (defaults to current session user).
 * Joins course details for each enrollment.
 */
async function handleGetStudentCourses(
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

    const student_id = searchParams.get('student_id') || session.user.id;

    const { data: enrollments, error } = await supabase
      .from('student_enrollments')
      .select(
        'id, course_id, enrollment_status, enrolled_at, progress_percentage, final_grade, courses(course_name, grade, start_date, end_date)',
      )
      .eq('student_id', student_id)
      .order('enrolled_at', { ascending: false });

    if (error) {
      console.error('[Enrollment] DB error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, data: { enrollments } },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Enrollment] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/enrollment/progress?enrollment_id={uuid}
 *
 * Returns detailed progress report via RPC — includes per-lesson status JSON.
 */
async function handleGetStudentProgress(
  req: NextRequest,
): Promise<NextResponse> {
  try {
    const supabase = createSupabaseClient();
    const { searchParams } = new URL(req.url);

    const enrollment_id = searchParams.get('enrollment_id');
    if (!enrollment_id) {
      return NextResponse.json(
        { success: false, error: 'enrollment_id required' },
        { status: 400 },
      );
    }

    const { data: progress, error } = await supabase.rpc(
      'get_student_progress',
      {
        p_enrollment_id: enrollment_id,
      },
    );

    if (error) {
      console.error('[Enrollment] RPC error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, data: { progress: progress?.[0] } },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Enrollment] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/enrollment/course-report?course_id={uuid}
 *
 * Returns aggregated course report via RPC — enrollment counts,
 * averages, per-student details.
 */
async function handleGenerateCourseReport(
  req: NextRequest,
): Promise<NextResponse> {
  try {
    const supabase = createSupabaseClient();
    const { searchParams } = new URL(req.url);

    const course_id = searchParams.get('course_id');
    if (!course_id) {
      return NextResponse.json(
        { success: false, error: 'course_id required' },
        { status: 400 },
      );
    }

    const { data: report, error } = await supabase.rpc(
      'generate_course_report',
      {
        p_course_id: course_id,
      },
    );

    if (error) {
      console.error('[Enrollment] RPC error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, data: { report: report?.[0] } },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Enrollment] Unexpected error:', err);
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
    case 'courses':
      return handleListCourses(req);
    case 'student-courses':
      return handleGetStudentCourses(req);
    case 'progress':
      return handleGetStudentProgress(req);
    case 'course-report':
      return handleGenerateCourseReport(req);
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
    case 'enroll':
      return handleEnrollStudent(req);
    case 'withdraw':
      return handleWithdrawStudent(req);
    default:
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 },
      );
  }
}

/**
 * ENDPOINTS:
 * GET  /api/enrollment/courses?grade=10&status=active
 * GET  /api/enrollment/student-courses?student_id={uuid}
 * GET  /api/enrollment/progress?enrollment_id={uuid}
 * GET  /api/enrollment/course-report?course_id={uuid}
 * POST /api/enrollment/enroll     — { student_id, course_id }
 * POST /api/enrollment/withdraw   — { enrollment_id, withdrawal_reason }
 */
