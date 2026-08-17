// ProfileScreen — Row 36 wiring + Row 83 role-conditional sections
// Live data: profiles (name, role, curriculum, grade, stage, intake)
// All fields backed by DB columns as of migration 089. No seed fallback.
// Row 83: Conditional sections by role (student/teacher/admin)

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../src/components/EmptyState';
import { supabase } from '../../src/services/supabase';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

interface Profile {
  name: string;
  role: string;
  curriculum: string | null;
  grade: string | null;
  stage: string | null;
  intake: string | null;
  created_at: string;
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

// ═══════════════════════════════════════════════════════════
// Role-conditional sections (Row 83)
// ═══════════════════════════════════════════════════════════

function StudentSections({ profile }: { profile: Profile }) {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Academic Info</Text>
        <Text style={styles.detail}>Curriculum: {profile.curriculum ?? '—'}</Text>
        <Text style={styles.detail}>Grade: {profile.grade ?? '—'}</Text>
        <Text style={styles.detail}>School stage: {profile.stage ?? '—'}</Text>
        <Text style={styles.detail}>Intake: {profile.intake ?? '—'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Groups</Text>
        <Text style={styles.emptyText}>Groups wired via conversation_members (059)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Progress</Text>
        <Text style={styles.emptyText}>
          Attendance and grades wired via school_desk (rows 73-74)
        </Text>
      </View>
    </>
  );
}

function TeacherSections() {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Classes</Text>
        <Text style={styles.emptyText}>Classes wired via school_desk.courses + enrollments</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attendance</Text>
        <Text style={styles.emptyText}>Mark attendance via school_desk (row 73)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gradebook</Text>
        <Text style={styles.emptyText}>
          Gradebook and assignments wired via school_desk (row 74)
        </Text>
      </View>
    </>
  );
}

function AdminSections() {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Desk Access</Text>
        <Text style={styles.detail}>Front Desk — leads & callbacks</Text>
        <Text style={styles.detail}>School Desk — courses & reports</Text>
        <Text style={styles.detail}>Office Desk — invoices & payments</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System</Text>
        <Text style={styles.emptyText}>Dashboard stats wired via office_desk views (row 111)</Text>
      </View>
    </>
  );
}

function QuickLinks() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Links</Text>
      <Text style={styles.link}>My Certificates</Text>
      <Text style={styles.link}>View booklist</Text>
      <Text style={styles.link}>Contact school</Text>
      <Text style={styles.link}>Log out</Text>
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

      const { data, error: profErr } = await supabase
        .from('profiles')
        .select('name, role, curriculum, grade, stage, intake, created_at')
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

  if (!profile) {
    return (
      <ScrollView style={styles.container}>
        <EmptyState title="Profile not found" message="Contact Office Desk" />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* User info — always shown */}
      <View style={styles.section}>
        <Text style={styles.name}>{profile.name ?? 'User'}</Text>
        <Text style={styles.role}>{profile.role}</Text>
      </View>

      {/* Role-conditional sections */}
      {profile.role === 'student' && <StudentSections profile={profile} />}
      {profile.role === 'teacher' && <TeacherSections />}
      {(profile.role === 'admin' || profile.role === 'expert') && <AdminSections />}

      {/* Quick links — always shown */}
      <QuickLinks />
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
