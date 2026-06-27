import { supabase } from './supabase';
import type { Course, CourseWithInstructor } from '../types/lms';

export interface PurchaseResult {
  success: boolean;
  enrollmentId?: string;
  error: string | null;
}

export async function purchaseCourse(
  studentId: string,
  courseId: string,
  paymentReference?: string
): Promise<PurchaseResult> {
  const { data, error } = await supabase
    .from('enrollments')
    .insert({
      student_id: studentId,
      course_id: courseId,
      payment_reference: paymentReference,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, enrollmentId: data.id, error: null };
}

export async function getPublishedCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []) as Course[];
}

export async function getPublishedCoursesWithInstructors(): Promise<CourseWithInstructor[]> {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      instructor:profiles!instructor_id(*)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []) as CourseWithInstructor[];
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (error) return null;
  return data as Course;
}

export async function getCourseWithInstructor(courseId: string): Promise<CourseWithInstructor | null> {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      instructor:profiles!instructor_id(*)
    `)
    .eq('id', courseId)
    .single();

  if (error) return null;
  return data as CourseWithInstructor;
}