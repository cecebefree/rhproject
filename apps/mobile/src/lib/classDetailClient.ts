// src/lib/classDetailClient.ts
// Fetch class details via Supabase RLS (Row 97)
// Aggregates: course + teacher name + enrollment + schedule + chapters

import { supabase } from '../services/supabase';
import type {
  ClassDetail,
  CurriculumChapter,
  MaterialItem,
  ScheduleSlotDetail,
} from '../types/classDetail';

export async function fetchClassDetail(classId: string): Promise<{
  data: ClassDetail | null;
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // 1. Fetch course
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('id, title, description, price, status, type, platform, teacher_id')
    .eq('id', classId)
    .single();

  if (courseErr || !course) {
    return { data: null, error: courseErr?.message ?? 'Class not found' };
  }

  // 2. Fetch teacher name
  let teacherName: string | null = null;
  const { data: teacherData } = await supabase.rpc('get_teacher_name', {
    p_teacher_id: course.teacher_id,
  });
  if (teacherData && teacherData.length > 0) {
    teacherName = teacherData[0].name;
  }

  // 3. Check enrollment status
  let enrollmentStatus: 'enrolled' | 'available' | 'waitlisted' = 'available';
  const { data: enrollment } = await supabase
    .from('student_class')
    .select('class_id')
    .eq('student_id', user.id)
    .eq('class_id', classId)
    .eq('is_active', true)
    .maybeSingle();

  if (enrollment) {
    enrollmentStatus = 'enrolled';
  }

  // 4. Fetch schedule slots
  const { data: slotData } = await supabase
    .from('schedule_slot')
    .select('id, label, start_time, end_time, days_of_week')
    .eq('course_id', classId)
    .eq('is_active', true)
    .order('start_time');

  const schedule: ScheduleSlotDetail[] = (slotData ?? []).map((s) => ({
    id: s.id,
    label: s.label,
    start_time: s.start_time,
    end_time: s.end_time,
    days_of_week: s.days_of_week,
  }));

  // 5. Fetch chapters via RPC (curriculum)
  let chapters: CurriculumChapter[] = [];
  const { data: chapterData } = await supabase.rpc('chapters_read', {
    p_course_id: classId,
  });
  if (chapterData) {
    chapters = chapterData.map((ch: Record<string, unknown>) => ({
      id: ch.id as string,
      title: ch.title as string,
      description: (ch.description as string) ?? null,
      order_index: ch.order_index as number,
    }));
  }

  // 6. Materials — placeholder (no materials table yet)
  const materials: MaterialItem[] = [];

  const detail: ClassDetail = {
    id: course.id,
    title: course.title,
    description: course.description,
    price: course.price,
    status: course.status,
    type: course.type,
    platform: course.platform,
    teacher_id: course.teacher_id,
    teacher_name: teacherName,
    enrollment_status: enrollmentStatus,
    chapters,
    schedule,
    materials,
  };

  return { data: detail, error: null };
}
