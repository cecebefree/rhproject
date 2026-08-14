// AttendanceForm — Mark attendance for a class session
// Row 73: Teacher selects course, date, then marks each student present/absent/excused

import { useEffect, useState } from 'react';
import {
  getTeacherCourses,
  getStudentRoster,
  markAttendanceBulk,
  type AttendanceStatus,
} from '../services/supabase';

interface Student {
  student_id: string;
  profiles: { id: string; name: string; email: string } | null;
}

interface Course {
  id: string;
  title: string;
  status: string;
}

interface AttendanceFormProps {
  tenantId: string;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AttendanceForm({
  tenantId,
  userId,
  onSuccess,
  onCancel,
}: AttendanceFormProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [classDate, setClassDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Map<string, { status: AttendanceStatus; notes: string }>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      const { data, error } = await getTeacherCourses(userId);
      if (!cancelled) {
        if (error) {
          setError(error.message);
        } else {
          setCourses(data ?? []);
        }
        setLoadingCourses(false);
      }
    }

    loadCourses();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      if (!selectedCourseId) {
        setStudents([]);
        return;
      }

      setLoadingStudents(true);
      const { data, error } = await getStudentRoster(selectedCourseId);

      if (!cancelled) {
        if (error) {
          setError(error.message);
        } else {
          setStudents(data ?? []);
          const initialMarks = new Map<string, { status: AttendanceStatus; notes: string }>();
          for (const s of data ?? []) {
            initialMarks.set(s.student_id, { status: 'absent', notes: '' });
          }
          setMarks(initialMarks);
        }
        setLoadingStudents(false);
      }
    }

