// ClassDetailScreen — Row 97 enhanced
// Full class detail: info, instructor, schedule, curriculum, materials, enroll button

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ClassMaterialsList } from '../../src/components/ClassMaterialsList';
import { ClassScheduleTable } from '../../src/components/ClassScheduleTable';
import { fetchClassDetail } from '../../src/lib/classDetailClient';
import { enrollStudent } from '../../src/lib/enrollmentClient';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import type { ClassDetail } from '../../src/types/classDetail';

const STATUS_LABELS: Record<string, string> = {
  enrolled: 'Enrolled',
  available: 'Open',
  waitlisted: 'Waitlisted',
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  enrolled: { bg: '#dcfce7', text: '#166534' },
  available: { bg: '#dbeafe', text: '#1e40af' },
  waitlisted: { bg: '#fef3c7', text: '#92400e' },
};

export default function ClassDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    const { data, error: err } = await fetchClassDetail(courseId);
    setDetail(data);
    setError(err);
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    let cancelled = false;
    loadDetail().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [loadDetail]);

  const handleEnroll = async () => {
    if (!courseId) return;
    setEnrolling(true);
    const { error: err } = await enrollStudent(courseId);
    setEnrolling(false);

    if (!err) {
      // Refresh to show enrolled state
      loadDetail();
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/browse-classes');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.burgundy} />
        <Text style={styles.loadingText}>Loading class…</Text>
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Unable to load</Text>
        <Text style={styles.errorText}>{error ?? 'Class not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDetail}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusStyle = STATUS_STYLES[detail.enrollment_status] ?? STATUS_STYLES.available;
  const isEnrolled = detail.enrollment_status === 'enrolled';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={2}>
              {detail.title}
            </Text>
            <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.badgeText, { color: statusStyle.text }]}>
                {STATUS_LABELS[detail.enrollment_status]}
              </Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {detail.price === 0 ? 'Free' : `R ${detail.price.toFixed(2)}`}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: colors.navy }]}>
              <Text style={styles.typeBadgeText}>{detail.type}</Text>
            </View>
            <Text style={styles.platform}>{detail.platform}</Text>
          </View>

          {/* Instructor */}
          {detail.teacher_name && (
            <View style={styles.instructorRow}>
              <Text style={styles.instructorLabel}>Instructor</Text>
              <Text style={styles.instructorName}>{detail.teacher_name}</Text>
            </View>
          )}

          {/* Description */}
          {detail.description && <Text style={styles.description}>{detail.description}</Text>}
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <ClassScheduleTable slots={detail.schedule} />
        </View>

        {/* Curriculum / Syllabus */}
        {detail.chapters.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Curriculum</Text>
            <Text style={styles.sectionSubtitle}>
              {detail.chapters.length} {detail.chapters.length === 1 ? 'topic' : 'topics'}
            </Text>
            {detail.chapters.map((ch, idx) => (
              <View key={ch.id} style={styles.chapterRow}>
                <View style={styles.chapterIndex}>
                  <Text style={styles.chapterIndexText}>{idx + 1}</Text>
                </View>
                <View style={styles.chapterInfo}>
                  <Text style={styles.chapterTitle}>{ch.title}</Text>
                  {ch.description && (
                    <Text style={styles.chapterDesc} numberOfLines={2}>
                      {ch.description}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Materials (enrolled only) */}
        {isEnrolled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Materials</Text>
            <ClassMaterialsList materials={detail.materials} />
          </View>
        )}
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        {isEnrolled ? (
          <View style={styles.enrolledBanner}>
            <Text style={styles.enrolledText}>✓ You are enrolled in this class</Text>
          </View>
        ) : detail.enrollment_status === 'waitlisted' ? (
          <View style={styles.waitlistBanner}>
            <Text style={styles.waitlistText}>
              Waitlisted — you will be notified when a spot opens
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.enrollButton, enrolling && styles.enrollButtonDisabled]}
            onPress={handleEnroll}
            disabled={enrolling}
          >
            {enrolling ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.enrollButtonText}>
                {detail.price === 0 ? 'Enroll (Free)' : `Enroll — R ${detail.price.toFixed(2)}`}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  scroll: {
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    marginTop: spacing.sm,
  },
  errorTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.burgundy,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  backButton: {
    padding: spacing.md,
  },
  backText: {
    fontSize: typography.sizes.body,
    color: colors.navy,
    fontWeight: typography.weights.semibold,
  },
  header: {
    padding: spacing.md,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.bold,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  price: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.bold,
    color: colors.burgundy,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
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
  instructorRow: {
    marginBottom: spacing.sm,
  },
  instructorLabel: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instructorName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginTop: 2,
  },
  description: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
    lineHeight: 24,
  },
  section: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  sectionTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginBottom: spacing.sm,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  chapterIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  chapterIndexText: {
    color: '#fff',
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.bold,
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  chapterDesc: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginTop: 2,
  },
  bottomBar: {
    padding: spacing.md,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.ivoryDark,
  },
  enrollButton: {
    paddingVertical: spacing.md,
    backgroundColor: colors.burgundy,
    borderRadius: 8,
    alignItems: 'center',
  },
  enrollButtonDisabled: {
    opacity: 0.7,
  },
  enrollButtonText: {
    color: '#fff',
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  enrolledBanner: {
    paddingVertical: spacing.sm,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    alignItems: 'center',
  },
  enrolledText: {
    color: '#166534',
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  waitlistBanner: {
    paddingVertical: spacing.sm,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    alignItems: 'center',
  },
  waitlistText: {
    color: '#92400e',
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
});
