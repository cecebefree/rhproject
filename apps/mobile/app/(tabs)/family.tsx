// Family variant — Design 6
// Per-child tabs, ledger — WIRED to real DB

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingState } from '../../src/components/LoadingState';
import {
  fetchFamilyChildren,
  fetchFamilyInvoices,
  type ChildProfile,
  type InvoiceRecord,
} from '../../src/lib/familyClient';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function FamilyScreen() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [childrenData, invoicesData] = await Promise.all([
        fetchFamilyChildren(),
        fetchFamilyInvoices(),
      ]);
      setChildren(childrenData);
      setInvoices(invoicesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load family data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <EmptyState message={error} />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Family</Text>
        <Text style={styles.subtitle}>Linked children</Text>
      </View>

      {children.length === 0 ? (
        <EmptyState message="No children linked to your account yet." />
      ) : (
        children.map((child) => (
          <View key={child.id} style={styles.childSection}>
            <Text style={styles.childName}>{child.name}</Text>
            <Text style={styles.childRole}>
              {child.grade || 'No grade'} · {child.curriculum || 'No curriculum'}
            </Text>

            {/* Ledger */}
            <View style={styles.ledger}>
              <Text style={styles.ledgerTitle}>Account</Text>
              {invoices.length === 0 ? (
                <Text style={styles.ledgerNote}>No invoices yet</Text>
              ) : (
                invoices.slice(0, 3).map((inv) => (
                  <View key={inv.id} style={styles.ledgerRow}>
                    <Text style={styles.ledgerLabel}>{inv.description || 'Invoice'}</Text>
                    <Text style={styles.ledgerValue}>
                      R {inv.amount.toLocaleString()} — {inv.status}
                    </Text>
                  </View>
                ))
              )}
            </View>
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
    color: colors.charcoalLight,
    fontStyle: 'italic',
  },
});
