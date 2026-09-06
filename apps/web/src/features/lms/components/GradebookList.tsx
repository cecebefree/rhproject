import React, { useState, useEffect } from 'react';
import {
  selectAssignments,
  selectGradebook,
  subscribeToAssignments,
  subscribeToGradebook,
  type Assignment,
  type Gradebook,
} from '../services/supabase';

interface GradebookListProps {
  tenantId: string;
  userId: string;
  onSelectCourse: (courseId: string) => void;
  onSelectAssignment: (assignmentId: string) => void;
  onEnterGrades: () => void;
  onCreateAssignment: () => void;
}

interface CourseSummary {
  courseId: string;
  courseTitle: string;
  assignmentCount: number;
  averageScore: number | null;
  highScore: number | null;
  lowScore: number | null;
  gradedCount: number;
}

export function GradebookList({
  tenantId,
  userId,
  onSelectCourse,
  onSelectAssignment,
  onEnterGrades,
  onCreateAssignment,
}: GradebookListProps) {
  const [programs, setPrograms] = useState<Array<{ id: string; title: string }>>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [gradebook, setGradebook] = useState<Gradebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [tenantId, userId]);

  useEffect(() => {
    const assignmentsSub = subscribeToAssignments((payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        setAssignments((prev) => {
          const exists = prev.find((a) => a.id === payload.new.id);
          if (exists) {
            return prev.map((a) => (a.id === payload.new.id ? payload.new : a));
          }
          return [payload.new, ...prev];
        });
      }
    });

    const gradebookSub = subscribeToGradebook((payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        setGradebook((prev) => {
          const exists = prev.find((g) => g.id === payload.new.id);
          if (exists) {
            return prev.map((g) => (g.id === payload.new.id ? payload.new : g));
          }
          return [payload.new, ...prev];
        });
      }
    });

    return () => {
      assignmentsSub.unsubscribe();
      gradebookSub.unsubscribe();
    };
  }, [tenantId]);

  async function loadData() {
    setLoading(true);
    try {
      const [programsResult, assignmentsResult, gradebookResult] = await Promise.all([
        import('../services/supabase').then((m) =>
          m.supabaseUntyped
            .from('school_desk.programs')
            .select('id, title')
            .eq('teacher_id', userId)
            .in('status', ['published', 'active']),
        ),
        selectAssignments(tenantId),
        selectGradebook(tenantId),
      ]);

      setPrograms(programsResult.data || []);
      setAssignments(assignmentsResult.data || []);
      setGradebook(gradebookResult.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function getCourseSummary(): CourseSummary[] {
    const filteredCourses = selectedCourseId
      ? programs.filter((c) => c.id === selectedCourseId)
      : programs;

    return filteredCourses.map((course) => {
      const courseAssignments = assignments.filter((a) => a.course_id === course.id);
      const courseGrades = gradebook.filter(
        (g) => g.course_id === course.id && g.score !== null,
      );

      const scores = courseGrades.map((g) => {
        const assignment = assignments.find((a) => a.id === g.assignment_id);
        if (!assignment) return null;
        return (g.score! / assignment.max_score) * 100;
      });

      const validScores = scores.filter((s): s is number => s !== null);

      return {
        courseId: course.id,
        courseTitle: course.title,
        assignmentCount: courseAssignments.length,
        averageScore:
          validScores.length > 0
            ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
            : null,
        highScore:
          validScores.length > 0 ? Math.round(Math.max(...validScores)) : null,
        lowScore:
          validScores.length > 0 ? Math.round(Math.min(...validScores)) : null,
        gradedCount: courseGrades.length,
      };
    });
  }

  const courseSummaries = getCourseSummary();
  const filteredSummaries = search
    ? courseSummaries.filter((c) =>
        c.courseTitle.toLowerCase().includes(search.toLowerCase()),
      )
    : courseSummaries;

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8 text-gray-500">Loading gradebook...</div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">Gradebook</h2>
        <div className="space-x-2">
          <button
            onClick={onCreateAssignment}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            + Create Assignment
          </button>
          <button
            onClick={onEnterGrades}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Enter Grades
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search subjects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div className="mb-4">
        <select
          value={selectedCourseId || ''}
          onChange={(e) => setSelectedCourseId(e.target.value || null)}
          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">All Programs</option>
          {programs.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {filteredSummaries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {search ? 'No programs match your search.' : 'No programs found.'}
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
                  Assignments
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Average
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  High
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Low
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Graded
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSummaries.map((summary) => (
                <tr key={summary.courseId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {summary.courseTitle}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {summary.assignmentCount}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {summary.averageScore !== null ? (
                      <span
                        className={`font-medium ${
                          summary.averageScore >= 70
                            ? 'text-green-600'
                            : summary.averageScore >= 60
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {summary.averageScore}%
                      </span>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {summary.highScore !== null ? `${summary.highScore}%` : '--'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {summary.lowScore !== null ? `${summary.lowScore}%` : '--'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {summary.gradedCount}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <button
                      onClick={() => onSelectCourse(summary.courseId)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
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
