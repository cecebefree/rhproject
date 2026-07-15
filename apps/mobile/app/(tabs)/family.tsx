// Family variant — Design 6
// Per-child tabs, ledger (PLANNED — seed only)

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SEED_USER } from '../../src/seed/user';
import { SEED_GROUPS } from '../../src/seed/groups';
import { GroupCard } from '../../src/components/GroupCard';
import { EmptyState } from '../../src/components/EmptyState';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function FamilyScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Family</Text>
        <Text style={styles.subtitle}>Linked children</Text>
      </View>

      {/* Child tab */}
      <View style={styles.childSection}>
        <Text style={styles.childName}>{SEED_USER.name}</Text>
        <Text style={styles.childRole}>{SEED_USER.role} · {SEED_USER.curriculum}</Text>

        {/* Ledger — PLANNED, seed only */}
        <View style={styles.ledger}>
          <Text style={styles.ledgerTitle}>Account</Text>
          <View style={styles.ledgerRow}>
            <Text style={styles.ledgerLabel}>Invoice</Text>
            <Text style={styles.ledgerValue}>INV-2026-001 (sample)</Text>
          </View>
          <View style={styles.ledgerRow}>
            <Text style={styles.ledgerLabel}>Amount</Text>
            <Text style={styles.ledgerValue}>R 12,500 (sample)</Text>
          </View>
          <View style={styles.ledgerRow}>
            <Text style={styles.ledgerLabel}>Payment Status</Text>
            <Text style={styles.ledgerValue}>Pending (sample)</Text>
          </View>
          <Text style={styles.ledgerNote}>Coming soon — full invoice tracking in next phase</Text>
        </View>

        {/* Groups */}
        <Text style={styles.sectionTitle}>Groups</Text>
        {SEED_GROUPS.map((group) => (
          <GroupCard
            key={group.id}
            name={group.name}
            category={group.category}
            lead={group.lead}
          />
        ))}
      </View>
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
  childSection: {
    padding: spacing.md,
  },
  childName: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  childRole: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    marginBottom: spacing.md,
  },
  ledger: {
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
    marginBottom: spacing.md,
  },
  ledgerTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  ledgerLabel: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
  ledgerValue: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
  },
  ledgerNote: {
    fontSize: typography.sizes.caption,
    color: colors.champagneDark,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
});
