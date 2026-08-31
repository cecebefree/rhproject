// src/screens/HomeScreen.tsx
// Home Feed — greeting, devotional, Coming Up schedule, School News
// Converted from stitch home_screen_standardized_design
// Uses useHomeFilter for role-based enrollment filtering

import { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LoadingState } from '../components/LoadingState';
import { useHomeFilter } from '../hooks/useHomeFilter';
import { supabase } from '../services/supabase';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const BRAND_NAVY = '#273946';
const BRAND_RED = '#C8281E';
const BRAND_CREAM = '#F8F7F4';
const TEXT_SECONDARY = '#8b939e';
const ACCENT_ORANGE = '#E8A020';

interface Greeting {
  text: string;
  name: string;
}

function getGreeting(): Greeting {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good Morning', name: '' };
  if (hour < 17) return { text: 'Good Afternoon', name: '' };
  return { text: 'Good Evening', name: '' };
}

export function HomeScreen() {
  const { classes, loading, error } = useHomeFilter();
  const [userName, setUserName] = useState('');
  const [devotionalExpanded, setDevotionalExpanded] = useState(false);

  const greeting = getGreeting();

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      setUserName(profile?.name ?? '');
    }
    loadUser();
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {userName ? userName.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.hamburger}>☰</Text>
              </TouchableOpacity>
            </View>

            {/* Greeting */}
            <View style={styles.greetingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greetingLabel}>{greeting.text}</Text>
                <Text style={styles.greetingName}>{userName || 'Student'}</Text>
              </View>
              <View style={styles.dateBadge}>
                <View style={styles.dateBadgeMonth}>
                  <Text style={styles.dateBadgeMonthText}>
                    {new Date().toLocaleString('default', { month: 'long' })}
                  </Text>
                </View>
                <View style={styles.dateBadgeDay}>
                  <Text style={styles.dateBadgeDayNum}>
                    {new Date().getDate()}
                  </Text>
                  <Text style={styles.dateBadgeDayName}>
                    {new Date().toLocaleString('default', { weekday: 'long' })}
                  </Text>
                </View>
              </View>
            </View>

            {/* Daily Devotional */}
            <View style={styles.devotionalCard}>
              <Text style={styles.devotionalLabel}>DAILY DEVOTIONAL</Text>
              <Text style={styles.devotionalVerse}>John 10:10 TPT</Text>
              <Text
                style={styles.devotionalText}
                numberOfLines={devotionalExpanded ? undefined : 3}
              >
                &quot;A thief has only one thing in mind — he wants to steal,
                slaughter, destroy. But I have come to give you everything in
                abundance, more than you expect — life in fullness until you
                overflow!&quot;
              </Text>
              <TouchableOpacity
                onPress={() => setDevotionalExpanded(!devotionalExpanded)}
              >
                <Text style={styles.devotionalToggle}>
                  {devotionalExpanded ? 'READ LESS' : 'READ MORE'}
                </Text>
              </TouchableOpacity>

              <View style={styles.devotionalActions}>
                <TouchableOpacity style={styles.devotionalAction}>
                  <Text style={styles.devotionalActionIcon}>♫</Text>
                  <Text style={styles.devotionalActionLabel}>Music</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.devotionalAction}>
                  <Text style={styles.devotionalActionIcon}>📖</Text>
                  <Text style={styles.devotionalActionLabel}>Bible</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.devotionalAction}>
                  <Text style={styles.devotionalActionIcon}>▶</Text>
                  <Text style={styles.devotionalActionLabel}>Vlog</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Coming Up */}
            {classes.length > 0 && (
              <View style={styles.section}>
                <View style={[styles.sectionHeader, { backgroundColor: BRAND_RED }]}>
                  <Text style={styles.sectionHeaderText}>COMING UP</Text>
                  <TouchableOpacity>
                    <Text style={styles.sectionSeeAll}>See all</Text>
                  </TouchableOpacity>
                </View>
                {classes.slice(0, 4).map((cls) => (
                  <View key={cls.id} style={styles.scheduleItem}>
                    <View style={styles.scheduleDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scheduleTitle}>{cls.title}</Text>
                      <Text style={styles.scheduleTeacher}>
                        {cls.teacher_name ?? 'Teacher'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Empty state */}
            {classes.length === 0 && !error && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={styles.emptyTitle}>No Classes Yet</Text>
                <Text style={styles.emptyMessage}>
                  Your enrolled classes will appear here.
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={() => null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_CREAM,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl + spacing.sm,
    paddingBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND_NAVY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  hamburger: {
    fontSize: 24,
    color: BRAND_NAVY,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  greetingLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    fontWeight: typography.weights.regular,
  },
  greetingName: {
    fontSize: 32,
    fontFamily: 'Georgia',
    color: BRAND_NAVY,
    fontWeight: typography.weights.regular,
    marginTop: spacing.xs,
  },
  dateBadge: {
    width: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  dateBadgeMonth: {
    backgroundColor: BRAND_RED,
    paddingVertical: 4,
    alignItems: 'center',
  },
  dateBadgeMonthText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  dateBadgeDay: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  dateBadgeDayNum: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    fontFamily: 'Georgia',
    color: BRAND_NAVY,
  },
  dateBadgeDayName: {
    fontSize: 8,
    color: TEXT_SECONDARY,
    fontWeight: typography.weights.regular,
  },
  devotionalCard: {
    backgroundColor: BRAND_NAVY,
    borderRadius: 16,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  devotionalLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#8899aa',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    fontWeight: typography.weights.regular,
  },
  devotionalVerse: {
    fontSize: 13,
    color: ACCENT_ORANGE,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.sm,
  },
  devotionalText: {
    fontSize: 16,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    color: '#ccc',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  devotionalToggle: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#8899aa',
    fontWeight: typography.weights.medium,
    marginBottom: spacing.md,
  },
  devotionalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  devotionalAction: {
    flex: 1,
    backgroundColor: '#384f5f',
    borderRadius: 16,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  devotionalActionIcon: {
    fontSize: 22,
    color: '#8899aa',
    marginBottom: spacing.xs,
  },
  devotionalActionLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#8899aa',
    textTransform: 'uppercase',
    fontWeight: typography.weights.regular,
  },
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  sectionHeaderText: {
    color: '#fff',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: typography.weights.regular,
    textTransform: 'uppercase',
  },
  sectionSeeAll: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: typography.weights.regular,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  scheduleDot: {
    width: 3,
    height: 32,
    borderRadius: 2,
    backgroundColor: BRAND_RED,
    marginRight: spacing.md,
  },
  scheduleTitle: {
    fontSize: 13,
    fontWeight: typography.weights.medium,
    color: BRAND_NAVY,
  },
  scheduleTeacher: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: typography.weights.regular,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: BRAND_NAVY,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: typography.sizes.body,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
});
