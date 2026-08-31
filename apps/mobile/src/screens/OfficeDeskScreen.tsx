// src/screens/OfficeDeskScreen.tsx
// Office Desk — family accounts, invoices, financial records for staff/admin
// Converted from stitch office_desk_absolute_structural_parity
// RLS: office_desk.family_accounts + office_desk.invoices, tenant-scoped

import { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LoadingState } from '../components/LoadingState';
import { useInvoices, type InvoiceWithFamily } from '../hooks/useStaffData';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const BRAND_NAVY = '#273946';
const BRAND_RED = '#C8281E';
const BRAND_CREAM = '#F8F7F4';
const BRAND_GOLD = '#E8A020';
const TEXT_MUTED = '#54626C';
const SURFACE_DIM = '#dbdad7';

const TABS = ['Invoices', 'Debit Orders', 'Contracts'] as const;
type TabKey = (typeof TABS)[number];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft: { bg: SURFACE_DIM + '30', color: TEXT_MUTED },
  issued: { bg: BRAND_NAVY + '12', color: BRAND_NAVY },
  paid: { bg: '#27ae60' + '18', color: '#27ae60' },
  overdue: { bg: BRAND_RED + '18', color: BRAND_RED },
  void: { bg: TEXT_MUTED + '18', color: TEXT_MUTED },
};

function formatCurrency(amount: number, currency = 'ZAR'): string {
  return `${currency === 'ZAR' ? 'R' : '$'}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (status === 'overdue') return true;
  if (!dueDate || status === 'paid' || status === 'void') return false;
  return new Date(dueDate) < new Date();
}

function InvoiceRow({ invoice }: { invoice: InvoiceWithFamily }) {
  const overdue = isOverdue(invoice.due_date, invoice.status);
  const statusKey = overdue ? 'overdue' : invoice.status;
  const statusStyle = STATUS_STYLES[statusKey] ?? STATUS_STYLES.draft;

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.accountName}>{invoice.family_code || 'Unknown Account'}</Text>
        <Text style={styles.invoiceMeta}>
          {invoice.invoice_number} · {formatDate(invoice.issued_date)}
        </Text>
      </View>
      <View style={styles.rowCenter}>
        <Text style={[styles.dueDate, overdue && styles.dueDateOverdue]}>
          {formatDate(invoice.due_date)}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.amount}>{formatCurrency(invoice.amount, invoice.currency)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.color }]}>
            {(statusKey ?? 'draft').toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function OfficeDeskScreen() {
  const { invoices, loading, error, refresh } = useInvoices();
  const [activeTab, setActiveTab] = useState<TabKey>('Invoices');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Stats
  const total = invoices.length;
  const paid = invoices.filter((i) => i.status === 'paid').length;
  const overdue = invoices.filter((i) => isOverdue(i.due_date, i.status)).length;
  const draft = invoices.filter((i) => i.status === 'draft').length;

  if (loading) {
    return <LoadingState />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Office Desk</Text>
          <Text style={styles.subtitle}>
            Manage family accounts, invoices, and financial records.
          </Text>
        </View>
        <TouchableOpacity style={styles.newButton}>
          <Text style={styles.newButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <FlatList
        horizontal
        data={TABS as unknown as TabKey[]}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tab, activeTab === item && styles.tabActive]}
            onPress={() => setActiveTab(item)}
          >
            <Text style={[styles.tabText, activeTab === item && styles.tabTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
      />

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          Total: {total} | Paid: {paid} | Overdue: {overdue} | Draft: {draft}
        </Text>
      </View>

      {/* Invoices List */}
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <InvoiceRow invoice={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCol, { flex: 1.5 }]}>Family / Account</Text>
            <Text style={[styles.headerCol, { flex: 1 }]}>Due Date</Text>
            <Text style={[styles.headerCol, { flex: 1, textAlign: 'right' }]}>Amount</Text>
            <Text style={[styles.headerCol, { flex: 0.8, textAlign: 'right' }]}>Status</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No Invoices Found</Text>
            <Text style={styles.emptyMessage}>
              {activeTab === 'Invoices'
                ? 'No invoices in the system yet.'
                : `No ${activeTab.toLowerCase()} found.`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_CREAM,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl + spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Georgia',
    color: BRAND_NAVY,
    fontWeight: typography.weights.medium,
  },
  subtitle: {
    fontSize: typography.sizes.body,
    color: TEXT_MUTED,
    marginTop: spacing.xs,
  },
  newButton: {
    backgroundColor: BRAND_NAVY,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  newButtonText: {
    color: '#fff',
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.5,
  },
  tabBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: BRAND_GOLD,
  },
  tabText: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: typography.weights.medium,
  },
  tabTextActive: {
    color: BRAND_NAVY,
  },
  errorBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
  },
  errorText: {
    color: BRAND_RED,
    fontSize: typography.sizes.caption,
  },
  summaryBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryText: {
    fontSize: typography.sizes.badge,
    color: TEXT_MUTED,
    letterSpacing: 0.3,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACE_DIM,
    backgroundColor: BRAND_CREAM,
  },
  headerCol: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: TEXT_MUTED,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACE_DIM + '60',
    backgroundColor: '#fff',
  },
  rowLeft: {
    flex: 1.5,
  },
  accountName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: BRAND_NAVY,
  },
  invoiceMeta: {
    fontSize: typography.sizes.caption,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  rowCenter: {
    flex: 1,
  },
  dueDate: {
    fontSize: typography.sizes.caption,
    color: TEXT_MUTED,
  },
  dueDateOverdue: {
    color: BRAND_RED,
    fontWeight: typography.weights.medium,
  },
  rowRight: {
    flex: 1.8,
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  amount: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: BRAND_NAVY,
    fontFamily: 'Georgia',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.5,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: BRAND_NAVY,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: typography.sizes.body,
    color: TEXT_MUTED,
    textAlign: 'center',
  },
});
