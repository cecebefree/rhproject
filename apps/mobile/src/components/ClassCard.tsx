// src/components/ClassCard.tsx
// Reusable class card with enrollment status badge + enroll flow (Row 96)

import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { ClassItem, EnrollmentStatus } from '../types/classes';

interface ClassCardProps {
  classItem: ClassItem;
  onPress: (classId: string) => void;
  onEnroll?: (classId: string) => void;
  enrolling?: boolean;
}

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  enrolled: 'Enrolled',
  available: 'Open',
  waitlisted: 'Waitlisted',
};

const STATUS_STYLES: Record<EnrollmentStatus, { bg: string; text: string }> = {
  enrolled: { bg: '#dcfce7', text: '#166534' },
  available: { bg: '#dbeafe', text: '#1e40af' },
  waitlisted: { bg: '#fef3c7', text: '#92400e' },
};

export function ClassCard({ classItem, onPress, onEnroll, enrolling = false }: ClassCardProps) {
  const statusStyle = STATUS_STYLES[classItem.enrollment_status];

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(classItem.id)} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.title} numberOfLines={1}>
          {classItem.title}
        </Text>
        <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.badgeText, { color: statusStyle.text }]}>
            {STATUS_LABELS[classItem.enrollment_status]}
          </Text>
        </View>
      </View>

      {classItem.teacher_name && <Text style={styles.teacher}>{classItem.teacher_name}</Text>}

      <View style={styles.metaRow}>
        <View style={[styles.typeBadge, { backgroundColor: colors.navy }]}>
          <Text style={styles.typeBadgeText}>{classItem.type}</Text>
        </View>
        <Text style={styles.platform}>{classItem.platform}</Text>
      </View>

      {classItem.description && (
        <Text style={styles.description} numberOfLines={2}>
          {classItem.description}
        </Text>
      )}

      {classItem.enrollment_status === 'available' && onEnroll && (
        <TouchableOpacity
          style={[styles.enrollButton, enrolling && styles.enrollButtonDisabled]}
          onPress={() => onEnroll(classItem.id)}
          activeOpacity={0.7}
          disabled={enrolling}
        >
          {enrolling ? (
            <View style={styles.enrollLoading}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.enrollButtonText}>Enrolling…</Text>
            </View>
          ) : (
            <Text style={styles.enrollButtonText}>Enroll</Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  badgeText: {
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.bold,
  },
  teacher: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.bold,
  },
  platform: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
  },
  description: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  enrollButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.burgundy,
    borderRadius: 6,
    alignItems: 'center',
  },
  enrollButtonDisabled: {
    opacity: 0.7,
  },
  enrollLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  enrollButtonText: {
    color: '#fff',
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
});
