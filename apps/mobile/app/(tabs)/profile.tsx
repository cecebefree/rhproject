// ProfileScreen — 3 variants: Student, Adult, Teacher
// Tables: public.profiles, office_desk.students, office_desk.family_accounts,
//         office_desk.invoices, office_desk.payments

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EditProfileModal } from '../../src/components/EditProfileModal';
import { EnrolledClassesList } from '../../src/components/EnrolledClassesList';
import { LoadingState } from '../../src/components/LoadingState';
import { PaymentHistoryList } from '../../src/components/PaymentHistoryList';
import { RegistrationStatusTimeline } from '../../src/components/RegistrationStatusTimeline';
import {
  fetchAdultProfile,
  fetchEnrolledClasses,
  fetchInvoices,
  fetchPaymentHistory,
  fetchRegistrationStatus,
  fetchStudentProfile,
  fetchTeacherProfile,
  getCurrentUser,
  updateStudentProfile,
} from '../../src/lib/profileClient';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import type {
  AdultProfile,
  ChildRecord,
  EnrolledClass,
  FamilyAccountDetail,
  InvoiceRecord,
  PaymentRecord,
  RegistrationRecord,
  StudentProfile,
  TeacherProfile,
  UserRole,
} from '../../src/types/profile';
import { INVOICE_STATUS_COLORS } from '../../src/types/profile';

const SUPPORT_EMAIL = 'support@redhouse.co.za';
const FAQ_URL = 'https://redhouse.co.za/faq';

// ═══════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════

