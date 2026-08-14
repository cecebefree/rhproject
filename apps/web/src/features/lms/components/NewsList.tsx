// NewsList — card grid of published news with search and real-time
// Row 68: List sorted by published_at desc, click to detail

import { useEffect, useState } from 'react';
import { selectNews, subscribeToNews } from '../services/supabase';
import type { News } from '../services/supabase';

interface NewsListProps {
  tenantId: string;
  onSelect?: (news: News) => void;
}

export function NewsList({ tenantId, onSelect }: NewsListProps) {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await selectNews(
        tenantId,
        search || undefined,
      );

      if (!cancelled) {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setNews(data ?? []);
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tenantId, search]);

  useEffect(() => {
    const channel = subscribeToNews((payload) => {
      if (payload.eventType === 'INSERT') {
        setNews((prev) => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setNews((prev) =>
          prev.map((n) => (n.id === payload.new.id ? payload.new : n)),
        );
      } else if (payload.eventType === 'DELETE') {
        setNews((prev) => prev.filter((n) => n.id !== payload.old?.id));
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [tenantId]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>News</h2>
        <input
          type="text"
          placeholder="Search news..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {loading && <div style={styles.loading}>Loading...</div>}
      {error && <div style={styles.error}>{error}</div>}

      {!loading && news.length === 0 && (
        <div style={styles.empty}>No news articles found</div>
      )}

      {!loading && news.length > 0 && (
        <div style={styles.grid}>
          {news.map((item) => (
            <div
              key={item.id}
              style={styles.card}
              onClick={() => onSelect?.(item)}
            >
              <h3 style={styles.cardTitle}>{item.title}</h3>
              <p style={styles.cardExcerpt}>
                {item.content.substring(0, 120)}
                {item.content.length > 120 ? '...' : ''}
              </p>
              <div style={styles.cardMeta}>
                <span style={styles.cardDate}>
                  {item.published_at
                    ? new Date(item.published_at).toLocaleDateString()
                    : 'Draft'}
                </span>
                {!item.published_at && <span style={styles.draftBadge}>Draft</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
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
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0',
  },
  searchInput: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    width: '250px',
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
    padding: '48px',
    textAlign: 'center',
    color: '#718096',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  card: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 8px 0',
  },
  cardExcerpt: {
    fontSize: '14px',
    color: '#718096',
    margin: '0 0 12px 0',
    lineHeight: '1.5',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardDate: {
    fontSize: '12px',
    color: '#a0aec0',
  },
  draftBadge: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
};
