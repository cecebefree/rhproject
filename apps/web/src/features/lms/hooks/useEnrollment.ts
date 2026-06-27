import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { EnrollmentWithCourse } from '../types/lms';

interface UseEnrollmentReturn {
  enrollments: EnrollmentWithCourse[];
  loading: boolean;
  error: Error | null;
  isEnrolled: (courseId: string) => boolean;
  getEnrollment: (courseId: string) => EnrollmentWithCourse | undefined;
  createEnrollment: (courseId: string, paymentReference?: string) => Promise<{ error: Error | null }>;
  updateLastAccessed: (courseId: string) => Promise<void>;
}

export function useEnrollment(studentId: string | null): UseEnrollmentReturn {
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEnrollments = useCallback(async () => {
    if (!studentId) {
      setEnrollments([]);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('enrollments')
      .select(`
        *,
        course:courses(*)
      `)
      .eq('student_id', studentId);

    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      return;
    }

    const enrollmentsWithProgress = await Promise.all(
      (data || []).map(async (enrollment) => {
        const { count } = await supabase
          .from('chapter_progress')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId);

        const { data: chapters } = await supabase
          .from('chapters')
          .select('id')
          .eq('course_id', enrollment.course_id);

        const totalChapters = chapters?.length || 0;
        const completedCount = count || 0;
        const progressPercentage = totalChapters > 0 
          ? Math.round((completedCount / totalChapters) * 100) 
          : 0;

        return {
          ...enrollment,
          progress_percentage: progressPercentage,
          last_accessed_at: enrollment.purchased_at,
        } as EnrollmentWithCourse;
      })
    );

    setEnrollments(enrollmentsWithProgress);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const isEnrolled = useCallback((courseId: string) => {
    return enrollments.some(e => e.course_id === courseId);
  }, [enrollments]);

  const getEnrollment = useCallback((courseId: string) => {
    return enrollments.find(e => e.course_id === courseId);
  }, [enrollments]);

  const createEnrollment = async (courseId: string, paymentReference?: string) => {
    if (!studentId) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('enrollments')
      .insert({
        student_id: studentId,
        course_id: courseId,
        payment_reference: paymentReference,
      });

    if (!error) {
      await fetchEnrollments();
    }

    return { error: error ? new Error(error.message) : null };
  };

  const updateLastAccessed = async (courseId: string) => {
    // Last accessed tracking is implicit via enrollment update
    // Could extend to track explicitly if needed
  };

  return {
    enrollments,
    loading,
    error,
    isEnrolled,
    getEnrollment,
    createEnrollment,
    updateLastAccessed,
  };
}