    loadStudents();
    return () => {
      cancelled = true;
    };
  }, [selectedCourseId]);

  function updateMark(studentId: string, status: AttendanceStatus) {
    setMarks((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      next.set(studentId, { status, notes: existing?.notes || '' });
      return next;
    });
  }

  function markAllPresent() {
    setMarks((prev) => {
      const next = new Map(prev);
      for (const [studentId] of prev) {
        next.set(studentId, { status: 'present', notes: '' });
      }
      return next;
    });
  }

  function markAllAbsent() {
    setMarks((prev) => {
      const next = new Map(prev);
      for (const [studentId] of prev) {
        next.set(studentId, { status: 'absent', notes: '' });
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const marksArray = Array.from(marks.entries()).map(([studentId, { status, notes }]) => ({
      student_id: studentId,
      status,
      notes: notes || undefined,
    }));

    const { error: markError } = await markAttendanceBulk({
      course_id: selectedCourseId,
      class_date: classDate,
      marks: marksArray,
    });

    setLoading(false);

    if (markError) {
      setError(markError.message);
    } else {
      setSuccess(true);
      onSuccess?.();
    }
  }

  const presentCount = Array.from(marks.values()).filter((m) => m.status === 'present').length;
  const absentCount = Array.from(marks.values()).filter((m) => m.status === 'absent').length;
  const excusedCount = Array.from(marks.values()).filter((m) => m.status === 'excused').length;

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Mark Attendance</h2>
      <p style={styles.description}>
        Select a course and date, then mark each student's attendance status.
      </p>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>Attendance saved successfully.</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Course *</label>
            {loadingCourses ? (
              <div style={styles.loadingText}>Loading courses...</div>
            ) : (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                required
                style={styles.select}
              >
                <option value="">Select a course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Date *</label>
            <input
              type="date"
              value={classDate}
              onChange={(e) => setClassDate(e.target.value)}
              required
              style={styles.input}
            />
          </div>
        </div>

        {selectedCourseId && !loadingStudents && students.length > 0 && (
          <div style={styles.summaryBar}>
            <span style={styles.summaryItem}>
              <span style={{ ...styles.dot, backgroundColor: '#38a169' }} />
              Present: {presentCount}
            </span>
            <span style={styles.summaryItem}>
              <span style={{ ...styles.dot, backgroundColor: '#e53e3e' }} />
              Absent: {absentCount}
            </span>
            <span style={styles.summaryItem}>
              <span style={{ ...styles.dot, backgroundColor: '#d69e2e' }} />
              Excused: {excusedCount}
            </span>
            <span style={styles.summaryTotal}>Total: {students.length}</span>
            <button type="button" onClick={markAllPresent} style={styles.quickButton}>
              Mark All Present
            </button>
            <button type="button" onClick={markAllAbsent} style={styles.quickButton}>
              Mark All Absent
            </button>
          </div>
        )}

        {loadingStudents && <div style={styles.loadingText}>Loading student roster...</div>}

        {!loadingStudents && students.length > 0 && (
          <div style={styles.roster}>
            {students.map((s) => {
              const mark = marks.get(s.student_id);
              const status = mark?.status || 'absent';
              return (
                <div key={s.student_id} style={styles.studentRow}>
                  <div style={styles.studentInfo}>
                    <div style={styles.studentName}>{s.profiles?.name ?? 'Unknown'}</div>
                    <div style={styles.studentEmail}>{s.profiles?.email ?? ''}</div>
                  </div>
                  <div style={styles.statusButtons}>
                    <button
                      type="button"
                      onClick={() => updateMark(s.student_id, 'present')}
                      style={
                        status === 'present'
                          ? styles.statusButtonPresent
                          : styles.statusButtonInactive
                      }
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      onClick={() => updateMark(s.student_id, 'absent')}
                      style={
                        status === 'absent'
                          ? styles.statusButtonAbsent
                          : styles.statusButtonInactive
                      }
                    >
                      Absent
                    </button>
                    <button
                      type="button"
                      onClick={() => updateMark(s.student_id, 'excused')}
                      style={
                        status === 'excused'
                          ? styles.statusButtonExcused
                          : styles.statusButtonInactive
                      }
                    >
                      Excused
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={styles.buttonRow}>
          {onCancel && (
            <button type="button" onClick={onCancel} style={styles.cancelButton}>
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || loadingStudents || !selectedCourseId}
            style={styles.submitButton}
          >
            {loading ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: { fontSize: '18px', fontWeight: '600', color: '#2d3748', margin: '0 0 8px 0' },
  description: { fontSize: '14px', color: '#718096', margin: '0 0 24px 0' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  row: { display: 'flex', gap: '16px' },
  field: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '14px', fontWeight: '500', color: '#4a5568' },
  input: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' },
  select: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', backgroundColor: 'white' },
  loadingText: { padding: '8px 12px', color: '#718096', fontSize: '14px' },
  summaryBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 16px',
    backgroundColor: '#f7fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  summaryItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#4a5568' },
  dot: { width: '8px', height: '8px', borderRadius: '50%' },
  summaryTotal: { fontSize: '14px', fontWeight: '600', color: '#2d3748' },
  quickButton: {
    padding: '4px 8px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    backgroundColor: 'white',
    fontSize: '12px',
    color: '#4a5568',
    cursor: 'pointer',
  },
  roster: { display: 'flex', flexDirection: 'column', gap: '8px' },
  studentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
  },
  studentInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  studentName: { fontSize: '14px', fontWeight: '500', color: '#2d3748' },
  studentEmail: { fontSize: '12px', color: '#718096' },
  statusButtons: { display: 'flex', gap: '4px' },
  statusButtonPresent: {
    padding: '4px 12px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    border: '1px solid #059669',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  statusButtonAbsent: {
    padding: '4px 12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #dc2626',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  statusButtonExcused: {
    padding: '4px 12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #d97706',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  statusButtonInactive: {
    padding: '4px 12px',
    backgroundColor: 'white',
    color: '#a0aec0',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  buttonRow: { display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  cancelButton: {
    padding: '8px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    fontSize: '14px',
    color: '#4a5568',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '8px 16px',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  success: {
    padding: '12px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
  },
};
