import { useState, useEffect, useRef } from 'react';
import {
  getLeadById,
  updateLead,
  archiveLead,
  type Lead,
  type ArchiveReason,
  ARCHIVE_REASONS,
  ARCHIVE_REASON_LABELS,
} from '../services/supabase';

interface LeadDetailProps {
  leadId: string;
  onBack: () => void;
  onArchived?: () => void;
}

export function LeadDetail({ leadId, onBack, onArchived }: LeadDetailProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState<ArchiveReason>('other');
  const [archiving, setArchiving] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!loading && nameRef.current) {
      nameRef.current.focus();
    }
  }, [loading]);

  const handleChange = (field: keyof Lead, value: string) => {
    if (lead) {
      setLead({ ...lead, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    setError(null);

    const { error: saveError } = await updateLead(lead.id, {
      name: lead.name || undefined,
      company: lead.company || undefined,
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      source: lead.source || undefined,
      notes: lead.notes || undefined,
      status: lead.status,
    });

    if (saveError) {
      setError(saveError.message);
    }
    setSaving(false);
  };

  const handleArchive = async () => {
    if (!lead) return;
    setArchiving(true);
    setError(null);

    const { error: archiveError } = await archiveLead(lead.id, archiveReason);
    if (archiveError) {
      setError(archiveError.message);
    } else {
      onArchived?.();
      onBack();
    }
    setArchiving(false);
  };

  if (loading) return <div style={{ padding: '24px' }}>Loading...</div>;
  if (error && !lead) return <div style={{ padding: '24px', color: 'red' }}>Error: {error}</div>;
  if (!lead) return <div style={{ padding: '24px' }}>Lead not found</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{ padding: '4px 8px' }}>
          ← Back
        </button>
        {lead.archived_at && (
          <span style={{ padding: '4px 8px', background: '#fff3e0', borderRadius: '4px', fontSize: '0.85em' }}>
            Archived
          </span>
        )}
      </div>

      <h2>Lead Detail</h2>

      {error && (
        <div style={{ color: 'red', padding: '8px', background: '#fee', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label>
          Name
          <input
            ref={nameRef}
            type="text"
            value={lead.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </label>

        <label>
          Company
          <input
            type="text"
            value={lead.company || ''}
            onChange={(e) => handleChange('company', e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={lead.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </label>

        <label>
          Phone
          <input
            type="tel"
            value={lead.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </label>

        <label>
          Source
          <input
            type="text"
            value={lead.source || ''}
            onChange={(e) => handleChange('source', e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </label>

        <label>
          Status
          <select
            value={lead.status}
            onChange={(e) => handleChange('status', e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          >
            <option value="enquiry">Enquiry</option>
            <option value="qualified">Qualified</option>
            <option value="invoiced">Invoiced</option>
            <option value="handed_off">Handed Off</option>
          </select>
        </label>

        <label>
          Notes
          <textarea
            value={lead.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </label>
      </div>

      {lead.callback_scheduled_at && (
        <div style={{ padding: '8px', background: '#e3f2fd', borderRadius: '4px' }}>
          <strong>Callback Scheduled:</strong>{' '}
          {new Date(lead.callback_scheduled_at).toLocaleString()}
          {lead.callback_notes && <div style={{ fontSize: '0.9em' }}>{lead.callback_notes}</div>}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '8px 16px',
            background: '#3182ce',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>

        {!lead.archived_at && (
          <button
            onClick={() => setShowArchiveModal(true)}
            style={{
              padding: '8px 16px',
              background: '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Archive
          </button>
        )}

        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            style={{
              padding: '8px 16px',
              background: '#38a169',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              textDecoration: 'none',
            }}
          >
            Call
          </a>
        )}

        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            style={{
              padding: '8px 16px',
              background: '#805ad5',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              textDecoration: 'none',
            }}
          >
            Email
          </a>
        )}
      </div>

      {showArchiveModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '360px',
              width: '100%',
            }}
          >
            <h3 style={{ marginTop: 0 }}>Archive Lead</h3>
            <p style={{ fontSize: '0.9em', color: '#666' }}>
              Archive <strong>{lead.name || 'this lead'}</strong>?
            </p>

            <label style={{ display: 'block', marginBottom: '16px' }}>
              Reason
              <select
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value as ArchiveReason)}
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              >
                {ARCHIVE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {ARCHIVE_REASON_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowArchiveModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#eee',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={archiving}
                style={{
                  padding: '8px 16px',
                  background: '#e53e3e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: archiving ? 'not-allowed' : 'pointer',
                }}
              >
                {archiving ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
