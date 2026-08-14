// ReportCardList — List of teacher's report cards with search/filter
// Row 71: Teacher sees only own cards (created_by = auth.uid())

import { useEffect, useState } from 'react';
import {
  selectReportCards,
  subscribeToReportCards,
  type ReportCardWithRelations,
} from '../services/supabase';
import { StatusBadge } from './StatusBadge';

interface ReportCardListProps {
  tenantId: string;
  userId: string;
  onSelect: (cardId: string) => void;
}

export function ReportCardList({ tenantId, userId, onSelect }: ReportCardListProps) {
  const [cards, setCards] = useState<ReportCardWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await selectReportCards(tenantId, {
        createdBy: userId,
      });

      if (!cancelled) {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setCards(data ?? []);
        }
        setLoading(false);
      }
    }

    load();
    const sub = subscribeToReportCards((payload) => {
      if (payload.eventType === 'INSERT') {
        setCards((prev) => [payload.new as ReportCardWithRelations, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setCards((prev) =>
          prev.map((c) =>
            c.id === payload.new.id
              ? (payload.new as ReportCardWithRelations)
              : c,
          ),
        );
      } else if (payload.eventType === 'DELETE') {
        setCards((prev) => prev.filter((c) => c.id !== payload.old?.id));
      }
    });

    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, [tenantId, userId]);

  const filtered = cards.filter(
    (c) =>
      c.term?.toLowerCase().includes(search.toLowerCase()) ||
      c.subject?.toLowerCase().includes(search.toLowerCase()) ||
      c.profiles?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <div style={styles.loading}>Loading report cards...</div>;
  if (error) return <div style={styles.error}>{error}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Report Cards</h2>
        <span style={styles.count}>{cards.length} total</span>
      </div>

      <input
        type="text"
        placeholder="Search by term, subject, or student..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      {filtered.length === 0 ? (
        <div style={styles.empty}>
          {cards.length === 0
            ? 'No report cards yet. Create one to get started.'
            : 'No results match your search.'}
        </div>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <div style={styles.colStudent}>Student</div>
            <div style={styles.colTerm}>Term</div>
            <div style={styles.colSubject}>Subject</div>
            <div style={styles.colGrade}>Grade</div>
            <div style={styles.colStatus}>Status</div>
          </div>
          {filtered.map((card) => (
            <div
              key={card.id}
              style={styles.tableRow}
              onClick={() => onSelect(card.id)}
            >
              <div style={styles.colStudent}>{card.profiles?.name ?? 'Unknown'}</div>
              <div style={styles.colTerm}>{card.term}</div>
              <div style={styles.colSubject}>{card.subject}</div>
              <div style={styles.colGrade}>{card.grade || '—'}</div>
              <div style={styles.colStatus}>
                <StatusBadge status={card.status} />
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
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  count: {
    fontSize: '14px',
    color: '#718096',
  },
  search: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
    boxSizing: 'border-box',
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
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#718096',
    fontSize: '14px',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
  },
  tableHeader: {
    display: 'flex',
    padding: '8px 12px',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: '600',
    fontSize: '12px',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tableRow: {
    display: 'flex',
    padding: '12px',
    borderBottom: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  colStudent: { flex: 2, fontSize: '14px' },
  colTerm: { flex: 1, fontSize: '14px' },
  colSubject: { flex: 1, fontSize: '14px' },
  colGrade: { flex: 1, fontSize: '14px' },
  colStatus: { flex: 1, fontSize: '14px' },
};
