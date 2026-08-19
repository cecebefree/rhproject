// src/components/ClassMaterialsList.tsx
// Materials list for enrolled students — documents, videos, links (Row 97)

import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { MaterialItem } from '../types/classDetail';

interface ClassMaterialsListProps {
  materials: MaterialItem[];
}

const TYPE_ICONS: Record<MaterialItem['type'], string> = {
  document: '📄',
  video: '🎬',
  link: '🔗',
  assignment: '📝',
};

export function ClassMaterialsList({ materials }: ClassMaterialsListProps) {
  if (materials.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No materials available yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {materials.map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.icon}>{TYPE_ICONS[item.type]}</Text>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {item.description && (
              <Text style={styles.description} numberOfLines={1}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  icon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  description: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginTop: 2,
  },
  empty: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
});
