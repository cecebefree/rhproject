// adminCoursesClient — CRUD operations for admin course builder (Rows 99-101)
// Uses school_desk.courses + school_desk.course_schedule

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Admin Supabase client init failed: env vars required');
}

// biome-ignore lint/suspicious/noExplicitAny: school_desk schema not in shared types
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as any;

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type CourseStatus = 'draft' | 'published';

export interface Course {
  id: string;
  tenant_id: string | null;
  title: string;
  description: string | null;
  price: number;
  status: CourseStatus;
  teacher_id: string;
  capacity: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  instructor_name?: string;
  enrollment_count?: number;
}

export interface CourseSchedule {
  id: string;
  tenant_id: string;
  course_id: string;
  class_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  recurring: 'none' | 'weekly' | 'monthly';
  created_at: string;
  updated_at: string;
}

export interface Instructor {
  id: string;
  name: string;
  email: string;
}

// ═══════════════════════════════════════════════════════════
// COURSE CRUD
// ═══════════════════════════════════════════════════════════

export async function listCourses(options?: {
  search?: string;
  status?: CourseStatus;
  instructorId?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('school_desk.courses')
    .select(`
      *,
      profiles!teacher_id(name),
      student_class(count)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (options?.search) {
    query = query.ilike('title', `%${options.search}%`);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.instructorId) {
    query = query.eq('teacher_id', options.instructorId);
  }

  if (options?.limit) {
    const offset = options.offset ?? 0;
    query = query.range(offset, offset + options.limit - 1);
  }

  const { data, error, count } = await query;

  if (error) return { data: null, error, count: 0 };

  // biome-ignore lint/suspicious/noExplicitAny: complex join result
  const courses = (data ?? []).map((row: any) => ({
    ...row,
    instructor_name: row.profiles?.name ?? 'Unassigned',
    enrollment_count: row.student_class?.[0]?.count ?? 0,
    profiles: undefined,
    student_class: undefined,
  }));

  return { data: courses as Course[], error: null, count: count ?? courses.length };
}

export async function getCourse(courseId: string) {
  const { data, error } = await supabase
    .from('school_desk.courses')
    .select(`
      *,
      profiles!teacher_id(name, email),
      student_class(count)
    `)
    .eq('id', courseId)
    .single();

  if (error) return { data: null, error };

  // biome-ignore lint/suspicious/noExplicitAny: complex join result
  const row = data as any;
  const course: Course = {
    ...row,
    instructor_name: row.profiles?.name ?? 'Unassigned',
    enrollment_count: row.student_class?.[0]?.count ?? 0,
  };

  return { data: course, error: null };
}

export async function createCourse(course: {
  tenant_id: string;
  title: string;
  description?: string;
  price: number;
  teacher_id: string;
  capacity?: number;
  status?: CourseStatus;
}) {
  return supabase
    .from('school_desk.courses')
    .insert({
      tenant_id: course.tenant_id,
      title: course.title,
      description: course.description || null,
      price: course.price,
      teacher_id: course.teacher_id,
      capacity: course.capacity || null,
      status: course.status ?? 'draft',
    })
    .select()
    .single();
}

export async function updateCourse(
  courseId: string,
  updates: {
    title?: string;
    description?: string;
    price?: number;
    teacher_id?: string;
    capacity?: number | null;
    status?: CourseStatus;
  },
) {
  return supabase
    .from('school_desk.courses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', courseId)
    .select()
    .single();
}

export async function deleteCourse(courseId: string) {
  // Check for linked family accounts and adult profiles via students enrolled in this course
  const { data: enrolledStudents } = await supabase
    .from('student_class')
    .select('student_id')
    .eq('class_id', courseId);

  if (!enrolledStudents?.length) {
    return supabase
      .from('school_desk.courses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', courseId);
  }

  const studentIds = enrolledStudents.map(e => e.student_id);

  // Check parent_student_link (adult profiles linked to enrolled students)
  const { count: parentCount } = await supabase
    .from('parent_student_link')
    .select('id', { count: 'exact', head: true })
    .in('student_id', studentIds);

  // Check family_child (family accounts linked to enrolled students)
  const { count: familyCount } = await supabase
    .from('family_child')
    .select('child_id', { count: 'exact', head: true })
    .in('child_id', studentIds);

  // Check office_desk.family_accounts via registration_reference
  const { count: familyAccountCount } = await supabase
    .from('office_desk.family_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', (await supabase.from('school_desk.courses').select('tenant_id').eq('id', courseId).single()).data?.tenant_id ?? '');

  const totalLinked = (parentCount ?? 0) + (familyCount ?? 0);

  if (totalLinked > 0) {
    const parts: string[] = [];
    if (parentCount) parts.push(`${parentCount} parent/guardian link(s)`);
    if (familyCount) parts.push(`${familyCount} family account link(s)`);
    return {
      error: {
        message: `Cannot delete: ${enrolledStudents.length} student(s) enrolled with linked family profiles (${parts.join(', ')}). Unlink families and remove enrollments first.`,
      },
    };
  }

  return supabase
    .from('school_desk.courses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', courseId);
}

export async function getCourseDeletionWarnings(courseId: string): Promise<{
  studentCount: number;
  parentLinks: number;
  familyLinks: number;
  blocking: boolean;
}> {
  const { data: enrolledStudents } = await supabase
    .from('student_class')
    .select('student_id')
    .eq('class_id', courseId);

  if (!enrolledStudents?.length) {
    return { studentCount: 0, parentLinks: 0, familyLinks: 0, blocking: false };
  }

  const studentIds = enrolledStudents.map(e => e.student_id);

  const { count: parentLinks } = await supabase
    .from('parent_student_link')
    .select('id', { count: 'exact', head: true })
    .in('student_id', studentIds);

  const { count: familyLinks } = await supabase
    .from('family_child')
    .select('child_id', { count: 'exact', head: true })
    .in('child_id', studentIds);

  return {
    studentCount: enrolledStudents.length,
    parentLinks: parentLinks ?? 0,
    familyLinks: familyLinks ?? 0,
    blocking: (parentLinks ?? 0) + (familyLinks ?? 0) > 0,
  };
}

// ═══════════════════════════════════════════════════════════
// INSTRUCTOR LIST
// ═══════════════════════════════════════════════════════════

export async function listInstructors(tenantId?: string) {
  let query = supabase
    .from('profiles')
    .select('id, name, email')
    .in('role', ['teacher', 'admin'])
    .order('name');

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  return query;
}

// ═══════════════════════════════════════════════════════════
// SCHEDULE CRUD
// ═══════════════════════════════════════════════════════════

export async function listSchedule(courseId: string) {
  return supabase
    .from('school_desk.course_schedule')
    .select('*')
    .eq('course_id', courseId)
    .order('class_date')
    .order('start_time');
}

export async function addScheduleSlot(slot: {
  tenant_id: string;
  course_id: string;
  class_date: string;
  start_time: string;
  end_time: string;
  location?: string;
  recurring?: 'none' | 'weekly' | 'monthly';
}) {
  return supabase
    .from('school_desk.course_schedule')
    .insert({
      tenant_id: slot.tenant_id,
      course_id: slot.course_id,
      class_date: slot.class_date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      location: slot.location || null,
      recurring: slot.recurring ?? 'none',
    })
    .select()
    .single();
}

export async function deleteScheduleSlot(slotId: string) {
  return supabase
    .from('school_desk.course_schedule')
    .delete()
    .eq('id', slotId);
}
