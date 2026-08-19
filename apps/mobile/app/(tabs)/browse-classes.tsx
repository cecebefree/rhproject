// app/(tabs)/browse-classes.tsx
// Row 95 — Index screen: all available classes + enrollment status

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ClassCard } from '../../src/components/ClassCard';
import { fetchClassesWithEnrollment } from '../../src/lib/classesClient';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import type { ClassItem, EnrollmentStatus } from '../../src/types/classes';

type FilterTab = 'all' | EnrollmentStatus;

export default function BrowseClassesScreen() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = await fetchClassesWithEnrollment();
      if (!cancelled) {
        setClasses(result.classes);
        setError(result.error);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const navigateToDetail = useCallback(
    (classId: string) => {
      router.push({ pathname: '/(tabs)/class-detail', params: { courseId: classId } });
    },
    [router]
  );

  const handleEnroll = useCallback(
    (classId: string) => {
      // TODO: Row 96 — enrollment flow
      router.push({ pathname: '/(tabs)/class-detail', params: { courseId: classId } });
    },
    [router]
  );

  const filtered =
    activeFilter === 'all' ? classes : classes.filter((c) => c.enrollment_status === activeFilter);

  const counts = {
    all: classes.length,
    enrolled: classes.filter((c) => c.enrollment_status === 'enrolled').length,
    available: classes.filter((c) => c.enrollment_status === 'available').length,
    waitlisted: classes.filter((c) => c.enrollment_status === 'waitlisted').length,
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Browse Classes</Text>
        <Text style={styles.subtitle}>Explore and enroll in available courses</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['all', 'enrolled', 'available', 'waitlisted'] as FilterTab[]).map((tab) => (
          <View key={tab} style={activeFilter === tab ? styles.filterTabActive : styles.filterTab}>
            <Text
              style={activeFilter === tab ? styles.filterTextActive : styles.filterText}
              onPress={() => setActiveFilter(tab)}
            >
              {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)} ({counts[tab]})
            </Text>
          </View>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.burgundy} />
          <Text style={styles.loadingText}>Loading classes...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Unable to load</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No classes found</Text>
          <Text style={styles.emptyText}>
            {activeFilter === 'all'
              ? 'No classes are currently available.'
              : `No ${activeFilter} classes.`}
          </Text>
        </View>
      ) : (
        filtered.map((cls) => (
          <ClassCard
            key={cls.id}
            classItem={cls}
            onPress={navigateToDetail}
            onEnroll={cls.enrollment_status === 'available' ? handleEnroll : undefined}
          />
        ))
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
    backgroundColor: colors.navy,
    padding: spacing.md,
  },
  title: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  subtitle: {
    fontSize: typography.sizes.body,
    color: '#fff',
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
    backgroundColor: '#fff',
  },
  filterTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.ivory,
  },
  filterTabActive: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.navy,
  },
  filterText: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
  },
  filterTextActive: {
    fontSize: typography.sizes.caption,
    color: '#fff',
    fontWeight: typography.weights.semibold,
  },
  centered: {
    padding: spacing.xxl,
    alignItems: 'center',
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
  emptyTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    textAlign: 'center',
  },
});
