// RegistrationDetail — detail view with status badge, payment indicator, lead ref
// Row 67: Shows full registration details + status transitions for teachers

import { useEffect, useState } from 'react';
import {
  getRegistrationById,
  updateRegistrationStatus,
} from '../services/supabase';
import type { Registration, RegistrationStatus } from '../services/supabase';
import { StatusBadge } from './StatusBadge';

interface RegistrationDetailProps {
  registrationId: string;
  onBack?: () => void;
}

const TEACHER_TRANSITIONS: Record<RegistrationStatus, RegistrationStatus[]> = {
  pending_init: ['pending_review', 'withdrawn'],
  pending_review: ['withdrawn'],
  approved: [],
  active: [],
  withdrawn: [],
  rejected: [],
};

export function RegistrationDetail({
  registrationId,
  onBack,
}: RegistrationDetailProps) {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } =
        await getRegistrationById(registrationId);

      if (!cancelled) {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setRegistration(data);
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [registrationId]);

  async function handleStatusTransition(newStatus: RegistrationStatus) {
    if (!registration) return;
    setUpdating(true);
    setError(null);

    const { data, error: updateError } = await updateRegistrationStatus(
      registration.id,
      newStatus,
    );

    setUpdating(false);

    if (updateError) {
      setError(updateError.message);
    } else if (data) {
      setRegistration(data);
    }
  }

  if (loading) {
    return <div style={styles.loading}>Loading registration...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  if (!registration) {
    return <div style={styles.error}>Registration not found</div>;
  }

  const allowedTransitions =
    TEACHER_TRANSITIONS[registration.status] ?? [];

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <button type="button" onClick={onBack} style={styles.backButton}>
          ← Back to List
        </button>
        <StatusBadge status={registration.status} />
      </div>

      <h2 style={styles.title}>{registration.student_name}</h2>

      <div style={styles.grid}>
        <div style={styles.field}>
          <span style={styles.label}>Email</span>
          <span style={styles.value}>{registration.student_email}</span>
        </div>
        <div style={styles.field}>
          <span style={styles.label}>Phone</span>
          <span style={styles.value}>
            {registration.student_phone ?? '—'}
          </span>
        </div>
        <div style={styles.field}>
          <span style={styles.label}>Course</span>
          <span style={styles.value}>{registration.course_name ?? '—'}</span>
        </div>
        <div style={styles.field}>
          <span style={styles.label}>Created</span>
          <span style={styles.value}>
            {new Date(registration.created_at).toLocaleDateString()}
          </span>
        </div>
        <div style={styles.field}>
          <span style={styles.label}>Payment Status</span>
          <span style={styles.value}>
            {registration.payment_attached_at ? (
              <span style={styles.paid}>
                Paid ({new Date(registration.payment_attached_at).toLocaleDateString()})
              </span>
            ) : (
              <span style={styles.pending}>Pending</span>
            )}
          </span>
        </div>
        {registration.lead_reference_id && (
          <div style={styles.field}>
            <span style={styles.label}>Lead Reference</span>
            <span style={styles.value}>{registration.lead_reference_id}</span>
          </div>
        )}
      </div>

      {registration.notes && (
        <div style={styles.notesSection}>
          <span style={styles.label}>Notes</span>
          <p style={styles.notes}>{registration.notes}</p>
        </div>
      )}

      {allowedTransitions.length > 0 && (
        <div style={styles.actions}>
          <span style={styles.label}>Actions</span>
          <div style={styles.buttonGroup}>
            {allowedTransitions.includes('pending_review') && (
              <button
                type="button"
                onClick={() => handleStatusTransition('pending_review')}
                disabled={updating}
                style={styles.submitButton}
              >
                Submit for Review
              </button>
            )}
            {allowedTransitions.includes('withdrawn') && (
              <button
                type="button"
                onClick={() => handleStatusTransition('withdrawn')}
                disabled={updating}
                style={styles.withdrawButton}
              >
                Withdraw
              </button>
            )}
          </div>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  backButton: {
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#4a5568',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 24px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: '14px',
    color: '#2d3748',
  },
  paid: {
    color: '#065f46',
    fontWeight: '500',
  },
  pending: {
    color: '#92400e',
    fontWeight: '500',
  },
  notesSection: {
    marginBottom: '24px',
  },
  notes: {
    fontSize: '14px',
    color: '#4a5568',
    margin: '4px 0 0 0',
  },
  actions: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
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
  withdrawButton: {
    padding: '8px 16px',
    backgroundColor: '#e53e3e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: '#718096',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '14px',
  },
};
