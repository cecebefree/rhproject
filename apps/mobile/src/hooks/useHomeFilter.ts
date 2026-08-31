// src/hooks/useHomeFilter.ts
// Home Feed Filter: fetches enrolled classes filtered by user role.
// - Student: own enrollments
// - Adult (parent): enrollments of linked children only
// - Staff/Admin: all published classes (unfiltered)

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { ClassItem } from '../types/classes';

interface HomeFilterResult {
  classes: ClassItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useHomeFilter(): HomeFilterResult {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHomeFeed = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setClasses([]);
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    // 1. Determine user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;

    if (role === 'adult') {
      // ADULT: fetch enrollments for connected children only
      await loadAdultHomeFeed(user.id);
    } else {
      // STUDENT / STAFF / ADMIN: fetch own enrollments
      await loadStudentHomeFeed(user.id);
    }

    setLoading(false);
  }, []);

  // ─── ADULT HOME FEED ───────────────────────────────────────
  // Query: enrollments for children linked via family_child
  async function loadAdultHomeFeed(parentId: string): Promise<void> {
    // Step 1: get child IDs from family_child
    const { data: links, error: linkErr } = await supabase
      .from('family_child')
      .select('child_id')
      .eq('guardian_id', parentId);

    if (linkErr || !links || links.length === 0) {
      setClasses([]);
      setError(linkErr?.message ?? 'No children linked');
      return;
    }

    const childIds = links.map((l) => l.child_id);

    // Step 2: fetch enrollments for those children
    const { data: enrollments, error: enrErr } = await supabase
      .from('student_class')
      .select('student_id, class_id, enrolled_at, is_active')
      .in('student_id', childIds)
      .eq('is_active', true)
      .order('enrolled_at', { ascending: false });

    if (enrErr) {
      setClasses([]);
      setError(enrErr.message);
      return;
    }

    if (!enrollments || enrollments.length === 0) {
      setClasses([]);
      return;
    }

    // Step 3: fetch course details
    const classIds = [...new Set(enrollments.map((e) => e.class_id))];
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, description, type, platform, status, teacher_id')
      .in('id', classIds);

    const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));

    // Step 4: fetch teacher names
    const teacherIds = [...new Set((courses ?? []).map((c) => c.teacher_id).filter(Boolean))];
    const teacherMap = new Map<string, string>();
    for (const tid of teacherIds) {
      const { data } = await supabase.rpc('get_teacher_name', { p_teacher_id: tid });
      if (data && data.length > 0) {
        teacherMap.set(tid, data[0].name);
      }
    }

    // Step 5: fetch schedule slots for "Coming Up" section
    const { data: slots } = await supabase
      .from('schedule_slot')
      .select('course_id, label, start_time, end_time, days_of_week')
      .in('course_id', classIds)
      .eq('is_active', true)
      .order('start_time');

    const scheduleMap = new Map<
      string,
      { label: string | null; start_time: string; end_time: string; days_of_week: number[] } | null
    >();
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

    // Step 6: build class list
    const classItems: ClassItem[] = enrollments.map((enr) => {
      const course = courseMap.get(enr.class_id);
      return {
        id: enr.class_id,
        title: course?.title ?? 'Unknown Class',
        description: course?.description ?? null,
        type: course?.type ?? '',
        platform: course?.platform ?? '',
        status: course?.status ?? '',
        teacher_id: course?.teacher_id ?? '',
        teacher_name: course?.teacher_id ? (teacherMap.get(course.teacher_id) ?? null) : null,
        enrollment_status: 'enrolled' as const,
      };
    });

    setClasses(classItems);
  }

  // ─── STUDENT HOME FEED ─────────────────────────────────────
  async function loadStudentHomeFeed(studentId: string): Promise<void> {
    const { data: enrollments, error: enrErr } = await supabase
      .from('student_class')
      .select('student_id, class_id, enrolled_at, is_active')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .order('enrolled_at', { ascending: false });

    if (enrErr) {
      setClasses([]);
      setError(enrErr.message);
      return;
    }

    if (!enrollments || enrollments.length === 0) {
      setClasses([]);
      return;
    }

    const classIds = [...new Set(enrollments.map((e) => e.class_id))];
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, description, type, platform, status, teacher_id')
      .in('id', classIds);

    const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));

    const teacherIds = [...new Set((courses ?? []).map((c) => c.teacher_id).filter(Boolean))];
    const teacherMap = new Map<string, string>();
    for (const tid of teacherIds) {
      const { data } = await supabase.rpc('get_teacher_name', { p_teacher_id: tid });
      if (data && data.length > 0) {
        teacherMap.set(tid, data[0].name);
      }
    }

    const classItems: ClassItem[] = enrollments.map((enr) => {
      const course = courseMap.get(enr.class_id);
      return {
        id: enr.class_id,
        title: course?.title ?? 'Unknown Class',
        description: course?.description ?? null,
        type: course?.type ?? '',
        platform: course?.platform ?? '',
        status: course?.status ?? '',
        teacher_id: course?.teacher_id ?? '',
        teacher_name: course?.teacher_id ? (teacherMap.get(course.teacher_id) ?? null) : null,
        enrollment_status: 'enrolled' as const,
      };
    });

    setClasses(classItems);
  }

  useEffect(() => {
    loadHomeFeed();
  }, [loadHomeFeed]);

  return {
    classes,
    loading,
    error,
    refresh: loadHomeFeed,
  };
}
