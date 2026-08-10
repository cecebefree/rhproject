// TeacherScreen — Row 37 wiring
// Live data: profiles (name, role, curriculum, grade, stage, intake)
// + conversations via conversation_members (059_chat_tables.sql).
// Source: frozen Design 7 (07-teacher-variant.md)

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { EmptyState } from '../../src/components/EmptyState';
import { supabase } from '../../src/services/supabase';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

interface Profile {
  name: string;
  role: string;
}

interface GroupRow {
  conversation_id: string;
  role: string;
  joined_at: string;
  conversations: {
    id: string;
    category: string;
    created_at: string;
  }[];
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

export default function TeacherScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaEnabled, setMediaEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTeacherData() {
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

      // 1. Profile
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', user.id)
        .single();

      if (!cancelled) {
        if (profErr) setError(profErr.message);
        else setProfile(prof);
      }

      // 2. Groups (conversation memberships)
      const { data: groupData, error: groupErr } = await supabase
        .from('conversation_members')
        .select('conversation_id, role, joined_at, conversations!inner(id, category, created_at)')
        .eq('profile_id', user.id);

      if (!cancelled) {
        if (groupErr) setError(groupErr.message);
        else setGroups(groupData ?? []);
        setLoading(false);
      }
    }

    loadTeacherData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <SectionLoader />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <ScrollView style={styles.container}>
        <SectionError message={error} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Teacher</Text>
        <Text style={styles.subtitle}>Group Lead controls</Text>
      </View>

      {/* Lead badge */}
      <View style={styles.section}>
        <View style={styles.leadBadge}>
          <Text style={styles.leadText}>Group Lead</Text>
        </View>
        <Text style={styles.leadName}>{profile?.name ?? 'Teacher'}</Text>
      </View>

      {/* Media dial — lead toggle (state only) */}
      <View style={styles.section}>
        <View style={styles.mediaRow}>
          <Text style={styles.mediaLabel}>Media types</Text>
          <Text style={styles.mediaValue}>{mediaEnabled ? 'All media' : 'Text + emoji'}</Text>
        </View>
        <Switch
          value={mediaEnabled}
          onValueChange={setMediaEnabled}
          trackColor={{ false: colors.charcoalLight, true: colors.burgundy }}
        />
      </View>

      {/* My Groups */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Groups</Text>
        {groups.length === 0 ? (
          <EmptyState title="No groups yet" message="You'll be added during onboarding" />
        ) : (
          groups.map((g) => {
            const convo = g.conversations[0];
            return (
              <View key={g.conversation_id} style={styles.groupItem}>
                <Text style={styles.groupCategory}>{convo?.category ?? 'general'}</Text>
                <Text style={styles.groupRole}>Role: {g.role}</Text>
                <Text style={styles.groupJoined}>
                  Joined: {new Date(g.joined_at).toLocaleDateString()}
                </Text>
              </View>
            );
          })
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
  },
  title: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
  },
  subtitle: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginTop: spacing.xs,
  },
  section: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  leadBadge: {
    backgroundColor: colors.burgundy,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  leadText: {
    color: '#fff',
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.medium,
  },
  leadName: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
  },
  mediaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaLabel: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
  },
  mediaValue: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
  sectionTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  groupItem: {
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  groupCategory: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  groupRole: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginBottom: 2,
  },
  groupJoined: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
  },
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
});
