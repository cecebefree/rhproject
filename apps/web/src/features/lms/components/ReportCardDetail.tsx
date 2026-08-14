// ReportCardDetail — Full report card view with status, dates, edit button
// Row 71: Full card view for teacher workflow

import { useEffect, useState } from 'react';
import {
  getReportCardById,
  type ReportCardWithRelations,
} from '../services/supabase';
import { StatusBadge } from './StatusBadge';

interface ReportCardDetailProps {
  cardId: string;
  onBack: () => void;
  onEdit?: (cardId: string) => void;
}

export function ReportCardDetail({
  cardId,
  onBack,
  onEdit,
}: ReportCardDetailProps) {
  const [card, setCard] = useState<ReportCardWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await getReportCardById(cardId);
      if (!cancelled) {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setCard(data);
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  if (loading) return <div style={styles.loading}>Loading report card...</div>;
  if (error) return <div style={styles.error}>{error}</div>;
  if (!card) return <div style={styles.error}>Report card not found.</div>;

  const isDraft = card.status === 'draft';

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>
          Back to List
        </button>
        {isDraft && onEdit && (
          <button
            onClick={() => onEdit(card.id)}
            style={styles.editButton}
          >
            Edit
          </button>
        )}
      </div>

      <div style={styles.statusRow}>
        <StatusBadge status={card.status} />
      </div>

      <h2 style={styles.title}>
        {card.profiles?.name ?? 'Student'} — {card.subject}
      </h2>

      <div style={styles.grid}>
        <div style={styles.field}>
          <div style={styles.label}>Student</div>
          <div style={styles.value}>{card.profiles?.name ?? 'Unknown'}</div>
        </div>
        <div style={styles.field}>
          <div style={styles.label}>Term</div>
          <div style={styles.value}>{card.term}</div>
        </div>
        <div style={styles.field}>
          <div style={styles.label}>Subject</div>
          <div style={styles.value}>{card.subject}</div>
        </div>
        <div style={styles.field}>
          <div style={styles.label}>Grade</div>
          <div style={styles.value}>{card.grade || '—'}</div>
        </div>
      </div>

      <div style={styles.datesSection}>
        <h3 style={styles.datesTitle}>Status Timeline</h3>
        <div style={styles.timeline}>
          <div style={styles.timelineItem}>
            <div style={styles.timelineDot} />
            <div>
              <div style={styles.timelineLabel}>Created</div>
              <div style={styles.timelineDate}>
                {new Date(card.created_at).toLocaleString()}
              </div>
            </div>
          </div>
          {card.released_at && (
            <div style={styles.timelineItem}>
              <div style={{ ...styles.timelineDot, backgroundColor: '#3182ce' }} />
              <div>
                <div style={styles.timelineLabel}>Released</div>
                <div style={styles.timelineDate}>
                  {new Date(card.released_at).toLocaleString()}
                </div>
              </div>
            </div>
          )}
          {card.visible_at && (
            <div style={styles.timelineItem}>
              <div style={{ ...styles.timelineDot, backgroundColor: '#38a169' }} />
              <div>
                <div style={styles.timelineLabel}>Visible to Learner</div>
                <div style={styles.timelineDate}>
                  {new Date(card.visible_at).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isDraft && (
        <div style={styles.lockedBanner}>
          This report card has been released and is no longer editable by teachers.
        </div>
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
    marginBottom: '16px',
  },
  backButton: {
    padding: '8px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    fontSize: '14px',
    color: '#4a5568',
    cursor: 'pointer',
  },
  editButton: {
    padding: '8px 16px',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  statusRow: {
    marginBottom: '8px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 24px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  value: {
    fontSize: '16px',
    color: '#2d3748',
  },
  datesSection: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
  },
  datesTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 12px 0',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  timelineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    flexShrink: 0,
  },
  timelineLabel: {
    fontSize: '14px',
    color: '#4a5568',
  },
  timelineDate: {
    fontSize: '12px',
    color: '#718096',
  },
  lockedBanner: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '6px',
    fontSize: '14px',
    textAlign: 'center',
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
