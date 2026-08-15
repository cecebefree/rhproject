// ActivityTimeline — Display chronological activity log for a contact

import { useState, useEffect, useCallback } from 'react';
import {
  selectActivityLog,
  subscribeToContactActivity,
  type ContactActivityLogEntry,
} from '../services/contactNotes';

interface ActivityTimelineProps {
  contactId: string;
  deskId: string;
}

const ACTION_ICONS: Record<string, string> = {
  note_created: '📝',
  note_updated: '✏️',
  note_deleted: '🗑️',
  contact_updated: '👤',
  contact_archived: '📦',
};

const ACTION_LABELS: Record<string, string> = {
  note_created: 'Note added',
  note_updated: 'Note updated',
  note_deleted: 'Note deleted',
  contact_updated: 'Contact updated',
  contact_archived: 'Contact archived',
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function getActionSummary(entry: ContactActivityLogEntry): string {
  const data = entry.action_data as Record<string, unknown> | null;
  if (!data) return '';

  if (entry.action === 'note_created' && typeof data.preview === 'string') {
    return data.preview.length > 100 ? data.preview.slice(0, 100) + '...' : data.preview;
  }

  return '';
}

export function ActivityTimeline({ contactId, deskId }: ActivityTimelineProps) {
  const [entries, setEntries] = useState<ContactActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchEntries = useCallback(async (offset = 0) => {
    const { data, error: fetchError } = await selectActivityLog(contactId, 30, offset);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    if (offset === 0) {
      setEntries(data || []);
    } else {
      setEntries((prev) => [...prev, ...(data || [])]);
    }
    setHasMore((data?.length || 0) === 30);
    setIsLoading(false);
  }, [contactId]);

  // Initial fetch
  useEffect(() => {
    fetchEntries(0);
  }, [fetchEntries]);

  // Real-time subscription
  useEffect(() => {
    const channel = subscribeToContactActivity(contactId, (payload) => {
      if (payload.eventType === 'INSERT') {
        setEntries((prev) => [payload.new as ContactActivityLogEntry, ...prev]);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [contactId]);

  const loadMore = () => {
    fetchEntries(entries.length);
  };

  if (isLoading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>Loading activity...</div>;
  }

  if (error) {
    return <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px' }}>{error}</div>;
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#718096' }}>
        <p style={{ fontSize: '14px', margin: 0 }}>No activity yet</p>
        <p style={{ fontSize: '13px', margin: '4px 0 0', color: '#a0aec0' }}>Changes to this contact will appear here</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          style={{
            display: 'flex',
            gap: '12px',
            padding: '12px 0',
            borderBottom: idx < entries.length - 1 ? '1px solid #edf2f7' : 'none',
          }}
        >
          {/* Icon */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#f7fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            flexShrink: 0,
          }}>
            {ACTION_ICONS[entry.action] || '📋'}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', color: '#2d3748', fontWeight: '500' }}>
                {ACTION_LABELS[entry.action] || entry.action}
              </span>
              <span style={{ fontSize: '12px', color: '#a0aec0', flexShrink: 0, marginLeft: '8px' }}>
                {formatRelativeTime(entry.created_at)}
              </span>
            </div>
            {getActionSummary(entry) && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#718096', lineHeight: '1.4' }}>
                {getActionSummary(entry)}
              </p>
            )}
          </div>
        </div>
      ))}

      {/* Load more */}
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          style={{
            padding: '8px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            backgroundColor: 'white',
            color: '#3182ce',
            fontSize: '13px',
            cursor: 'pointer',
            marginTop: '8px',
          }}
        >
          Load more activity
        </button>
      )}
    </div>
  );
}
