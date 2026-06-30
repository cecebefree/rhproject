import { supabase } from './supabase';
import type { Course, CourseWithInstructor } from '../types/lms';
import { validateCourseInput } from '../validation/schemas';

export interface CreateCourseResult {
  success: boolean;
  courseId?: string;
  error: string | null;
}

export async function createCourse(
  instructorId: string,
  title: string,
  description: string | null,
  price: number
): Promise<CreateCourseResult> {
  try {
    const input = validateCourseInput({ title, description, price });

    const { data, error } = await supabase
      .from('courses')
      .insert({
        title: input.title,
        description: input.description || null,
        price: input.price,
        instructor_id: instructorId,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, courseId: data.id, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create course' };
  }
}

export async function updateCourse(
  courseId: string,
  updates: { title?: string; description?: string; price?: number }
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('courses')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function publishCourse(courseId: string): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('courses')
    .update({
      status: 'published',
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function getInstructorCourses(instructorId: string): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('instructor_id', instructorId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []) as Course[];
}

export async function getInstructorCoursesWithEnrollmentCounts(instructorId: string): Promise<(Course & { enrollment_count: number })[]> {
  const courses = await getInstructorCourses(instructorId);

  const coursesWithCounts = await Promise.all(
    courses.map(async (course) => {
      const { count } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id);

      return {
        ...course,
        enrollment_count: count || 0,
      };
    })
  );

  return coursesWithCounts as (Course & { enrollment_count: number })[];
}

export async function deleteCourse(courseId: string): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}