// Teacher variant — Design 7
// Content swap on student layout + Group Lead controls

import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { GroupCard } from '../../src/components/GroupCard';
import { SEED_GROUPS } from '../../src/seed/groups';
import { SEED_USER } from '../../src/seed/user';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function TeacherScreen() {
  const [mediaEnabled, setMediaEnabled] = useState(false);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Teacher</Text>
        <Text style={styles.subtitle}>Group Lead controls</Text>
      </View>

      {/* Lead badge */}
      <View style={styles.section}>
        <View style={styles.leadBadge}>
          <Text style={styles.leadText}>Group Lead</Text>
        </View>
        <Text style={styles.leadName}>{SEED_USER.name}</Text>
      </View>

      {/* Media dial — lead toggle */}
      <View style={styles.section}>
        <View style={styles.mediaRow}>
          <Text style={styles.mediaLabel}>Media types</Text>
          <Text style={styles.mediaValue}>{mediaEnabled ? 'All media' : 'Text + emoji'}</Text>
        </View>
        <Switch
          value={mediaEnabled}
          onValueChange={setMediaEnabled}
          trackColor={{ false: colors.charcoalLight, true: colors.burgundy }}
        />
      </View>

      {/* My Groups with lead controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Groups</Text>
        {SEED_GROUPS.map((group) => (
          <GroupCard key={group.id} name={group.name} category={group.category} lead={group.lead} />
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
  section: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  leadBadge: {
    backgroundColor: colors.burgundy,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  leadText: {
    color: '#fff',
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.medium,
  },
  leadName: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
  },
  mediaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaLabel: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
  },
  mediaValue: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
  sectionTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
});
