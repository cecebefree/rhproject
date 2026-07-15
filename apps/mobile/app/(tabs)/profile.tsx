import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SEED_USER } from '../../src/seed/user';
import { SEED_GROUPS } from '../../src/seed/groups';
import { GroupCard } from '../../src/components/GroupCard';
import { EmptyState } from '../../src/components/EmptyState';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.container}>
      {/* User info */}
      <View style={styles.section}>
        <Text style={styles.name}>{SEED_USER.name}</Text>
        <Text style={styles.role}>
          {SEED_USER.role} · {SEED_USER.curriculum} · 2026
        </Text>
        <Text style={styles.detail}>Grade: {SEED_USER.grade}</Text>
        <Text style={styles.detail}>School stage: {SEED_USER.stage}</Text>
        <Text style={styles.detail}>Intake: {SEED_USER.intake}</Text>
      </View>

      {/* My Groups mirror — read-only */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Groups</Text>
        {SEED_GROUPS.length > 0 ? (
          SEED_GROUPS.map((group) => (
            <GroupCard
              key={group.id}
              name={group.name}
              category={group.category}
              lead={group.lead}
            />
          ))
        ) : (
          <EmptyState
            title="No groups yet"
            message="You'll be added during onboarding"
          />
        )}
      </View>

      {/* Quick links */}
      <View style={styles.section}>
        <Text style={styles.link}>My Certificates</Text>
        <Text style={styles.link}>View booklist</Text>
        <Text style={styles.link}>Contact school</Text>
        <Text style={styles.link}>Log out</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  section: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  name: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  role: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    marginBottom: spacing.sm,
  },
  detail: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
  link: {
    fontSize: typography.sizes.body,
    color: colors.burgundy,
    paddingVertical: spacing.sm,
  },
});
