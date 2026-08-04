// ReportCardForm — Enter report card data per student
// INSERTs via rc_office_insert (migration 088, status='draft')
// Source: AO-002-safeguarding-pipeline.md §2.1

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

interface Student {
  id: string;
  name: string;
}

interface ReportCardFormProps {
  tenantId: string | null;
  onSuccess: () => void;
}

export function ReportCardForm({ tenantId, onSuccess }: ReportCardFormProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [term, setTerm] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadStudents() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'student')
        .eq('tenant_id', tenantId ?? '')
        .order('name');

      if (!error && data) {
        setStudents(data);
      }
    }

    if (tenantId) {
      loadStudents();
    }
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('report_cards').insert({
      student_id: studentId,
      term,
      subject,
      grade: grade || null,
      status: 'draft',
      created_by: user.id,
      tenant_id: tenantId ?? '',
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess(true);
      setStudentId('');
      setTerm('');
      setSubject('');
      setGrade('');
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <div style={styles.formContainer}>
      <h2 style={styles.formTitle}>Enter Report Card</h2>
      <p style={styles.formDescription}>
        Create a new report card draft. Status will be "draft" until released by Office Desk.
      </p>

      {success && <div style={styles.success}>Report card created successfully.</div>}
      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label htmlFor="student" style={styles.label}>
            Student
          </label>
          <select
            id="student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            style={styles.select}
          >
            <option value="">Select a student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label htmlFor="term" style={styles.label}>
            Term
          </label>
          <input
            id="term"
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="e.g., Term 1 2026"
            required
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label htmlFor="subject" style={styles.label}>
            Subject
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Mathematics"
            required
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label htmlFor="grade" style={styles.label}>
            Grade (optional)
          </label>
          <input
            id="grade"
            type="text"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="e.g., A, B+, 85%"
            style={styles.input}
          />
        </div>

        <button type="submit" disabled={loading} style={styles.submitButton}>
          {loading ? 'Creating...' : 'Create Report Card'}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  formContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  formTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 8px 0',
    color: '#1a202c',
  },
  formDescription: {
    fontSize: '14px',
    color: '#718096',
    margin: '0 0 24px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
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
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    outline: 'none',
  },
  select: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: 'white',
  },
  submitButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#3182ce',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '8px',
  },
  success: {
    padding: '12px',
    marginBottom: '16px',
    backgroundColor: '#c6f6d5',
    color: '#22543d',
    borderRadius: '6px',
    fontSize: '14px',
  },
  error: {
    padding: '12px',
    marginBottom: '16px',
    backgroundColor: '#fed7d7',
    color: '#742a2a',
    borderRadius: '6px',
    fontSize: '14px',
  },
};
