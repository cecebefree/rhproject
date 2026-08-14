// BroadcastList — table of sent broadcasts with group filter and real-time
// Row 69: List sorted by sent_at desc, filter by group

import { useEffect, useState } from 'react';
import {
  selectBroadcasts,
  subscribeToBroadcasts,
  supabaseUntyped,
} from '../services/supabase';
import type { BroadcastWithGroup } from '../services/supabase';

interface BroadcastListProps {
  tenantId: string;
  onSelect?: (broadcast: BroadcastWithGroup) => void;
}

interface Group {
  id: string;
  category: string;
}

export function BroadcastList({ tenantId, onSelect }: BroadcastListProps) {
  const [broadcasts, setBroadcasts] = useState<BroadcastWithGroup[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const [broadcastsResult, groupsResult] = await Promise.all([
        selectBroadcasts(tenantId, { groupId: groupFilter || undefined }),
        supabaseUntyped
          .from('school_desk.conversations')
          .select('id, category')
          .order('category'),
      ]);

      if (!cancelled) {
        if (broadcastsResult.error) {
          setError(broadcastsResult.error.message);
        } else {
          setBroadcasts(broadcastsResult.data ?? []);
        }
        if (groupsResult.data) {
          setGroups(groupsResult.data);
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tenantId, groupFilter]);

  useEffect(() => {
    const channel = subscribeToBroadcasts((payload) => {
      if (payload.eventType === 'INSERT') {
        setBroadcasts((prev) => [payload.new as BroadcastWithGroup, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setBroadcasts((prev) =>
          prev.map((b) =>
            b.id === payload.new.id ? (payload.new as BroadcastWithGroup) : b,
          ),
        );
      } else if (payload.eventType === 'DELETE') {
        setBroadcasts((prev) => prev.filter((b) => b.id !== payload.old?.id));
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [tenantId]);

  function getGroupName(broadcast: BroadcastWithGroup): string {
    if (broadcast.conversations?.category) {
      return broadcast.conversations.category;
    }
    return 'Unknown Group';
  }

  function getSenderName(broadcast: BroadcastWithGroup): string {
    if (broadcast.profiles?.name) {
      return broadcast.profiles.name;
    }
    return 'Unknown';
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h2 style={styles.title}>Broadcasts</h2>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.category}
            </option>
          ))}
        </select>
      </div>

      {loading && <div style={styles.loading}>Loading...</div>}
      {error && <div style={styles.error}>{error}</div>}

      {!loading && broadcasts.length === 0 && (
        <div style={styles.empty}>No broadcasts found</div>
      )}

      {!loading && broadcasts.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Title</th>
              <th style={styles.th}>Group</th>
              <th style={styles.th}>Sender</th>
              <th style={styles.th}>Sent At</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {broadcasts.map((broadcast) => (
              <tr
                key={broadcast.id}
                style={styles.tr}
                onClick={() => onSelect?.(broadcast)}
              >
                <td style={styles.td}>{broadcast.title}</td>
                <td style={styles.td}>{getGroupName(broadcast)}</td>
                <td style={styles.td}>{getSenderName(broadcast)}</td>
                <td style={styles.td}>
                  {broadcast.sent_at
                    ? new Date(broadcast.sent_at).toLocaleDateString()
                    : '—'}
                </td>
                <td style={styles.td}>
                  <span
                    style={
                      broadcast.sent_at ? styles.statusSent : styles.statusDraft
                    }
                  >
                    {broadcast.sent_at ? 'Sent' : 'Draft'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '150px',
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
    marginBottom: '16px',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#718096',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 8px',
    borderBottom: '2px solid #e2e8f0',
    fontSize: '12px',
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase',
  },
  tr: {
    cursor: 'pointer',
  },
  td: {
    padding: '12px 8px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#4a5568',
  },
  statusSent: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusDraft: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
};
