// HubScreen — Row 39 wiring
// Live data: courses (enrichment platform) via student_class join +
// schedule_slot for schedule info.
// Source: frozen Design 7 (teacher variant) + field-register hub fields

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EmptyState } from '../../src/components/EmptyState';
import { supabase } from '../../src/services/supabase';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

interface EnrichmentCourse {
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

export default function HubScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<EnrichmentCourse[]>([]);
  const [slotsByCourse, setSlotsByCourse] = useState<Map<string, ScheduleSlot[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHub() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setError('Not authenticated');
          setLoading(false);
        }
        return;
      }

      // 1. Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role ?? 'student';

      // 2. Fetch enrichment courses based on role
      let courseData: EnrichmentCourse[] = [];

      if (role === 'teacher' || role === 'admin') {
        // Teacher/admin: see courses they teach
        const { data, error: coursesErr } = await supabase
          .from('courses')
          .select('id, title, description, status, type, platform, teacher_id')
          .eq('teacher_id', user.id)
          .eq('status', 'published')
          .eq('platform', 'enrichment');

        if (!cancelled) {
          if (coursesErr) setError(coursesErr.message);
          else courseData = data ?? [];
        }
      } else {
        // Student: see enrolled enrichment courses via student_class
        const { data, error: coursesErr } = await supabase
          .from('student_class')
          .select(
            'class_id, courses!student_class_class_id_fkey(id, title, description, status, type, platform, teacher_id)'
          )
          .eq('student_id', user.id)
          .eq('is_active', true);

        if (!cancelled) {
          if (coursesErr) setError(coursesErr.message);
          else {
            courseData = (data ?? [])
              .map((row: { courses: EnrichmentCourse[] }) => row.courses[0])
              .filter(Boolean) as EnrichmentCourse[];
          }
        }
      }

      // 3. Fetch schedule slots for enrolled courses
      const courseIds = courseData.map((c) => c.id);
      const slotMap = new Map<string, ScheduleSlot[]>();

      if (courseIds.length > 0 && !cancelled) {
        const { data: slotData } = await supabase
          .from('schedule_slot')
          .select('id, label, start_time, end_time, days_of_week, course_id')
          .in('course_id', courseIds)
          .eq('is_active', true)
          .order('start_time');

        if (slotData) {
          for (const slot of slotData) {
            const existing = slotMap.get(slot.course_id) ?? [];
            existing.push(slot);
            slotMap.set(slot.course_id, existing);
          }
        }
      }

      if (!cancelled) {
        setCourses(courseData);
        setSlotsByCourse(slotMap);
        setLoading(false);
      }
    }

    loadHub();
    return () => {
      cancelled = true;
    };
  }, []);

  const navigateToDetail = (courseId: string) => {
    router.push({ pathname: '/(tabs)/hub-detail', params: { courseId } });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enrichment</Text>
      </View>

      {loading ? (
        <SectionLoader />
      ) : error ? (
        <SectionError message={error} />
      ) : courses.length === 0 ? (
        <EmptyState
          title="No enrichment courses"
          message="Your enrolled courses will appear here"
        />
      ) : (
        courses.map((course) => {
          const courseSlots = slotsByCourse.get(course.id) ?? [];
          const nextSlot = courseSlots[0];

          return (
            <TouchableOpacity
              key={course.id}
              style={styles.card}
              onPress={() => navigateToDetail(course.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.subject}>{course.title}</Text>
                <View style={[styles.badge, styles.badgeEnrichment]}>
                  <Text style={styles.badgeText}>Enrichment</Text>
                </View>
              </View>

              {nextSlot ? (
                <Text style={styles.schedule}>
                  {formatDays(nextSlot.days_of_week)} · {formatTime(nextSlot.start_time)}–
                  {formatTime(nextSlot.end_time)}
                </Text>
              ) : (
                <Text style={styles.schedule}>No scheduled sessions</Text>
              )}

              {course.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {course.description}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })
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
  },
  title: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
  },
  card: {
    backgroundColor: '#fff',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subject: {
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
  badgeEnrichment: {
    backgroundColor: colors.champagne,
  },
  badgeText: {
    color: '#fff',
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.bold,
  },
  schedule: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginTop: spacing.xs,
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
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
});
