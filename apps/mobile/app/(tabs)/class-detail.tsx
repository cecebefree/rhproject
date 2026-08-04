// ClassDetailScreen — Row 35 wiring
// Live data: course details + chapters via chapters_read RPC + schedule slots

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
  teacher_name: string | null;
}

interface Chapter {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  order_index: number;
}

interface ScheduleSlot {
  id: string;
  label: string | null;
  start_time: string;
  end_time: string;
  days_of_week: number[];
}

function SectionLoader() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Loading...</Text>
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

function SectionEmpty({ message }: { message: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
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

export default function ClassDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!courseId) return;
      setLoading(true);
      const newErrors: Record<string, string> = {};

      // 1. Fetch course details
      const { data: courseData, error: courseErr } = await supabase
        .from('courses')
        .select('id, title, description, status, type, platform, teacher_id')
        .eq('id', courseId)
        .single();

      if (!cancelled) {
        if (courseErr) newErrors.course = courseErr.message;
        else if (courseData) {
          // 2. Fetch teacher name
          const { data: teacherData } = await supabase.rpc('get_teacher_name', {
            p_teacher_id: courseData.teacher_id,
          });

          setCourse({
            ...courseData,
            teacher_name: teacherData?.[0]?.name ?? null,
          });
        }
      }

      // 3. Fetch chapters via RPC
      const { data: chapterData, error: chapterErr } = await supabase.rpc('chapters_read', {
        p_course_id: courseId,
      });

      if (!cancelled) {
        if (chapterErr) newErrors.chapters = chapterErr.message;
        else setChapters(chapterData ?? []);
      }

      // 4. Fetch schedule slots
      const { data: slotData, error: slotErr } = await supabase
        .from('schedule_slot')
        .select('id, label, start_time, end_time, days_of_week')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('start_time');

      if (!cancelled) {
        if (slotErr) newErrors.schedule = slotErr.message;
        else setSlots(slotData ?? []);
      }

      if (!cancelled) {
        setErrors(newErrors);
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
        ) : errors.course ? (
          <SectionError message={errors.course} />
        ) : course ? (
          <>
            <View style={styles.headerRow}>
              <Text style={styles.subject}>{course.title}</Text>
              <View style={[styles.badge, styles.badgeCore]}>
                <Text style={styles.badgeText}>{course.type}</Text>
              </View>
            </View>
            {course.teacher_name && <Text style={styles.teacher}>{course.teacher_name}</Text>}
            {course.description && <Text style={styles.description}>{course.description}</Text>}
          </>
        ) : (
          <SectionEmpty message="Course not found" />
        )}
      </View>

      {/* Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        {loading ? (
          <SectionLoader />
        ) : errors.schedule ? (
          <SectionError message={errors.schedule} />
        ) : slots.length === 0 ? (
          <SectionEmpty message="No scheduled sessions" />
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

      {/* Chapters */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chapters</Text>
        {loading ? (
          <SectionLoader />
        ) : errors.chapters ? (
          <SectionError message={errors.chapters} />
        ) : chapters.length === 0 ? (
          <SectionEmpty message="No chapters available" />
        ) : (
          chapters.map((ch, idx) => (
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
          ))
        )}
      </View>
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
    marginLeft: spacing.sm,
  },
  badgeCore: {
    backgroundColor: colors.navy,
  },
  badgeText: {
    color: '#fff',
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.bold,
  },
  teacher: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    marginBottom: spacing.xs,
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
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
});
