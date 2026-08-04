// HubDetailScreen — Row 36 wiring
// Reads a single enrichment course + its schedule slots from Supabase.
// Source: frozen Design 7 (teacher variant)

import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

interface CourseDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  platform: string;
  teacher_id: string;
}

interface ScheduleSlot {
  id: string;
  label: string | null;
  start_time: string;
  end_time: string;
  days_of_week: number[];
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

function SectionLoader() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Loading…</Text>
    </View>
  );
}

function SectionError({ message }: { message: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Unable to load</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export default function HubDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!courseId) return;
      setLoading(true);
      setError(null);

      // 1. Fetch course details
      const { data: courseData, error: courseErr } = await supabase
        .from('courses')
        .select('id, title, description, status, type, platform, teacher_id')
        .eq('id', courseId)
        .single();

      if (!cancelled) {
        if (courseErr) setError(courseErr.message);
        else setCourse(courseData);
      }

      // 2. Fetch schedule slots
      const { data: slotData, error: slotErr } = await supabase
        .from('schedule_slot')
        .select('id, label, start_time, end_time, days_of_week')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('start_time');

      if (!cancelled) {
        if (slotErr) setError(slotErr.message);
        else if (slotData) setSlots(slotData);
        setLoading(false);
      }
    }

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return (
    <ScrollView style={styles.container}>
      {/* Course Header */}
      <View style={styles.header}>
        {loading ? (
          <SectionLoader />
        ) : error ? (
          <SectionError message={error} />
        ) : course ? (
          <>
            <View style={styles.headerRow}>
              <Text style={styles.subject}>{course.title}</Text>
              <View style={[styles.badge, styles.badgeEnrichment]}>
                <Text style={styles.badgeText}>{course.type}</Text>
              </View>
            </View>
            {course.description ? (
              <Text style={styles.description}>{course.description}</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.emptyText}>Course not found</Text>
        )}
      </View>

      {/* Schedule */}
      {!loading && !error && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          {slots.length === 0 ? (
            <Text style={styles.emptyText}>No scheduled sessions</Text>
          ) : (
            slots.map((slot) => (
              <View key={slot.id} style={styles.scheduleRow}>
                <Text style={styles.scheduleDays}>{formatDays(slot.days_of_week)}</Text>
                <Text style={styles.scheduleTime}>
                  {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                </Text>
                {slot.label && <Text style={styles.scheduleLabel}>{slot.label}</Text>}
              </View>
            ))
          )}
        </View>
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
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subject: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeEnrichment: {
    backgroundColor: colors.champagne,
  },
  badgeText: {
    color: '#fff',
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.bold,
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
    marginBottom: spacing.sm,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  scheduleDays: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    width: 80,
  },
  scheduleTime: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    flex: 1,
  },
  scheduleLabel: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginLeft: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
});
