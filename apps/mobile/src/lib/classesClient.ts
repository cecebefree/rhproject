// src/lib/classesClient.ts
// Fetch classes + enrollment status via Supabase RLS (Row 95)

import { supabase } from '../services/supabase';
import type { ClassItem, EnrollmentStatus, ScheduleSlot } from '../types/classes';

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
    .select('id, label, start_time, end_time, days_of_week')
    .eq('course_id', classId)
    .eq('is_active', true)
    .order('start_time');

  if (error) {
    return { slots: [], error: error.message };
  }

  return { slots: data ?? [], error: null };
}
