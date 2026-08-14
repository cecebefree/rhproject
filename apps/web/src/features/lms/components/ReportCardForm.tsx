// ReportCardForm — Create report card for students in teacher's courses
// Row 71: Teacher workflow - student dropdown filters to own courses

import { useEffect, useState } from 'react';
import { insertReportCard, supabaseUntyped } from '../services/supabase';

interface Student {
  id: string;
  name: string;
}

interface ReportCardFormProps {
  tenantId: string;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReportCardForm({
  tenantId,
  userId,
  onSuccess,
  onCancel,
}: ReportCardFormProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [term, setTerm] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      const { data, error } = await supabaseUntyped
        .from('school_desk.student_class')
        .select('student_id, profiles!student_id(id, name)')
        .eq('courses.teacher_id', userId);

      if (!cancelled) {
        if (error) {
          setError(error.message);
        } else {
          const uniqueStudents = new Map<string, Student>();
          for (const row of data ?? []) {
            const profile = row.profiles;
            if (profile?.id && profile?.name) {
              uniqueStudents.set(profile.id, {
                id: profile.id,
                name: profile.name,
              });
            }
          }
          setStudents(Array.from(uniqueStudents.values()));
        }
        setLoadingStudents(false);
      }
    }

    loadStudents();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { error: insertError } = await insertReportCard({
      student_id: studentId,
      term,
      subject,
      grade: grade || undefined,
      created_by: userId,
      tenant_id: tenantId,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess(true);
      setStudentId('');
      setTerm('');
      setSubject('');
      setGrade('');
      onSuccess?.();
    }
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Create Report Card</h2>
      <p style={styles.description}>
        Create a new report card draft. Status will be "draft" until released by Office Desk.
      </p>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>Report card created successfully.</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Student *</label>
          {loadingStudents ? (
            <div style={styles.loadingText}>Loading students...</div>
          ) : (
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              style={styles.select}
            >
              <option value="">Select a student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Term *</label>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="e.g., Term 1 2026"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Mathematics"
              required
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Grade (optional)</label>
          <input
            type="text"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="e.g., A, B+, 85%"
            style={styles.input}
          />
        </div>

        <div style={styles.buttonRow}>
          {onCancel && (
            <button type="button" onClick={onCancel} style={styles.cancelButton}>
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || loadingStudents}
            style={styles.submitButton}
          >
            {loading ? 'Creating...' : 'Create Report Card'}
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
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 8px 0',
  },
  description: {
    fontSize: '14px',
    color: '#718096',
    margin: '0 0 24px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  field: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  loadingText: {
    padding: '8px 12px',
    color: '#718096',
    fontSize: '14px',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
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
