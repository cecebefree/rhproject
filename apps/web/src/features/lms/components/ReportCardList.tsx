// ReportCardList — View report cards and release via EF
// SELECTs via rc_office_select (office/admin can see all statuses in tenant)
// Releases via release-report-card EF (row 25)
// Source: AO-002-safeguarding-pipeline.md §2.3

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';

interface ReportCard {
  id: string;
  student_id: string;
  term: string;
  subject: string;
  grade: string | null;
  status: string;
  created_at: string;
  profiles: { name: string } | null;
}

interface ReportCardListProps {
  tenantId: string | null;
  refreshKey: number;
}

export function ReportCardList({ tenantId, refreshKey }: ReportCardListProps) {
  const [cards, setCards] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState<string | null>(null);
  const refreshKeyRef = useRef(refreshKey);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('report_cards')
      .select('id, student_id, term, subject, grade, status, created_at, profiles!student_id(name)')
      .eq('tenant_id', tenantId ?? '')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCards(data as ReportCard[]);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    refreshKeyRef.current = refreshKey;
    fetchCards();
  }, [fetchCards, refreshKey]);

  const handleRelease = async (cardId: string) => {
    setReleasing(cardId);
    setError(null);

    const { error: fnError } = await supabase.functions.invoke('release-report-card', {
      body: { card_id: cardId },
    });

    if (fnError) {
      setError(fnError.message);
    } else {
      await fetchCards();
    }

    setReleasing(null);
  };

  if (loading) {
    return <div style={styles.loading}>Loading report cards...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  if (cards.length === 0) {
    return (
      <div style={styles.empty}>
        <h3>No report cards</h3>
        <p>No report cards have been created yet. Use "Enter Report Card" to create one.</p>
      </div>
    );
  }

  return (
    <div style={styles.listContainer}>
      <h2 style={styles.listTitle}>Report Cards ({cards.length})</h2>
      <div style={styles.cardList}>
        {cards.map((card) => (
          <div key={card.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.studentName}>{card.profiles?.name ?? 'Unknown Student'}</span>
              <span
                style={{
                  ...styles.statusBadge,
                  backgroundColor:
                    card.status === 'draft'
                      ? '#fefcbf'
                      : card.status === 'released'
                        ? '#c6f6d5'
                        : '#bee3f8',
                  color:
                    card.status === 'draft'
                      ? '#744210'
                      : card.status === 'released'
                        ? '#22543d'
                        : '#2a4365',
                }}
              >
                {card.status}
              </span>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.cardField}>
                <span style={styles.fieldLabel}>Term:</span> {card.term}
              </div>
              <div style={styles.cardField}>
                <span style={styles.fieldLabel}>Subject:</span> {card.subject}
              </div>
              <div style={styles.cardField}>
                <span style={styles.fieldLabel}>Grade:</span> {card.grade ?? '—'}
              </div>
            </div>
            {card.status === 'draft' && (
              <div style={styles.cardFooter}>
                <button
                  type="button"
                  onClick={() => handleRelease(card.id)}
                  disabled={releasing === card.id}
                  style={styles.releaseButton}
                >
                  {releasing === card.id ? 'Releasing...' : 'Release'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  listTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0',
    color: '#1a202c',
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  studentName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a202c',
  },
  statusBadge: {
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '14px',
    color: '#4a5568',
  },
  cardField: {
    display: 'flex',
    gap: '8px',
  },
  fieldLabel: {
    fontWeight: '500',
    color: '#718096',
  },
  cardFooter: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
  },
  releaseButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#38a169',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: '#718096',
  },
  error: {
    padding: '16px',
    backgroundColor: '#fed7d7',
    color: '#742a2a',
    borderRadius: '6px',
    fontSize: '14px',
  },
  empty: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
};
