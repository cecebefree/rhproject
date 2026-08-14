import React, { useState, useEffect } from 'react';
import {
  getStudentGrades,
  selectGradebook,
} from '../../lms/services/supabase';

interface CourseDetailViewProps {
  courseId: string;
  studentId: string;
  courseTitle: string;
  onBack: () => void;
}

interface AssignmentGrade {
  assignmentId: string;
  assignmentTitle: string;
  score: number | null;
  maxScore: number;
  weight: number;
  percentage: number | null;
  feedback: string | null;
  gradedAt: string | null;
}

interface CourseStats {
  classAverage: number | null;
  studentPercentile: number | null;
  assignmentCount: number;
  gradedCount: number;
}

export function CourseDetailView({
  courseId,
  studentId,
  courseTitle,
  onBack,
}: CourseDetailViewProps) {
  const [grades, setGrades] = useState<AssignmentGrade[]>([]);
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGrades();
  }, [courseId, studentId]);

  async function loadGrades() {
    setLoading(true);
    try {
      // Get student's grades
      const { data: studentGrades, error: gradesError } = await getStudentGrades(
        courseId,
        studentId,
      );
      if (gradesError) throw gradesError;

      const processedGrades: AssignmentGrade[] = (studentGrades || []).map((g: any) => {
        const assignment = g.assignments;
        const percentage =
          g.score !== null && assignment?.max_score > 0
            ? Math.round((g.score / assignment.max_score) * 100)
            : null;

        return {
          assignmentId: g.assignment_id,
          assignmentTitle: assignment?.title || 'Unknown',
          score: g.score,
          maxScore: assignment?.max_score || 100,
          weight: assignment?.weight || 1.0,
          percentage,
          feedback: g.feedback,
          gradedAt: g.graded_at,
        };
      });

      setGrades(processedGrades);

      // Get class statistics
      const { data: allGrades } = await selectGradebook(
        studentGrades?.[0]?.tenant_id || '',
        { courseId },
      );

      if (allGrades && allGrades.length > 0) {
        // Calculate class average
        const classPercentages = allGrades
          .filter((g: any) => g.score !== null && g.assignments)
          .map((g: any) => {
            const assignment = g.assignments as any;
            return (g.score / assignment.max_score) * 100;
          });

        const classAverage =
          classPercentages.length > 0
            ? Math.round(
                classPercentages.reduce((a: number, b: number) => a + b, 0) /
                  classPercentages.length,
              )
            : null;

        // Calculate student's weighted average
        const studentWeighted = processedGrades
          .filter((g) => g.percentage !== null)
          .reduce((sum, g) => sum + (g.percentage || 0) * g.weight, 0);
        const studentTotalWeight = processedGrades
          .filter((g) => g.percentage !== null)
          .reduce((sum, g) => sum + g.weight, 0);
        const studentAverage =
          studentTotalWeight > 0
            ? Math.round(studentWeighted / studentTotalWeight)
            : null;

        // Calculate percentile
        let percentile = null;
        if (studentAverage !== null) {
          const studentsBelow = classPercentages.filter((p: number) => p < studentAverage).length;
          percentile = Math.round((studentsBelow / classPercentages.length) * 100);
        }

        setStats({
          classAverage,
          studentPercentile: percentile,
          assignmentCount: processedGrades.length,
          gradedCount: processedGrades.filter((g) => g.score !== null).length,
        });
      } else {
        setStats({
          classAverage: null,
          studentPercentile: null,
          assignmentCount: processedGrades.length,
          gradedCount: processedGrades.filter((g) => g.score !== null).length,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load grades');
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

  function getColorForPercentage(pct: number | null): string {
    if (pct === null) return '#718096';
    if (pct >= 70) return '#38a169';
    if (pct >= 60) return '#d69e2e';
    return '#e53e3e';
  }

  // Calculate student's weighted average
  const studentWeighted = grades
    .filter((g) => g.percentage !== null)
    .reduce((sum, g) => sum + (g.percentage || 0) * g.weight, 0);
  const studentTotalWeight = grades
    .filter((g) => g.percentage !== null)
    .reduce((sum, g) => sum + g.weight, 0);
  const studentAverage =
    studentTotalWeight > 0 ? Math.round(studentWeighted / studentTotalWeight) : null;

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8 text-gray-500">Loading grades...</div>
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
          <h2 className="text-lg font-medium text-gray-900">{courseTitle}</h2>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-700">Your Grade</div>
          <div
            className="text-2xl font-bold"
            style={{ color: getColorForPercentage(studentAverage) }}
          >
            {studentAverage !== null ? `${studentAverage}%` : '--'}
          </div>
          {studentAverage !== null && (
            <div className="text-sm text-blue-600">
              {getLetterGrade(studentAverage)}
            </div>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-700">Class Average</div>
          <div
            className="text-2xl font-bold"
            style={{ color: getColorForPercentage(stats?.classAverage || null) }}
          >
            {stats?.classAverage !== null && stats?.classAverage !== undefined ? `${stats.classAverage}%` : '--'}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-700">Percentile</div>
          <div className="text-2xl font-bold text-green-900">
            {stats?.studentPercentile !== null
              ? `${stats?.studentPercentile}th`
              : '--'}
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-700">Graded</div>
          <div className="text-2xl font-bold text-purple-900">
            {stats?.gradedCount || 0}/{stats?.assignmentCount || 0}
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      <h3 className="text-md font-semibold text-gray-900 mb-3">Assignments</h3>

      {grades.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No graded assignments yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Assignment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Percentage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Grade
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Weight
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Feedback
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {grades.map((grade) => (
                <tr key={grade.assignmentId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {grade.assignmentTitle}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {grade.score !== null
                      ? `${grade.score}/${grade.maxScore}`
                      : '--'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {grade.percentage !== null ? (
                      <span
                        className="font-medium"
                        style={{ color: getColorForPercentage(grade.percentage) }}
                      >
                        {grade.percentage}%
                      </span>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {grade.percentage !== null ? (
                      <span className="font-medium text-gray-900">
                        {getLetterGrade(grade.percentage)}
                      </span>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {grade.weight}x
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                    {grade.feedback || '--'}
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
