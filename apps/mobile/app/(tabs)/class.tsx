// ClassScreen — Row 35 wiring
// Live data: enrolled/teaching classes from Supabase

import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  platform: string;
  teacher_id: string;
  teacher_name?: string | null;
}

interface ScheduleRow {
  id: string;
  label: string | null;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  course_id: string;
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
  return days.map((d) => DAY_NAMES[d] || '').filter(Boolean).join(', ');
}

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

export default function ClassScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [slots, setSlots] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadClasses() {
      setLoading(true);
      const newErrors: Record<string, string> = {};

      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !cancelled) {
        if (!user) newErrors.auth = 'Not authenticated';
      }
      if (!user) {
        if (!cancelled) { setErrors(newErrors); setLoading(false); }
        return;
      }

      // 2. Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role ?? 'student';

      // 3. Fetch courses based on role
      let courseData: CourseRow[] = [];

      if (role === 'teacher' || role === 'admin') {
        // Teacher/admin: see courses they teach
        const { data, error } = await supabase
          .from('courses')
          .select('id, title, description, status, type, platform, teacher_id')
          .eq('status', 'published');

        if (!cancelled) {
          if (error) newErrors.courses = error.message;
          else courseData = data ?? [];
        }
      } else {
        // Student: see enrolled courses via student_class
        const { data, error } = await supabase
          .from('student_class')
          .select('class_id, courses!student_class_class_id_fkey(id, title, description, status, type, platform, teacher_id)')
          .eq('student_id', user.id)
          .eq('is_active', true);

        if (!cancelled) {
          if (error) newErrors.courses = error.message;
          else {
            courseData = (data ?? [])
              .map((row: any) => row.courses)
              .filter(Boolean) as CourseRow[];
          }
        }
      }

      // 4. Fetch teacher names via RPC
      const teacherIds = [...new Set(courseData.map((c) => c.teacher_id))];
      const teacherMap = new Map<string, string>();

      for (const tid of teacherIds) {
        const { data } = await supabase
          .rpc('get_teacher_name', { p_teacher_id: tid });
        if (data && data.length > 0) {
          teacherMap.set(tid, data[0].name);
        }
      }

      // 5. Attach teacher names
      courseData = courseData.map((c) => ({
        ...c,
        teacher_name: teacherMap.get(c.teacher_id) ?? null,
      }));

      // 6. Fetch schedule slots for these courses
      const courseIds = courseData.map((c) => c.id);
      let slotData: ScheduleRow[] = [];

      if (courseIds.length > 0) {
        const { data, error } = await supabase
          .from('schedule_slot')
          .select('id, label, start_time, end_time, days_of_week, course_id')
          .in('course_id', courseIds)
          .eq('is_active', true)
          .order('start_time');

        if (!cancelled) {
          if (error) newErrors.schedule = error.message;
          else slotData = data ?? [];
        }
      }

      if (!cancelled) {
        setCourses(courseData);
        setSlots(slotData);
        setErrors(newErrors);
        setLoading(false);
      }
    }

    loadClasses();
    return () => { cancelled = true; };
  }, []);

  const navigateToDetail = useCallback((courseId: string) => {
    router.push({ pathname: '/(tabs)/class-detail', params: { courseId } });
  }, [router]);

  // Group slots by course_id for quick lookup
  const slotsByCourse = new Map<string, ScheduleRow[]>();
  for (const slot of slots) {
    const existing = slotsByCourse.get(slot.course_id) ?? [];
    existing.push(slot);
    slotsByCourse.set(slot.course_id, existing);
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Classes</Text>
      </View>

      {loading ? (
        <SectionLoader />
      ) : errors.courses ? (
        <SectionError message={errors.courses} />
      ) : courses.length === 0 ? (
        <SectionEmpty message="No classes yet" />
      ) : (
        courses.map((cls) => {
          const courseSlots = slotsByCourse.get(cls.id) ?? [];
          const nextSlot = courseSlots[0];

          return (
            <TouchableOpacity
              key={cls.id}
              style={styles.card}
              onPress={() => navigateToDetail(cls.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.subject}>{cls.title}</Text>
                <View style={[styles.badge, styles.badgeCore]}>
                  <Text style={styles.badgeText}>{cls.type}</Text>
                </View>
              </View>

              {cls.teacher_name && (
                <Text style={styles.teacher}>{cls.teacher_name}</Text>
              )}

              {nextSlot ? (
                <Text style={styles.schedule}>
                  {formatDays(nextSlot.days_of_week)} · {formatTime(nextSlot.start_time)}–{formatTime(nextSlot.end_time)}
                </Text>
              ) : (
                <Text style={styles.schedule}>No scheduled sessions</Text>
              )}

              {cls.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {cls.description}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })
      )}

      {errors.schedule && !loading && (
        <SectionError message={errors.schedule} />
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
