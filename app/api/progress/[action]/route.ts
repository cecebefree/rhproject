/**
 * Progress & Assessment API — Chapter Completion + Submissions + Grading
 * ======================================================================
 * Endpoints:
 *   POST /api/progress/update-chapter     — { enrollment_id, chapter_id, completion_percentage?, status?, time_spent_minutes? }
 *   POST /api/progress/submit-assessment  — { assessment_id, enrollment_id, submission_content, submission_files? }
 *   POST /api/progress/grade-assessment   — { submission_id, mark_earned, feedback? }
 *   GET  /api/progress/report?report_type=progress&enrollment_id={uuid}
 *   GET  /api/progress/report?report_type=assessments&enrollment_id={uuid}
 *
 * @module app/api/progress/[action]
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// ══════════════════════════════════════════════════════════════════════════════
// TYPESCRIPT INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

interface UpdateProgressPayload {
  enrollment_id: string;
  chapter_id: string;
  completion_percentage?: number;
  status?: 'not_started' | 'in_progress' | 'completed' | 'review_pending';
  time_spent_minutes?: number;
}

interface SubmitAssessmentPayload {
  assessment_id: string;
  enrollment_id: string;
  submission_content: Record<string, unknown>;
  submission_files?: Array<{ filename: string; url: string }>;
}

interface GradeAssessmentPayload {
  submission_id: string;
  mark_earned: number;
  feedback?: string;
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
 * POST /api/progress/update-chapter
 *
 * Body: { enrollment_id, chapter_id, completion_percentage?, status?, time_spent_minutes? }
 *
 * Creates or updates chapter progress. Idempotent upsert.
 * Auto-sets status to 'completed' when completion reaches 100%.
 */
async function updateChapterProgress(
  req: NextRequest,
): Promise<NextResponse> {
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

    const body: UpdateProgressPayload = await req.json();
    const { enrollment_id, chapter_id, completion_percentage, status, time_spent_minutes } = body;

    if (!enrollment_id || !chapter_id) {
      return NextResponse.json(
        { success: false, error: 'enrollment_id and chapter_id required' },
        { status: 400 },
      );
    }

    if (completion_percentage !== undefined && (completion_percentage < 0 || completion_percentage > 100)) {
      return NextResponse.json(
        { success: false, error: 'completion_percentage must be between 0 and 100' },
        { status: 400 },
      );
    }

    if (status && !['not_started', 'in_progress', 'completed', 'review_pending'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 },
      );
    }

    const { data: result, error } = await supabase.rpc('update_chapter_progress', {
      p_enrollment_id: enrollment_id,
      p_chapter_id: chapter_id,
      p_completion_percentage: completion_percentage ?? null,
      p_status: status ?? null,
      p_time_spent_minutes: time_spent_minutes ?? 0,
    });

    if (error) {
      console.error('[Progress] RPC error:', error);
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
          progress_id: result?.[0]?.progress_id,
          message: result?.[0]?.message,
          new_completion_percentage: result?.[0]?.new_completion_percentage,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Progress] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/progress/submit-assessment
 *
 * Body: { assessment_id, enrollment_id, submission_content, submission_files? }
 *
 * Submits or resubmits an assessment. Idempotent upsert.
 */
async function submitAssessment(
  req: NextRequest,
): Promise<NextResponse> {
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

    const body: SubmitAssessmentPayload = await req.json();
    const { assessment_id, enrollment_id, submission_content, submission_files } = body;

    if (!assessment_id || !enrollment_id || !submission_content) {
      return NextResponse.json(
        { success: false, error: 'assessment_id, enrollment_id, and submission_content required' },
        { status: 400 },
      );
    }

    // Verify student owns this enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from('student_enrollments')
      .select('student_id')
      .eq('id', enrollment_id)
      .single();

    if (enrollError || !enrollment) {
      return NextResponse.json(
        { success: false, error: 'Enrollment not found' },
        { status: 404 },
      );
    }

    if (enrollment.student_id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to submit for this enrollment' },
        { status: 403 },
      );
    }

    const { data: result, error } = await supabase.rpc('submit_assessment', {
      p_assessment_id: assessment_id,
      p_enrollment_id: enrollment_id,
      p_submission_content: submission_content,
      p_submission_files: submission_files || null,
    });

    if (error) {
      console.error('[Progress] RPC error:', error);
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
          submission_id: result?.[0]?.submission_id,
          message: result?.[0]?.message,
          submitted_at: result?.[0]?.submitted_at,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Progress] Submit error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/progress/grade-assessment
 *
 * Body: { submission_id, mark_earned, feedback? }
 *
 * Grades a submission. Teacher or office_desk_admin only.
 * Triggers average recalculation on the enrollment.
 */
