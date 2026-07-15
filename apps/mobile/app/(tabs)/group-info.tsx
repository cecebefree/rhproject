// GroupInfoScreen — Chat adjustments
// Group info view: member list, category badge, lead, count, media-dial

import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { SEED_GROUPS } from '../../src/seed/groups';
import { Badge } from '../../src/components/Badge';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { useState } from 'react';

export default function GroupInfoScreen() {
  const [mediaEnabled, setMediaEnabled] = useState(false);
  const group = SEED_GROUPS[0]; // Default to first group

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{group.name}</Text>
        <Badge category={group.category} />
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

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Media types</Text>
          <Text style={styles.value}>
            {mediaEnabled ? 'All media' : 'Text + emoji'}
          </Text>
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
        <View style={styles.memberRow}>
          <Text style={styles.memberName}>Zoe Mitchell</Text>
        </View>
        <View style={styles.memberRow}>
          <Text style={styles.memberName}>Thomas Chen</Text>
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
});
