// src/screens/FrontDeskScreen.tsx
// Front Desk — leads pipeline for staff/admin
// Converted from stitch front_desk_refined_lead_management_sub_tab_sync
// RLS: contacts table (office_desk schema), tenant-scoped

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
import { useLeads, type Lead } from '../hooks/useStaffData';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const BRAND_NAVY = '#273946';
const BRAND_RED = '#C8281E';
const BRAND_CREAM = '#F8F7F4';
const BRAND_GOLD = '#E8A020';
const TEXT_MUTED = '#54626C';
const SURFACE_DIM = '#dbdad7';

const TABS = ['All Leads', 'Call', 'Email', 'Contact Form', 'Enrollment Call'] as const;
type TabKey = (typeof TABS)[number];

const STATUS_COLORS: Record<string, string> = {
  new: BRAND_GOLD,
  contacted: BRAND_NAVY,
  qualified: '#27ae60',
  unqualified: TEXT_MUTED,
  enrolled: '#27ae60',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function LeadRow({ lead }: { lead: Lead }) {
  const statusColor = STATUS_COLORS[lead.status ?? ''] ?? TEXT_MUTED;
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.leadName}>{lead.name || 'Unnamed Lead'}</Text>
        <Text style={styles.leadMeta}>
          {lead.category ?? 'General'} · {formatDate(lead.created_at)}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {(lead.status ?? 'new').toUpperCase()}
          </Text>
        </View>
        {lead.tags && lead.tags.length > 0 && (
          <Text style={styles.tagText}>{lead.tags[0]}</Text>
        )}
      </View>
    </View>
  );
}

export function FrontDeskScreen() {
  const { leads, loading, error, refresh } = useLeads();
  const [activeTab, setActiveTab] = useState<TabKey>('All Leads');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const filteredLeads =
    activeTab === 'All Leads'
      ? leads
      : leads.filter(
          (l) =>
            l.category?.toLowerCase() === activeTab.toLowerCase() ||
            l.name?.toLowerCase().includes(activeTab.toLowerCase())
        );

  if (loading) {
    return <LoadingState />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Front Desk</Text>
          <Text style={styles.subtitle}>Pipeline management for incoming student inquiries.</Text>
        </View>
        <TouchableOpacity style={styles.newLeadButton}>
          <Text style={styles.newLeadButtonText}>+ New Lead</Text>
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

      {/* Leads List */}
      <FlatList
        data={filteredLeads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LeadRow lead={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No Leads Found</Text>
            <Text style={styles.emptyMessage}>
              {activeTab === 'All Leads'
                ? 'No leads in the pipeline yet.'
                : `No ${activeTab.toLowerCase()} leads found.`}
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
  newLeadButton: {
    backgroundColor: BRAND_NAVY,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  newLeadButtonText: {
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
  list: {
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACE_DIM + '60',
    backgroundColor: '#fff',
  },
  rowLeft: {
    flex: 1,
  },
  leadName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: BRAND_NAVY,
  },
  leadMeta: {
    fontSize: typography.sizes.caption,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
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
  tagText: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: typography.weights.regular,
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
