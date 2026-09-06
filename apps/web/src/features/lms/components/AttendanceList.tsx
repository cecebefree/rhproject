// AttendanceList — List attendance sessions with summary counts
// Row 73: Teacher sees attendance records grouped by course and date

import { useEffect, useState } from 'react';
import {
  selectAttendance,
  subscribeToAttendance,
  type AttendanceWithRelations,
} from '../services/supabase';

interface AttendanceListProps {
  tenantId: string;
  onSelect: (courseId: string, date: string) => void;
}

interface SessionSummary {
  courseId: string;
  courseName: string;
  classDate: string;
  present: number;
  absent: number;
  excused: number;
  total: number;
}

export function AttendanceList({ tenantId, onSelect }: AttendanceListProps) {
  const [records, setRecords] = useState<AttendanceWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await selectAttendance(tenantId);

      if (!cancelled) {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setRecords(data ?? []);
        }
        setLoading(false);
      }
    }

    load();
    const sub = subscribeToAttendance((payload) => {
      if (payload.eventType === 'INSERT') {
        setRecords((prev) => [payload.new as AttendanceWithRelations, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === payload.new.id ? (payload.new as AttendanceWithRelations) : r,
          ),
        );
      } else if (payload.eventType === 'DELETE') {
        setRecords((prev) => prev.filter((r) => r.id !== payload.old?.id));
      }
    });

    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, [tenantId]);

  // Group records by course + date
  const sessions = records.reduce<Map<string, SessionSummary>>((acc, r) => {
    const key = `${r.course_id}|${r.class_date}`;
    if (!acc.has(key)) {
      acc.set(key, {
        courseId: r.course_id,
        courseName: r.courses?.title ?? 'Unknown Course',
        classDate: r.class_date,
        present: 0,
        absent: 0,
        excused: 0,
        total: 0,
      });
    }
    const session = acc.get(key)!;
    session.total++;
    if (r.status === 'present') session.present++;
    else if (r.status === 'absent') session.absent++;
    else if (r.status === 'excused') session.excused++;
    return acc;
  }, new Map());

  let sessionList = Array.from(sessions.values());

  // Filter by search
  if (search) {
    sessionList = sessionList.filter(
      (s) =>
        s.courseName.toLowerCase().includes(search.toLowerCase()) ||
        s.classDate.includes(search),
    );
  }

  // Filter by date range
  if (startDate) {
    sessionList = sessionList.filter((s) => s.classDate >= startDate);
  }
  if (endDate) {
    sessionList = sessionList.filter((s) => s.classDate <= endDate);
  }

  // Sort by date descending
  sessionList.sort((a, b) => b.classDate.localeCompare(a.classDate));

  if (loading) return <div style={styles.loading}>Loading attendance records...</div>;
  if (error) return <div style={styles.error}>{error}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Attendance</h2>
        <span style={styles.count}>{sessionList.length} sessions</span>
      </div>

      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Search by subject name or date..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={styles.dateInput}
          placeholder="From"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={styles.dateInput}
          placeholder="To"
        />
      </div>

      {sessionList.length === 0 ? (
        <div style={styles.empty}>
          {records.length === 0
            ? 'No attendance records yet. Mark attendance to get started.'
            : 'No results match your filters.'}
        </div>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <div style={styles.colCourse}>Course</div>
            <div style={styles.colDate}>Date</div>
            <div style={styles.colPresent}>Present</div>
            <div style={styles.colAbsent}>Absent</div>
            <div style={styles.colExcused}>Excused</div>
            <div style={styles.colTotal}>Total</div>
          </div>
          {sessionList.map((s) => (
            <div
              key={`${s.courseId}|${s.classDate}`}
              style={styles.tableRow}
              onClick={() => onSelect(s.courseId, s.classDate)}
            >
              <div style={styles.colCourse}>{s.courseName}</div>
              <div style={styles.colDate}>{s.classDate}</div>
              <div style={{ ...styles.colPresent, color: '#38a169', fontWeight: '500' }}>
                {s.present}
              </div>
              <div style={{ ...styles.colAbsent, color: '#e53e3e', fontWeight: '500' }}>
                {s.absent}
              </div>
              <div style={{ ...styles.colExcused, color: '#d69e2e', fontWeight: '500' }}>
                {s.excused}
              </div>
              <div style={styles.colTotal}>{s.total}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: { fontSize: '18px', fontWeight: '600', color: '#2d3748', margin: 0 },
  count: { fontSize: '14px', color: '#718096' },
  filters: { display: 'flex', gap: '12px', marginBottom: '16px' },
  search: { flex: 2, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' },
  dateInput: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' },
  loading: { padding: '24px', textAlign: 'center', color: '#718096' },
  error: { padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '14px' },
  empty: { padding: '24px', textAlign: 'center', color: '#718096', fontSize: '14px' },
  table: { display: 'flex', flexDirection: 'column' },
  tableHeader: {
    display: 'flex',
    padding: '8px 12px',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: '600',
    fontSize: '12px',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tableRow: {
    display: 'flex',
    padding: '12px',
    borderBottom: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  colCourse: { flex: 3, fontSize: '14px' },
  colDate: { flex: 2, fontSize: '14px' },
  colPresent: { flex: 1, fontSize: '14px', textAlign: 'center' },
  colAbsent: { flex: 1, fontSize: '14px', textAlign: 'center' },
  colExcused: { flex: 1, fontSize: '14px', textAlign: 'center' },
  colTotal: { flex: 1, fontSize: '14px', textAlign: 'center', fontWeight: '500' },
};
