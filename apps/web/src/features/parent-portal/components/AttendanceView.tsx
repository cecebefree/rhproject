import React, { useState, useEffect } from 'react';
import { getChildAttendance } from '../../lms/services/supabase';
import type { Attendance } from '../../lms/services/supabase';

interface AttendanceViewProps {
  studentId: string;
  onBack: () => void;
}

interface AttendanceRecord extends Attendance {
  courses?: { id: string; title: string } | null;
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  excused: number;
  percentage: number | null;
}

export function AttendanceView({ studentId, onBack }: AttendanceViewProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState<string>('all');

  useEffect(() => {
    loadAttendance();
  }, [studentId]);

  async function loadAttendance() {
    setLoading(true);
    try {
      const { data, error } = await getChildAttendance(studentId);
      if (error) throw error;

      setRecords(data || []);

      // Calculate summary
      if (data && data.length > 0) {
        const present = data.filter((r: any) => r.status === 'present').length;
        const absent = data.filter((r: any) => r.status === 'absent').length;
        const excused = data.filter((r: any) => r.status === 'excused').length;
        const total = data.length;

        setSummary({
          total,
          present,
          absent,
          excused,
          percentage: total > 0 ? Math.round((present / total) * 100) : null,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'excused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusIcon(status: string): string {
    switch (status) {
      case 'present':
        return '✓';
      case 'absent':
        return '✗';
      case 'excused':
        return 'E';
      default:
        return '?';
    }
  }

  // Get unique courses for filter
  const uniqueCourses = Array.from(
    new Set(
      records
        .filter((r) => r.courses)
        .map((r) => JSON.stringify(r.courses)),
    ),
  ).map((c) => JSON.parse(c) as { id: string; title: string });

  // Filter records
  const filteredRecords =
    courseFilter === 'all'
      ? records
      : records.filter((r) => r.course_id === courseFilter);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8 text-gray-500">Loading attendance...</div>
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
          <h2 className="text-lg font-medium text-gray-900">Attendance Record</h2>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-700">Total Sessions</div>
            <div className="text-2xl font-bold text-blue-900">{summary.total}</div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-700">Present</div>
            <div className="text-2xl font-bold text-green-900">{summary.present}</div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-sm text-red-700">Absent</div>
            <div className="text-2xl font-bold text-red-900">{summary.absent}</div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-sm text-yellow-700">Excused</div>
            <div className="text-2xl font-bold text-yellow-900">{summary.excused}</div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-purple-700">Attendance Rate</div>
            <div className="text-2xl font-bold text-purple-900">
              {summary.percentage !== null ? `${summary.percentage}%` : '--'}
            </div>
          </div>
        </div>
      )}

      {/* Course Filter */}
      {uniqueCourses.length > 0 && (
        <div className="mb-4">
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="block w-full md:w-64 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="all">All Courses</option>
            {uniqueCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Attendance Records */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No attendance records found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Course
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record) => {
                const course = record.courses as any;
                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.class_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {course?.title || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}
                      >
                        <span className="mr-1">{getStatusIcon(record.status)}</span>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {record.notes || '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
