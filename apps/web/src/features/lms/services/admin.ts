import { supabase } from './supabase';
import type { Enrollment, ChapterProgress, Profile, Course } from '../types/lms';

export interface RegistrationRecord {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  payment_status: string;
  student_name: string;
  student_email: string;
  course_title: string;
  course_price: number;
}

export interface ProgressRecord {
  student_id: string;
  student_name: string;
  student_email: string;
  course_id: string;
  course_title: string;
  completed_chapters: number;
  total_chapters: number;
  progress_percentage: number;
}

export async function getAllRegistrations(): Promise<RegistrationRecord[]> {
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select(`
      *,
      course:courses(id, title, price),
      student:profiles!student_id(id, name)
    `)
    .order('purchased_at', { ascending: false });

  if (error || !enrollments) return [];

  return enrollments.map(e => ({
    id: e.id,
    student_id: e.student_id,
    course_id: e.course_id,
    enrolled_at: e.purchased_at,
    payment_status: e.payment_reference ? 'paid' : 'pending',
    student_name: (e.student as { name: string })?.name || 'Unknown',
    student_email: '',
    course_title: (e.course as { title: string })?.title || 'Unknown',
    course_price: (e.course as { price: number })?.price || 0,
  }));
}

export async function getRegistrationsByCourse(courseId: string): Promise<RegistrationRecord[]> {
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select(`
      *,
      course:courses(id, title, price),
      student:profiles!student_id(id, name)
    `)
    .eq('course_id', courseId)
    .order('purchased_at', { ascending: false });

  if (error || !enrollments) return [];

  return enrollments.map(e => ({
    id: e.id,
    student_id: e.student_id,
    course_id: e.course_id,
    enrolled_at: e.purchased_at,
    payment_status: e.payment_reference ? 'paid' : 'pending',
    student_name: (e.student as { name: string })?.name || 'Unknown',
    student_email: '',
    course_title: (e.course as { title: string })?.title || 'Unknown',
    course_price: (e.course as { price: number })?.price || 0,
  }));
}

export async function getAllProgress(): Promise<ProgressRecord[]> {
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select(`
      *,
      course:courses(id, title),
      student:profiles!student_id(id, name)
    `);

  if (error || !enrollments) return [];

  const progressRecords: ProgressRecord[] = [];

  for (const enrollment of enrollments) {
    const { count: completedCount } = await supabase
      .from('chapter_progress')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', enrollment.student_id);

    const { data: chapters } = await supabase
      .from('chapters')
      .select('id', { count: 'exact' })
      .eq('course_id', enrollment.course_id);

    const totalChapters = chapters?.length || 0;
    const completed = completedCount || 0;
    const percentage = totalChapters > 0 ? Math.round((completed / totalChapters) * 100) : 0;

    progressRecords.push({
      student_id: enrollment.student_id,
      student_name: (enrollment.student as { name: string })?.name || 'Unknown',
      student_email: '',
      course_id: enrollment.course_id,
      course_title: (enrollment.course as { title: string })?.title || 'Unknown',
      completed_chapters: completed,
      total_chapters: totalChapters,
      progress_percentage: percentage,
    });
  }

  return progressRecords;
}

export async function getProgressByStudent(studentId: string): Promise<ProgressRecord[]> {
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select(`
      *,
      course:courses(id, title)
    `)
    .eq('student_id', studentId);

  if (error || !enrollments) return [];

  const progressRecords: ProgressRecord[] = [];

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

    progressRecords.push({
      student_id: studentId,
      student_name: '',
      student_email: '',
      course_id: enrollment.course_id,
      course_title: (enrollment.course as { title: string })?.title || 'Unknown',
      completed_chapters: completed,
      total_chapters: totalChapters,
      progress_percentage: percentage,
    });
  }

  return progressRecords;
}

export async function getAllStudents(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student');

  if (error) return [];
  return (data || []) as Profile[];
}

export async function getAllCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('status', 'published');

  if (error) return [];
  return (data || []) as Course[];
}