async function gradeAssessment(
  req: NextRequest,
): Promise<NextResponse> {
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

    const body: GradeAssessmentPayload = await req.json();
    const { submission_id, mark_earned, feedback } = body;

    if (!submission_id || mark_earned === undefined) {
      return NextResponse.json(
        { success: false, error: 'submission_id and mark_earned required' },
        { status: 400 },
      );
    }

    if (mark_earned < 0) {
      return NextResponse.json(
        { success: false, error: 'mark_earned cannot be negative' },
        { status: 400 },
      );
    }

    const { data: result, error } = await supabase.rpc('grade_assessment', {
      p_submission_id: submission_id,
      p_mark_earned: mark_earned,
      p_feedback: feedback || null,
      p_grader_id: session.user.id,
    });

    if (error) {
      console.error('[Progress] RPC error:', error);
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
          submission_id: result?.[0]?.submission_id,
          message: result?.[0]?.message,
          mark_percentage: result?.[0]?.mark_percentage,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Progress] Grade error:', err);
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
 * GET /api/progress/report?report_type=progress&enrollment_id={uuid}
 * GET /api/progress/report?report_type=assessments&enrollment_id={uuid}
 *
 * Returns progress or assessment report via RPC.
 */
async function getProgressReport(
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
    if (!reportType || !['progress', 'assessments'].includes(reportType)) {
      return NextResponse.json(
        { success: false, error: 'report_type required (progress or assessments)' },
        { status: 400 },
      );
    }

    const enrollmentId = searchParams.get('enrollment_id');
    if (!enrollmentId) {
      return NextResponse.json(
        { success: false, error: 'enrollment_id required' },
        { status: 400 },
      );
    }

    let data, error;

    if (reportType === 'progress') {
      ({ data, error } = await supabase.rpc('get_student_progress_report', {
        p_enrollment_id: enrollmentId,
      }));
    } else {
      const courseId = searchParams.get('course_id');
      ({ data, error } = await supabase.rpc('get_assessment_grades_report', {
        p_enrollment_id: enrollmentId,
        p_course_id: courseId || null,
      }));
    }

    if (error) {
      console.error('[Progress] RPC error:', error);
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
    console.error('[Progress] Report error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/progress/assessments?course_id={uuid}
 *
 * Returns published assessments for a course.
 */
async function getAssessments(
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

    const courseId = searchParams.get('course_id');
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'course_id required' },
        { status: 400 },
      );
    }

    const { data: assessments, error } = await supabase
      .from('assessments')
      .select('id, title, description, assessment_type, max_mark, weight_percentage, due_date, is_published')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('[Progress] DB error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, data: { assessments } },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Progress] Assessments error:', err);
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
    case 'update-chapter':
      return updateChapterProgress(req);
    case 'submit-assessment':
      return submitAssessment(req);
    case 'grade-assessment':
      return gradeAssessment(req);
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
      return getProgressReport(req);
    case 'assessments':
      return getAssessments(req);
    default:
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 },
      );
  }
}

/**
 * ENDPOINTS:
 * POST /api/progress/update-chapter      — { enrollment_id, chapter_id, completion_percentage?, status?, time_spent_minutes? }
 * POST /api/progress/submit-assessment   — { assessment_id, enrollment_id, submission_content, submission_files? }
 * POST /api/progress/grade-assessment    — { submission_id, mark_earned, feedback? }
 * GET  /api/progress/report?report_type=progress&enrollment_id={uuid}
 * GET  /api/progress/report?report_type=assessments&enrollment_id={uuid}
 * GET  /api/progress/assessments?course_id={uuid}
 */
