// BroadcastDetail — full broadcast message with group, sender, dates
// Row 69: Shows complete broadcast content

import { useEffect, useState } from 'react';
import { getBroadcastById } from '../services/supabase';
import type { BroadcastWithGroup } from '../services/supabase';

interface BroadcastDetailProps {
  broadcastId: string;
  onBack?: () => void;
}

export function BroadcastDetail({ broadcastId, onBack }: BroadcastDetailProps) {
  const [broadcast, setBroadcast] = useState<BroadcastWithGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await getBroadcastById(broadcastId);

      if (!cancelled) {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setBroadcast(data);
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [broadcastId]);

  if (loading) {
    return <div style={styles.loading}>Loading broadcast...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  if (!broadcast) {
    return <div style={styles.error}>Broadcast not found</div>;
  }

  const groupName = broadcast.conversations?.category ?? 'Unknown Group';
  const senderName = broadcast.profiles?.name ?? 'Unknown';

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <button type="button" onClick={onBack} style={styles.backButton}>
          ← Back to Broadcasts
        </button>
        <span
          style={broadcast.sent_at ? styles.statusSent : styles.statusDraft}
        >
          {broadcast.sent_at ? 'Sent' : 'Draft'}
        </span>
      </div>

      <article style={styles.article}>
        <h1 style={styles.title}>{broadcast.title}</h1>

        <div style={styles.meta}>
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>Group</span>
            <span style={styles.metaValue}>{groupName}</span>
          </div>
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>Sender</span>
            <span style={styles.metaValue}>{senderName}</span>
          </div>
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>Created</span>
            <span style={styles.metaValue}>
              {new Date(broadcast.created_at).toLocaleDateString()}
            </span>
          </div>
          {broadcast.sent_at && (
            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>Sent</span>
              <span style={styles.metaValue}>
                {new Date(broadcast.sent_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <div style={styles.content}>
          {broadcast.message.split('\n').map((paragraph, i) => (
            <p key={`paragraph-${i.toString()}`} style={styles.paragraph}>
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  backButton: {
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#4a5568',
  },
  statusSent: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusDraft: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  article: {
    maxWidth: '700px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2d3748',
    margin: '0 0 24px 0',
    lineHeight: '1.3',
  },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  metaLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase',
    minWidth: '60px',
  },
  metaValue: {
    fontSize: '14px',
    color: '#2d3748',
  },
  content: {
    fontSize: '16px',
    color: '#4a5568',
    lineHeight: '1.7',
  },
  paragraph: {
    margin: '0 0 16px 0',
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: '#718096',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '14px',
  },
};
