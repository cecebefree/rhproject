import React, { useState, useEffect } from 'react';
import { getChildProgress, type ChildProgress } from '../../lms/services/supabase';

interface ChildProgressViewProps {
  studentId: string;
  studentName: string;
  onBack: () => void;
  onSelectCourse: (courseId: string, courseName: string) => void;
}

export function ChildProgressView({
  studentId,
  studentName,
  onBack,
  onSelectCourse,
}: ChildProgressViewProps) {
  const [progress, setProgress] = useState<ChildProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, [studentId]);

  async function loadProgress() {
    setLoading(true);
    try {
      const { data, error } = await getChildProgress(studentId);
      if (error) throw error;
      setProgress(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load progress');
    } finally {
      setLoading(false);
    }
  }

  function getGpaColor(gpa: number | null): string {
    if (gpa === null) return '#718096';
    if (gpa >= 70) return '#38a169';
    if (gpa >= 60) return '#d69e2e';
    return '#e53e3e';
  }

  function getAttendanceColor(pct: number | null): string {
    if (pct === null) return '#718096';
    if (pct >= 90) return '#38a169';
    if (pct >= 75) return '#d69e2e';
    return '#e53e3e';
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8 text-gray-500">Loading progress...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
            &larr; Back
          </button>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
            &larr; Back
          </button>
        </div>
        <div className="text-center py-8 text-gray-500">No progress data available.</div>
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
            {progress.student_name}'s Progress
          </h2>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-700">Enrolled Courses</div>
          <div className="text-2xl font-bold text-blue-900">
            {progress.courses.length}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-700">Overall GPA</div>
          <div
            className="text-2xl font-bold"
            style={{ color: getGpaColor(progress.overall_gpa) }}
          >
            {progress.overall_gpa !== null ? `${progress.overall_gpa}%` : '--'}
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-700">Avg Attendance</div>
          <div className="text-2xl font-bold text-purple-900">
            {(() => {
              const valid = progress.courses.filter((c) => c.attendance_pct !== null);
              if (valid.length === 0) return '--';
              const avg = Math.round(
                valid.reduce((sum, c) => sum + (c.attendance_pct || 0), 0) / valid.length,
              );
              return `${avg}%`;
            })()}
          </div>
        </div>
      </div>

      {/* Courses List */}
      <h3 className="text-md font-semibold text-gray-900 mb-3">Courses</h3>

      {progress.courses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No courses enrolled yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Course
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Teacher
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Grade
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Attendance
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {progress.courses.map((course) => (
                <tr key={course.course_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {course.course_title}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {course.teacher_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {course.weighted_average !== null ? (
                      <span
                        className="font-medium"
                        style={{ color: getGpaColor(course.weighted_average) }}
                      >
                        {course.weighted_average}% ({course.grade_letter})
                      </span>
                    ) : (
                      <span className="text-gray-400">No grades</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {course.attendance_pct !== null ? (
                      <span
                        className="font-medium"
                        style={{ color: getAttendanceColor(course.attendance_pct) }}
                      >
                        {course.attendance_pct}%
                      </span>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <button
                      onClick={() =>
                        onSelectCourse(course.course_id, course.course_title)
                      }
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
