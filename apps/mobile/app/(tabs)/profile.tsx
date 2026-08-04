// ProfileScreen — Row 33 wiring
// Live data: profiles (name, role) via single supabase import
// Seed-only fields (curriculum, grade, stage, intake): DB columns not yet
// migrated; display from SEED_USER fallback until schema extension.

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { EmptyState } from '../../src/components/EmptyState';
import { SEED_USER } from '../../src/seed/user';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

interface Profile {
  name: string;
  role: string;
  created_at: string;
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

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setError('Not authenticated');
          setLoading(false);
        }
        return;
      }

      const { data, error: profErr } = await supabase
        .from('profiles')
        .select('name, role, created_at')
        .eq('id', user.id)
        .single();

      if (!cancelled) {
        if (profErr) {
          setError(profErr.message);
        } else {
          setProfile(data);
        }
        setLoading(false);
      }
    }

    loadProfile();
    return () => { cancelled = true; };
  }, []);

  const displayName = profile?.name ?? SEED_USER.name;
  const displayRole = profile?.role ?? SEED_USER.role;

  return (
    <ScrollView style={styles.container}>
      {/* User info */}
      {loading ? (
        <SectionLoader />
      ) : error ? (
        <SectionError message={error} />
      ) : profile ? (
        <View style={styles.section}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.role}>
            {displayRole} · {SEED_USER.curriculum} · 2026
          </Text>
          <Text style={styles.detail}>Grade: {SEED_USER.grade}</Text>
          <Text style={styles.detail}>School stage: {SEED_USER.stage}</Text>
          <Text style={styles.detail}>Intake: {SEED_USER.intake}</Text>
        </View>
      ) : (
        <SectionError message="Profile not found" />
      )}

      {/* My Groups mirror — read-only */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Groups</Text>
        <Text style={styles.emptyText}>Groups data not yet wired</Text>
      </View>

      {/* Quick links */}
      <View style={styles.section}>
        <Text style={styles.link}>My Certificates</Text>
        <Text style={styles.link}>View booklist</Text>
        <Text style={styles.link}>Contact school</Text>
        <Text style={styles.link}>Log out</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  section: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  name: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  role: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    marginBottom: spacing.sm,
  },
  detail: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
  link: {
    fontSize: typography.sizes.body,
    color: colors.burgundy,
    paddingVertical: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
});
