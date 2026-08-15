// ReportCardPreview — Read-only report card view for parents/students
// Row 71: Parent/student preview with download option

import { useEffect, useState } from 'react';
import {
  getReportCardById,
  type ReportCardWithRelations,
} from '../services/supabase';

interface ReportCardPreviewProps {
  cardId: string;
  onBack?: () => void;
}

export function ReportCardPreview({ cardId, onBack }: ReportCardPreviewProps) {
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

  function handleDownload() {
    if (!card) return;

    const lines = [
      'REPORT CARD',
      '='.repeat(50),
      '',
      `Student:  ${card.profiles?.name ?? 'Unknown'}`,
      `Subject:  ${card.subject}`,
      `Term:     ${card.term}`,
      `Grade:    ${card.grade || '--'}`,
      `Status:   ${card.status}`,
      '',
      '-'.repeat(50),
    ];

    if (card.released_at) {
      lines.push(`Released: ${new Date(card.released_at).toLocaleDateString()}`);
    }
    if (card.visible_at) {
      lines.push(`Visible:  ${new Date(card.visible_at).toLocaleDateString()}`);
    }
    lines.push(
      '',
      '='.repeat(50),
      'This is an official report card.',
    );

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-card-${card.subject.replace(/\s+/g, '-').toLowerCase()}-${card.term.replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: '#fef3c7', text: '#92400e' },
    released: { bg: '#dbeafe', text: '#1e40af' },
    visible: { bg: '#d1fae5', text: '#065f46' },
  };

  const statusStyle = statusColors[card.status] ?? { bg: '#e2e8f0', text: '#4a5568' };

  return (
    <div style={styles.card}>
      {onBack && (
        <div style={styles.header}>
          <button onClick={onBack} style={styles.backButton}>
            &larr; Back
          </button>
          <button onClick={handleDownload} style={styles.downloadButton}>
            Download
          </button>
        </div>
      )}

      <div style={styles.statusBadge}>
        <span style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, ...styles.badge }}>
          {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
        </span>
      </div>

      <h2 style={styles.title}>Report Card</h2>

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
          <div style={styles.valueLarge}>{card.grade || '--'}</div>
        </div>
      </div>

      {card.status === 'draft' && (
        <div style={styles.draftNotice}>
          This report card is still being prepared by the teacher.
        </div>
      )}

      {card.released_at && (
        <div style={styles.meta}>
          Released on {new Date(card.released_at).toLocaleDateString()}
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
  downloadButton: {
    padding: '8px 16px',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  statusBadge: {
    marginBottom: '8px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize',
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
    gap: '20px',
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
  valueLarge: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
  },
  draftNotice: {
    padding: '12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '6px',
    fontSize: '14px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  meta: {
    fontSize: '12px',
    color: '#718096',
    textAlign: 'right',
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
