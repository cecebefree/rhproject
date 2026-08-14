import React, { useState, useEffect } from 'react';
import {
  getStudentTranscript,
  getStudentGrades,
  calculateGrade,
  type Gradebook,
} from '../services/supabase';

interface StudentTranscriptProps {
  studentId: string;
  studentName: string;
  tenantId: string;
  onBack: () => void;
}

interface CourseTranscript {
  course_id: string;
  course_title: string;
  weighted_average: number | null;
  grade_letter: string | null;
  grade_count: number;
  assignments: Array<{
    title: string;
    score: number | null;
    max_score: number;
    weight: number;
    percentage: number | null;
    feedback: string | null;
  }>;
}

export function StudentTranscript({
  studentId,
  studentName,
  tenantId,
  onBack,
}: StudentTranscriptProps) {
  const [transcript, setTranscript] = useState<CourseTranscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTranscript();
  }, [studentId, tenantId]);

  async function loadTranscript() {
    setLoading(true);
    try {
      const { data, error } = await getStudentTranscript(studentId, tenantId);
      if (error) throw error;

      if (!data || data.length === 0) {
        setTranscript([]);
        return;
      }

      const enrichedTranscript: CourseTranscript[] = [];

      for (const course of data) {
        const { data: grades } = await getStudentGrades(course.course_id, studentId);

        const assignments = (grades || []).map((g: any) => {
          const assignment = g.assignments;
          const percentage =
            g.score !== null && assignment?.max_score > 0
              ? Math.round((g.score / assignment.max_score) * 100)
              : null;

          return {
            title: assignment?.title || 'Unknown',
            score: g.score,
            max_score: assignment?.max_score || 100,
            weight: assignment?.weight || 1.0,
            percentage,
            feedback: g.feedback,
          };
        });

        enrichedTranscript.push({
          course_id: course.course_id,
          course_title: course.course_title,
          weighted_average: course.weighted_average,
          grade_letter: course.grade_letter,
          grade_count: course.grade_count,
          assignments,
        });
      }

      setTranscript(enrichedTranscript);
    } catch (err: any) {
      setError(err.message || 'Failed to load transcript');
    } finally {
      setLoading(false);
    }
  }

  function getLetterGrade(percentage: number): string {
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  function getOverallGPA(): number | null {
    const validCourses = transcript.filter(
      (c) => c.weighted_average !== null,
    );
    if (validCourses.length === 0) return null;

    const total = validCourses.reduce((sum, c) => sum + c.weighted_average!, 0);
    return Math.round(total / validCourses.length);
  }

  function getGpaLabel(gpa: number): string {
    if (gpa >= 93) return '4.0 (A)';
    if (gpa >= 90) return '3.7 (A-)';
    if (gpa >= 87) return '3.3 (B+)';
    if (gpa >= 83) return '3.0 (B)';
    if (gpa >= 80) return '2.7 (B-)';
    if (gpa >= 77) return '2.3 (C+)';
    if (gpa >= 73) return '2.0 (C)';
    if (gpa >= 70) return '1.7 (C-)';
    if (gpa >= 67) return '1.3 (D+)';
    if (gpa >= 60) return '1.0 (D)';
    return '0.0 (F)';
  }

  const overallGPA = getOverallGPA();

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8 text-gray-500">Loading transcript...</div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
            &larr; Back
          </button>
          <h2 className="text-lg font-medium text-gray-900">
            Transcript — {studentName}
          </h2>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {overallGPA !== null && (
        <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
          <div className="text-sm text-indigo-700">Overall GPA</div>
          <div className="text-2xl font-bold text-indigo-900">
            {getGpaLabel(overallGPA)}
          </div>
          <div className="text-sm text-indigo-600 mt-1">
            {transcript.filter((c) => c.weighted_average !== null).length} courses
          </div>
        </div>
      )}

      {transcript.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No courses or grades found for this student.
        </div>
      ) : (
        <div className="space-y-6">
          {transcript.map((course) => (
            <div
              key={course.course_id}
              className="border rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-md font-semibold text-gray-900">
                    {course.course_title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {course.grade_count} graded {course.grade_count === 1 ? 'assignment' : 'assignments'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Average</div>
                  <div
                    className={`text-xl font-bold ${
                      course.weighted_average !== null
                        ? course.weighted_average >= 70
                          ? 'text-green-600'
                          : course.weighted_average >= 60
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {course.weighted_average !== null
                      ? `${course.weighted_average}%`
                      : '--'}
                  </div>
                  {course.grade_letter && (
                    <div className="text-sm font-medium text-gray-700">
                      {course.grade_letter}
                    </div>
                  )}
                </div>
              </div>

              {course.assignments.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Assignment
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Score
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Percentage
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Grade
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Feedback
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {course.assignments.map((a, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {a.title}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {a.score !== null ? `${a.score}/${a.max_score}` : '--'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {a.percentage !== null ? (
                              <span
                                className={`font-medium ${
                                  a.percentage >= 70
                                    ? 'text-green-600'
                                    : a.percentage >= 60
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                }`}
                              >
                                {a.percentage}%
                              </span>
                            ) : (
                              <span className="text-gray-400">--</span>
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {a.percentage !== null ? (
                              <span className="font-medium text-gray-900">
                                {getLetterGrade(a.percentage)}
                              </span>
                            ) : (
                              <span className="text-gray-400">--</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 max-w-xs truncate">
                            {a.feedback || '--'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
