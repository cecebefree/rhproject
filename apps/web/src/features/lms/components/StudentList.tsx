// StudentList — read-only student view for School Desk
// Shows students enrolled in teacher's courses via student_class
// RLS: sc_student_read policy filters by student_id = auth.uid()
// For teacher/admin view, we query via course ownership

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

interface Student {
  id: string;
  name: string;
  curriculum?: string;
  grade?: string;
  stage?: string;
  intake?: string;
  class_id: string;
  class_title?: string;
  enrolled_at: string;
}

interface StudentListProps {
  tenantId: string | null;
}

export function StudentList({ tenantId }: StudentListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      setLoading(true);
      setError(null);

      const { data, error: studentsError } = await supabase
        .from('student_class')
        .select(`
          id,
          student_id,
          class_id,
          enrolled_at,
          profiles!inner (id, name, role, curriculum, grade, stage, intake),
          courses!inner (title)
        `)
        .order('enrolled_at', { ascending: false });

      if (!cancelled) {
        if (studentsError) {
          setError(studentsError.message);
        } else {
          const mapped = (data ?? []).map((row: Record<string, unknown>) => ({
            id: row.profiles.id,
            name: row.profiles.name,
            curriculum: row.profiles.curriculum,
            grade: row.profiles.grade,
            stage: row.profiles.stage,
            intake: row.profiles.intake,
            class_id: row.class_id,
            class_title: row.courses?.title,
            enrolled_at: row.enrolled_at,
          }));
          setStudents(mapped);
        }
        setLoading(false);
      }
    }

    loadStudents();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading students...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <p>Unable to load students: {error}</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div style={styles.empty}>
        <h3>No students enrolled</h3>
        <p>No students are enrolled in your courses yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.sectionTitle}>Enrolled Students ({students.length})</h2>
      <div style={styles.list}>
        {students.map((student) => (
          <div key={student.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>{student.name}</span>
              <span style={styles.badge}>{student.class_title ?? 'Unknown Class'}</span>
            </div>
            <div style={styles.studentDetails}>
              {student.grade && <span>Grade: {student.grade}</span>}
              {student.curriculum && <span>Curriculum: {student.curriculum}</span>}
              {student.stage && <span>Stage: {student.stage}</span>}
              {student.intake && <span>Intake: {student.intake}</span>}
            </div>
            <p style={styles.cardTime}>
              Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096',
  },
  error: {
    padding: '48px',
    textAlign: 'center',
    color: '#e53e3e',
  },
  empty: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 16px 0',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
  },
  badge: {
    backgroundColor: '#e2e8f0',
    color: '#4a5568',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  studentDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    fontSize: '13px',
    color: '#718096',
    margin: '4px 0',
  },
  cardTime: {
    fontSize: '14px',
    color: '#4a5568',
    margin: '4px 0 0 0',
  },
};
