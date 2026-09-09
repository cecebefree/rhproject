// Social screen — My Groups list + chat entry
// Source: frozen Design 5 + chat adjustments
// WIRED to real DB — group_conversations via socialClient

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingState } from '../../src/components/LoadingState';
import { GroupCard } from '../../src/components/GroupCard';
import { fetchSocialGroups, type SocialGroup } from '../../src/lib/socialClient';
import { fetchScheduleBySection, type ScheduleEvent } from '../../src/lib/scheduleClient';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function SocialScreen() {
  const [groups, setGroups] = useState<SocialGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [groupsData, scheduleResult] = await Promise.all([
          fetchSocialGroups(),
          fetchScheduleBySection('social', ''),
        ]);
        if (!cancelled) {
          setGroups(groupsData);
          setScheduleEvents(scheduleResult.events);
          if (scheduleResult.error) {
            setError(scheduleResult.error);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load groups');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <EmptyState title="Error" message={error} />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Groups</Text>
      </View>

      {/* Scheduled Events from Schedule Client */}
      {scheduleEvents.length > 0 && (
        <View style={styles.scheduleSection}>
          <Text style={styles.scheduleSectionTitle}>Scheduled Events</Text>
          {scheduleEvents.slice(0, 4).map((event) => (
            <TouchableOpacity key={event.id} style={styles.scheduleItem}>
              <View style={[styles.scheduleDot, { backgroundColor: event.color ?? '#8B5CF6' }]} />
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleEventTitle}>{event.title}</Text>
                <Text style={styles.scheduleEventTime}>
                  {event.start_time ? event.start_time : ''}
                  {event.end_time ? ` – ${event.end_time}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {groups.length > 0 ? (
        groups.map((group) => (
          <TouchableOpacity key={group.id} style={styles.groupTouchable}>
            <GroupCard
              name={group.name}
              category={group.category as any}
              lead={group.lead}
              lastMessage={group.lastMessage ?? undefined}
            />
          </TouchableOpacity>
        ))
      ) : (
        <EmptyState
          title="No conversations yet"
          message="Groups appear here once you are enrolled"
        />
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
  groupTouchable: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  scheduleSection: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
    padding: spacing.md,
  },
  scheduleSectionTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.ivoryDark,
  },
  scheduleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.sm,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleEventTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.charcoal,
  },
  scheduleEventTime: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginTop: 2,
  },
});
