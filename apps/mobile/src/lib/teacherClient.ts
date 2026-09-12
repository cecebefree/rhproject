// src/lib/teacherClient.ts
// Teacher dashboard data — courses taught + enrolled students per course

import { supabase } from '../services/supabase';

// ─── TYPES ─────────────────────────────────────────────────────

export interface TeacherCourse {
  id: string;
  title: string;
  description: string | null;
  type: string;
  platform: string;
  status: string;
  teacher_id: string;
}

export interface EnrolledStudent {
  id: string;
  class_id: string;
  student_id: string;
  is_active: boolean;
  enrolled_at: string;
}

export interface TeacherDashboardData {
  courses: TeacherCourse[];
  studentsByCourse: Map<string, EnrolledStudent[]>;
}

// ─── FETCH FUNCTIONS ───────────────────────────────────────────

/**
 * Fetch courses where the current user is the teacher.
 */
export async function fetchTeacherCourses(): Promise<{
  courses: TeacherCourse[];
  error: string | null;
}> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { courses: [], error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .schema('public').from('courses')
    .select('id, title, description, type, platform, status, teacher_id')
    .eq('teacher_id', user.id)
    .order('title');

  if (error) {
    return { courses: [], error: error.message };
  }

  return { courses: data ?? [], error: null };
}

/**
 * Fetch students enrolled in a specific course.
 */
export async function fetchCourseStudents(courseId: string): Promise<{
  students: EnrolledStudent[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .schema('public').from('student_class')
    .select('id, class_id, student_id, is_active, enrolled_at')
    .eq('class_id', courseId)
    .eq('is_active', true)
    .order('enrolled_at');

  if (error) {
    return { students: [], error: error.message };
  }

  return { students: data ?? [], error: null };
}

/**
 * Fetch full teacher dashboard: courses taught + students per course.
 * Returns a Map keyed by course ID for O(1) lookup in the UI.
 */
export async function fetchTeacherDashboard(): Promise<{
  data: TeacherDashboardData | null;
  error: string | null;
}> {
  const { courses, error: courseErr } = await fetchTeacherCourses();

  if (courseErr) {
    return { data: null, error: courseErr };
  }

  if (courses.length === 0) {
    return {
      data: { courses: [], studentsByCourse: new Map() },
      error: null,
    };
  }

  const studentsByCourse = new Map<string, EnrolledStudent[]>();

  // Fetch students for each course sequentially to avoid connection pool saturation
  for (const course of courses) {
    const { students, error: stuErr } = await fetchCourseStudents(course.id);
    if (!stuErr) {
      studentsByCourse.set(course.id, students);
    }
  }

  return {
    data: { courses, studentsByCourse },
    error: null,
  };
}
