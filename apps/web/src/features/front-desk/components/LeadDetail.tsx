import { useEffect, useRef, useState } from 'react';
import { useRbac } from '../../../hooks/useRbac';
import {
  ARCHIVE_REASONS,
  ARCHIVE_REASON_LABELS,
  PIPELINE_STAGES,
  PIPELINE_STAGE_COLORS,
  type ArchiveReason,
  type CallLog,
  type EmailLog,
  type Lead,
  type PipelineStage,
  type PipelineType,
  archiveLead,
  archiveLeadToPipeline,
  advanceLeadPipeline,
  callLead,
  getLeadById,
  moveLeadToPipeline,
  selectCallLogs,
  selectEmailLogs,
  subscribeToCallLogs,
  subscribeToEmailLogs,
  updateLead,
} from '../services/supabase';
import { EmailComposer } from './EmailComposer';

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

  // Pipeline state
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [pipelineAction, setPipelineAction] = useState<'move' | 'advance' | 'archive'>('move');
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineType>('general_enquiry');
  const [selectedStage, setSelectedStage] = useState<PipelineStage>('new');
  const [pipelineNotes, setPipelineNotes] = useState('');
  const [processingPipeline, setProcessingPipeline] = useState(false);
  const [archiveSentiment, setArchiveSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  const [archiveEnquiryType, setArchiveEnquiryType] = useState('');
  const [archiveOutcome, setArchiveOutcome] = useState('');

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

  // Pipeline handlers
  const handleMoveToPipeline = async () => {
    if (!lead) return;
    setProcessingPipeline(true);
    setError(null);

    const { error: moveError } = await moveLeadToPipeline(lead.id, selectedPipeline, pipelineNotes || undefined);
    if (moveError) {
      setError(moveError.message);
    } else {
      // Refresh lead
      const { data } = await getLeadById(lead.id);
      if (data) setLead(data);
      setShowPipelineModal(false);
      setPipelineNotes('');
    }
    setProcessingPipeline(false);
  };

  const handleAdvancePipeline = async () => {
    if (!lead) return;
    setProcessingPipeline(true);
    setError(null);

    const { error: advanceError } = await advanceLeadPipeline(lead.id, selectedStage, pipelineNotes || undefined);
    if (advanceError) {
      setError(advanceError.message);
    } else {
      const { data } = await getLeadById(lead.id);
      if (data) setLead(data);
      setShowPipelineModal(false);
      setPipelineNotes('');
    }
    setProcessingPipeline(false);
  };

  const handleArchiveToPipeline = async () => {
    if (!lead) return;
    setProcessingPipeline(true);
    setError(null);

    const { error: archiveErr } = await archiveLeadToPipeline(
      lead.id,
      archiveReason === 'enrolled' ? 'enrolled' : archiveReason === 'withdrawn' ? 'withdrawn' : 'other',
      archiveSentiment,
      archiveEnquiryType || undefined,
      archiveOutcome || undefined
    );
    if (archiveErr) {
      setError(archiveErr.message);
    } else {
      onArchived?.();
      onBack();
    }
    setProcessingPipeline(false);
  };

  const openPipelineModal = (action: 'move' | 'advance' | 'archive') => {
    setPipelineAction(action);
    if (lead) {
      setSelectedPipeline(lead.pipeline || 'general_enquiry');
      setSelectedStage(lead.pipeline_stage || 'new');
    }
    setShowPipelineModal(true);
  };

  // Get next valid stages for current pipeline
  const getNextStages = (): { value: PipelineStage; label: string }[] => {
    if (!lead) return [];
    const stages = PIPELINE_STAGES[lead.pipeline] || [];
    const currentIdx = stages.findIndex(s => s.value === lead.pipeline_stage);
    // Return stages after current
    return stages.slice(currentIdx + 1);
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
        <button type="button" onClick={onBack} style={{ padding: '4px 8px' }}>
          &larr; Back
        </button>
        {lead.archived_at && (
          <span
            style={{
              padding: '4px 8px',
              background: '#fff3e0',
              borderRadius: '4px',
              fontSize: '0.85em',
            }}
          >
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
        <label htmlFor="lead-detail-name">
          Name
        </label>
        <input
          id="lead-detail-name"
          ref={nameRef}
          type="text"
          value={lead.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />

        <label htmlFor="lead-detail-company">
          Company
        </label>
        <input
          id="lead-detail-company"
          type="text"
          value={lead.company || ''}
          onChange={(e) => handleChange('company', e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />

        <label htmlFor="lead-detail-email">
          Email
        </label>
        <input
          id="lead-detail-email"
          type="email"
          value={lead.email || ''}
          onChange={(e) => handleChange('email', e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />

        <label htmlFor="lead-detail-phone">
          Phone
        </label>
        <input
          id="lead-detail-phone"
          type="tel"
          value={lead.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />

        <label htmlFor="lead-detail-source">
          Source
        </label>
        <input
          id="lead-detail-source"
          type="text"
          value={lead.source || ''}
          onChange={(e) => handleChange('source', e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />

        <label htmlFor="lead-detail-status">
          Status
        </label>
        <select
          id="lead-detail-status"
          value={lead.status}
          onChange={(e) => handleChange('status', e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        >
          <option value="enquiry">Enquiry</option>
          <option value="qualified">Qualified</option>
          <option value="invoiced">Invoiced</option>
          <option value="handed_off">Handed Off</option>
        </select>

        <label htmlFor="lead-detail-notes">
          Notes
        </label>
        <textarea
          id="lead-detail-notes"
          value={lead.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
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
          <button type="button"
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
          <button type="button"
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
          <button type="button"
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
          <button type="button"
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

      {/* Pipeline Section */}
      {!lead.archived_at && (
        <div style={{
          borderTop: '1px solid #e2e8f0',
          paddingTop: '16px',
          background: '#F8F7F4',
          borderRadius: '8px',
          padding: '16px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1A242B', marginBottom: '12px', marginTop: 0 }}>
            Pipeline
          </h3>

          {/* Current pipeline status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              color: '#54626C',
              letterSpacing: '0.05em',
            }}>
              {lead.pipeline?.replace('_', ' ') || 'General Enquiry'}
            </span>
            <span style={{ color: '#CBD5E0' }}>→</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: PIPELINE_STAGE_COLORS[lead.pipeline_stage]?.bg || '#F3F4F6',
              color: PIPELINE_STAGE_COLORS[lead.pipeline_stage]?.text || '#6B7280',
            }}>
              {lead.pipeline_stage?.replace('_', ' ') || 'New'}
            </span>
          </div>

          {/* Pipeline action buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {lead.pipeline === 'general_enquiry' && (
              <>
                <button type="button"
                  onClick={() => openPipelineModal('move')}
                  style={{
                    padding: '6px 12px',
                    background: '#273946',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Move to Registration
                </button>
                <button type="button"
                  onClick={() => openPipelineModal('move')}
                  style={{
                    padding: '6px 12px',
                    background: '#273946',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Move to Career
                </button>
              </>
            )}

            {lead.pipeline === 'registration' && (
              <>
                {lead.pipeline_stage !== 'handed_off' && lead.pipeline_stage !== 'archived' && (
                  <button type="button"
                    onClick={() => openPipelineModal('advance')}
                    style={{
                      padding: '6px 12px',
                      background: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Advance to {getNextStages()[0]?.label || 'Next Stage'}
                  </button>
                )}
                {lead.pipeline_stage === 'fee_captured' && (
                  <button type="button"
                    onClick={() => {
                      setSelectedStage('handed_off');
                      openPipelineModal('advance');
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#D97706',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Hand Off to School Desk
                  </button>
                )}
              </>
            )}

            {lead.pipeline === 'career' && (
              <>
                {lead.pipeline_stage !== 'hired' && lead.pipeline_stage !== 'rejected' && lead.pipeline_stage !== 'archived' && (
                  <button type="button"
                    onClick={() => openPipelineModal('advance')}
                    style={{
                      padding: '6px 12px',
                      background: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Advance to {getNextStages()[0]?.label || 'Next Stage'}
                  </button>
                )}
                {(lead.pipeline_stage === 'hired' || lead.pipeline_stage === 'rejected') && (
                  <button type="button"
                    onClick={() => openPipelineModal('archive')}
                    style={{
                      padding: '6px 12px',
                      background: '#6B7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Archive for AI Analysis
                  </button>
                )}
              </>
            )}

            {/* Archive for AI - available on any non-archived lead */}
            <button type="button"
              onClick={() => openPipelineModal('archive')}
              style={{
                padding: '6px 12px',
                background: '#9CA3AF',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Archive for AI
            </button>
          </div>
        </div>
      )}

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
                <th style={{ textAlign: 'left', padding: '8px 4px', color: '#718096' }}>
                  Duration
                </th>
                <th style={{ textAlign: 'left', padding: '8px 4px', color: '#718096' }}>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {callLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f7fafc' }}>
                  <td style={{ padding: '8px 4px' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
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

            <label htmlFor="archive-reason" style={{ display: 'block', marginBottom: '16px' }}>
              Reason
            </label>
            <select
              id="archive-reason"
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

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button"
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
              <button type="button"
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

      {/* Pipeline Modal */}
      {showPipelineModal && (
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
              maxWidth: '440px',
              width: '100%',
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: '16px', color: '#1A242B' }}>
              {pipelineAction === 'move' && 'Move to Pipeline'}
              {pipelineAction === 'advance' && 'Advance Pipeline Stage'}
              {pipelineAction === 'archive' && 'Archive for AI Analysis'}
            </h3>

            {/* Move to pipeline: select pipeline type */}
            {pipelineAction === 'move' && (
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="pipeline-select" style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#54626C', marginBottom: '4px' }}>
                  Select Pipeline
                </label>
                <select
                  id="pipeline-select"
                  value={selectedPipeline}
                  onChange={(e) => setSelectedPipeline(e.target.value as PipelineType)}
                  style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                >
                  <option value="general_enquiry">General Enquiry</option>
                  <option value="registration">Registration</option>
                  <option value="career">Career</option>
                </select>
              </div>
            )}

            {/* Advance pipeline: select stage */}
            {pipelineAction === 'advance' && (
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="stage-select" style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#54626C', marginBottom: '4px' }}>
                  Move to Stage
                </label>
                <select
                  id="stage-select"
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value as PipelineStage)}
                  style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                >
                  {getNextStages().map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Archive: sentiment + enquiry type + outcome */}
            {pipelineAction === 'archive' && (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <label htmlFor="archive-sentiment" style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#54626C', marginBottom: '4px' }}>
                    Overall Sentiment
                  </label>
                  <select
                    id="archive-sentiment"
                    value={archiveSentiment}
                    onChange={(e) => setArchiveSentiment(e.target.value as 'positive' | 'neutral' | 'negative')}
                    style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                  >
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label htmlFor="archive-enquiry-type" style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#54626C', marginBottom: '4px' }}>
                    Enquiry Type
                  </label>
                  <select
                    id="archive-enquiry-type"
                    value={archiveEnquiryType}
                    onChange={(e) => setArchiveEnquiryType(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                  >
                    <option value="">Select...</option>
                    <option value="curriculum">Curriculum</option>
                    <option value="pricing">Pricing</option>
                    <option value="general">General</option>
                    <option value="technical">Technical</option>
                    <option value="complaint">Complaint</option>
                  </select>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label htmlFor="archive-outcome" style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#54626C', marginBottom: '4px' }}>
                    Outcome Summary
                  </label>
                  <input
                    id="archive-outcome"
                    type="text"
                    value={archiveOutcome}
                    onChange={(e) => setArchiveOutcome(e.target.value)}
                    placeholder="e.g. Enrolled, Withdrew, No response..."
                    style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                  />
                </div>
              </>
            )}

            {/* Notes (always shown) */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="pipeline-notes" style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#54626C', marginBottom: '4px' }}>
                Notes (optional)
              </label>
              <textarea
                id="pipeline-notes"
                value={pipelineNotes}
                onChange={(e) => setPipelineNotes(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '8px', fontSize: '14px' }}
              />
            </div>

            {error && (
              <div style={{ padding: '8px', background: '#FEE', borderRadius: '4px', fontSize: '13px', color: '#C8281E', marginBottom: '12px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button"
                onClick={() => {
                  setShowPipelineModal(false);
                  setPipelineNotes('');
                  setError(null);
                }}
                style={{
                  padding: '8px 16px',
                  background: '#eee',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button type="button"
                onClick={
                  pipelineAction === 'move' ? handleMoveToPipeline :
                  pipelineAction === 'advance' ? handleAdvancePipeline :
                  handleArchiveToPipeline
                }
                disabled={processingPipeline}
                style={{
                  padding: '8px 16px',
                  background: pipelineAction === 'archive' ? '#6B7280' : '#273946',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processingPipeline ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                }}
              >
                {processingPipeline ? 'Processing...' :
                  pipelineAction === 'move' ? 'Move Lead' :
                  pipelineAction === 'advance' ? 'Advance Stage' :
                  'Archive for AI'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
