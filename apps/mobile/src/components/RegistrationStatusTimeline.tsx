// src/components/RegistrationStatusTimeline.tsx
// Row 98: Registration status display with timeline and action buttons

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { RegistrationRecord } from '../types/profile';
import { REGISTRATION_STATUS_LABELS } from '../types/profile';

interface RegistrationStatusTimelineProps {
  registration: RegistrationRecord | null;
  onPaymentPress?: () => void;
}

const STATUS_ORDER = [
  'pending_init',
  'pending_review',
  'pending_payment',
  'approved',
  'active',
] as const;

const TERMINAL_STATUSES = ['withdrawn', 'rejected'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function TimelineStep({
  label,
  date,
  isActive,
  isCompleted,
}: {
  label: string;
  date?: string;
  isActive: boolean;
  isCompleted: boolean;
}) {
  const dotColor = isCompleted ? colors.success : isActive ? colors.burgundy : colors.ivoryDark;

  return (
    <View style={timelineStyles.step}>
      <View style={timelineStyles.dotCol}>
        <View style={[timelineStyles.dot, { backgroundColor: dotColor }]} />
        <View
          style={[
            timelineStyles.line,
            { backgroundColor: isCompleted ? colors.success : colors.ivoryDark },
          ]}
        />
      </View>
      <View style={timelineStyles.content}>
        <Text
          style={[
            timelineStyles.label,
            isActive && timelineStyles.labelActive,
            isCompleted && timelineStyles.labelCompleted,
          ]}
        >
          {label}
        </Text>
        {date && <Text style={timelineStyles.date}>{formatDate(date)}</Text>}
      </View>
    </View>
  );
}

export function RegistrationStatusTimeline({
  registration,
  onPaymentPress,
}: RegistrationStatusTimelineProps) {
  if (!registration) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No registration found</Text>
        <Text style={styles.emptyHint}>Contact Front Desk to start registration</Text>
      </View>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(registration.status as (typeof STATUS_ORDER)[number]);
  const isTerminal = TERMINAL_STATUSES.includes(registration.status);

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Status</Text>
        <Text
          style={[
            styles.statusValue,
            isTerminal && styles.statusTerminal,
            registration.status === 'active' && styles.statusActive,
          ]}
        >
          {REGISTRATION_STATUS_LABELS[registration.status] ?? registration.status}
        </Text>
      </View>

      {registration.course_name && (
        <Text style={styles.course}>Course: {registration.course_name}</Text>
      )}

      {/* Timeline */}
      <View style={styles.timeline}>
        {STATUS_ORDER.map((step, idx) => {
          const isCompleted = currentIdx > idx || (isTerminal && registration.status === 'active');
          const isActive = currentIdx === idx;
          return (
            <TimelineStep
              key={step}
              label={REGISTRATION_STATUS_LABELS[step]}
              date={isCompleted || isActive ? registration.updated_at : undefined}
              isActive={isActive}
              isCompleted={isCompleted}
            />
          );
        })}
      </View>

      {/* Action button */}
      {registration.status === 'pending_payment' && onPaymentPress && (
        <TouchableOpacity style={styles.actionButton} onPress={onPaymentPress}>
          <Text style={styles.actionButtonText}>Complete Payment</Text>
        </TouchableOpacity>
      )}

      {registration.status === 'pending_review' && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Awaiting approval</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
  statusValue: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  statusActive: {
    color: colors.success,
  },
  statusTerminal: {
    color: colors.error,
  },
  course: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
  },
  timeline: {
    marginTop: spacing.sm,
  },
  actionButton: {
    backgroundColor: colors.burgundy,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  badge: {
    backgroundColor: colors.warning,
    borderRadius: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  badgeText: {
    fontSize: typography.sizes.badge,
    color: '#fff',
    fontWeight: typography.weights.medium,
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

const timelineStyles = StyleSheet.create({
  step: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  dotCol: {
    width: 20,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 16,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
  },
  labelActive: {
    color: colors.burgundy,
    fontWeight: typography.weights.semibold,
  },
  labelCompleted: {
    color: colors.success,
  },
  date: {
    fontSize: typography.sizes.badge,
    color: colors.charcoalLight,
    marginTop: 2,
  },
});
