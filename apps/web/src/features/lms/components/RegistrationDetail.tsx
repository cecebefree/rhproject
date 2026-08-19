// RegistrationDetail — expandable detail card for a single registration (Row 70)
// Shows: family info, enrollment info, timeline, payment status, contract status, actions

import { useState } from 'react';
import {
  updateRegistrationStatus,
  type Registration,
  type RegistrationStatus,
} from '../services/supabase';

interface RegistrationDetailProps {
  registration: Registration;
  onBack: () => void;
  onStatusChanged?: () => void;
}

const STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending_init: 'Not Started',
  pending_review: 'Under Review',
  approved: 'Approved',
  active: 'Active',
  withdrawn: 'Withdrawn',
  rejected: 'Rejected',
};

const STATUS_COLORS: Record<RegistrationStatus, string> = {
  pending_init: '#e2e8f0',
  pending_review: '#fef3c7',
  approved: '#d1fae5',
  active: '#27ae60',
  withdrawn: '#fee2e2',
  rejected: '#fee2e2',
};

const TIMELINE_STEPS: { key: string; label: string }[] = [
  { key: 'created', label: 'Created' },
  { key: 'pending_review', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'active', label: 'Active' },
];

const STATUS_ORDER: RegistrationStatus[] = [
  'pending_init',
  'pending_review',
  'approved',
  'active',
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function RegistrationDetail({
  registration,
  onBack,
  onStatusChanged,
}: RegistrationDetailProps) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIdx = STATUS_ORDER.indexOf(registration.status);

  const handleApprove = async () => {
    setUpdating(true);
    setError(null);
    const { error: updateErr } = await updateRegistrationStatus(
      registration.id,
      'approved',
    );
    setUpdating(false);
    if (updateErr) {
      setError(updateErr.message);
    } else {
      onStatusChanged?.();
    }
  };

  const handleReject = async () => {
    setUpdating(true);
    setError(null);
    const { error: updateErr } = await updateRegistrationStatus(
      registration.id,
      'rejected',
    );
    setUpdating(false);
    if (updateErr) {
      setError(updateErr.message);
    } else {
      onStatusChanged?.();
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>
          &larr; Back
        </button>
        <span
          style={{
            ...styles.statusBadge,
            backgroundColor: STATUS_COLORS[registration.status] ?? '#e2e8f0',
          }}
        >
          {STATUS_LABELS[registration.status]}
        </span>
      </div>

      <h2 style={styles.title}>{registration.student_name}</h2>

      {error && <div style={styles.error}>{error}</div>}

      {/* Family Info */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Student Info</h3>
        <div style={styles.fieldRow}>
          <span style={styles.fieldLabel}>Name</span>
          <span style={styles.fieldValue}>{registration.student_name}</span>
        </div>
        <div style={styles.fieldRow}>
          <span style={styles.fieldLabel}>Email</span>
          <span style={styles.fieldValue}>{registration.student_email}</span>
        </div>
        {registration.student_phone && (
          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Phone</span>
            <span style={styles.fieldValue}>{registration.student_phone}</span>
          </div>
        )}
      </div>

      {/* Enrollment Info */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Enrollment</h3>
        {registration.course_name && (
          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Course</span>
            <span style={styles.fieldValue}>{registration.course_name}</span>
          </div>
        )}
        <div style={styles.fieldRow}>
          <span style={styles.fieldLabel}>Registered</span>
          <span style={styles.fieldValue}>{formatDate(registration.created_at)}</span>
        </div>
        {registration.notes && (
          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Notes</span>
            <span style={styles.fieldValue}>{registration.notes}</span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Timeline</h3>
        <div style={styles.timeline}>
          {TIMELINE_STEPS.map((step, idx) => {
            const stepIdx = STATUS_ORDER.indexOf(step.key as RegistrationStatus);
            const isCompleted = stepIdx >= 0 && currentIdx > stepIdx;
            const isActive = step.key === registration.status;
            return (
              <div key={step.key} style={styles.timelineStep}>
                <div
                  style={{
                    ...styles.timelineDot,
                    backgroundColor: isCompleted
                      ? '#27ae60'
                      : isActive
                        ? '#8b1a2e'
                        : '#e2e8f0',
                  }}
                />
                <div style={styles.timelineContent}>
                  <span
                    style={{
                      ...styles.timelineLabel,
                      color: isCompleted || isActive ? '#2d3748' : '#a0aec0',
                      fontWeight: isActive ? '600' : '400',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Status */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Payment</h3>
        <div style={styles.fieldRow}>
          <span style={styles.fieldLabel}>Status</span>
          <span style={styles.fieldValue}>
            {registration.payment_attached_at ? 'Paid' : 'Pending'}
          </span>
        </div>
        {registration.stripe_charge_id && (
          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Stripe Charge</span>
            <span style={{ ...styles.fieldValue, fontFamily: 'monospace', fontSize: '12px' }}>
              {registration.stripe_charge_id}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Actions</h3>
        <div style={styles.actions}>
          {registration.status === 'pending_review' && (
            <button
              onClick={handleApprove}
              disabled={updating}
              style={{ ...styles.actionButton, backgroundColor: '#27ae60' }}
            >
              {updating ? 'Approving...' : 'Approve Registration'}
            </button>
          )}
          {(registration.status === 'pending_init' ||
            registration.status === 'pending_review') && (
            <button
              onClick={handleReject}
              disabled={updating}
              style={{ ...styles.actionButton, backgroundColor: '#e53e3e' }}
            >
              {updating ? 'Rejecting...' : 'Reject'}
            </button>
          )}
          <button
            disabled
            style={{ ...styles.actionButton, backgroundColor: '#718096', cursor: 'not-allowed' }}
          >
            Request Signature
          </button>
          <button
            disabled
            style={{ ...styles.actionButton, backgroundColor: '#718096', cursor: 'not-allowed' }}
          >
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '700px',
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
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  error: {
    padding: '8px 12px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '4px',
    fontSize: '14px',
  },
  section: {
    padding: '16px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 12px 0',
  },
  fieldRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid #f7fafc',
  },
  fieldLabel: {
    fontSize: '14px',
    color: '#718096',
  },
  fieldValue: {
    fontSize: '14px',
    color: '#2d3748',
    fontWeight: '500',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  timelineStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  timelineDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  timelineContent: {
    display: 'flex',
    alignItems: 'center',
  },
  timelineLabel: {
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionButton: {
    padding: '8px 16px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};
