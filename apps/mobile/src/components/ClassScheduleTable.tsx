// src/components/ClassScheduleTable.tsx
// Schedule table for class detail — days, times, labels (Row 97)

import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { ScheduleSlotDetail } from '../types/classDetail';

interface ClassScheduleTableProps {
  slots: ScheduleSlotDetail[];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDays(days: number[]): string {
  return days
    .map((d) => DAY_NAMES[d] || '')
    .filter(Boolean)
    .join(', ');
}

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = Number.parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

export function ClassScheduleTable({ slots }: ClassScheduleTableProps) {
  if (slots.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No scheduled sessions</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {slots.map((slot) => (
        <View key={slot.id} style={styles.row}>
          <View style={styles.dayBadge}>
            <Text style={styles.dayText}>{formatDays(slot.days_of_week)}</Text>
          </View>
          <View style={styles.timeInfo}>
            <Text style={styles.time}>
              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
            </Text>
            {slot.label && <Text style={styles.label}>{slot.label}</Text>}
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
  dayBadge: {
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    marginRight: spacing.md,
    minWidth: 72,
    alignItems: 'center',
  },
  dayText: {
    color: '#fff',
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.bold,
  },
  timeInfo: {
    flex: 1,
  },
  time: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  label: {
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
