// src/lib/profileClient.ts
// Fetch student profile data: profile, enrollments, registrations, payments, grades, attendance (Row 98)

import { supabase } from '../services/supabase';
import type {
  AttendanceRecord,
  EnrolledClass,
  GradeRecord,
  PaymentRecord,
  RegistrationRecord,
  StudentProfile,
} from '../types/profile';

// ═══════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════

export async function fetchStudentProfile(): Promise<{
  data: StudentProfile | null;
  error: string | null;
}> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, phone, role, curriculum, grade, stage, intake, created_at')
    .eq('id', user.id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ═══════════════════════════════════════════════════════════
// ENROLLED CLASSES
// ═══════════════════════════════════════════════════════════

export async function fetchEnrolledClasses(): Promise<{
  data: EnrolledClass[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Not authenticated' };
  }

  // 1. Fetch active enrollments
  const { data: enrollments, error: enrErr } = await supabase
    .from('student_class')
    .select('id, class_id, enrolled_at, is_active')
    .eq('student_id', user.id)
    .eq('is_active', true)
    .order('enrolled_at', { ascending: false });

  if (enrErr) {
    return { data: [], error: enrErr.message };
  }

  if (!enrollments || enrollments.length === 0) {
    return { data: [], error: null };
  }

  // 2. Fetch course details for each enrollment
  const classIds = enrollments.map((e) => e.class_id);
  const { data: courses, error: courseErr } = await supabase
    .from('courses')
    .select('id, title, description, type, platform, teacher_id')
    .in('id', classIds);

  if (courseErr) {
    return { data: [], error: courseErr.message };
  }

  const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));

  // 3. Fetch teacher names
  const teacherIds = [...new Set((courses ?? []).map((c) => c.teacher_id))];
  const teacherMap = new Map<string, string>();

  for (const tid of teacherIds) {
    const { data } = await supabase.rpc('get_teacher_name', { p_teacher_id: tid });
    if (data && data.length > 0) {
      teacherMap.set(tid, data[0].name);
    }
  }

  // 4. Fetch next schedule slot for each enrolled class
  const scheduleMap = new Map<
    string,
    { label: string | null; start_time: string; end_time: string; days_of_week: number[] } | null
  >();

  const { data: slots } = await supabase
    .from('schedule_slot')
    .select('course_id, label, start_time, end_time, days_of_week')
    .in('course_id', classIds)
    .eq('is_active', true)
    .order('start_time');

  // Group by course_id and pick first slot per course
  for (const slot of slots ?? []) {
    if (!scheduleMap.has(slot.course_id)) {
      scheduleMap.set(slot.course_id, {
        label: slot.label,
        start_time: slot.start_time,
        end_time: slot.end_time,
        days_of_week: slot.days_of_week,
      });
    }
  }

  // 5. Fetch latest grade per course from gradebook
  const gradeMap = new Map<string, number | null>();
  const { data: gradeData } = await supabase
    .from('gradebook')
    .select('course_id, score')
    .in('course_id', classIds)
    .eq('student_id', user.id)
    .order('graded_at', { ascending: false });

  // Compute average score per course
  const gradeAccum = new Map<string, { total: number; count: number }>();
  for (const g of gradeData ?? []) {
    if (g.score == null) continue;
    const acc = gradeAccum.get(g.course_id) ?? { total: 0, count: 0 };
    acc.total += Number(g.score);
    acc.count += 1;
    gradeAccum.set(g.course_id, acc);
  }
  for (const [cid, acc] of gradeAccum) {
    gradeMap.set(cid, acc.count > 0 ? acc.total / acc.count : null);
  }

  // 6. Fetch attendance percentage per course
  const attendanceMap = new Map<string, number | null>();
  const { data: attData } = await supabase
    .from('attendance')
    .select('course_id, status')
    .in('course_id', classIds)
    .eq('student_id', user.id);

  const attAccum = new Map<string, { total: number; present: number }>();
  for (const a of attData ?? []) {
    const acc = attAccum.get(a.course_id) ?? { total: 0, present: 0 };
    acc.total += 1;
    if (a.status === 'present') acc.present += 1;
    attAccum.set(a.course_id, acc);
  }
  for (const [cid, acc] of attAccum) {
    attendanceMap.set(cid, acc.total > 0 ? Math.round((acc.present / acc.total) * 100) : null);
  }

  // 7. Build enrolled class list
  const classes: EnrolledClass[] = enrollments.map((enr) => {
    const course = courseMap.get(enr.class_id);
    return {
      id: enr.id,
      class_id: enr.class_id,
      title: course?.title ?? 'Unknown Class',
      description: course?.description ?? null,
      type: course?.type ?? '',
      platform: course?.platform ?? '',
      teacher_name: course?.teacher_id ? (teacherMap.get(course.teacher_id) ?? null) : null,
      enrolled_at: enr.enrolled_at,
      is_active: enr.is_active,
      next_class: scheduleMap.get(enr.class_id) ?? null,
      grade: gradeMap.get(enr.class_id) ?? null,
      attendance_pct: attendanceMap.get(enr.class_id) ?? null,
      status: 'active',
    };
  });

  return { data: classes, error: null };
}

// ═══════════════════════════════════════════════════════════
// REGISTRATION STATUS
// ═══════════════════════════════════════════════════════════

