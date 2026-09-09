// GroupInfoScreen — Chat adjustments
// Group info view: member list, category badge, lead, count, media-dial
// WIRED to real DB — group_conversations via groupChatClient

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Badge } from '../../src/components/Badge';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingState } from '../../src/components/LoadingState';
import { fetchGroupInfo, type GroupInfo } from '../../src/lib/groupChatClient';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function GroupInfoScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaEnabled, setMediaEnabled] = useState(false);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchGroupInfo(groupId);
        if (!cancelled) setGroup(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load group info');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [groupId]);

  if (loading) return <LoadingState />;
  if (error) return <EmptyState title="Error" message={error} />;
  if (!group) return <EmptyState title="Group not found" message="This group may have been removed." />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{group.name}</Text>
        <Badge category={group.category as any} />
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Group Lead</Text>
          <Text style={styles.value}>{group.lead}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Members</Text>
          <Text style={styles.value}>{group.memberCount}</Text>
        </View>
      </View>

      {group.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{group.description}</Text>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Media types</Text>
          <Text style={styles.value}>{mediaEnabled ? 'All media' : 'Text + emoji'}</Text>
        </View>
        <Switch
          value={mediaEnabled}
          onValueChange={setMediaEnabled}
          trackColor={{ false: colors.charcoalLight, true: colors.burgundy }}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members</Text>
        <View style={styles.memberRow}>
          <Text style={styles.memberName}>{group.lead}</Text>
          <View style={styles.leadBadge}>
            <Text style={styles.leadText}>Lead</Text>
          </View>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
  },
  section: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
  },
  value: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
  sectionTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  memberName: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
  },
  leadBadge: {
    backgroundColor: colors.burgundy,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leadText: {
    color: '#fff',
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.medium,
  },
  description: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    lineHeight: 20,
  },
});
