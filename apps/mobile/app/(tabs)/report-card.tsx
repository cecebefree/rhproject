// Report Card screen — Design 8
// Status chain: draft → released → visible
// Released-only visibility per R18

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../src/components/EmptyState';
import { SEED_CARDS } from '../../src/seed/cards';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function ReportCardScreen() {
  const visibleCards = SEED_CARDS.filter((c) => c.status === 'visible');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Report Cards</Text>
        <Text style={styles.subtitle}>Released cards only</Text>
      </View>

      {visibleCards.length > 0 ? (
        visibleCards.map((card) => (
          <View key={card.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardSubject}>{card.subject}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{card.status}</Text>
              </View>
            </View>
            <Text style={styles.cardTerm}>{card.term}</Text>
            <Text style={styles.cardGrade}>Grade: {card.grade}</Text>
          </View>
        ))
      ) : (
        <EmptyState
          title="No report cards available yet"
          message="Your report cards will appear here once released"
        />
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
