import React, { useState, useEffect } from 'react';
import {
  selectAssignments,
  selectGradebook,
  getStudentRoster,
  insertGrade,
  updateGrade,
  type Assignment,
  type Gradebook,
} from '../services/supabase';

interface GradebookFormProps {
  tenantId: string;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface StudentGrade {
  studentId: string;
  studentName: string;
  score: string;
  feedback: string;
  existingGradeId?: string;
}

export function GradebookForm({
  tenantId,
  userId,
  onSuccess,
  onCancel,
}: GradebookFormProps) {
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [assignments, setAssignments] = useState<Array<{ id: string; title: string; max_score: number; weight: number }>>([]);
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');

  useEffect(() => {
    loadCourses();
  }, [userId]);

  useEffect(() => {
    if (selectedCourseId) {
      loadAssignments(selectedCourseId);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedCourseId && selectedAssignmentId) {
      loadRosterAndGrades(selectedCourseId, selectedAssignmentId);
    }
  }, [selectedCourseId, selectedAssignmentId]);

  async function loadCourses() {
    try {
      const { data: enrollments } = await import('../services/supabase').then((m) =>
        m.supabaseUntyped
          .from('school_desk.courses')
          .select('id, title')
          .eq('teacher_id', userId)
          .in('status', ['published', 'active']),
      );
      setCourses(enrollments || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load courses');
    }
  }

  async function loadAssignments(courseId: string) {
    try {
      const { data, error } = await selectAssignments(tenantId, { courseId });
      if (error) throw error;
      setAssignments(data || []);
      setSelectedAssignmentId('');
      setStudentGrades([]);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
    }
  }

  async function loadRosterAndGrades(courseId: string, assignmentId: string) {
    setLoadingRoster(true);
    try {
      const [rosterResult, gradebookResult] = await Promise.all([
        getStudentRoster(courseId),
        selectGradebook(tenantId, { assignmentId, courseId }),
      ]);

      const roster = rosterResult.data || [];
      const existingGrades = gradebookResult.data || [];

      const gradesMap = new Map<string, Gradebook>();
      for (const g of existingGrades) {
        gradesMap.set(g.student_id, g);
      }

      const merged: StudentGrade[] = roster.map((r: any) => {
        const studentId = r.student_id;
        const existing = gradesMap.get(studentId);
        const profile = r.profiles as any;
        return {
          studentId,
          studentName: profile?.name || profile?.email || studentId,
          score: existing?.score?.toString() || '',
          feedback: existing?.feedback || '',
          existingGradeId: existing?.id,
        };
      });

      setStudentGrades(merged);
    } catch (err: any) {
      setError(err.message || 'Failed to load roster');
    } finally {
      setLoadingRoster(false);
    }
  }

  function handleScoreChange(studentId: string, score: string) {
    setStudentGrades((prev) =>
      prev.map((g) => (g.studentId === studentId ? { ...g, score } : g)),
    );
  }

  function handleFeedbackChange(studentId: string, feedback: string) {
    setStudentGrades((prev) =>
      prev.map((g) => (g.studentId === studentId ? { ...g, feedback } : g)),
    );
  }

  function handleMarkAllPresent() {
    const assignment = assignments.find((a) => a.id === selectedAssignmentId);
    if (!assignment) return;

    setStudentGrades((prev) =>
      prev.map((g) => ({
        ...g,
        score: g.score || assignment.max_score.toString(),
      })),
    );
  }

  function handleClearAll() {
    setStudentGrades((prev) =>
      prev.map((g) => ({ ...g, score: '', feedback: '' })),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      if (!selectedCourseId || !selectedAssignmentId) {
        throw new Error('Please select a course and assignment');
      }

      const assignment = assignments.find((a) => a.id === selectedAssignmentId);
      if (!assignment) throw new Error('Assignment not found');

      let upsertCount = 0;

      for (const sg of studentGrades) {
        const scoreValue = sg.score ? parseFloat(sg.score) : null;

        if (scoreValue !== null && (scoreValue < 0 || scoreValue > assignment.max_score)) {
          throw new Error(
            `Score for ${sg.studentName} must be between 0 and ${assignment.max_score}`,
          );
        }

        if (sg.existingGradeId) {
          const { error } = await updateGrade(sg.existingGradeId, {
            score: scoreValue,
            feedback: sg.feedback || undefined,
          });
          if (error) throw error;
        } else if (scoreValue !== null) {
          const { error } = await insertGrade({
            tenant_id: tenantId,
            assignment_id: selectedAssignmentId,
            student_id: sg.studentId,
            course_id: selectedCourseId,
            score: scoreValue,
            feedback: sg.feedback || undefined,
            graded_by: userId,
          });
          if (error) throw error;
        }

        upsertCount++;
      }

      setSuccess(true);
      setStudentGrades([]);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save grades');
    } finally {
      setLoading(false);
    }
  }

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Enter Grades</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
          Grades saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Course *</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Assignment *</label>
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              required
              disabled={!selectedCourseId}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
            >
              <option value="">Select assignment</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} (max: {a.max_score})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedAssignment && (
          <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-600">
            <strong>{selectedAssignment.title}</strong> — Max Score: {selectedAssignment.max_score} | Weight: {assignments.find((a) => a.id === selectedAssignmentId)?.weight || 1.0}x
          </div>
        )}

        {loadingRoster && (
          <div className="text-center py-8 text-gray-500">Loading student roster...</div>
        )}

        {selectedAssignment && studentGrades.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {studentGrades.length} students
              </span>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Fill Max Score
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Score (0-{selectedAssignment.max_score})
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Feedback
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studentGrades.map((sg) => (
                    <tr key={sg.studentId}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {sg.studentName}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={sg.score}
                          onChange={(e) => handleScoreChange(sg.studentId, e.target.value)}
                          min="0"
                          max={selectedAssignment.max_score}
                          step="0.01"
                          placeholder="-"
                          className="block w-24 border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={sg.feedback}
                          onChange={(e) => handleFeedbackChange(sg.studentId, e.target.value)}
                          placeholder="Optional feedback"
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedCourseId && selectedAssignmentId && !loadingRoster && studentGrades.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No students enrolled in this course.
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !selectedAssignmentId || studentGrades.length === 0}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Grades'}
          </button>
        </div>
      </form>
    </div>
  );
}