export default function ProfileScreen() {
  const router = useRouter();

  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Student state
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([]);
  const [registration, setRegistration] = useState<RegistrationRecord | null>(null);

  // Adult state
  const [adultProfile, setAdultProfile] = useState<AdultProfile | null>(null);
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [familyAccount, setFamilyAccount] = useState<FamilyAccountDetail | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);

  // Teacher state
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);

  // Shared
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1. Get current user role
    const { userId, role: userRole, error: roleError } = await getCurrentUser();
    if (roleError || !userRole) {
      setError(roleError ?? 'Unable to determine role');
      setLoading(false);
      return;
    }

    setRole(userRole as UserRole);

    // 2. Load role-specific data
    if (userRole === 'student') {
      const [profileResult, classesResult, regResult, payResult] = await Promise.all([
        fetchStudentProfile(),
        fetchEnrolledClasses(),
        fetchRegistrationStatus(),
        fetchPaymentHistory(),
      ]);

      if (profileResult.error) {
        setError(profileResult.error);
        setLoading(false);
        return;
      }

      setStudentProfile(profileResult.data);
      setEnrolledClasses(classesResult.data);
      setRegistration(regResult.data);
      setPayments(payResult.data);
    } else if (userRole === 'adult') {
      const [profileResult, invoicesResult, payResult] = await Promise.all([
        fetchAdultProfile(),
        fetchInvoices(),
        fetchPaymentHistory(),
      ]);

      if (profileResult.error) {
        setError(profileResult.error);
        setLoading(false);
        return;
      }

      setAdultProfile(profileResult.data);
      setChildren(profileResult.children);
      setFamilyAccount(profileResult.familyAccount);
      setInvoices(invoicesResult.data);
      setPayments(payResult.data);
    } else if (userRole === 'teacher') {
      const [profileResult, payResult] = await Promise.all([
        fetchTeacherProfile(),
        fetchPaymentHistory(),
      ]);

      if (profileResult.error) {
        setError(profileResult.error);
        setLoading(false);
        return;
      }

      setTeacherProfile(profileResult.data);
      setPayments(payResult.data);
    }

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
    console.log('Payment receipt:', payment.id);
  }, []);

  const handleEditSave = useCallback(
    async (updates: { name: string; phone: string }) => {
      const { error: saveError } = await updateStudentProfile(updates);
      if (saveError) return saveError;

      // Refresh based on role
      if (role === 'student') {
        const result = await fetchStudentProfile();
        if (result.data) setStudentProfile(result.data);
      } else if (role === 'adult') {
        const result = await fetchAdultProfile();
        if (result.data) setAdultProfile(result.data);
      } else if (role === 'teacher') {
        const result = await fetchTeacherProfile();
        if (result.data) setTeacherProfile(result.data);
      }

      setEditModalVisible(false);
      return null;
    },
    [role]
  );

  // ─── LOADING ───
  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centered}>
        <LoadingState />
      </ScrollView>
    );
  }

  // ─── ERROR ───
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

  // ─── PROFILE NOT FOUND ───
  const profileData = studentProfile ?? adultProfile ?? teacherProfile;
  if (!profileData) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centered}>
        <Text style={styles.errorTitle}>Profile not found</Text>
        <Text style={styles.errorMessage}>Contact Office Desk</Text>
      </ScrollView>
    );
  }

  // ─── RENDER ───
  return (
    <ScrollView style={styles.container}>
      {/* ═══ HEADER (shared) ═══ */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{profileData.name ?? 'User'}</Text>
            {profileData.email && <Text style={styles.email}>{profileData.email}</Text>}
            {profileData.phone && <Text style={styles.phone}>{profileData.phone}</Text>}
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{role?.toUpperCase()}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => setEditModalVisible(true)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ STUDENT PROFILE ═══ */}
      {role === 'student' && studentProfile && (
        <StudentSections
          profile={studentProfile}
          enrolledClasses={enrolledClasses}
          registration={registration}
          onClassPress={handleClassPress}
          onPaymentPress={handlePaymentPress}
        />
      )}

      {/* ═══ ADULT PROFILE ═══ */}
      {role === 'adult' && adultProfile && (
        <AdultSections
          profile={adultProfile}
          childRecords={children}
          familyAccount={familyAccount}
          invoices={invoices}
          payments={payments}
          onPaymentPress={handlePaymentPress}
        />
      )}

      {/* ═══ TEACHER PROFILE ═══ */}
      {role === 'teacher' && teacherProfile && (
        <TeacherSections profile={teacherProfile} onClassPress={handleClassPress} />
      )}

      {/* ═══ SUPPORT (shared) ═══ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>

        {profileData.phone && (
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Phone</Text>
            <Text style={styles.contactValue}>{profileData.phone}</Text>
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

      <View style={styles.spacer} />

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={editModalVisible}
        name={profileData.name ?? ''}
        phone={profileData.phone ?? ''}
        onSave={handleEditSave}
        onCancel={() => setEditModalVisible(false)}
      />
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════
// STUDENT SECTIONS
// ═══════════════════════════════════════════════════════════

function StudentSections({
  profile,
  enrolledClasses,
  registration,
  onClassPress,
  onPaymentPress,
}: {
  profile: StudentProfile;
  enrolledClasses: EnrolledClass[];
  registration: RegistrationRecord | null;
  onClassPress: (classId: string) => void;
  onPaymentPress: (payment: PaymentRecord) => void;
}) {
  return (
    <>
      {/* Curriculum info */}
      {(profile.curriculum || profile.current_stage || profile.intake_group) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic</Text>
          <View style={styles.infoGrid}>
            {profile.curriculum && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Curriculum</Text>
                <Text style={styles.infoValue}>{profile.curriculum}</Text>
              </View>
            )}
            {profile.current_stage && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Stage</Text>
                <Text style={styles.infoValue}>{profile.current_stage}</Text>
              </View>
            )}
            {profile.intake_group && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Intake</Text>
                <Text style={styles.infoValue}>{profile.intake_group}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Enrolled Classes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Classes</Text>
        <EnrolledClassesList classes={enrolledClasses} onClassPress={onClassPress} />
      </View>

      {/* Registration Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registration</Text>
        <RegistrationStatusTimeline registration={registration} />
      </View>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// ADULT SECTIONS
// ═══════════════════════════════════════════════════════════

function AdultSections({
  profile,
  childRecords,
  familyAccount,
  invoices,
  payments,
  onPaymentPress,
}: {
  profile: AdultProfile;
  childRecords: ChildRecord[];
  familyAccount: FamilyAccountDetail | null;
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  onPaymentPress: (payment: PaymentRecord) => void;
}) {
  return (
    <>
      {/* Children */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Children</Text>
        {childRecords.length === 0 ? (
          <Text style={styles.emptyText}>No children linked to your account</Text>
        ) : (
          <View style={styles.cardList}>
            {childRecords.map((child) => (
              <View key={child.id} style={styles.childCard}>
                <Text style={styles.childName}>{child.name ?? 'Student'}</Text>
                <View style={styles.childDetails}>
                  {child.curriculum && (
                    <Text style={styles.childDetail}>Curriculum: {child.curriculum}</Text>
                  )}
                  {child.current_stage && (
                    <Text style={styles.childDetail}>Stage: {child.current_stage}</Text>
                  )}
                  {child.grade && <Text style={styles.childDetail}>Grade: {child.grade}</Text>}
                  {child.intake_group && (
                    <Text style={styles.childDetail}>Intake: {child.intake_group}</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        child.status === 'active' ? colors.success : colors.charcoalLight,
                    },
                  ]}
                >
                  <Text style={styles.statusText}>{child.status ?? 'pending'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Family Account */}
      {familyAccount && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Family Account</Text>
          <View style={styles.accountCard}>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      familyAccount.status === 'active' ? colors.success : colors.warning,
                  },
                ]}
              >
                <Text style={styles.statusText}>{familyAccount.status ?? 'unknown'}</Text>
              </View>
            </View>
            {familyAccount.family_name && (
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Family</Text>
                <Text style={styles.accountValue}>{familyAccount.family_name}</Text>
              </View>
            )}
            {familyAccount.primary_contact_email && (
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Contact Email</Text>
                <Text style={styles.accountValue}>{familyAccount.primary_contact_email}</Text>
              </View>
            )}
            {familyAccount.primary_contact_phone && (
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Contact Phone</Text>
                <Text style={styles.accountValue}>{familyAccount.primary_contact_phone}</Text>
              </View>
            )}
            {familyAccount.bank_name && (
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Bank</Text>
                <Text style={styles.accountValue}>{familyAccount.bank_name}</Text>
              </View>
            )}
            {familyAccount.bank_sort_code && (
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Sort Code</Text>
                <Text style={styles.accountValue}>{familyAccount.bank_sort_code}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Invoices */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invoices</Text>
        {invoices.length === 0 ? (
          <Text style={styles.emptyText}>No invoices yet</Text>
        ) : (
          <View style={styles.cardList}>
            {invoices.map((inv) => (
              <View key={inv.id} style={styles.invoiceCard}>
                <View style={styles.invoiceHeader}>
                  <Text style={styles.invoiceNumber}>{inv.invoice_number ?? 'Invoice'}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: INVOICE_STATUS_COLORS[inv.status] ?? colors.charcoalLight,
                      },
                    ]}
                  >
                    <Text style={styles.statusText}>{inv.status}</Text>
                  </View>
                </View>
                {inv.description && <Text style={styles.invoiceDesc}>{inv.description}</Text>}
                <View style={styles.invoiceFooter}>
                  <Text style={styles.invoiceAmount}>
                    {inv.currency} {inv.amount.toFixed(2)}
                  </Text>
                  {inv.due_date && (
                    <Text style={styles.invoiceDue}>
                      Due:{' '}
                      {new Date(inv.due_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Payments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment History</Text>
        <PaymentHistoryList payments={payments} onPaymentPress={onPaymentPress} />
      </View>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// TEACHER SECTIONS
// ═══════════════════════════════════════════════════════════

function TeacherSections({
  profile,
  onClassPress,
}: {
  profile: TeacherProfile;
  onClassPress: (classId: string) => void;
}) {
  return (
    <>
      {/* Classes Taught */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Classes Taught</Text>
        {profile.classes_taught.length === 0 ? (
          <Text style={styles.emptyText}>No classes assigned</Text>
        ) : (
          <View style={styles.cardList}>
            {profile.classes_taught.map((cls) => (
              <TouchableOpacity
                key={cls.course_id}
                style={styles.teacherClassCard}
                onPress={() => onClassPress(cls.course_id)}
                activeOpacity={0.7}
              >
                <View style={styles.teacherClassHeader}>
                  <Text style={styles.teacherClassName} numberOfLines={1}>
                    {cls.title}
                  </Text>
                  {cls.section && (
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>{cls.section}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.teacherClassMeta}>
                  {cls.student_count} student{cls.student_count !== 1 ? 's' : ''}
                  {cls.type ? ` · ${cls.type}` : ''}
                </Text>

                {/* Student list */}
                {cls.students.length > 0 && (
                  <View style={styles.studentList}>
                    {cls.students.map((student) => (
                      <View key={student.id} style={styles.studentRow}>
                        <Text style={styles.studentName} numberOfLines={1}>
                          {student.name ?? 'Student'}
                        </Text>
                        {student.grade && <Text style={styles.studentGrade}>{student.grade}</Text>}
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════

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
    marginBottom: spacing.xs,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.navy,
  },
  roleText: {
    fontSize: typography.sizes.badge,
    color: '#fff',
    fontWeight: typography.weights.medium,
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
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
  // Info grid (student academic)
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoItem: {
    minWidth: 100,
  },
  infoLabel: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  // Card lists
  cardList: {
    gap: spacing.sm,
  },
  // Child card
  childCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  childName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  childDetails: {
    gap: 2,
    marginBottom: spacing.sm,
  },
  childDetail: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.sizes.badge,
    color: '#fff',
    fontWeight: typography.weights.medium,
  },
  // Account card
  accountCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
    gap: spacing.sm,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountLabel: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
  accountValue: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.charcoal,
  },
  // Invoice card
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  invoiceNumber: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  invoiceDesc: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginBottom: spacing.xs,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceAmount: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  invoiceDue: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
  },
  // Teacher class card
  teacherClassCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  teacherClassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  teacherClassName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    flex: 1,
    marginRight: spacing.sm,
  },
  teacherClassMeta: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginBottom: spacing.sm,
  },
  sectionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.navy,
  },
  sectionBadgeText: {
    fontSize: typography.sizes.badge,
    color: '#fff',
    fontWeight: typography.weights.medium,
  },
  // Student list (teacher view)
  studentList: {
    borderTopWidth: 1,
    borderTopColor: colors.ivoryDark,
    paddingTop: spacing.sm,
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  studentName: {
    fontSize: typography.sizes.caption,
    color: colors.charcoal,
    flex: 1,
  },
  studentGrade: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.charcoalLight,
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
