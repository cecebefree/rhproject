// PaymentsScreen — Dedicated payments tab
// Live data: office_desk.payments, office_desk.invoices, public.payments

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingState } from '../../src/components/LoadingState';
import {
  fetchInvoices,
  fetchPayments,
  fetchPaymentsSummary,
  type PaymentsSummary,
} from '../../src/lib/paymentsClient';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import type { InvoiceRecord, PaymentRecord } from '../../src/types/profile';
import { INVOICE_STATUS_COLORS, PAYMENT_STATUS_COLORS } from '../../src/types/profile';

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ═══════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════

export default function PaymentsScreen() {
  const router = useRouter();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'payments' | 'invoices'>('payments');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [payResult, invResult, sumResult] = await Promise.all([
      fetchPayments(),
      fetchInvoices(),
      fetchPaymentsSummary(),
    ]);

    if (payResult.error && invResult.error) {
      setError(payResult.error || invResult.error);
    }

    setPayments(payResult.data);
    setInvoices(invResult.data);
    setSummary(sumResult.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePaymentPress = useCallback(
    (payment: PaymentRecord) => {
      if (payment.invoice_number) {
        // Navigate to invoice detail if we have an invoice link
        const invoice = invoices.find((inv) => inv.invoice_number === payment.invoice_number);
        if (invoice) {
          router.push(`/(tabs)/invoice-detail?id=${invoice.id}`);
        }
      }
    },
    [invoices, router]
  );

  const handleInvoicePress = useCallback(
    (invoice: InvoiceRecord) => {
      router.push(`/(tabs)/invoice-detail?id=${invoice.id}`);
    },
    [router]
  );

  // ─── LOADING ───
  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centered}>
        <LoadingState />
      </ScrollView>
    );
  }

  // ─── ERROR ───
  if (error && payments.length === 0 && invoices.length === 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centered}>
        <EmptyState title="Unable to load payments" message={error} />
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── RENDER ───
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Payments</Text>
        <Text style={styles.subtitle}>Billing & Invoices</Text>
      </View>

      {/* Summary Cards */}
      {summary && summary.outstandingBalance > 0 && (
        <TouchableOpacity
          style={styles.payOnlineButton}
          onPress={() => Linking.openURL('https://redhouse.co.za/payments')}
        >
          <Text style={styles.payOnlineText}>Pay Online — R{summary.outstandingBalance.toFixed(2)}</Text>
        </TouchableOpacity>
      )}

      {summary && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#D1FAE5' }]}>
            <Text style={styles.summaryLabel}>Paid</Text>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>
              {formatCurrency(summary.totalPaid, summary.currency)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={[styles.summaryValue, { color: '#D97706' }]}>
              {formatCurrency(summary.totalPending, summary.currency)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FEE2E2' }]}>
            <Text style={styles.summaryLabel}>Outstanding</Text>
            <Text style={[styles.summaryValue, { color: '#C8281E' }]}>
              {formatCurrency(summary.outstandingBalance, summary.currency)}
            </Text>
          </View>
        </View>
      )}

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'payments' && styles.tabActive]}
          onPress={() => setTab('payments')}
        >
          <Text style={[styles.tabText, tab === 'payments' && styles.tabTextActive]}>
            Payments
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'invoices' && styles.tabActive]}
          onPress={() => setTab('invoices')}
        >
          <Text style={[styles.tabText, tab === 'invoices' && styles.tabTextActive]}>
            Invoices
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {tab === 'payments' ? (
        <PaymentsTab
          payments={payments}
          onPaymentPress={handlePaymentPress}
        />
      ) : (
        <InvoicesTab
          invoices={invoices}
          onInvoicePress={handleInvoicePress}
        />
      )}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════
// PAYMENTS TAB
// ═══════════════════════════════════════════════════════════

