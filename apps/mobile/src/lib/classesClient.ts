// src/lib/classesClient.ts
// Fetch classes + enrollment status via Supabase RLS (Row 95)
// Provides student/teacher class fetching and class detail delegation

import { supabase } from '../services/supabase';
import type { ClassItem, ScheduleSlot } from '../types/classes';
import { fetchClassDetail } from './classDetailClient';

// ─── SHARED TYPES ─────────────────────────────────────────────

/** Result for class list queries (enrolled or teaching) */
export interface ClassDataResult {
  classes: ClassItem[];
  slots: ScheduleSlot[];
  error: string | null;
}

export async function fetchClassesWithEnrollment(): Promise<{
  classes: ClassItem[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { classes: [], error: 'Not authenticated' };
  }

  // 1. Fetch all published classes
  const { data: allCourses, error: courseErr } = await supabase
    .from('courses')
    .select('id, title, description, type, platform, status, teacher_id')
    .eq('status', 'published')
    .order('title');

  if (courseErr) {
    return { classes: [], error: courseErr.message };
  }

  if (!allCourses || allCourses.length === 0) {
    return { classes: [], error: null };
  }

  // 2. Fetch user's enrollments
  const { data: enrollments } = await supabase
    .from('student_class')
    .select('class_id')
    .eq('student_id', user.id)
    .eq('is_active', true);

  const enrolledIds = new Set((enrollments ?? []).map((e) => e.class_id));

  // 3. Fetch teacher names
  const teacherIds = [...new Set(allCourses.map((c) => c.teacher_id))];
  const teacherMap = new Map<string, string>();

  for (const tid of teacherIds) {
    const { data } = await supabase.rpc('get_teacher_name', { p_teacher_id: tid });
    if (data && data.length > 0) {
      teacherMap.set(tid, data[0].name);
    }
  }

  // 4. Build class list with enrollment status
  const classes: ClassItem[] = allCourses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    type: c.type,
    platform: c.platform,
    status: c.status,
    teacher_id: c.teacher_id,
    teacher_name: teacherMap.get(c.teacher_id) ?? null,
    enrollment_status: enrolledIds.has(c.id) ? 'enrolled' : 'available',
  }));

  return { classes, error: null };
}

export async function fetchClassSchedule(classId: string): Promise<{
  slots: ScheduleSlot[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('schedule_slot')
    .select('id, label, start_time, end_time, days_of_week, course_id')
    .eq('course_id', classId)
    .eq('is_active', true)
    .order('start_time');

  if (error) {
    return { slots: [], error: error.message };
  }

  return { slots: data ?? [], error: null };
}

// ─── STUDENT CLASSES ──────────────────────────────────────────

/**
 * Fetch classes a student is enrolled in, with teacher names and schedule slots.
 * Used by the Class screen for student role.
 */
export async function fetchStudentClasses(studentId: string): Promise<ClassDataResult> {
  // 1. Fetch enrolled courses via student_class join
  const { data: enrolled, error: enrErr } = await supabase
    .from('student_class')
    .select(
      'class_id, courses!student_class_class_id_fkey(id, title, description, status, type, platform, teacher_id)'
    )
    .eq('student_id', studentId)
    .eq('is_active', true);

  if (enrErr) {
    return { classes: [], slots: [], error: enrErr.message };
  }

  const courseRows: ClassItem[] = (enrolled ?? [])
    .map((row: { courses: Record<string, unknown>[] | Record<string, unknown> | null }) => {
      const c = row.courses;
      const raw = Array.isArray(c) ? c[0] : c;
      if (!raw) return null;
      return {
        id: raw.id as string,
        title: raw.title as string,
        description: raw.description as string | null,
        type: raw.type as string,
        platform: raw.platform as string,
        status: raw.status as string,
        teacher_id: raw.teacher_id as string,
        teacher_name: null,
        enrollment_status: 'enrolled' as const,
      } as ClassItem;
    })
    .filter((c): c is ClassItem => c != null);

  if (courseRows.length === 0) {
    return { classes: [], slots: [], error: null };
  }

  // 2. Fetch teacher names
  const classesWithTeachers = await attachTeacherNames(courseRows);

  // 3. Fetch schedule slots for these courses
  const courseIds = courseRows.map((c) => c.id);
  const { data: slotData, error: slotErr } = await supabase
    .from('schedule_slot')
    .select('id, label, start_time, end_time, days_of_week, course_id')
    .in('course_id', courseIds)
    .eq('is_active', true)
    .order('start_time');

  if (slotErr) {
    return { classes: classesWithTeachers, slots: [], error: slotErr.message };
  }

  return { classes: classesWithTeachers, slots: slotData ?? [], error: null };
}

// ─── TEACHER / ADMIN CLASSES ──────────────────────────────────

/**
 * Fetch published classes a teacher teaches, with teacher names and schedule slots.
 * Used by the Class screen for teacher/admin role.
 */
export async function fetchTeacherClasses(teacherId: string): Promise<ClassDataResult> {
  // 1. Fetch all published courses
  const { data: courses, error: courseErr } = await supabase
    .from('courses')
    .select('id, title, description, status, type, platform, teacher_id')
    .eq('status', 'published')
    .order('title');

  if (courseErr) {
    return { classes: [], slots: [], error: courseErr.message };
  }

  if (!courses || courses.length === 0) {
    return { classes: [], slots: [], error: null };
  }

  const baseClasses: ClassItem[] = courses.map((c) => ({
    ...c,
    teacher_name: null,
    enrollment_status: 'available' as const,
  }));

  // 2. Fetch teacher names
  const classesWithTeachers = await attachTeacherNames(baseClasses);

  // 3. Fetch schedule slots for these courses
  const courseIds = courses.map((c) => c.id);
  const { data: slotData, error: slotErr } = await supabase
    .from('schedule_slot')
    .select('id, label, start_time, end_time, days_of_week, course_id')
    .in('course_id', courseIds)
    .eq('is_active', true)
    .order('start_time');

  if (slotErr) {
    return { classes: classesWithTeachers, slots: [], error: slotErr.message };
  }

  return { classes: classesWithTeachers, slots: slotData ?? [], error: null };
}

// ─── CLASS DETAILS (delegates to classDetailClient) ───────────

/**
 * Fetch full class details including chapters, schedule, and enrollment status.
 * Delegates to classDetailClient.fetchClassDetail.
 */
export async function fetchClassDetails(classId: string) {
  return fetchClassDetail(classId);
}

// ─── INTERNAL HELPERS ─────────────────────────────────────────

/**
 * Resolve teacher names for a list of classes via the get_teacher_name RPC.
 * Mutates teacher_name on each ClassItem in place and returns the array.
 */
async function attachTeacherNames(classes: ClassItem[]): Promise<ClassItem[]> {
  const teacherIds = [...new Set(classes.map((c) => c.teacher_id))];
  const teacherMap = new Map<string, string>();

  for (const tid of teacherIds) {
    const { data } = await supabase.rpc('get_teacher_name', { p_teacher_id: tid });
    if (data && data.length > 0) {
      teacherMap.set(tid, data[0].name);
    }
  }

  return classes.map((c) => ({
    ...c,
    teacher_name: teacherMap.get(c.teacher_id) ?? null,
  }));
}
