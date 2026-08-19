// src/components/EnrolledClassesList.tsx
// Row 98: List of enrolled classes with next class, grade, attendance, status

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { DayOfWeek, EnrolledClass } from '../types/profile';
import { DAY_LABELS } from '../types/profile';

interface EnrolledClassesListProps {
  classes: EnrolledClass[];
  onClassPress: (classId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: colors.success,
  completed: colors.charcoalLight,
  waitlisted: colors.warning,
};

function formatDays(days: DayOfWeek[]): string {
  if (!days || days.length === 0) return '';
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d as DayOfWeek))) {
    return 'Weekdays';
  }
  return days.map((d) => DAY_LABELS[d as DayOfWeek]).join(', ');
}

function formatTime(time: string): string {
  // "14:00:00" → "2:00 PM"
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function ClassCard({
  enrolledClass,
  onPress,
}: {
  enrolledClass: EnrolledClass;
  onPress: () => void;
}) {
  const { title, teacher_name, next_class, grade, attendance_pct, status } = enrolledClass;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: STATUS_COLORS[status] ?? colors.charcoalLight },
          ]}
        >
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      {teacher_name && <Text style={styles.teacher}>with {teacher_name}</Text>}

      {next_class && (
        <Text style={styles.nextClass}>
          Next: {formatDays(next_class.days_of_week as DayOfWeek[])}{' '}
          {formatTime(next_class.start_time)} – {formatTime(next_class.end_time)}
        </Text>
      )}

      <View style={styles.metricsRow}>
        {grade != null && (
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Grade</Text>
            <Text style={styles.metricValue}>{Math.round(grade)}%</Text>
          </View>
        )}
        {attendance_pct != null && (
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Attendance</Text>
            <Text style={styles.metricValue}>{attendance_pct}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function EnrolledClassesList({ classes, onClassPress }: EnrolledClassesListProps) {
  if (classes.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No enrolled classes yet</Text>
        <Text style={styles.emptyHint}>Browse classes to get started</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {classes.map((cls) => (
        <ClassCard key={cls.id} enrolledClass={cls} onPress={() => onClassPress(cls.class_id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.sizes.badge,
    color: '#fff',
    fontWeight: typography.weights.medium,
  },
  teacher: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginBottom: spacing.xs,
  },
  nextClass: {
    fontSize: typography.sizes.caption,
    color: colors.burgundy,
    marginBottom: spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricLabel: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
  },
  metricValue: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
  emptyHint: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginTop: spacing.xs,
  },
});
