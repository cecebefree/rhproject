// Report Card screen — Row 35 wiring
// READ-ONLY per Ruling 2: office loads cards, learner sees only
// status='visible' cards. No INSERT/UPDATE/DELETE on this screen.
// Source: frozen Design 8 (08-report-card-tab.md)

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../src/components/EmptyState';
import { supabase } from '../../src/services/supabase';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

interface ReportCard {
  id: string;
  term: string;
  subject: string;
  grade: string | null;
  status: string;
  visible_at: string | null;
}

function SectionLoader() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Loading…</Text>
    </View>
  );
}

function SectionError({ message }: { message: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Unable to load</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export default function ReportCardScreen() {
  const [cards, setCards] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCards() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setError('Not authenticated');
          setLoading(false);
        }
        return;
      }

      // READ-ONLY: learner sees only their own visible report cards.
      // RLS (rc_learner_select_visible) restricts to student_id = auth.uid()
      // AND status = 'visible'. Explicit eq() filter is defense-in-depth.
      const { data, error: cardsErr } = await supabase
        .from('report_cards')
        .select('id, term, subject, grade, status, visible_at')
        .eq('student_id', user.id)
        .eq('status', 'visible')
        .order('visible_at', { ascending: false });

      if (!cancelled) {
        if (cardsErr) setError(cardsErr.message);
        else setCards(data ?? []);
        setLoading(false);
      }
    }

    loadCards();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Report Cards</Text>
        <Text style={styles.subtitle}>Released cards only</Text>
      </View>

      {loading ? (
        <SectionLoader />
      ) : error ? (
        <SectionError message={error} />
      ) : cards.length === 0 ? (
        <EmptyState
          title="No report cards available yet"
          message="Your report cards will appear here once released"
        />
      ) : (
        cards.map((card) => (
          <View key={card.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardSubject}>{card.subject}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{card.status}</Text>
              </View>
            </View>
            <Text style={styles.cardTerm}>{card.term}</Text>
            <Text style={styles.cardGrade}>Grade: {card.grade ?? '—'}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  title: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
  },
  subtitle: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginTop: spacing.xs,
  },
  section: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  sectionTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
  card: {
    backgroundColor: '#fff',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardSubject: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  statusBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
  },
  cardTerm: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    marginBottom: spacing.xs,
  },
  cardGrade: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.bold,
    color: colors.navy,
  },
});
