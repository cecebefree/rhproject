// NewsForm — create/edit news in school_desk.news
// Row 68: Form with title, content, publish toggle

import { useEffect, useState } from 'react';
import { insertNews, updateNews } from '../services/supabase';
import type { News, NewsCategory } from '../services/supabase';

const CATEGORIES: NewsCategory[] = ['general_news', 'junior_news', 'senior_news', 'staff_news', 'adult_news'];

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  general_news: 'General News',
  junior_news: 'Junior News',
  senior_news: 'Senior News',
  staff_news: 'Staff News',
  adult_news: 'Adult News',
};

const TARGET_OPTIONS = [
  { value: 'students', label: 'Students' },
  { value: 'parents', label: 'Parents' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'staff', label: 'Staff' },
  { value: 'all', label: 'Everyone' },
];

interface NewsFormProps {
  tenantId: string;
  userId: string;
  news?: News | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function NewsForm({ tenantId, userId, news, onSuccess, onCancel }: NewsFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NewsCategory>('general_news');
  const [targetAudience, setTargetAudience] = useState<string[]>(['all']);
  const [publish, setPublish] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (news) {
      setTitle(news.title);
      setContent(news.content);
      setCategory(news.category || 'general_news');
      setTargetAudience(news.target_audience || ['all']);
      setPublish(news.published_at !== null);
    }
  }, [news]);

  function toggleTarget(value: string) {
    setTargetAudience((prev) => {
      if (value === 'all') return ['all'];
      const filtered = prev.filter((t) => t !== 'all' && t !== value);
      filtered.push(value);
      return filtered.length === 0 ? ['all'] : filtered;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (news) {
      const { error: updateError } = await updateNews(news.id, {
        title,
        content,
        category,
        target_audience: targetAudience,
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
        category,
        target_audience: targetAudience,
        created_by: userId,
        publish,
      });

      setLoading(false);

      if (insertError) {
        setError(insertError.message);
      } else {
        setTitle('');
        setContent('');
        setCategory('general_news');
        setTargetAudience(['all']);
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
          <label htmlFor="news-title" style={styles.label}>Title *</label>
          <input
            id="news-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label htmlFor="news-content" style={styles.label}>Content *</label>
          <textarea
            id="news-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={10}
            style={styles.textarea}
          />
        </div>

        <div style={styles.field}>
          <label htmlFor="news-category" style={styles.label}>Category</label>
          <select
            id="news-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as NewsCategory)}
            style={styles.input}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Target Audience</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {TARGET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleTarget(opt.value)}
                style={{
                  ...styles.chip,
                  ...(targetAudience.includes(opt.value) ? styles.chipActive : {}),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
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
            <button type="button" onClick={onCancel} style={styles.cancelButton}>
              Cancel
            </button>
          )}
          <button type="submit" disabled={loading} style={styles.submitButton}>
            {loading ? 'Saving...' : news ? 'Update News' : publish ? 'Publish News' : 'Save Draft'}
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
  chip: {
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    backgroundColor: 'white',
    fontSize: '13px',
    color: '#4a5568',
    cursor: 'pointer',
  },
  chipActive: {
    backgroundColor: '#3182ce',
    color: 'white',
    borderColor: '#3182ce',
  },
};
