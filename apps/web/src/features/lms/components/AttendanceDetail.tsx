// AttendanceDetail — Full attendance view for a class session
// Row 73: Course name, date, student list with status/marked_by/notes

import { useEffect, useState } from 'react';
import { getAttendanceByDate, type AttendanceWithRelations } from '../services/supabase';
import { StatusBadge } from './StatusBadge';

interface AttendanceDetailProps {
  courseId: string;
  classDate: string;
  onBack: () => void;
}

export function AttendanceDetail({
  courseId,
  classDate,
  onBack,
}: AttendanceDetailProps) {
  const [records, setRecords] = useState<AttendanceWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await getAttendanceByDate(courseId, classDate);
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
    return () => {
      cancelled = true;
    };
  }, [courseId, classDate]);

  if (loading) return <div style={styles.loading}>Loading attendance...</div>;
  if (error) return <div style={styles.error}>{error}</div>;

  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const excusedCount = records.filter((r) => r.status === 'excused').length;
  const courseName = records[0]?.courses?.title ?? 'Unknown Course';

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>
          Back to List
        </button>
      </div>

      <h2 style={styles.title}>{courseName}</h2>
      <p style={styles.date}>{classDate}</p>

      <div style={styles.summaryBar}>
        <div style={styles.summaryItem}>
          <span style={{ ...styles.dot, backgroundColor: '#38a169' }} />
          <span>Present: <strong>{presentCount}</strong></span>
        </div>
        <div style={styles.summaryItem}>
          <span style={{ ...styles.dot, backgroundColor: '#e53e3e' }} />
          <span>Absent: <strong>{absentCount}</strong></span>
        </div>
        <div style={styles.summaryItem}>
          <span style={{ ...styles.dot, backgroundColor: '#d69e2e' }} />
          <span>Excused: <strong>{excusedCount}</strong></span>
        </div>
        <div style={styles.summaryItem}>
          <span>Total: <strong>{records.length}</strong></span>
        </div>
      </div>

      {records.length === 0 ? (
        <div style={styles.empty}>No attendance records for this session.</div>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <div style={styles.colStudent}>Student</div>
            <div style={styles.colStatus}>Status</div>
            <div style={styles.colNotes}>Notes</div>
            <div style={styles.colMarked}>Marked At</div>
          </div>
          {records.map((r) => (
            <div key={r.id} style={styles.tableRow}>
              <div style={styles.colStudent}>{r.profiles?.name ?? 'Unknown'}</div>
              <div style={styles.colStatus}>
                <StatusBadge status={r.status as 'present' | 'absent' | 'excused'} />
              </div>
              <div style={styles.colNotes}>{r.notes || '—'}</div>
              <div style={styles.colMarked}>
                {new Date(r.marked_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
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
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '16px' },
  backButton: {
    padding: '8px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    fontSize: '14px',
    color: '#4a5568',
    cursor: 'pointer',
  },
  title: { fontSize: '20px', fontWeight: '600', color: '#2d3748', margin: '0 0 4px 0' },
  date: { fontSize: '14px', color: '#718096', margin: '0 0 16px 0' },
  summaryBar: {
    display: 'flex',
    gap: '24px',
    padding: '12px 16px',
    backgroundColor: '#f7fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    marginBottom: '24px',
  },
  summaryItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#4a5568' },
  dot: { width: '8px', height: '8px', borderRadius: '50%' },
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
  },
  colStudent: { flex: 2, fontSize: '14px', fontWeight: '500' },
  colStatus: { flex: 1, fontSize: '14px' },
  colNotes: { flex: 2, fontSize: '14px', color: '#718096' },
  colMarked: { flex: 1, fontSize: '12px', color: '#718096' },
  loading: { padding: '24px', textAlign: 'center', color: '#718096' },
  error: { padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '14px' },
};
