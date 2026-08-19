// StudentDetail — student-centric detail view for School Desk (Row 73)
// Shows: grades across all courses, attendance summary, communication history
// Actions: update grade, log attendance, send message

import { useEffect, useState } from 'react';
import { supabaseUntyped, getChildAttendance, type AttendanceWithRelations } from '../services/supabase';
import type { Student } from './StudentList';

interface StudentDetailProps {
  student: Student;
  onBack: () => void;
  onSendMessage?: (studentId: string, studentName: string) => void;
}

interface CourseGrade {
  courseId: string;
  courseTitle: string;
  grades: Array<{
    gradeId: string;
    assignmentTitle: string;
    score: number | null;
    maxScore: number;
    weight: number;
  }>;
  average: number | null;
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  excused: number;
  percentage: number | null;
  byCourse: Array<{
    courseId: string;
    courseTitle: string;
    total: number;
    present: number;
    absent: number;
    percentage: number | null;
  }>;
}

interface Message {
  id: string;
  subject: string;
  body: string;
  sent_at: string;
  sender_name: string;
  channel: 'email' | 'sms' | 'in_app';
}

function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value)}%`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function gradeColor(pct: number | null): string {
  if (pct === null) return '#718096';
  if (pct >= 90) return '#27ae60';
  if (pct >= 80) return '#3182ce';
  if (pct >= 70) return '#d69e2e';
  return '#e53e3e';
}

export function StudentDetail({ student, onBack, onSendMessage }: StudentDetailProps) {
  const [courseGrades, setCourseGrades] = useState<CourseGrade[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // 1. Load enrolled courses
        const { data: enrollments } = await supabaseUntyped
          .from('student_class')
          .select('class_id, courses!class_id(id, title)')
          .eq('student_id', student.id)
          .is('deleted_at', null);

        if (cancelled) return;

        // 2. Load grades for each course
        const grades: CourseGrade[] = [];
        for (const enrollment of enrollments ?? []) {
          const course = enrollment.courses as any;
          if (!course) continue;

          const { data: gradeData } = await supabaseUntyped
            .from('school_desk.gradebook')
            .select('id, score, assignments!assignment_id(id, title, max_score, weight)')
            .eq('course_id', course.id)
            .eq('student_id', student.id)
            .is('deleted_at', null);

          // biome-ignore lint/suspicious/noExplicitAny: Supabase join query returns complex nested types
          const gradeRows = (gradeData ?? []).map((g: any) => ({
            gradeId: g.id as string,
            assignmentTitle: (g.assignments?.title ?? 'Unknown') as string,
            score: g.score as number | null,
            maxScore: (g.assignments?.max_score ?? 100) as number,
            weight: (g.assignments?.weight ?? 1.0) as number,
          }));

          const graded = gradeRows.filter((g: { score: number | null }) => g.score !== null);
          const average =
            graded.length > 0
              ? graded.reduce(
                  (sum: number, g: { score: number; maxScore: number }) =>
                    sum + (g.score / g.maxScore) * 100,
                  0,
                ) / graded.length
              : null;

          grades.push({
            courseId: course.id,
            courseTitle: course.title,
            grades: gradeRows,
            average,
          });
        }

        if (!cancelled) setCourseGrades(grades);

        // 3. Load attendance
        const { data: attendanceData } = await getChildAttendance(student.id);
        if (!cancelled && attendanceData) {
          const records = attendanceData as AttendanceWithRelations[];
          const total = records.length;
          const present = records.filter((r) => r.status === 'present').length;
          const absent = records.filter((r) => r.status === 'absent').length;
          const excused = records.filter((r) => r.status === 'excused').length;
          const percentage = total > 0 ? (present / total) * 100 : null;

          // Group by course
          const courseMap = new Map<string, { title: string; total: number; present: number; absent: number }>();
          for (const r of records) {
            const courseId = r.course_id;
            const existing = courseMap.get(courseId) ?? { title: (r.courses as any)?.title ?? 'Unknown', total: 0, present: 0, absent: 0 };
            existing.total++;
            if (r.status === 'present') existing.present++;
            if (r.status === 'absent') existing.absent++;
            courseMap.set(courseId, existing);
          }

          const byCourse = [...courseMap.entries()].map(([courseId, data]) => ({
            courseId,
            courseTitle: data.title,
            total: data.total,
            present: data.present,
            absent: data.absent,
            percentage: data.total > 0 ? (data.present / data.total) * 100 : null,
          }));

          setAttendance({ total, present, absent, excused, percentage, byCourse });
        }

        // 4. Load messages (placeholder — query student_messages or return empty)
        // TODO: Implement when messaging table/EF is ready
        if (!cancelled) setMessages([]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load student data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [student.id]);

  if (loading) {
    return (
      <div style={styles.container}>
        <button onClick={onBack} style={styles.backButton}>&larr; Back</button>
        <div style={styles.loading}>Loading student data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <button onClick={onBack} style={styles.backButton}>&larr; Back</button>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  const overallAverage =
    courseGrades.length > 0
      ? courseGrades.filter((c) => c.average !== null).length > 0
        ? courseGrades
            .filter((c) => c.average !== null)
            .reduce((sum, c) => sum + c.average!, 0) /
          courseGrades.filter((c) => c.average !== null).length
        : null
      : null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>&larr; Back</button>
        <div style={styles.headerActions}>
          {onSendMessage && (
            <button
              onClick={() => onSendMessage(student.id, student.name)}
              style={styles.actionButton}
            >
              Send Message
            </button>
          )}
        </div>
      </div>

      <h2 style={styles.title}>{student.name}</h2>
      <div style={styles.meta}>
        {student.grade && <span style={styles.metaItem}>Grade: {student.grade}</span>}
        {student.curriculum && <span style={styles.metaItem}>Curriculum: {student.curriculum}</span>}
        {student.stage && <span style={styles.metaItem}>Stage: {student.stage}</span>}
        {student.class_title && <span style={styles.metaItem}>Class: {student.class_title}</span>}
      </div>

      {/* Grades Summary */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Grades</h3>
        {overallAverage !== null && (
          <div style={styles.overallAvg}>
            <span style={styles.overallAvgLabel}>Overall Average</span>
            <span style={{ ...styles.overallAvgValue, color: gradeColor(overallAverage) }}>
              {formatPercent(overallAverage)}
            </span>
          </div>
        )}
        {courseGrades.length === 0 ? (
          <p style={styles.emptyText}>No grades recorded yet.</p>
        ) : (
          <div style={styles.courseList}>
            {courseGrades.map((cg) => (
              <div key={cg.courseId} style={styles.courseCard}>
                <div style={styles.courseHeader}>
                  <span style={styles.courseName}>{cg.courseTitle}</span>
                  <span style={{ ...styles.courseAvg, color: gradeColor(cg.average) }}>
                    {formatPercent(cg.average)}
                  </span>
                </div>
                {cg.grades.length > 0 && (
                  <div style={styles.gradeList}>
                    {cg.grades.map((g) => (
                      <div key={g.gradeId} style={styles.gradeRow}>
                        <span style={styles.gradeName}>{g.assignmentTitle}</span>
                        <span style={styles.gradeScore}>
                          {g.score !== null ? `${g.score}/${g.maxScore}` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Summary */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Attendance</h3>
        {!attendance || attendance.total === 0 ? (
          <p style={styles.emptyText}>No attendance records yet.</p>
        ) : (
          <>
            <div style={styles.attendanceSummary}>
              <div style={styles.attStat}>
                <span style={styles.attStatValue}>{formatPercent(attendance.percentage)}</span>
                <span style={styles.attStatLabel}>Overall</span>
              </div>
              <div style={styles.attStat}>
                <span style={styles.attStatValue}>{attendance.present}</span>
                <span style={styles.attStatLabel}>Present</span>
              </div>
              <div style={styles.attStat}>
                <span style={styles.attStatValue}>{attendance.absent}</span>
                <span style={styles.attStatLabel}>Absent</span>
              </div>
              <div style={styles.attStat}>
                <span style={styles.attStatValue}>{attendance.excused}</span>
                <span style={styles.attStatLabel}>Excused</span>
              </div>
            </div>
            {attendance.byCourse.length > 0 && (
              <div style={styles.courseList}>
                {attendance.byCourse.map((ac) => (
                  <div key={ac.courseId} style={styles.courseCard}>
                    <div style={styles.courseHeader}>
                      <span style={styles.courseName}>{ac.courseTitle}</span>
                      <span style={{ ...styles.courseAvg, color: gradeColor(ac.percentage) }}>
                        {formatPercent(ac.percentage)}
                      </span>
                    </div>
                    <span style={styles.attDetail}>
                      {ac.present}/{ac.total} present
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Communication History */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Communication History</h3>
        {messages.length === 0 ? (
          <p style={styles.emptyText}>No messages sent yet.</p>
        ) : (
          <div style={styles.messageList}>
            {messages.map((msg) => (
              <div key={msg.id} style={styles.messageCard}>
                <div style={styles.messageHeader}>
                  <span style={styles.messageSubject}>{msg.subject}</span>
                  <span style={styles.messageDate}>{formatDate(msg.sent_at)}</span>
                </div>
                <div style={styles.messageMeta}>
                  <span style={styles.messageChannel}>{msg.channel.toUpperCase()}</span>
                  <span style={styles.messageSender}>from {msg.sender_name}</span>
                </div>
                <p style={styles.messageBody}>{msg.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '800px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: '4px 8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#3182ce',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    padding: '8px 16px',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    fontSize: '14px',
    color: '#718096',
  },
  metaItem: {
    display: 'inline-block',
  },
  section: {
    padding: '20px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 16px 0',
  },
  overallAvg: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f7fafc',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  overallAvgLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
  },
  overallAvgValue: {
    fontSize: '20px',
    fontWeight: '700',
  },
  courseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  courseCard: {
    padding: '12px 16px',
    background: '#f7fafc',
    borderRadius: '6px',
  },
  courseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  courseName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  courseAvg: {
    fontSize: '16px',
    fontWeight: '700',
  },
  gradeList: {
    marginTop: '8px',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '8px',
  },
  gradeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0',
    fontSize: '13px',
  },
  gradeName: {
    color: '#4a5568',
  },
  gradeScore: {
    fontWeight: '500',
    color: '#2d3748',
  },
  attendanceSummary: {
    display: 'flex',
    gap: '24px',
    marginBottom: '16px',
    padding: '12px 16px',
    background: '#f7fafc',
    borderRadius: '6px',
  },
  attStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  attStatValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#2d3748',
  },
  attStatLabel: {
    fontSize: '12px',
    color: '#718096',
    marginTop: '2px',
  },
  attDetail: {
    fontSize: '13px',
    color: '#718096',
  },
  messageList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  messageCard: {
    padding: '12px 16px',
    background: '#f7fafc',
    borderRadius: '6px',
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  messageSubject: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  messageDate: {
    fontSize: '13px',
    color: '#718096',
  },
  messageMeta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '4px',
  },
  messageChannel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#3182ce',
    background: '#ebf8ff',
    padding: '1px 6px',
    borderRadius: '3px',
  },
  messageSender: {
    fontSize: '12px',
    color: '#718096',
  },
  messageBody: {
    fontSize: '13px',
    color: '#4a5568',
    margin: 0,
    lineHeight: '1.4',
  },
  emptyText: {
    color: '#a0aec0',
    fontStyle: 'italic',
    fontSize: '14px',
    margin: 0,
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096',
  },
  error: {
    padding: '24px',
    textAlign: 'center',
    color: '#e53e3e',
    background: '#fee2e2',
    borderRadius: '8px',
  },
};
