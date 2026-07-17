// Group card — avatar + name + badge + lead
// Source: frozen Design 5

import { StyleSheet, Text, View } from 'react-native';
import type { CategoryKey } from '../theme/colors';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Badge } from './Badge';

interface GroupCardProps {
  name: string;
  category: CategoryKey;
  lead: string;
  lastMessage?: string;
}

export function GroupCard({ name, category, lead, lastMessage }: GroupCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <Badge category={category} />
      </View>
      <Text style={styles.lead}>Lead: {lead}</Text>
      {lastMessage && (
        <Text style={styles.message} numberOfLines={1}>
          {lastMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    flex: 1,
  },
  lead: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
  },
});
