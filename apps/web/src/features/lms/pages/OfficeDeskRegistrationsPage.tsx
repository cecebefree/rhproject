// OfficeDeskRegistrationsPage — Registration list with expandable detail (Row 70)
// Table view: status, student name, course, created, invoice, actions
// Detail view: RegistrationDetail card with approve/reject

import { useEffect, useState } from 'react';
import {
  selectRegistrations,
  updateRegistrationStatus,
  subscribeToRegistrations,
  type Registration,
  type RegistrationStatus,
  REGISTRATION_STATUSES,
} from '../services/supabase';
import { RegistrationDetail } from '../components/RegistrationDetail';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';

interface DeskContext {
  tenantId: string;
  deskId: string;
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

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function OfficeDeskRegistrationsPage() {
  const { tenantId } = useOutletContext<DeskContext>();
  const { registrationId } = useParams<{ registrationId: string }>();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | ''>('');
  const [selected, setSelected] = useState<Registration | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Load registrations
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await selectRegistrations(
        tenantId,
        search || undefined,
        (statusFilter as RegistrationStatus) || undefined,
      );
      if (!cancelled) {
        setRegistrations((data as any) ?? []);
        setLoading(false);
      }
    }

    load();
    const sub = subscribeToRegistrations((payload) => {
      if (payload.eventType === 'INSERT') {
        setRegistrations((prev) => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setRegistrations((prev) => prev.map((r) => (r.id === payload.new.id ? payload.new : r)));
      } else if (payload.eventType === 'DELETE') {
        setRegistrations((prev) => prev.filter((r) => r.id !== payload.old?.id));
      }
    });

    return () => {
      cancelled = true;
      sub?.then?.((s: any) => s?.unsubscribe?.());
    };
  }, [tenantId, search, statusFilter]);

  // Load selected registration detail
  useEffect(() => {
    if (registrationId) {
      const found = registrations.find((r) => r.id === registrationId);
      setSelected(found ?? null);
    } else {
      setSelected(null);
    }
  }, [registrationId, registrations]);

  const handleBulkAction = async (action: 'approved' | 'rejected') => {
    if (!selected) return;
    setUpdating(selected.id);
    await updateRegistrationStatus(selected.id, action);
    setUpdating(null);
    navigate('/lms/office-desk/registrations');
  };

  // Show detail view if registration selected
  if (selected) {
    return (
      <RegistrationDetail
        registration={selected}
        onBack={() => navigate('/lms/office-desk/registrations')}
        onStatusChanged={() => {
          // Refresh data
          setLoading(true);
          selectRegistrations(tenantId).then(({ data }) => {
            setRegistrations((data as any) ?? []);
            setLoading(false);
          });
        }}
      />
    );
  }

  return (
    <div>
      {/* Controls */}
      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RegistrationStatus | '')}
          style={styles.filterSelect}
        >
          <option value="">All Status</option>
          {REGISTRATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={styles.loading}>Loading registrations...</div>
      ) : registrations.length === 0 ? (
        <div style={styles.empty}>No registrations found.</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Student</th>
              <th style={styles.th}>Course</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}>Invoice</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((reg) => (
              <tr
                key={reg.id}
                style={styles.row}
                onClick={() => navigate(`/lms/office-desk/registrations/${reg.id}`)}
              >
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: STATUS_COLORS[reg.status] ?? '#e2e8f0',
                    }}
                  >
                    {STATUS_LABELS[reg.status]}
                  </span>
                </td>
                <td style={styles.td}>
                  <div>
                    <div style={styles.studentName}>{reg.student_name}</div>
                    <div style={styles.studentEmail}>{reg.student_email}</div>
                  </div>
                </td>
                <td style={styles.td}>{reg.course_name || '—'}</td>
                <td style={styles.td}>{formatDate(reg.created_at)}</td>
                <td style={styles.td}>
                  {reg.payment_attached_at ? (
                    <span style={{ color: '#27ae60', fontWeight: 500 }}>Paid</span>
                  ) : (
                    <span style={{ color: '#a0aec0' }}>Pending</span>
                  )}
                </td>
                <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                  {reg.status === 'pending_review' && (
                    <button
                      onClick={() => handleBulkAction('approved')}
                      disabled={updating === reg.id}
                      style={styles.approveButton}
                    >
                      {updating === reg.id ? '...' : 'Approve'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  controls: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '14px',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '14px',
    minWidth: '150px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    backgroundColor: '#f7fafc',
    borderBottom: '2px solid #e2e8f0',
    fontSize: '13px',
    fontWeight: '600',
    color: '#4a5568',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #f7fafc',
    fontSize: '14px',
    color: '#2d3748',
  },
  row: {
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  studentName: {
    fontWeight: '500',
    color: '#2d3748',
  },
  studentEmail: {
    fontSize: '13px',
    color: '#718096',
  },
  approveButton: {
    padding: '4px 12px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096',
  },
  empty: {
    padding: '48px',
    textAlign: 'center',
    color: '#a0aec0',
    fontStyle: 'italic',
  },
};
