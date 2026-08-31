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
    <>
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}>
      {/* Avatar + Name */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profileData.name ? profileData.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={styles.profileName}>{profileData.name ?? 'User'}</Text>
        {profileData.email && <Text style={styles.profileEmail}>{profileData.email}</Text>}
        {profileData.phone && <Text style={styles.profilePhone}>{profileData.phone}</Text>}
        <TouchableOpacity style={styles.editButton} onPress={() => setEditModalVisible(true)}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* ═══ STUDENT PROFILE ═══ */}
      {role === 'student' && studentProfile && (
        <StudentSections
          profile={studentProfile}
          enrolledClasses={enrolledClasses}
          registration={registration}
          payments={payments}
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
    </ScrollView>

    {/* Edit Profile Modal */}
    <EditProfileModal
      visible={editModalVisible}
      name={profileData.name ?? ''}
      phone={profileData.phone ?? ''}
      onSave={handleEditSave}
      onCancel={() => setEditModalVisible(false)}
    />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// STUDENT SECTIONS
// ═══════════════════════════════════════════════════════════

function StudentSections({
  profile,
  enrolledClasses,
  registration,
  payments,
  onClassPress,
  onPaymentPress,
}: {
  profile: StudentProfile;
  enrolledClasses: EnrolledClass[];
  registration: RegistrationRecord | null;
  payments: PaymentRecord[];
  onClassPress: (classId: string) => void;
  onPaymentPress: (payment: PaymentRecord) => void;
}) {
  return (
    <>
      {/* Academic */}
      {(profile.curriculum || profile.current_stage || profile.intake_group) && (
        <View style={styles.sectionCard}>
          <View style={[styles.sectionCardHeader, { backgroundColor: colors.navy }]}>
            <Text style={styles.sectionCardTitle}>Academic</Text>
          </View>
          <View style={styles.sectionCardBody}>
            {profile.curriculum && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Curriculum</Text>
                <Text style={styles.infoValue}>{profile.curriculum}</Text>
              </View>
            )}
            {profile.current_stage && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Stage</Text>
                <Text style={styles.infoValue}>{profile.current_stage}</Text>
              </View>
            )}
            {profile.intake_group && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Intake</Text>
                <Text style={styles.infoValue}>{profile.intake_group}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Core Classes */}
      <View style={styles.sectionCard}>
        <View style={[styles.sectionCardHeader, { backgroundColor: colors.burgundy }]}>
          <Text style={styles.sectionCardTitle}>Core Classes</Text>
        </View>
        <View style={styles.sectionCardBody}>
          <EnrolledClassesList classes={enrolledClasses} onClassPress={onClassPress} />
        </View>
      </View>

      {/* Registration */}
      <View style={styles.sectionCard}>
        <View style={[styles.sectionCardHeader, { backgroundColor: colors.navy }]}>
          <Text style={styles.sectionCardTitle}>Registration</Text>
        </View>
        <View style={styles.sectionCardBody}>
          <RegistrationStatusTimeline registration={registration} />
        </View>
      </View>

      {/* Enrichment */}
      <View style={styles.sectionCard}>
        <View style={[styles.sectionCardHeader, { backgroundColor: colors.burgundy }]}>
          <Text style={styles.sectionCardTitle}>Enrichment</Text>
        </View>
        <View style={styles.sectionCardBody}>
          {enrolledClasses.filter(c => c.type === 'enrichment').length > 0 ? (
            enrolledClasses.filter(c => c.type === 'enrichment').map(c => (
              <TouchableOpacity key={c.id} style={styles.infoRow} onPress={() => onClassPress(c.id)}>
                <Text style={styles.infoLabel}>{c.title}</Text>
                <Text style={{ color: colors.charcoalLight, fontSize: 16 }}>{'›'}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ color: colors.charcoalLight, fontSize: 14 }}>No enrichment activities</Text>
          )}
        </View>
      </View>

      {/* Clubs */}
      <View style={styles.sectionCard}>
        <View style={[styles.sectionCardHeader, { backgroundColor: colors.navy }]}>
          <Text style={styles.sectionCardTitle}>Clubs</Text>
        </View>
        <View style={styles.sectionCardBody}>
          {enrolledClasses.filter(c => c.type === 'club').length > 0 ? (
            enrolledClasses.filter(c => c.type === 'club').map(c => (
              <TouchableOpacity key={c.id} style={styles.infoRow} onPress={() => onClassPress(c.id)}>
                <Text style={styles.infoLabel}>{c.title}</Text>
                <Text style={{ color: colors.charcoalLight, fontSize: 16 }}>{'›'}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ color: colors.charcoalLight, fontSize: 14 }}>No clubs joined</Text>
          )}
        </View>
      </View>

      {/* Groups */}
      <View style={styles.sectionCard}>
        <View style={[styles.sectionCardHeader, { backgroundColor: colors.burgundy }]}>
          <Text style={styles.sectionCardTitle}>Groups</Text>
        </View>
        <View style={styles.sectionCardBody}>
          <Text style={{ color: colors.charcoalLight, fontSize: 14 }}>Groups</Text>
        </View>
      </View>

      {/* Documents */}
      <View style={styles.sectionCard}>
        <View style={[styles.sectionCardHeader, { backgroundColor: colors.navy }]}>
          <Text style={styles.sectionCardTitle}>Documents</Text>
        </View>
        <View style={styles.sectionCardBody}>
          <Text style={{ color: colors.charcoalLight, fontSize: 14 }}>Documents</Text>
        </View>
      </View>

      {/* Activity */}
      <View style={styles.sectionCard}>
        <View style={[styles.sectionCardHeader, { backgroundColor: colors.burgundy }]}>
          <Text style={styles.sectionCardTitle}>Activity</Text>
        </View>
        <View style={styles.sectionCardBody}>
          <Text style={{ color: colors.charcoalLight, fontSize: 14 }}>Activity</Text>
        </View>
      </View>

      {/* Accounts */}
      <View style={styles.sectionCard}>
        <View style={[styles.sectionCardHeader, { backgroundColor: colors.navy }]}>
          <Text style={styles.sectionCardTitle}>Accounts</Text>
        </View>
        <View style={styles.sectionCardBody}>
          {payments.length > 0 ? (
            payments.slice(0, 3).map(p => (
              <TouchableOpacity key={p.id} style={styles.infoRow} onPress={() => onPaymentPress(p)}>
                <Text style={styles.infoLabel}>
                  {new Date(p.paid_at || p.created_at).toLocaleDateString('en-ZA')}
                </Text>
                <Text style={[styles.infoValue, { color: p.status === 'confirmed' ? '#27ae60' : colors.burgundy }]}>
                  R{Number(p.amount).toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ color: colors.charcoalLight, fontSize: 14 }}>No accounts</Text>
          )}
        </View>
      </View>

      {/* Service Desk */}
      <View style={styles.sectionCard}>
        <View style={[styles.sectionCardHeader, { backgroundColor: colors.burgundy }]}>
          <Text style={styles.sectionCardTitle}>Service Desk</Text>
        </View>
        <View style={styles.sectionCardBody}>
          <Text style={{ color: colors.charcoalLight, fontSize: 14 }}>Service Desk</Text>
        </View>
      </View>

      {/* General */}
      <View style={styles.sectionCard}>
        <View style={[styles.sectionCardHeader, { backgroundColor: colors.champagne }]}>
          <Text style={styles.sectionCardTitle}>General</Text>
        </View>
        <View style={styles.sectionCardBody}>
          {profile.created_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member since</Text>
              <Text style={styles.infoValue}>{new Date(profile.created_at).toLocaleDateString('en-ZA')}</Text>
            </View>
          )}
        </View>
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
    backgroundColor: '#F8F7F4',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#273946',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '500',
  },
  profileName: {
    fontSize: 22,
    color: '#273946',
    fontWeight: '500',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#8b939e',
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 14,
    color: '#8b939e',
    marginBottom: 12,
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#C8281E',
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 13,
    color: '#C8281E',
    fontWeight: '500',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionCardHeader: {
    backgroundColor: '#273946',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionCardTitle: {
    color: '#fff',
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '400',
    textTransform: 'uppercase',
  },
  sectionCardBody: {
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#8b939e',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#273946',
  },
  section: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#273946',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#8b939e',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#273946',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#8b939e',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#C8281E',
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  contactLabel: {
    fontSize: 14,
    color: '#8b939e',
  },
  contactValue: {
    fontSize: 14,
    color: '#273946',
  },
  supportLink: {
    paddingVertical: 10,
  },
  supportLinkText: {
    fontSize: 14,
    color: '#C8281E',
  },
  cardList: {
    gap: 8,
  },
  childCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  childName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#273946',
    marginBottom: 4,
  },
  childDetails: {
    gap: 2,
    marginBottom: 8,
  },
  childDetail: {
    fontSize: 12,
    color: '#8b939e',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  accountCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 8,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountLabel: {
    fontSize: 14,
    color: '#8b939e',
  },
  accountValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#273946',
  },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#273946',
  },
  invoiceDesc: {
    fontSize: 12,
    color: '#8b939e',
    marginBottom: 4,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#273946',
  },
  invoiceDue: {
    fontSize: 12,
    color: '#8b939e',
  },
  teacherClassCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  teacherClassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  teacherClassName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#273946',
    flex: 1,
    marginRight: 8,
  },
  teacherClassMeta: {
    fontSize: 12,
    color: '#8b939e',
    marginBottom: 8,
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#273946',
  },
  sectionBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  studentList: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  studentName: {
    fontSize: 12,
    color: '#273946',
    flex: 1,
  },
  studentGrade: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b939e',
  },
  spacer: {
    height: 40,
  },
});
