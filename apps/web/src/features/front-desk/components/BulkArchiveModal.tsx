import { useState } from 'react';
import {
  ARCHIVE_REASONS,
  ARCHIVE_REASON_LABELS,
  type ArchiveReason,
  bulkArchiveLeads,
} from '../services/supabase';
import { useResponsive } from '../../../components/MobileNav';

interface BulkArchiveModalProps {
  leadIds: string[];
  onComplete: (result: { archived: number; skipped: number }) => void;
  onCancel: () => void;
}

export function BulkArchiveModal({ leadIds, onComplete, onCancel }: BulkArchiveModalProps) {
  const [reason, setReason] = useState<ArchiveReason>('other');
  const [notes, setNotes] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ archived: number; skipped: number } | null>(null);
  const { isMobile } = useResponsive();

  const handleArchive = async () => {
    setArchiving(true);
    setError(null);

    const { data, error: archiveError } = await bulkArchiveLeads(
      leadIds,
      reason,
      notes || undefined
    );

    if (archiveError) {
      setError(archiveError.message);
      setArchiving(false);
      return;
    }

    if (data) {
      setResult(data);
      if (data.archived > 0) {
        onComplete(data);
      }
    }
    setArchiving(false);
  };

  if (result) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <h3 style={{ marginTop: 0 }}>Archive Complete</h3>
          <div style={{ marginBottom: '16px' }}>
            <p>
              <strong>{result.archived}</strong> lead{result.archived !== 1 ? 's' : ''} archived
              successfully.
            </p>
            {result.skipped > 0 && (
              <p style={{ color: '#718096' }}>{result.skipped} already archived (skipped).</p>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                background: '#3182ce',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginTop: 0 }}>
          Archive {leadIds.length} Lead{leadIds.length !== 1 ? 's' : ''}
        </h3>
        <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '16px' }}>
          This will hide the selected leads from the active list. You can restore them later from
          the Archived tab.
        </p>

        {error && (
          <div
            style={{
              color: 'red',
              padding: '8px',
              background: '#fee',
              borderRadius: '4px',
              marginBottom: '12px',
            }}
          >
            {error}
          </div>
        )}

        <label style={{ display: 'block', marginBottom: '12px' }}>
          Reason
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as ArchiveReason)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          >
            {ARCHIVE_REASONS.map((r) => (
              <option key={r} value={r}>
                {ARCHIVE_REASON_LABELS[r]}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: '16px' }}>
          Notes (optional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional context for this archive..."
            style={{ width: '100%', padding: '8px', marginTop: '4px', boxSizing: 'border-box' }}
          />
        </label>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={archiving}
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
            type="button"
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
            {archiving
              ? 'Archiving...'
              : `Archive ${leadIds.length} Lead${leadIds.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
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
  padding: '16px',
};

const modalStyle: React.CSSProperties = {
  background: 'white',
  padding: '24px',
  borderRadius: '8px',
  maxWidth: '400px',
  width: '100%',
  maxHeight: '90vh',
  overflow: 'auto',
};
