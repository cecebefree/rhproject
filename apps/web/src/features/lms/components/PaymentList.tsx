// PaymentList — List of payment requests with search/filter and real-time
// Row 72: Teacher sees payment requests for their tenant

import { useEffect, useState } from 'react';
import {
  selectPaymentRequests,
  subscribeToPaymentRequests,
  type PaymentRequestWithRelations,
} from '../services/supabase';
import { StatusBadge } from './StatusBadge';

interface PaymentListProps {
  tenantId: string;
  onSelect: (requestId: string) => void;
}

export function PaymentList({ tenantId, onSelect }: PaymentListProps) {
  const [requests, setRequests] = useState<PaymentRequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await selectPaymentRequests(tenantId);

      if (!cancelled) {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setRequests(data ?? []);
        }
        setLoading(false);
      }
    }

    load();
    const sub = subscribeToPaymentRequests((payload) => {
      if (payload.eventType === 'INSERT') {
        setRequests((prev) => [payload.new as PaymentRequestWithRelations, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === payload.new.id
              ? (payload.new as PaymentRequestWithRelations)
              : r,
          ),
        );
      } else if (payload.eventType === 'DELETE') {
        setRequests((prev) => prev.filter((r) => r.id !== payload.old?.id));
      }
    });

    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, [tenantId]);

  const filtered = requests.filter((r) => {
    const matchesSearch =
      r.registrations?.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.registrations?.student_email?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div style={styles.loading}>Loading payment requests...</div>;
  if (error) return <div style={styles.error}>{error}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Payment Requests</h2>
        <span style={styles.count}>{requests.length} total</span>
      </div>

      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Search by student, email, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.statusFilter}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={styles.empty}>
          {requests.length === 0
            ? 'No payment requests yet. Create one to get started.'
            : 'No results match your filters.'}
        </div>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <div style={styles.colStudent}>Student</div>
            <div style={styles.colAmount}>Amount</div>
            <div style={styles.colStatus}>Status</div>
            <div style={styles.colCreated}>Created</div>
            <div style={styles.colPaid}>Paid</div>
          </div>
          {filtered.map((req) => (
            <div
              key={req.id}
              style={styles.tableRow}
              onClick={() => onSelect(req.id)}
            >
              <div style={styles.colStudent}>
                {req.registrations?.student_name ?? 'Unknown'}
              </div>
              <div style={styles.colAmount}>
                {req.currency} {req.amount.toFixed(2)}
              </div>
              <div style={styles.colStatus}>
                <StatusBadge status={req.status as 'pending' | 'paid' | 'expired' | 'cancelled'} />
              </div>
              <div style={styles.colCreated}>
                {new Date(req.created_at).toLocaleDateString()}
              </div>
              <div style={styles.colPaid}>
                {req.paid_at
                  ? new Date(req.paid_at).toLocaleDateString()
                  : '—'}
              </div>
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
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  count: {
    fontSize: '14px',
    color: '#718096',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  search: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  statusFilter: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
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
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#718096',
    fontSize: '14px',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
  },
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
  colStudent: { flex: 2, fontSize: '14px' },
  colAmount: { flex: 1, fontSize: '14px', fontWeight: '500' },
  colStatus: { flex: 1, fontSize: '14px' },
  colCreated: { flex: 1, fontSize: '14px', color: '#718096' },
  colPaid: { flex: 1, fontSize: '14px', color: '#718096' },
};
