import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@redhouse/shared'

export type LMSClient = SupabaseClient<Database>;

export interface Profile {
  id: string;
  name: string;
  role: 'student' | 'instructor' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: 'draft' | 'published';
  instructor_id: string;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  purchased_at: string;
  payment_reference: string | null;
}

export interface ChapterProgress {
  id: string;
  student_id: string;
  chapter_id: string;
  completed_at: string;
}

export interface Registration {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  payment_status: string;
}

export interface CourseWithInstructor extends Course {
  instructor: Profile;
}

export interface ChapterWithProgress extends Chapter {
  completed: boolean;
  progress_id: string | null;
}

export interface EnrollmentWithCourse extends Enrollment {
  course: Course;
  progress_percentage: number;
  last_accessed_at: string | null;
}

export interface StudentProgress {
  student: Profile;
  course_id: string;
  course_title: string;
  completed_chapters: number;
  total_chapters: number;
  progress_percentage: number;
}

export type UserRole = 'student' | 'instructor' | 'admin';