// ClassDetailScreen — sub-screen for individual class view
// Reads from seed/classes.ts

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SEED_CLASSES } from '../../src/seed/classes';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function ClassDetailScreen() {
  const cls = SEED_CLASSES[0]; // Default to first class

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subject}>{cls.subject}</Text>
        {cls.status === 'live' && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Teacher</Text>
          <Text style={styles.value}>{cls.teacher}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Schedule</Text>
          <Text style={styles.value}>{cls.schedule}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{cls.location}</Text>
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
  subject: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
  },
  liveBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.bold,
  },
  section: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  label: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
  },
  value: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
});
