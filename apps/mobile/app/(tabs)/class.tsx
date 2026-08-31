// ClassScreen — Row 35 wiring
// Live data: enrolled/teaching classes from Supabase

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    <View style={styles.sectionEmpty}>
      <Text style={styles.sectionEmptyText}>Loading...</Text>
    </View>
  );
}

function SectionError({ message }: { message: string }) {
  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorText}>{message}</Text>
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

function getBarColor(idx: number): string {
  const palette = ['#C8281E', '#E8A020', '#273946', '#3a3a3e'];
  return palette[idx % palette.length];
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !cancelled) {
        if (!user) newErrors.auth = 'Not authenticated';
      }
      if (!user) {
        if (!cancelled) {
          setErrors(newErrors);
          setLoading(false);
        }
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
          .select(
            'class_id, courses!student_class_class_id_fkey(id, title, description, status, type, platform, teacher_id)'
          )
          .eq('student_id', user.id)
          .eq('is_active', true);

        if (!cancelled) {
          if (error) newErrors.courses = error.message;
          else {
            courseData = (data ?? [])
              .map((row: { courses: CourseRow[] }) => row.courses[0])
              .filter(Boolean) as CourseRow[];
          }
        }
      }

      // 4. Fetch teacher names via RPC
      const teacherIds = [...new Set(courseData.map((c) => c.teacher_id))];
      const teacherMap = new Map<string, string>();

      for (const tid of teacherIds) {
        const { data } = await supabase.rpc('get_teacher_name', { p_teacher_id: tid });
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
    return () => {
      cancelled = true;
    };
  }, []);

  const navigateToDetail = useCallback(
    (courseId: string) => {
      router.push({ pathname: '/(tabs)/class-detail', params: { courseId } });
    },
    [router]
  );

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
        <Text style={styles.subtitle}>Cambridge · Mid School</Text>
      </View>

      {/* Go to Class CTA */}
      <TouchableOpacity style={styles.goToClassCard} activeOpacity={0.8}>
        <View style={styles.goToClassLeft}>
          <Text style={styles.goToClassLabel}>GO TO CLASS</Text>
          <Text style={styles.goToClassTitle}>Join your next live session</Text>
        </View>
        <View style={styles.goToClassArrow}>
          <Text style={styles.goToClassArrowText}>→</Text>
        </View>
      </TouchableOpacity>

      {/* Coming Up */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { backgroundColor: '#C8281E' }]}>
          <Text style={styles.sectionHeaderText}>COMING UP</Text>
          <TouchableOpacity>
            <Text style={styles.sectionSeeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.sectionEmpty}>
            <Text style={styles.sectionEmptyText}>Loading...</Text>
          </View>
        ) : courses.length > 0 ? (
          courses.slice(0, 5).map((cls, idx) => {
            const courseSlots = slotsByCourse.get(cls.id) ?? [];
            const nextSlot = courseSlots[0];
            return (
              <TouchableOpacity
                key={cls.id}
                style={styles.scheduleItem}
                onPress={() => navigateToDetail(cls.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.scheduleBar, { backgroundColor: getBarColor(idx) }]} />
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleTitle}>{cls.title}</Text>
                  <Text style={styles.scheduleTeacher}>
                    {cls.teacher_name ?? 'Teacher'}
                    {nextSlot
                      ? ` · ${formatDays(nextSlot.days_of_week)} ${formatTime(nextSlot.start_time)}`
                      : ''}
                  </Text>
                </View>
                {idx === 0 ? (
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                ) : nextSlot ? (
                  <Text style={styles.scheduleTime}>{formatTime(nextSlot.start_time)}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.sectionEmpty}>
            <Text style={styles.sectionEmptyText}>No classes scheduled</Text>
          </View>
        )}
      </View>

      {/* Clubs */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { backgroundColor: '#E8A020' }]}>
          <Text style={styles.sectionHeaderText}>CLUBS</Text>
        </View>
        {courses.filter((c) => c.type === 'club').length > 0 ? (
          courses
            .filter((c) => c.type === 'club')
            .map((cls) => (
              <TouchableOpacity
                key={cls.id}
                style={styles.scheduleItem}
                onPress={() => navigateToDetail(cls.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.scheduleBar, { backgroundColor: '#E8A020' }]} />
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleTitle}>{cls.title}</Text>
                  <Text style={styles.scheduleType}>Club</Text>
                </View>
              </TouchableOpacity>
            ))
        ) : (
          <View style={styles.sectionEmpty}>
            <Text style={styles.sectionEmptyText}>No clubs</Text>
          </View>
        )}
      </View>

      {/* Enrichment */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { backgroundColor: '#273946' }]}>
          <Text style={styles.sectionHeaderText}>ENRICHMENT</Text>
        </View>
        {courses.filter((c) => c.type === 'enrichment').length > 0 ? (
          courses
            .filter((c) => c.type === 'enrichment')
            .map((cls) => (
              <TouchableOpacity
                key={cls.id}
                style={styles.scheduleItem}
                onPress={() => navigateToDetail(cls.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.scheduleBar, { backgroundColor: '#273946' }]} />
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleTitle}>{cls.title}</Text>
                  <Text style={styles.scheduleTypeEnrichment}>Enrichment</Text>
                </View>
              </TouchableOpacity>
            ))
        ) : (
          <View style={styles.sectionEmpty}>
            <Text style={styles.sectionEmptyText}>No enrichment classes</Text>
          </View>
        )}
      </View>

      {errors.courses && !loading && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errors.courses}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F4',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    color: '#273946',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 12,
    color: '#8b939e',
    marginTop: 2,
  },
  goToClassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#273946',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  goToClassLeft: {
    flex: 1,
  },
  goToClassLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#8899aa',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  goToClassTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  goToClassArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C8281E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goToClassArrowText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sectionHeaderText: {
    color: '#fff',
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '400',
    textTransform: 'uppercase',
  },
  sectionSeeAll: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
  },
  sectionEmpty: {
    padding: 16,
    alignItems: 'center',
  },
  sectionEmptyText: {
    fontSize: 14,
    color: '#8b939e',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  scheduleBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#273946',
  },
  scheduleTeacher: {
    fontSize: 12,
    color: '#8b939e',
    fontWeight: '300',
    marginTop: 2,
  },
  scheduleTime: {
    fontSize: 13,
    color: '#8b939e',
  },
  scheduleType: {
    fontSize: 11,
    color: '#E8A020',
    fontWeight: '500',
    marginTop: 2,
  },
  scheduleTypeEnrichment: {
    fontSize: 11,
    color: '#273946',
    fontWeight: '500',
    marginTop: 2,
  },
  liveBadge: {
    backgroundColor: '#C8281E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  errorText: {
    fontSize: 13,
    color: '#e74c3c',
  },
});
