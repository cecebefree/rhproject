/**
 * ClassAssignmentDashboard — View and manage auto-assigned students.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface Assignment {
  id: string;
  student_id: string;
  class_instance_id: string;
  pipeline_id: string;
  assignment_type: 'auto' | 'manual';
  score: number;
  status: 'pending' | 'approved' | 'rejected' | 'waitlisted';
  created_at: string;
  student?: {
    name: string;
    grade: string;
    curriculum: string;
  };
  class_instance?: {
    grade: string;
    class_section: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    program?: {
      title: string;
    };
  };
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = Number.parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function ClassAssignmentDashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('office_desk.class_assignments')
        .select(`
          *,
          student:profiles(name, grade, curriculum),
          class_instance:office_desk.class_instances(
            grade, class_section, day_of_week, start_time, end_time,
            program:school_desk.programs(title)
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch assignments:', error);
        return;
      }

      setAssignments((data as unknown as Assignment[]) || []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  async function handleApprove(id: string) {
    const { error } = await supabase
      .from('office_desk.class_assignments')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to approve:', error);
      return;
    }

    fetchAssignments();
  }

  async function handleReject(id: string, reason: string) {
    const { error } = await supabase
      .from('office_desk.class_assignments')
      .update({
        status: 'rejected',
        rejection_reason: reason,
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to reject:', error);
      return;
    }

    fetchAssignments();
  }

  async function handleBulkApprove() {
    const pendingIds = assignments
      .filter((a) => a.status === 'pending')
      .map((a) => a.id);

    if (pendingIds.length === 0) return;

    const { error } = await supabase
      .from('office_desk.class_assignments')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .in('id', pendingIds);

    if (error) {
      console.error('Failed to bulk approve:', error);
      return;
    }

    fetchAssignments();
  }

  const pendingCount = assignments.filter((a) => a.status === 'pending').length;
  const approvedCount = assignments.filter((a) => a.status === 'approved').length;
  const rejectedCount = assignments.filter((a) => a.status === 'rejected').length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Class Assignments</h2>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={handleBulkApprove}
                className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700"
              >
                Approve All ({pendingCount})
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-gray-600">
          <span>Total: {assignments.length}</span>
          <span className="text-yellow-600">Pending: {pendingCount}</span>
          <span className="text-green-600">Approved: {approvedCount}</span>
          <span className="text-red-600">Rejected: {rejectedCount}</span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
      ) : assignments.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">No assignments found</div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-medium">Student</th>
                <th className="text-left p-3 font-medium">Grade</th>
                <th className="text-left p-3 font-medium">Class</th>
                <th className="text-left p-3 font-medium">Schedule</th>
                <th className="text-left p-3 font-medium">Score</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-medium">{assignment.student?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{assignment.student?.curriculum}</div>
                  </td>
                  <td className="p-3">{assignment.student?.grade}</td>
                  <td className="p-3">
                    <div>{assignment.class_instance?.class_section}</div>
                    <div className="text-xs text-gray-500">
                      {assignment.class_instance?.program?.title}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-xs">
                      {DAYS[assignment.class_instance?.day_of_week || 0]}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(assignment.class_instance?.start_time || '')} -{' '}
                      {formatTime(assignment.class_instance?.end_time || '')}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-xs">
                      {assignment.score?.toFixed(1)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        assignment.assignment_type === 'auto'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {assignment.assignment_type}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        assignment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : assignment.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {assignment.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {assignment.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(assignment.id)}
                          className="text-green-600 hover:text-green-800 text-xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Rejection reason:');
                            if (reason) handleReject(assignment.id, reason);
                          }}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Reject
                        </button>
                      </div>
                    )}
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
