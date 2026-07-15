// Category badge — 7 colors from palette
// Source: frozen Design 5

import { View, Text, StyleSheet } from 'react-native';
import { categoryColors, CategoryKey } from '../theme/colors';
import { typography } from '../theme/typography';

interface BadgeProps {
  category: CategoryKey;
}

export function Badge({ category }: BadgeProps) {
  const bgColor = categoryColors[category] || categoryColors.core;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={styles.text}>{category}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    color: '#fff',
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
  },
});
