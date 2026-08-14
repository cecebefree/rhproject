import { useState, useEffect } from 'react';
import { getLeadById, type Lead } from '../services/supabase';
import { StatusDropdown } from './StatusDropdown';
import { ArchiveIndicator } from './ArchiveIndicator';

interface LeadDetailProps {
  leadId: string;
  onBack: () => void;
}

export function LeadDetail({ leadId, onBack }: LeadDetailProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLead() {
      const { data, error: fetchError } = await getLeadById(leadId);
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setLead(data);
      }
      setLoading(false);
    }
    loadLead();
  }, [leadId]);

  const handleStatusChange = (newStatus: Lead['status']) => {
    if (lead) {
      setLead({ ...lead, status: newStatus });
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
  if (!lead) return <div>Lead not found</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', padding: '4px 8px' }}>
        ← Back to List
      </button>

      <h2>Lead Detail</h2>

      <ArchiveIndicator archivedAt={lead.archived_at} archiveReason={lead.archive_reason} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div><strong>Name:</strong> {lead.name || '—'}</div>
        <div><strong>Email:</strong> {lead.email || '—'}</div>
        <div><strong>Phone:</strong> {lead.phone || '—'}</div>
        <div><strong>Notes:</strong> {lead.notes || '—'}</div>
        <div><strong>Created:</strong> {new Date(lead.created_at).toLocaleString()}</div>
        <div><strong>Updated:</strong> {new Date(lead.updated_at).toLocaleString()}</div>
      </div>

      <StatusDropdown
        leadId={lead.id}
        currentStatus={lead.status}
        onStatusChange={handleStatusChange}
      />

      {lead.callback_scheduled_at && (
        <div style={{ padding: '8px', background: '#e3f2fd', borderRadius: '4px' }}>
          <strong>Callback Scheduled:</strong> {new Date(lead.callback_scheduled_at).toLocaleString()}
          {lead.callback_notes && <div style={{ fontSize: '0.9em' }}>{lead.callback_notes}</div>}
        </div>
      )}
    </div>
  );
}
