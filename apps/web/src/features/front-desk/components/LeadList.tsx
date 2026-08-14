import { useState, useEffect } from 'react';
import { selectLeads, subscribeToLeads, type Lead, type LeadStatus, LEAD_STATUSES } from '../services/supabase';

interface LeadListProps {
  tenantId: string;
  onSelectLead: (leadId: string) => void;
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  enquiry: 'Enquiry',
  qualified: 'Qualified',
  invoiced: 'Invoiced',
  handed_off: 'Handed Off',
};

export function LeadList({ tenantId, onSelectLead }: LeadListProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');

  const loadLeads = async () => {
    const { data, error: fetchError } = await selectLeads(
      tenantId,
      search || undefined,
      (statusFilter as LeadStatus) || undefined
    );
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLeads();
  }, [tenantId, search, statusFilter]);

  useEffect(() => {
    const channel = subscribeToLeads((payload) => {
      if (payload.eventType === 'UPDATE') {
        setLeads((prev) =>
          prev.map((lead) => (lead.id === payload.new.id ? payload.new : lead))
        );
      } else if (payload.eventType === 'INSERT') {
        setLeads((prev) => [payload.new, ...prev]);
      } else if (payload.eventType === 'DELETE') {
        setLeads((prev) => prev.filter((lead) => lead.id !== payload.old?.id));
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  if (loading) return <div>Loading leads...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2>Leads</h2>

      {error && <div style={{ color: 'red', padding: '8px', background: '#fee' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '16px' }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '8px' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | '')}
          style={{ padding: '8px' }}
        >
          <option value="">All Statuses</option>
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {leads.length === 0 ? (
        <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '4px' }}>No leads found</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>Name</th>
              <th style={{ padding: '8px' }}>Email</th>
              <th style={{ padding: '8px' }}>Phone</th>
              <th style={{ padding: '8px' }}>Status</th>
              <th style={{ padding: '8px' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                style={{ borderBottom: '1px solid #ddd', cursor: 'pointer' }}
              >
                <td style={{ padding: '8px' }}>{lead.name || '—'}</td>
                <td style={{ padding: '8px' }}>{lead.email || '—'}</td>
                <td style={{ padding: '8px' }}>{lead.phone || '—'}</td>
                <td style={{ padding: '8px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: lead.status === 'handed_off' ? '#4caf50' : '#2196f3',
                      color: 'white',
                      fontSize: '0.85em',
                    }}
                  >
                    {STATUS_LABELS[lead.status]}
                  </span>
                </td>
                <td style={{ padding: '8px' }}>{new Date(lead.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
