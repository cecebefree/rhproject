import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

interface Profile {
  name: string | null;
  curriculum: string | null;
  stage: string | null;
  zone: number | null;
  nation: string | null;
  city: string | null;
}

interface DevotionalItem {
  id: string;
  type: string;
  day: number;
  url_or_text: string;
  is_iframe: boolean;
}

interface ScheduleSlot {
  id: string;
  label: string | null;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  courses: { name: string; teacher_id: string | null }[] | null;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  publish_at: string;
  pinned: boolean;
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

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function HomeScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [devotional, setDevotional] = useState<DevotionalItem | null>(null);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      const newErrors: Record<string, string> = {};

      // 1. Profile
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('name, curriculum, stage, zone, nation, city')
        .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single();

      if (!cancelled) {
        if (profErr) newErrors.profile = profErr.message;
        else setProfile(prof);
      }

      // 2. Devotional (RPC)
      const { data: devoc, error: devocErr } = await supabase.rpc('get_today_devotional');

      if (!cancelled) {
        if (devocErr) newErrors.devotional = devocErr.message;
        else setDevotional(devoc && devoc.length > 0 ? devoc[0] : null);
      }

      // 3. Coming Up — schedule slots with course names
      const { data: slotData, error: slotErr } = await supabase
        .from('schedule_slot')
        .select('id, label, start_time, end_time, days_of_week, courses(name, teacher_id)')
        .eq('is_active', true)
        .order('start_time');

      if (!cancelled) {
        if (slotErr) newErrors.schedule = slotErr.message;
        else setSlots(slotData ?? []);
      }

      // 4. Announcements (RPC)
      const { data: ann, error: annErr } = await supabase.rpc('get_announcements');

      if (!cancelled) {
        if (annErr) newErrors.announcements = annErr.message;
        else setAnnouncements(ann ?? []);
      }

      if (!cancelled) {
        setErrors(newErrors);
        setLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = profile?.name ?? 'Student';

  return (
    <ScrollView style={styles.container}>
      {/* Greeting */}
      <View style={styles.greetingSection}>
        {loading ? (
          <Text style={styles.greeting}>Loading...</Text>
        ) : errors.profile ? (
          <>
            <Text style={styles.greeting}>Welcome</Text>
            <Text style={styles.name}>Student</Text>
          </>
        ) : (
          <>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.name}>{greeting}</Text>
            {profile?.curriculum && (
              <Text style={styles.tag}>
                {profile.curriculum}
                {profile.stage ? ` · ${profile.stage}` : ''}
              </Text>
            )}
          </>
        )}
      </View>

      {/* Devotional */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today&apos;s Devotional</Text>
        {loading ? (
          <SectionLoader />
        ) : errors.devotional ? (
          <SectionError message={errors.devotional} />
        ) : devotional ? (
          <>
            <Text style={styles.verse}>{devotional.type}</Text>
            <Text style={styles.verseText}>{devotional.url_or_text}</Text>
          </>
        ) : (
          <SectionEmpty message="No devotional today" />
        )}
      </View>

      {/* Coming Up */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coming Up</Text>
        {loading ? (
          <SectionLoader />
        ) : errors.schedule ? (
          <SectionError message={errors.schedule} />
        ) : slots.length === 0 ? (
          <SectionEmpty message="No upcoming classes" />
        ) : (
          slots.slice(0, 5).map((slot) => (
            <View key={slot.id} style={styles.comingUpRow}>
              <View style={styles.comingUpLeft}>
                <Text style={styles.comingUpSubject}>
                  {slot.courses?.[0]?.name ?? slot.label ?? 'Class'}
                </Text>
                <Text style={styles.comingUpTeacher}>
                  {formatTime(slot.start_time)}–{formatTime(slot.end_time)} ·{' '}
                  {formatDays(slot.days_of_week)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* News */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>News</Text>
        {loading ? (
          <SectionLoader />
        ) : errors.announcements ? (
          <SectionError message={errors.announcements} />
        ) : announcements.length === 0 ? (
          <SectionEmpty message="No announcements" />
        ) : (
          announcements.slice(0, 5).map((ann) => (
            <View key={ann.id} style={styles.newsItem}>
              <Text style={styles.newsHeadline}>{ann.title}</Text>
              <Text style={styles.newsRecency}>{timeAgo(ann.publish_at)}</Text>
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
  greetingSection: {
    backgroundColor: colors.navy,
    padding: spacing.lg,
  },
  greeting: {
    fontSize: typography.sizes.h3,
    color: '#fff',
    fontWeight: typography.weights.regular,
  },
  name: {
    fontSize: typography.sizes.h1,
    color: '#fff',
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs,
  },
  tag: {
    fontSize: typography.sizes.body,
    color: '#fff',
    opacity: 0.8,
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
  verse: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.burgundy,
    marginBottom: spacing.xs,
  },
  verseText: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
    lineHeight: 24,
  },
  comingUpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  comingUpLeft: {
    flex: 1,
  },
  comingUpSubject: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  comingUpTeacher: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginTop: spacing.xs,
  },
  newsItem: {
    marginBottom: spacing.sm,
  },
  newsHeadline: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
  },
  newsRecency: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginTop: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
});