function PaymentsTab({
  payments,
  onPaymentPress,
}: {
  payments: PaymentRecord[];
  onPaymentPress: (payment: PaymentRecord) => void;
}) {
  if (payments.length === 0) {
    return <EmptyState title="No payments" message="Payment history will appear here" />;
  }

  return (
    <View style={styles.cardSection}>
      <View style={[styles.sectionHeader, { backgroundColor: colors.navy }]}>
        <Text style={styles.sectionHeaderText}>PAYMENT HISTORY</Text>
      </View>
      {payments.map((p) => (
        <TouchableOpacity
          key={p.id}
          style={styles.paymentRow}
          activeOpacity={0.7}
          onPress={() => onPaymentPress(p)}
        >
          <View style={styles.paymentLeft}>
            <Text style={styles.paymentDesc} numberOfLines={1}>
              {p.description ?? p.invoice_number ?? 'Payment'}
            </Text>
            <Text style={styles.paymentDate}>{formatDate(p.paid_at ?? p.created_at)}</Text>
            {p.payment_method && (
              <Text style={styles.paymentMethod}>{p.payment_method}</Text>
            )}
          </View>
          <View style={styles.paymentRight}>
            <Text style={styles.paymentAmount}>{formatCurrency(p.amount, p.currency)}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: PAYMENT_STATUS_COLORS[p.status] ?? colors.charcoalLight },
              ]}
            >
              <Text style={styles.statusText}>{p.status}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// INVOICES TAB
// ═══════════════════════════════════════════════════════════

function InvoicesTab({
  invoices,
  onInvoicePress,
}: {
  invoices: InvoiceRecord[];
  onInvoicePress: (invoice: InvoiceRecord) => void;
}) {
  if (invoices.length === 0) {
    return <EmptyState title="No invoices" message="Invoices will appear here" />;
  }

  return (
    <View style={styles.cardSection}>
      <View style={[styles.sectionHeader, { backgroundColor: colors.burgundy }]}>
        <Text style={styles.sectionHeaderText}>INVOICES</Text>
      </View>
      {invoices.map((inv) => (
        <TouchableOpacity
          key={inv.id}
          style={styles.invoiceRow}
          activeOpacity={0.7}
          onPress={() => onInvoicePress(inv)}
        >
          <View style={styles.invoiceLeft}>
            <Text style={styles.invoiceNumber}>{inv.invoice_number ?? 'Invoice'}</Text>
            {inv.description && (
              <Text style={styles.invoiceDesc} numberOfLines={1}>{inv.description}</Text>
            )}
            {inv.due_date && (
              <Text style={styles.invoiceDue}>Due: {formatDate(inv.due_date)}</Text>
            )}
          </View>
          <View style={styles.invoiceRight}>
            <Text style={styles.invoiceAmount}>{formatCurrency(inv.amount, inv.currency)}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: INVOICE_STATUS_COLORS[inv.status] ?? colors.charcoalLight },
              ]}
            >
              <Text style={styles.statusText}>{inv.status}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: colors.navy,
  },
  subtitle: {
    fontSize: 12,
    color: colors.charcoalLight,
    marginTop: 2,
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.medium,
    color: colors.charcoal,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.navy,
  },
  tabText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    color: colors.charcoalLight,
  },
  tabTextActive: {
    color: '#fff',
  },

  // Section
  cardSection: {
    marginHorizontal: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionHeaderText: {
    color: '#fff',
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '400',
    textTransform: 'uppercase',
  },

  // Payment rows
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  paymentLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentDesc: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.charcoal,
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
  },
  paymentMethod: {
    fontSize: typography.sizes.badge,
    color: colors.charcoalLight,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: 2,
  },

  // Invoice rows
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  invoiceLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  invoiceNumber: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: 2,
  },
  invoiceDesc: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginBottom: 2,
  },
  invoiceDue: {
    fontSize: typography.sizes.badge,
    color: colors.charcoalLight,
  },
  invoiceAmount: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: 2,
  },

  // Shared
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.sizes.badge,
    color: '#fff',
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: colors.burgundy,
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  payOnlineButton: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.burgundy,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  payOnlineText: {
    color: '#fff',
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
});
