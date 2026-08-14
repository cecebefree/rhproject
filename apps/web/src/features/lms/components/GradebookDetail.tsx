import React, { useState, useEffect } from 'react';
import {
  selectGradebook,
  subscribeToGradebook,
  type Gradebook,
  type GradebookWithRelations,
} from '../services/supabase';

interface GradebookDetailProps {
  courseId: string;
  courseTitle: string;
  onBack: () => void;
  tenantId: string;
}

interface StudentGradeRow {
  studentId: string;
  studentName: string;
  score: number | null;
  maxScore: number;
  feedback: string;
  gradedAt: string;
  percentage: number | null;
}

interface AssignmentGrades {
  assignmentId: string;
  assignmentTitle: string;
  maxScore: number;
  weight: number;
  grades: StudentGradeRow[];
  classAverage: number | null;
  highScore: number | null;
  lowScore: number | null;
}

export function GradebookDetail({
  courseId,
  courseTitle,
  onBack,
  tenantId,
}: GradebookDetailProps) {
  const [grades, setGrades] = useState<GradebookWithRelations[]>([]);
  const [assignments, setAssignments] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGrades();

    const sub = subscribeToGradebook((payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        setGrades((prev) => {
          const exists = prev.find((g) => g.id === payload.new.id);
          if (exists) {
            return prev.map((g) => (g.id === payload.new.id ? payload.new : g));
          }
          return [...prev, payload.new];
        });
      }
    });

    return () => sub.unsubscribe();
  }, [courseId, tenantId]);

  async function loadGrades() {
    setLoading(true);
    try {
      const { data, error } = await selectGradebook(tenantId, { courseId });
      if (error) throw error;

      setGrades(data || []);

      const assignmentMap: Record<string, any> = {};
      for (const g of data || []) {
        if (g.assignments) {
          assignmentMap[g.assignment_id] = g.assignments;
        }
      }
      setAssignments(assignmentMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load grades');
    } finally {
      setLoading(false);
    }
  }

  function getAssignmentGrades(): AssignmentGrades[] {
    const grouped: Record<string, StudentGradeRow[]> = {};

    for (const g of grades) {
      const assignment = assignments[g.assignment_id];
      if (!assignment) continue;

      if (!grouped[g.assignment_id]) {
        grouped[g.assignment_id] = [];
      }

      const percentage =
        g.score !== null && assignment.max_score > 0
          ? Math.round((g.score / assignment.max_score) * 100)
          : null;

      grouped[g.assignment_id].push({
        studentId: g.student_id,
        studentName: (g.profiles as any)?.name || g.student_id,
        score: g.score,
        maxScore: assignment.max_score,
        feedback: g.feedback || '',
        gradedAt: g.graded_at,
        percentage,
      });
    }

    return Object.entries(grouped).map(([assignmentId, gradeRows]) => {
      const assignment = assignments[assignmentId];
      const percentages = gradeRows
        .map((r) => r.percentage)
        .filter((p): p is number => p !== null);

      return {
        assignmentId,
        assignmentTitle: assignment.title,
        maxScore: assignment.max_score,
        weight: assignment.weight,
        grades: gradeRows,
        classAverage:
          percentages.length > 0
            ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
            : null,
        highScore:
          percentages.length > 0 ? Math.round(Math.max(...percentages)) : null,
        lowScore:
          percentages.length > 0 ? Math.round(Math.min(...percentages)) : null,
      };
    });
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

  const assignmentGrades = getAssignmentGrades();

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8 text-gray-500">Loading gradebook...</div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700"
          >
            &larr; Back
          </button>
          <h2 className="text-lg font-medium text-gray-900">
            {courseTitle} — Gradebook
          </h2>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {assignmentGrades.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No graded assignments yet.
        </div>
      ) : (
        <div className="space-y-8">
          {assignmentGrades.map((ag) => (
            <div key={ag.assignmentId} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-md font-semibold text-gray-900">
                    {ag.assignmentTitle}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Max: {ag.maxScore} | Weight: {ag.weight}x
                  </p>
                </div>
                <div className="text-right text-sm">
                  <div className="text-gray-500">Class Average</div>
                  <div
                    className={`text-lg font-semibold ${
                      ag.classAverage !== null
                        ? ag.classAverage >= 70
                          ? 'text-green-600'
                          : ag.classAverage >= 60
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {ag.classAverage !== null
                      ? `${ag.classAverage}% (${getLetterGrade(ag.classAverage)})`
                      : '--'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                <div>
                  <span className="text-gray-500">High: </span>
                  <span className="font-medium">
                    {ag.highScore !== null ? `${ag.highScore}%` : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Low: </span>
                  <span className="font-medium">
                    {ag.lowScore !== null ? `${ag.lowScore}%` : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Graded: </span>
                  <span className="font-medium">{ag.grades.length}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Student
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
                    {ag.grades.map((grade) => (
                      <tr key={grade.studentId}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {grade.studentName}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {grade.score !== null ? `${grade.score}/${grade.maxScore}` : '--'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {grade.percentage !== null ? (
                            <span
                              className={`font-medium ${
                                grade.percentage >= 70
                                  ? 'text-green-600'
                                  : grade.percentage >= 60
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                              }`}
                            >
                              {grade.percentage}%
                            </span>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {grade.percentage !== null ? (
                            <span className="font-medium text-gray-900">
                              {getLetterGrade(grade.percentage)}
                            </span>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500 max-w-xs truncate">
                          {grade.feedback || '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
