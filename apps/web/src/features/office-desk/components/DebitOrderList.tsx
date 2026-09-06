// DebitOrderList — table view of debit orders with search, status filter, real-time, execute action

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

interface DebitOrder {
  id: string;
  student_id: string;
  amount: number;
  frequency: string;
  status: string;
  next_debit_date: string | null;
  start_date: string | null;
  end_date: string | null;
  last_debit_date: string | null;
  failed_attempts: number;
  max_retries: number;
  created_at: string;
  students?: { first_name: string; last_name: string; email: string | null } | null;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#e2e8f0',
  active: '#27ae60',
  paused: '#fef3c7',
  completed: '#d1fae5',
  failed: '#fee2e2',
  cancelled: '#fee2e2',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `R ${amount.toFixed(2)}`;
}

export function DebitOrderList({ tenantId }: { tenantId: string }) {
  const [orders, setOrders] = useState<DebitOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [executingId, setExecutingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let query = supabase
        .from('debit_orders')
        .select('*, students(first_name, last_name, email)')
        .order('next_debit_date', { ascending: true });

      if (search) {
        query = query.or(`frequency.ilike.%${search}%`);
      }
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      if (!cancelled) {
        setOrders((data as any) ?? []);
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel('debit-orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debit_orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setOrders((prev) => [payload.new as any, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setOrders((prev) => prev.map((o) => (o.id === (payload.new as any).id ? payload.new as any : o)));
        } else if (payload.eventType === 'DELETE') {
          setOrders((prev) => prev.filter((o) => o.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      channel.unsubscribe();
    };
  }, [tenantId, search, statusFilter]);

  async function handleExecute(orderId: string, status: 'succeeded' | 'failed') {
    setExecutingId(orderId);
    const { error } = await supabase.rpc('execute_debit_order', {
      p_debit_order_id: orderId,
      p_status: status,
    });
    setExecutingId(null);

    if (error) {
      alert(`Error: ${error.message}`);
    }
  }

  if (loading) return <div style={styles.loading}>Loading debit orders...</div>;
  if (orders.length === 0) return <div style={styles.empty}>No debit orders found.</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
        >
          <option value="">All Status</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Student</th>
            <th style={styles.th}>Amount</th>
            <th style={styles.th}>Frequency</th>
            <th style={styles.th}>Next Debit</th>
            <th style={styles.th}>Last Debit</th>
            <th style={styles.th}>Retries</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const canExecute = o.status === 'scheduled' || o.status === 'active';
            return (
              <tr key={o.id} style={styles.row}>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, backgroundColor: STATUS_COLORS[o.status] ?? '#e2e8f0' }}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </td>
                <td style={styles.td}>
                  {o.students ? `${o.students.first_name} ${o.students.last_name}` : '—'}
                </td>
                <td style={styles.td}>{formatCurrency(o.amount)}</td>
                <td style={styles.td}>{o.frequency}</td>
                <td style={styles.td}>{formatDate(o.next_debit_date)}</td>
                <td style={styles.td}>{formatDate(o.last_debit_date)}</td>
                <td style={styles.td}>{o.failed_attempts > 0 ? <span style={{ color: '#e53e3e' }}>{o.failed_attempts}/{o.max_retries}</span> : `0/${o.max_retries}`}</td>
                <td style={styles.td}>
                  {canExecute && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleExecute(o.id, 'succeeded')}
                        disabled={executingId === o.id}
                        style={styles.btnSuccess}
                      >
                        {executingId === o.id ? '...' : 'Mark Paid'}
                      </button>
                      <button
                        onClick={() => handleExecute(o.id, 'failed')}
                        disabled={executingId === o.id}
                        style={styles.btnDanger}
                      >
                        {executingId === o.id ? '...' : 'Mark Failed'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  controls: { display: 'flex', gap: '12px', marginBottom: '16px' },
  searchInput: { flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' },
  filterSelect: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px', minWidth: '150px' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' },
  th: { textAlign: 'left', padding: '12px 16px', backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0', fontSize: '13px', fontWeight: '600', color: '#4a5568', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  td: { padding: '12px 16px', borderBottom: '1px solid #f7fafc', fontSize: '14px', color: '#2d3748' },
  row: { transition: 'background-color 0.15s' },
  badge: { display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' },
  loading: { padding: '48px', textAlign: 'center', color: '#718096' },
  empty: { padding: '48px', textAlign: 'center', color: '#a0aec0', fontStyle: 'italic' },
  btnSuccess: { padding: '4px 8px', fontSize: '12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  btnDanger: { padding: '4px 8px', fontSize: '12px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
};
