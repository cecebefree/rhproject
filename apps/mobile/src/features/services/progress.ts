import { supabase } from './supabase';
import type { ChapterProgress, EnrollmentWithCourse } from '../types/lms';

export interface CourseProgress {
  courseId: string;
  courseTitle: string;
  completedChapters: number;
  totalChapters: number;
  progressPercentage: number;
}

export async function getStudentProgress(
  studentId: string
): Promise<CourseProgress[]> {
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      *,
      course:courses(*)
    `)
    .eq('student_id', studentId);

  if (!enrollments) return [];

  const progressList: CourseProgress[] = [];

  for (const enrollment of enrollments) {
    const { count: completedCount } = await supabase
      .from('chapter_progress')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId);

    const { data: chapters } = await supabase
      .from('chapters')
      .select('id', { count: 'exact' })
      .eq('course_id', enrollment.course_id);

    const totalChapters = chapters?.length || 0;
    const completed = completedCount || 0;
    const percentage = totalChapters > 0 ? Math.round((completed / totalChapters) * 100) : 0;

    progressList.push({
      courseId: enrollment.course_id,
      courseTitle: enrollment.course.title,
      completedChapters: completed,
      totalChapters,
      progressPercentage: percentage,
    });
  }

  return progressList;
}

export async function markChapterComplete(
  studentId: string,
  chapterId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('chapter_progress')
    .insert({
      student_id: studentId,
      chapter_id: chapterId,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function isChapterCompleted(
  studentId: string,
  chapterId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('chapter_progress')
    .select('id')
    .eq('student_id', studentId)
    .eq('chapter_id', chapterId)
    .single();

  return !!data && !error;
}

export async function getCompletedChapterIds(
  studentId: string,
  courseId: string
): Promise<string[]> {
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id')
    .eq('course_id', courseId);

  if (!chapters) return [];

  const { data: progress } = await supabase
    .from('chapter_progress')
    .select('chapter_id')
    .eq('student_id', studentId)
    .in('chapter_id', chapters.map(c => c.id));

  return (progress || []).map(p => p.chapter_id);
}