// ContractList — table view of contracts with search, status filter, real-time
// Tables: public.contracts, public.students

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

interface Contract {
  id: string;
  tenant_id: string;
  student_id: string;
  enrollment_id: string | null;
  registration_id: string | null;
  status: string;
  title: string;
  terms: Record<string, unknown>;
  start_date: string | null;
  end_date: string | null;
  signed_at: string | null;
  signed_by: string | null;
  created_at: string;
  students?: { first_name: string; last_name: string; email: string | null } | null;
}

type ContractStatus = 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_signature: 'Awaiting Signature',
  active: 'Active',
  expired: 'Expired',
  terminated: 'Terminated',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#e2e8f0',
  pending_signature: '#fef3c7',
  active: '#27ae60',
  expired: '#fee2e2',
  terminated: '#fee2e2',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface ContractListProps {
  tenantId: string;
  onSelect?: (contract: Contract) => void;
}

export function ContractList({ tenantId, onSelect }: ContractListProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let query = supabase
        .from('contracts')
        .select('*, students(first_name, last_name, email)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`title.ilike.%${search}%`);
      }
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      if (!cancelled) {
        setContracts((data as any) ?? []);
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel('contracts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setContracts((prev) => [payload.new as any, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setContracts((prev) => prev.map((c) => (c.id === (payload.new as any).id ? payload.new as any : c)));
        } else if (payload.eventType === 'DELETE') {
          setContracts((prev) => prev.filter((c) => c.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      channel.unsubscribe();
    };
  }, [tenantId, search, statusFilter]);

  if (loading) return <div style={styles.loading}>Loading contracts...</div>;
  if (contracts.length === 0) return <div style={styles.empty}>No contracts found.</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search contracts..."
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
            <th style={styles.th}>Title</th>
            <th style={styles.th}>Start</th>
            <th style={styles.th}>End</th>
            <th style={styles.th}>Signed</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((c) => (
            <tr
              key={c.id}
              style={{
                ...styles.row,
                cursor: 'pointer',
                backgroundColor: selectedId === c.id ? '#F0F7FF' : undefined,
              }}
              onClick={() => {
                setSelectedId(c.id);
                onSelect?.(c);
              }}
            >
              <td style={styles.td}>
                <span style={{ ...styles.badge, backgroundColor: STATUS_COLORS[c.status] ?? '#e2e8f0' }}>
                  {STATUS_LABELS[c.status] ?? c.status}
                </span>
              </td>
              <td style={styles.td}>
                {c.students ? `${c.students.first_name} ${c.students.last_name}` : '—'}
              </td>
              <td style={styles.td}>{c.title}</td>
              <td style={styles.td}>{formatDate(c.start_date)}</td>
              <td style={styles.td}>{formatDate(c.end_date)}</td>
              <td style={styles.td}>{c.signed_at ? formatDate(c.signed_at) : '—'}</td>
            </tr>
          ))}
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
};