export async function fetchRegistrationStatus(): Promise<{
  data: RegistrationRecord | null;
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Try fetching by student_email (registration is keyed by email, not user ID)
  const email = user.email;
  if (!email) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from('office_desk.registrations')
    .select('id, student_name, student_email, course_name, status, created_at, updated_at')
    .eq('student_email', email)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // RLS may block student access — return null gracefully
    return { data: null, error: null };
  }

  return { data, error: null };
}

// ═══════════════════════════════════════════════════════════
// PAYMENT HISTORY
// ═══════════════════════════════════════════════════════════

export async function fetchPaymentHistory(): Promise<{
  data: PaymentRecord[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Not authenticated' };
  }

  // Payments are readable by any authenticated user in their tenant (payments_auth_select)
  const { data, error } = await supabase
    .from('office_desk.payments')
    .select(
      'id, amount, currency, status, payment_method, reference, paid_at, created_at, invoice_id'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  // Enrich with invoice description/number
  const invoiceIds = [...new Set((data ?? []).map((p) => p.invoice_id).filter(Boolean))];
  const invoiceMap = new Map<
    string,
    { description: string | null; invoice_number: string | null }
  >();

  if (invoiceIds.length > 0) {
    const { data: invoices } = await supabase
      .from('office_desk.invoices')
      .select('id, description, invoice_number')
      .in('id', invoiceIds);

    for (const inv of invoices ?? []) {
      invoiceMap.set(inv.id, {
        description: inv.description,
        invoice_number: inv.invoice_number,
      });
    }
  }

  const payments: PaymentRecord[] = (data ?? []).map((p) => {
    const inv = invoiceMap.get(p.invoice_id);
    return {
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      payment_method: p.payment_method,
      reference: p.reference,
      paid_at: p.paid_at,
      created_at: p.created_at,
      description: inv?.description ?? null,
      invoice_number: inv?.invoice_number ?? null,
    };
  });

  return { data: payments, error: null };
}

// ═══════════════════════════════════════════════════════════
// GRADES (per course)
// ═══════════════════════════════════════════════════════════

export async function fetchGrades(): Promise<{
  data: GradeRecord[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Not authenticated' };
  }

  // Fetch gradebook entries for this student
  const { data: grades, error: gbErr } = await supabase
    .from('gradebook')
    .select('course_id, score, max_score:assignments(max_score)')
    .eq('student_id', user.id);

  if (gbErr) {
    // RLS may block — return empty gracefully
    return { data: [], error: null };
  }

  // Fetch course titles
  const courseIds = [...new Set((grades ?? []).map((g) => g.course_id))];
  const { data: courses } = await supabase.from('courses').select('id, title').in('id', courseIds);
  const courseMap = new Map((courses ?? []).map((c) => [c.id, c.title]));

  // Group by course and compute averages
  const accum = new Map<string, { total: number; count: number; maxScore: number }>();
  for (const g of grades ?? []) {
    const acc = accum.get(g.course_id) ?? { total: 0, count: 0, maxScore: 0 };
    if (g.score != null) {
      acc.total += Number(g.score);
      acc.count += 1;
    }
    const maxScore = (g.max_score as unknown as { max_score: number }[])?.[0]?.max_score;
    if (maxScore && maxScore > acc.maxScore) {
      acc.maxScore = maxScore;
    }
    accum.set(g.course_id, acc);
  }

  const result: GradeRecord[] = [];
  for (const [courseId, acc] of accum) {
    result.push({
      course_id: courseId,
      course_title: courseMap.get(courseId) ?? 'Unknown Course',
      avg_score: acc.count > 0 ? acc.total / acc.count : null,
      max_score: acc.maxScore || null,
      assignment_count: acc.count,
    });
  }

  return { data: result, error: null };
}

// ═══════════════════════════════════════════════════════════
// ATTENDANCE (per course)
// ═══════════════════════════════════════════════════════════

export async function fetchAttendance(): Promise<{
  data: AttendanceRecord[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Not authenticated' };
  }

  // Fetch attendance records for this student
  const { data: records, error: attErr } = await supabase
    .from('attendance')
    .select('course_id, status')
    .eq('student_id', user.id);

  if (attErr) {
    // RLS may block — return empty gracefully
    return { data: [], error: null };
  }

  // Fetch course titles
  const courseIds = [...new Set((records ?? []).map((r) => r.course_id))];
  const { data: courses } = await supabase.from('courses').select('id, title').in('id', courseIds);
  const courseMap = new Map((courses ?? []).map((c) => [c.id, c.title]));

  // Group by course and compute attendance %
  const accum = new Map<string, { total: number; present: number }>();
  for (const r of records ?? []) {
    const acc = accum.get(r.course_id) ?? { total: 0, present: 0 };
    acc.total += 1;
    if (r.status === 'present') acc.present += 1;
    accum.set(r.course_id, acc);
  }

  const result: AttendanceRecord[] = [];
  for (const [courseId, acc] of accum) {
    result.push({
      course_id: courseId,
      course_title: courseMap.get(courseId) ?? 'Unknown Course',
      total_sessions: acc.total,
      present_count: acc.present,
      attendance_pct: acc.total > 0 ? Math.round((acc.present / acc.total) * 100) : 0,
    });
  }

  return { data: result, error: null };
}

// ═══════════════════════════════════════════════════════════
// UPDATE PROFILE
// ═══════════════════════════════════════════════════════════

export async function updateStudentProfile(updates: {
  name?: string;
  phone?: string;
}): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  return { error: error?.message ?? null };
}
