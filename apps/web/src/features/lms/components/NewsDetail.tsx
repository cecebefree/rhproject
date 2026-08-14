// NewsDetail — full article view with author, dates, edit button
// Row 68: Shows full news content, author info, publish date

import { useEffect, useState } from 'react';
import { getNewsById } from '../services/supabase';
import type { News } from '../services/supabase';

interface NewsDetailProps {
  newsId: string;
  currentUserId: string;
  onBack?: () => void;
  onEdit?: (news: News) => void;
}

export function NewsDetail({
  newsId,
  currentUserId,
  onBack,
  onEdit,
}: NewsDetailProps) {
  const [news, setNews] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await getNewsById(newsId);

      if (!cancelled) {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setNews(data);
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [newsId]);

  if (loading) {
    return <div style={styles.loading}>Loading article...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  if (!news) {
    return <div style={styles.error}>Article not found</div>;
  }

  const isAuthor = news.created_by === currentUserId;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <button type="button" onClick={onBack} style={styles.backButton}>
          ← Back to News
        </button>
        {isAuthor && onEdit && (
          <button
            type="button"
            onClick={() => onEdit(news)}
            style={styles.editButton}
          >
            Edit
          </button>
        )}
      </div>

      <article style={styles.article}>
        <h1 style={styles.title}>{news.title}</h1>

        <div style={styles.meta}>
          <span style={styles.metaItem}>
            {news.published_at
              ? `Published ${new Date(news.published_at).toLocaleDateString()}`
              : 'Draft'}
          </span>
          <span style={styles.metaItem}>
            Last updated {new Date(news.updated_at).toLocaleDateString()}
          </span>
        </div>

        <div style={styles.content}>
          {news.content.split('\n').map((paragraph, i) => (
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
  editButton: {
    padding: '6px 12px',
    border: '1px solid #3182ce',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#3182ce',
  },
  article: {
    maxWidth: '700px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2d3748',
    margin: '0 0 16px 0',
    lineHeight: '1.3',
  },
  meta: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  metaItem: {
    fontSize: '13px',
    color: '#718096',
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
