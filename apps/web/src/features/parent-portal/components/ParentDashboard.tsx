import React, { useState, useEffect } from 'react';
import {
  selectLinkedChildren,
  getChildProgress,
  type ParentStudentLinkWithStudent,
} from '../../lms/services/supabase';

interface ParentDashboardProps {
  parentId: string;
  onSelectChild: (studentId: string, studentName: string) => void;
}

interface ChildSummary {
  studentId: string;
  studentName: string;
  studentEmail: string;
  relationship: string;
  courseCount: number;
  attendancePct: number | null;
  overallGpa: number | null;
}

export function ParentDashboard({ parentId, onSelectChild }: ParentDashboardProps) {
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChildren();
  }, [parentId]);

  async function loadChildren() {
    setLoading(true);
    try {
      const { data: links, error: linksError } = await selectLinkedChildren(parentId);
      if (linksError) throw linksError;

      if (!links || links.length === 0) {
        setChildren([]);
        return;
      }

      const summaries: ChildSummary[] = [];

      for (const link of links) {
        const typedLink = link as ParentStudentLinkWithStudent;
        const profile = typedLink.profiles as any;

        // Get progress data for quick stats
        const { data: progress } = await getChildProgress(typedLink.student_id);

        summaries.push({
          studentId: typedLink.student_id,
          studentName: profile?.name || 'Unknown',
          studentEmail: profile?.email || '',
          relationship: typedLink.relationship,
          courseCount: progress?.courses?.length || 0,
          attendancePct: null,
          overallGpa: progress?.overall_gpa || null,
        });

        // Calculate average attendance across courses
        if (progress?.courses && progress.courses.length > 0) {
          const validAttendance = progress.courses
            .filter((c: any) => c.attendance_pct !== null)
            .map((c: any) => c.attendance_pct);
          if (validAttendance.length > 0) {
            summaries[summaries.length - 1].attendancePct = Math.round(
              validAttendance.reduce((a: number, b: number) => a + b, 0) / validAttendance.length,
            );
          }
        }
      }

      setChildren(summaries);
    } catch (err: any) {
      setError(err.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  }

  function getRelationshipLabel(rel: string): string {
    const labels: Record<string, string> = {
      mother: 'Mother',
      father: 'Father',
      guardian: 'Guardian',
      other: 'Other',
    };
    return labels[rel] || rel;
  }

  function getGpaColor(gpa: number | null): string {
    if (gpa === null) return '#718096';
    if (gpa >= 70) return '#38a169';
    if (gpa >= 60) return '#d69e2e';
    return '#e53e3e';
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8 text-gray-500">Loading your children...</div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">My Children</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {children.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">👶</div>
          <p className="text-gray-500">No children linked to your account yet.</p>
          <p className="text-sm text-gray-400 mt-2">
            Please contact the school office to link your child to your account.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child) => (
            <div
              key={child.studentId}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectChild(child.studentId, child.studentName)}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-md font-semibold text-gray-900">
                    {child.studentName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {getRelationshipLabel(child.relationship)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-medium text-lg">
                    {child.studentName.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Courses</span>
                  <span className="font-medium text-gray-900">{child.courseCount}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Attendance</span>
                  <span className="font-medium text-gray-900">
                    {child.attendancePct !== null ? `${child.attendancePct}%` : '--'}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">GPA</span>
                  <span
                    className="font-medium"
                    style={{ color: getGpaColor(child.overallGpa) }}
                  >
                    {child.overallGpa !== null ? `${child.overallGpa}%` : '--'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t">
                <span className="text-sm text-indigo-600 hover:text-indigo-800">
                  View Progress →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
