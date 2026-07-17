// Social screen — My Groups list + chat entry
// Source: frozen Design 5 + chat adjustments

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EmptyState } from '../../src/components/EmptyState';
import { GroupCard } from '../../src/components/GroupCard';
import { SEED_GROUPS } from '../../src/seed/groups';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function SocialScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Groups</Text>
      </View>

      {SEED_GROUPS.length > 0 ? (
        SEED_GROUPS.map((group) => (
          <TouchableOpacity key={group.id} style={styles.groupTouchable}>
            <GroupCard
              name={group.name}
              category={group.category}
              lead={group.lead}
              lastMessage={group.lastMessage}
            />
          </TouchableOpacity>
        ))
      ) : (
        <EmptyState
          title="No conversations yet"
          message="Groups appear here once you are enrolled"
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
  groupTouchable: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
});
