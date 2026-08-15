import { useState, useEffect, useRef } from 'react';
import {
  getLeadById,
  updateLead,
  archiveLead,
  selectCallLogs,
  selectEmailLogs,
  subscribeToCallLogs,
  subscribeToEmailLogs,
  callLead,
  type Lead,
  type CallLog,
  type EmailLog,
  type ArchiveReason,
  ARCHIVE_REASONS,
  ARCHIVE_REASON_LABELS,
} from '../services/supabase';
import { EmailComposer } from './EmailComposer';
import { useRbac } from '../../../hooks/useRbac';

interface LeadDetailProps {
  leadId: string;
  deskId: string;
  userId: string;
  onBack: () => void;
  onArchived?: () => void;
}

export function LeadDetail({ leadId, deskId, userId, onBack, onArchived }: LeadDetailProps) {
  const { hasPermission } = useRbac({ userId, deskId });
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState<ArchiveReason>('other');
  const [archiving, setArchiving] = useState(false);

  // Call/email state
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [calling, setCalling] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLead() {
      const { data, error: fetchError } = await getLeadById(leadId);
      if (!cancelled) {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setLead(data);
        }
        setLoading(false);
      }
    }

    async function loadLogs() {
      const [callResult, emailResult] = await Promise.all([
        selectCallLogs(leadId),
        selectEmailLogs(leadId),
      ]);
      if (!cancelled) {
        if (callResult.data) setCallLogs(callResult.data);
        if (emailResult.data) setEmailLogs(emailResult.data);
      }
    }

    loadLead();
    loadLogs();

    // Real-time subscriptions
    const callSub = subscribeToCallLogs(leadId, (payload) => {
      if (payload.eventType === 'INSERT') {
        setCallLogs((prev) => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setCallLogs((prev) => prev.map((c) => (c.id === payload.new.id ? payload.new : c)));
      }
    });

    const emailSub = subscribeToEmailLogs(leadId, (payload) => {
      if (payload.eventType === 'INSERT') {
        setEmailLogs((prev) => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setEmailLogs((prev) => prev.map((e) => (e.id === payload.new.id ? payload.new : e)));
      }
    });

    return () => {
      cancelled = true;
      callSub.unsubscribe();
      emailSub.unsubscribe();
    };
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

  const handleCall = async () => {
    if (!lead?.phone) return;
    setCalling(true);
    setError(null);

    const { data, error: callError } = await callLead(lead.id, lead.phone);

    if (callError) {
      setError(callError.message || 'Failed to initiate call');
    } else if (data?.success === false) {
      setError(data.error || 'Failed to initiate call');
    }
    setCalling(false);
  };

  const outcomeColors: Record<string, string> = {
    initiated: '#e2e8f0',
    answered: '#d1fae5',
    missed: '#fee2e2',
    declined: '#fef3c7',
    voicemail: '#dbeafe',
    failed: '#f5f5f5',
  };

  const emailStatusColors: Record<string, string> = {
    draft: '#e2e8f0',
    sent: '#d1fae5',
    failed: '#fee2e2',
  };

  if (loading) return <div style={{ padding: '24px' }}>Loading...</div>;
  if (error && !lead) return <div style={{ padding: '24px', color: 'red' }}>Error: {error}</div>;
  if (!lead) return <div style={{ padding: '24px' }}>Lead not found</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{ padding: '4px 8px' }}>
          &larr; Back
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

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {hasPermission('leads.edit') && (
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
        )}

        {!lead.archived_at && hasPermission('leads.archive') && (
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
          <button
            onClick={handleCall}
            disabled={calling}
            style={{
              padding: '8px 16px',
              background: '#38a169',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: calling ? 'not-allowed' : 'pointer',
            }}
          >
            {calling ? 'Calling...' : 'Call'}
          </button>
        )}

        {lead.email && (
          <button
            onClick={() => setShowEmailComposer(true)}
            style={{
              padding: '8px 16px',
              background: '#805ad5',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Email
          </button>
        )}
      </div>

      {/* Call History */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748', marginBottom: '8px' }}>
          Call History
        </h3>
        {callLogs.length === 0 ? (
          <div style={{ color: '#718096', fontSize: '14px' }}>No calls logged</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px', color: '#718096' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '8px 4px', color: '#718096' }}>Duration</th>
                <th style={{ textAlign: 'left', padding: '8px 4px', color: '#718096' }}>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {callLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f7fafc' }}>
                  <td style={{ padding: '8px 4px' }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td style={{ padding: '8px 4px' }}>
                    {log.duration_seconds != null ? `${log.duration_seconds}s` : '—'}
                  </td>
                  <td style={{ padding: '8px 4px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: outcomeColors[log.outcome] || '#e2e8f0',
                      }}
                    >
                      {log.outcome}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Email History */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748', marginBottom: '8px' }}>
          Email History
        </h3>
        {emailLogs.length === 0 ? (
          <div style={{ color: '#718096', fontSize: '14px' }}>No emails sent</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px', color: '#718096' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '8px 4px', color: '#718096' }}>Subject</th>
                <th style={{ textAlign: 'left', padding: '8px 4px', color: '#718096' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {emailLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f7fafc' }}>
                  <td style={{ padding: '8px 4px' }}>
                    {log.sent_at ? new Date(log.sent_at).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '8px 4px' }}>{log.subject}</td>
                  <td style={{ padding: '8px 4px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: emailStatusColors[log.status] || '#e2e8f0',
                      }}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Archive Modal */}
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

      {/* Email Composer Modal */}
      {showEmailComposer && lead.email && (
        <EmailComposer
          leadId={lead.id}
          recipientEmail={lead.email}
          leadName={lead.name || 'Lead'}
          onSent={() => {
            setShowEmailComposer(false);
            // Refresh email logs
            selectEmailLogs(lead.id).then(({ data }) => {
              if (data) setEmailLogs(data);
            });
          }}
          onCancel={() => setShowEmailComposer(false)}
        />
      )}
    </div>
  );
}
