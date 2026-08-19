// ProfileScreen — Row 98: Student control center
// Sections: header, enrolled classes, registration status, payment history, grades+attendance, contact+support

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EditProfileModal } from '../../src/components/EditProfileModal';
import { EnrolledClassesList } from '../../src/components/EnrolledClassesList';
import { GradesAttendanceCard } from '../../src/components/GradesAttendanceCard';
import { LoadingState } from '../../src/components/LoadingState';
import { PaymentHistoryList } from '../../src/components/PaymentHistoryList';
import { RegistrationStatusTimeline } from '../../src/components/RegistrationStatusTimeline';
import {
  fetchAttendance,
  fetchEnrolledClasses,
  fetchGrades,
  fetchPaymentHistory,
  fetchRegistrationStatus,
  fetchStudentProfile,
  updateStudentProfile,
} from '../../src/lib/profileClient';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import type {
  AttendanceRecord,
  EnrolledClass,
  GradeRecord,
  PaymentRecord,
  RegistrationRecord,
  StudentProfile,
} from '../../src/types/profile';

const SUPPORT_EMAIL = 'support@redhouse.co.za';
const FAQ_URL = 'https://redhouse.co.za/faq';

export default function ProfileScreen() {
  const router = useRouter();

  // State
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([]);
  const [registration, setRegistration] = useState<RegistrationRecord | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const profileResult = await fetchStudentProfile();
    if (profileResult.error) {
      setError(profileResult.error);
      setLoading(false);
      return;
    }

    setProfile(profileResult.data);

    // Fetch all sections in parallel
    const [classesResult, regResult, payResult, gradesResult, attResult] = await Promise.all([
      fetchEnrolledClasses(),
      fetchRegistrationStatus(),
      fetchPaymentHistory(),
      fetchGrades(),
      fetchAttendance(),
    ]);

    setEnrolledClasses(classesResult.data);
    setRegistration(regResult.data);
    setPayments(payResult.data);
    setGrades(gradesResult.data);
    setAttendance(attResult.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleClassPress = useCallback(
    (classId: string) => {
      router.push(`/class-detail?classId=${classId}`);
    },
    [router]
  );

  const handlePaymentPress = useCallback((payment: PaymentRecord) => {
    // Receipt preview — show details in a future modal
    // For now, log to console
    console.log('Payment receipt:', payment.id);
  }, []);

  const handleEditSave = useCallback(async (updates: { name: string; phone: string }) => {
    const { error: saveError } = await updateStudentProfile(updates);
    if (saveError) return saveError;

    // Refresh profile
    const result = await fetchStudentProfile();
    if (result.data) setProfile(result.data);
    setEditModalVisible(false);
    return null;
  }, []);

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centered}>
        <LoadingState />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centered}>
        <Text style={styles.errorTitle}>Unable to load profile</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAll}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (!profile) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centered}>
        <Text style={styles.errorTitle}>Profile not found</Text>
        <Text style={styles.errorMessage}>Contact Office Desk</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* ═══ HEADER ═══ */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{profile.name ?? 'User'}</Text>
            {profile.email && <Text style={styles.email}>{profile.email}</Text>}
            {profile.phone && <Text style={styles.phone}>{profile.phone}</Text>}
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => setEditModalVisible(true)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ SECTION A: ENROLLED CLASSES ═══ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Classes</Text>
        <EnrolledClassesList classes={enrolledClasses} onClassPress={handleClassPress} />
      </View>

      {/* ═══ SECTION B: REGISTRATION STATUS ═══ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registration</Text>
        <RegistrationStatusTimeline registration={registration} />
      </View>

      {/* ═══ SECTION C: PAYMENT HISTORY ═══ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment History</Text>
        <PaymentHistoryList payments={payments} onPaymentPress={handlePaymentPress} />
      </View>

      {/* ═══ SECTION D: GRADES + ATTENDANCE ═══ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Grades & Attendance</Text>
        <GradesAttendanceCard grades={grades} attendance={attendance} />
      </View>

      {/* ═══ SECTION E: CONTACT + SUPPORT ═══ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>

        {profile.phone && (
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Phone</Text>
            <Text style={styles.contactValue}>{profile.phone}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.supportLink}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        >
          <Text style={styles.supportLinkText}>Email Support</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.supportLink} onPress={() => Linking.openURL(FAQ_URL)}>
          <Text style={styles.supportLinkText}>FAQ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.supportLink}
          onPress={() => Linking.openURL('https://wa.me/27000000000')}
        >
          <Text style={styles.supportLinkText}>Chat Support</Text>
        </TouchableOpacity>
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={editModalVisible}
        name={profile.name ?? ''}
        phone={profile.phone ?? ''}
        onSave={handleEditSave}
        onCancel={() => setEditModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
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
    marginBottom: spacing.md,
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    marginBottom: 2,
  },
  phone: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
  editButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.burgundy,
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: typography.sizes.caption,
    color: colors.burgundy,
    fontWeight: typography.weights.medium,
  },
  // Error / empty
  errorTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.burgundy,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  // Contact
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  contactLabel: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
  contactValue: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
  },
  supportLink: {
    paddingVertical: spacing.sm,
  },
  supportLinkText: {
    fontSize: typography.sizes.body,
    color: colors.burgundy,
  },
  spacer: {
    height: spacing.xxl,
  },
});
