import { useState, useEffect, useRef } from 'react';
import {
  selectLeads,
  subscribeToLeads,
  type Lead,
  type LeadStatus,
  LEAD_STATUSES,
} from '../services/supabase';
import { LeadFilterPanel } from './LeadFilterPanel';

interface LeadListProps {
  tenantId: string;
  onSelectLead: (leadId: string) => void;
  onEditLead: (leadId: string) => void;
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  enquiry: 'Enquiry',
  qualified: 'Qualified',
  invoiced: 'Invoiced',
  handed_off: 'Handed Off',
};

export function LeadList({ tenantId, onSelectLead, onEditLead }: LeadListProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const loadLeads = async () => {
    const { data, error: fetchError } = await selectLeads(
      tenantId,
      search || undefined,
      (statusFilter as LeadStatus) || undefined,
      sourceFilter || undefined,
      dateFrom || undefined,
      dateTo || undefined
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
  }, [tenantId, search, statusFilter, sourceFilter, dateFrom, dateTo]);

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

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setSourceFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const focusSearch = () => {
    searchRef.current?.focus();
  };

  // Expose focusSearch via window for keyboard shortcut
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__leadListFocusSearch = focusSearch;
    return () => {
      const w = window as unknown as Record<string, unknown>;
      delete w.__leadListFocusSearch;
    };
  }, []);

  if (loading) return <div>Loading leads...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2>Leads</h2>

      {error && (
        <div style={{ color: 'red', padding: '8px', background: '#fee', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <LeadFilterPanel
        search={search}
        statusFilter={statusFilter}
        sourceFilter={sourceFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onSourceChange={setSourceFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onReset={handleResetFilters}
      />

      {leads.length === 0 ? (
        <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '4px' }}>No leads found</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Name</th>
                <th style={{ padding: '8px' }}>Company</th>
                <th style={{ padding: '8px' }}>Email</th>
                <th style={{ padding: '8px' }}>Phone</th>
                <th style={{ padding: '8px' }}>Status</th>
                <th style={{ padding: '8px' }}>Created</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  style={{ borderBottom: '1px solid #ddd' }}
                >
                  <td
                    style={{ padding: '8px', cursor: 'pointer', color: '#3182ce' }}
                    onClick={() => onSelectLead(lead.id)}
                  >
                    {lead.name || '—'}
                  </td>
                  <td style={{ padding: '8px' }}>{lead.company || '—'}</td>
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
                  <td style={{ padding: '8px' }}>
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => onEditLead(lead.id)}
                        style={{
                          padding: '4px 8px',
                          background: '#3182ce',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '0.8em',
                        }}
                      >
                        Edit
                      </button>
                      {lead.phone && (
                        <a
                          href={`tel:${lead.phone}`}
                          style={{
                            padding: '4px 8px',
                            background: '#38a169',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            textDecoration: 'none',
                            fontSize: '0.8em',
                          }}
                        >
                          Call
                        </a>
                      )}
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}`}
                          style={{
                            padding: '4px 8px',
                            background: '#805ad5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            textDecoration: 'none',
                            fontSize: '0.8em',
                          }}
                        >
                          Email
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
