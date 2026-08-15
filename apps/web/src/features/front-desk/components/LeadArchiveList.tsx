import { useState, useEffect } from 'react';
import { selectArchivedLeads, unarchiveLead, subscribeToArchivedLeads, type Lead } from '../services/supabase';

interface LeadArchiveListProps {
  tenantId: string;
}

export function LeadArchiveList({ tenantId }: LeadArchiveListProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const loadArchivedLeads = async () => {
    const { data, error: fetchError } = await selectArchivedLeads(tenantId);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadArchivedLeads();
  }, [tenantId]);

  useEffect(() => {
    const channel = subscribeToArchivedLeads((payload) => {
      if (payload.eventType === 'UPDATE') {
        setLeads((prev) =>
          prev
            .map((lead) => (lead.id === payload.new.id ? payload.new : lead))
            .filter((lead) => lead.archived_at !== null)
        );
      } else if (payload.eventType === 'DELETE') {
        setLeads((prev) => prev.filter((lead) => lead.id !== payload.old?.id));
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleRestore = async (leadId: string) => {
    setRestoring(leadId);
    setError(null);

    const { error: restoreError } = await unarchiveLead(leadId);
    if (restoreError) {
      setError(restoreError.message);
    } else {
      setLeads((prev) => prev.filter((lead) => lead.id !== leadId));
    }
    setRestoring(null);
  };

  if (loading) return <div>Loading archived leads...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2>Archived Leads</h2>

      {error && (
        <div style={{ color: 'red', padding: '8px', background: '#fee', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {leads.length === 0 ? (
        <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '4px' }}>
          No archived leads
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Name</th>
                <th style={{ padding: '8px' }}>Company</th>
                <th style={{ padding: '8px' }}>Email</th>
                <th style={{ padding: '8px' }}>Archived</th>
                <th style={{ padding: '8px' }}>Reason</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px' }}>{lead.name || '—'}</td>
                  <td style={{ padding: '8px' }}>{lead.company || '—'}</td>
                  <td style={{ padding: '8px' }}>{lead.email || '—'}</td>
                  <td style={{ padding: '8px' }}>
                    {lead.archived_at ? new Date(lead.archived_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '8px' }}>{lead.archive_reason || '—'}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleRestore(lead.id)}
                      disabled={restoring === lead.id}
                      style={{
                        padding: '4px 12px',
                        background: '#38a169',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: restoring === lead.id ? 'not-allowed' : 'pointer',
                        fontSize: '0.85em',
                      }}
                    >
                      {restoring === lead.id ? 'Restoring...' : 'Restore'}
                    </button>
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
