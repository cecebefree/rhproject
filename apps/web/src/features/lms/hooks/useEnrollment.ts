import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

/**
 * T018 — useEnrollment hook
 * Checks whether a student is enrolled in a specific course.
 * Returns enrolled (boolean) and loading state.
 */
export function useEnrollment(studentId: string | null, courseId: string | null) {
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId || !courseId) {
      setLoading(false);
      return;
    }

    const checkEnrollment = async () => {
      const { data, error } = await supabase
        .from('student_class' as never)
        .select('student_id')
        .eq('student_id', studentId)
        .eq('class_id', courseId)
        .limit(1);

      if (error) {
        console.error('Enrollment check failed:', error);
        setEnrolled(false);
      } else {
        setEnrolled((data ?? []).length > 0);
      }
      setLoading(false);
    };

    checkEnrollment();
  }, [studentId, courseId]);

  return { enrolled, loading };
}

/**
 * T018 — useStudentCourses hook
 * Returns all courses a student is enrolled in.
 */
export function useStudentCourses(studentId: string | null) {
  const [courses, setCourses] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    const fetchCourses = async () => {
      const { data: enrollments, error } = await supabase
        .from('student_class' as never)
        .select('class_id')
        .eq('student_id', studentId);

      if (error || !enrollments?.length) {
        setCourses([]);
        setLoading(false);
        return;
      }

      const classIds = enrollments.map((e: { class_id: string }) => e.class_id);

      const { data: courseData } = await supabase
        .from('school_desk.programs' as never)
        .select('*')
        .in('id', classIds);

      setCourses(courseData ?? []);
      setLoading(false);
    };

    fetchCourses();
  }, [studentId]);

  return { courses, loading };
}
