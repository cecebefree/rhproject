// RegistrationList — table view of registrations with search, filter, real-time
// Row 67: List with search by name/email, filter by status, sort by created_at

import { useEffect, useState } from 'react';
import {
  selectRegistrations,
  subscribeToRegistrations,
  REGISTRATION_STATUSES,
} from '../services/supabase';
import type { Registration, RegistrationStatus } from '../services/supabase';
import { StatusBadge } from './StatusBadge';

interface RegistrationListProps {
  tenantId: string;
  onSelect?: (registration: Registration) => void;
}

export function RegistrationList({ tenantId, onSelect }: RegistrationListProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | ''>('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await selectRegistrations(
        tenantId,
        search || undefined,
        (statusFilter as RegistrationStatus) || undefined,
      );

      if (!cancelled) {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setRegistrations(data ?? []);
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tenantId, search, statusFilter]);

  useEffect(() => {
    const channel = subscribeToRegistrations((payload) => {
      if (payload.eventType === 'INSERT') {
        setRegistrations((prev) => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === payload.new.id ? payload.new : r)),
        );
      } else if (payload.eventType === 'DELETE') {
        setRegistrations((prev) => prev.filter((r) => r.id !== payload.old?.id));
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [tenantId]);

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Registrations</h2>

      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RegistrationStatus | '')}
          style={styles.filterSelect}
        >
          <option value="">All Statuses</option>
          {REGISTRATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {loading && <div style={styles.loading}>Loading...</div>}
      {error && <div style={styles.error}>{error}</div>}

      {!loading && registrations.length === 0 && (
        <div style={styles.empty}>No registrations found</div>
      )}

      {!loading && registrations.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Course</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((reg) => (
              <tr
                key={reg.id}
                style={styles.tr}
                onClick={() => onSelect?.(reg)}
              >
                <td style={styles.td}>{reg.student_name}</td>
                <td style={styles.td}>{reg.student_email}</td>
                <td style={styles.td}>{reg.course_name ?? '—'}</td>
                <td style={styles.td}>
                  <StatusBadge status={reg.status} />
                </td>
                <td style={styles.td}>
                  {new Date(reg.created_at).toLocaleDateString()}
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
    margin: '0 0 16px 0',
  },
  toolbar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '150px',
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
    marginBottom: '16px',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#718096',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 8px',
    borderBottom: '2px solid #e2e8f0',
    fontSize: '12px',
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase',
  },
  tr: {
    cursor: 'pointer',
  },
  td: {
    padding: '12px 8px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#4a5568',
  },
};
