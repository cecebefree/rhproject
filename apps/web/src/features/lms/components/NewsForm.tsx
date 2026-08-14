// NewsForm — create/edit news in school_desk.news
// Row 68: Form with title, content, publish toggle

import { useState, useEffect } from 'react';
import { insertNews, updateNews } from '../services/supabase';
import type { News } from '../services/supabase';

interface NewsFormProps {
  tenantId: string;
  userId: string;
  news?: News | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function NewsForm({
  tenantId,
  userId,
  news,
  onSuccess,
  onCancel,
}: NewsFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [publish, setPublish] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (news) {
      setTitle(news.title);
      setContent(news.content);
      setPublish(news.published_at !== null);
    }
  }, [news]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (news) {
      const { error: updateError } = await updateNews(news.id, {
        title,
        content,
        publish,
      });

      setLoading(false);

      if (updateError) {
        setError(updateError.message);
      } else {
        onSuccess?.();
      }
    } else {
      const { error: insertError } = await insertNews({
        tenant_id: tenantId,
        title,
        content,
        created_by: userId,
        publish,
      });

      setLoading(false);

      if (insertError) {
        setError(insertError.message);
      } else {
        setTitle('');
        setContent('');
        setPublish(false);
        onSuccess?.();
      }
    }
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>{news ? 'Edit News' : 'Create News'}</h2>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Content *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={10}
            style={styles.textarea}
          />
        </div>

        <div style={styles.toggleRow}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
              style={styles.checkbox}
            />
            Publish immediately
          </label>
          <span style={styles.toggleHint}>
            {publish ? 'Will be visible to all teachers' : 'Saved as draft'}
          </span>
        </div>

        <div style={styles.buttonRow}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={styles.cancelButton}
            >
              Cancel
            </button>
          )}
          <button type="submit" disabled={loading} style={styles.submitButton}>
            {loading
              ? 'Saving...'
              : news
                ? 'Update News'
                : publish
                  ? 'Publish News'
                  : 'Save Draft'}
          </button>
        </div>
      </form>
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
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 16px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  textarea: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#4a5568',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
  },
  toggleHint: {
    fontSize: '12px',
    color: '#718096',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  cancelButton: {
    padding: '8px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    fontSize: '14px',
    color: '#4a5568',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '8px 16px',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
  },
};
