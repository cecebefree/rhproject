// School Desk page — Row 67/68/69/71/72/73/74 scope
// Reworked: registration intake, list, detail views + news + broadcasts + report cards + payments + attendance + gradebook
// Teacher workflow: create registrations, submit for review, author news, send broadcasts, write report cards, collect payments, mark attendance, manage assignments/grades

import { useEffect, useState } from 'react';
import { RegistrationIntakeForm } from '../components/RegistrationIntakeForm';
import { RegistrationList } from '../components/RegistrationList';
import { RegistrationDetail } from '../components/RegistrationDetail';
import { NewsList } from '../components/NewsList';
import { NewsDetail } from '../components/NewsDetail';
import { NewsForm } from '../components/NewsForm';
import { BroadcastList } from '../components/BroadcastList';
import { BroadcastDetail } from '../components/BroadcastDetail';
import { BroadcastForm } from '../components/BroadcastForm';
import { ReportCardList } from '../components/ReportCardList';
import { ReportCardDetail } from '../components/ReportCardDetail';
import { ReportCardForm } from '../components/ReportCardForm';
import { PaymentList } from '../components/PaymentList';
import { PaymentDetail } from '../components/PaymentDetail';
import { PaymentRequestForm } from '../components/PaymentRequestForm';
import { AttendanceList } from '../components/AttendanceList';
import { AttendanceDetail } from '../components/AttendanceDetail';
import { AttendanceForm } from '../components/AttendanceForm';
import { AssignmentForm } from '../components/AssignmentForm';
import { GradebookForm } from '../components/GradebookForm';
import { GradebookList } from '../components/GradebookList';
import { GradebookDetail } from '../components/GradebookDetail';
import { StudentList } from '../components/StudentList';
import type { Student } from '../components/StudentList';
import { StudentDetail } from '../components/StudentDetail';
import { SendMessageModal } from '../components/SendMessageModal';
import { StudentTranscript } from '../components/StudentTranscript';
import { NotificationCenter } from '../../../components/NotificationCenter';
import { supabase } from '../services/supabase';
import type { Registration } from '../services/supabase';
import type { News } from '../services/supabase';
import type { BroadcastWithGroup } from '../services/supabase';

interface Profile {
  id: string;
  name: string;
  role: string;
  tenant_id: string | null;
}

type ViewMode =
  | 'intake'
  | 'list'
  | 'detail'
  | 'students'
  | 'students-detail'
  | 'send-message'
  | 'news'
  | 'news-detail'
  | 'news-create'
  | 'news-edit'
  | 'broadcasts'
  | 'broadcasts-detail'
  | 'broadcasts-create'
  | 'report-cards'
  | 'report-cards-detail'
  | 'report-cards-create'
  | 'report-cards-edit'
  | 'payments'
  | 'payments-detail'
  | 'payments-create'
  | 'attendance'
  | 'attendance-detail'
  | 'attendance-mark'
  | 'gradebook'
  | 'gradebook-detail'
  | 'gradebook-create-assignment'
  | 'gradebook-enter-grades'
  | 'gradebook-transcript';

export default function SchoolDeskPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRegistration, setSelectedRegistration] =
    useState<Registration | null>(null);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [selectedBroadcast, setSelectedBroadcast] =
    useState<BroadcastWithGroup | null>(null);
  const [selectedReportCardId, setSelectedReportCardId] =
    useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] =
    useState<string | null>(null);
  const [selectedAttendanceCourseId, setSelectedAttendanceCourseId] =
    useState<string | null>(null);
  const [selectedAttendanceDate, setSelectedAttendanceDate] =
    useState<string | null>(null);
  const [selectedGradebookCourseId, setSelectedGradebookCourseId] =
    useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
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

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, role, tenant_id')
        .eq('id', user.id)
        .single();

      if (!cancelled) {
        if (profileError) {
          setError(profileError.message);
        } else if (
          profileData.role !== 'teacher' &&
          profileData.role !== 'admin'
        ) {
          setError('Access denied. School Desk is for teachers and admins only.');
        } else {
          setProfile(profileData);
        }
        setLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelectRegistration(reg: Registration) {
    setSelectedRegistration(reg);
    setViewMode('detail');
  }

  function handleBackToList() {
    setSelectedRegistration(null);
    setViewMode('list');
  }

  function handleSelectNews(news: News) {
    setSelectedNews(news);
    setViewMode('news-detail');
  }

  function handleBackToNewsList() {
    setSelectedNews(null);
    setViewMode('news');
  }

  function handleEditNews(news: News) {
    setSelectedNews(news);
    setViewMode('news-edit');
  }

  function handleSelectBroadcast(broadcast: BroadcastWithGroup) {
    setSelectedBroadcast(broadcast);
    setViewMode('broadcasts-detail');
  }

  function handleBackToBroadcasts() {
    setSelectedBroadcast(null);
    setViewMode('broadcasts');
  }

  function handleSelectReportCard(cardId: string) {
    setSelectedReportCardId(cardId);
    setViewMode('report-cards-detail');
  }

  function handleBackToReportCards() {
    setSelectedReportCardId(null);
    setViewMode('report-cards');
  }

  function handleEditReportCard(cardId: string) {
    setSelectedReportCardId(cardId);
    setViewMode('report-cards-edit');
  }

  function handleSelectPayment(paymentId: string) {
    setSelectedPaymentId(paymentId);
    setViewMode('payments-detail');
  }

  function handleBackToPayments() {
    setSelectedPaymentId(null);
    setViewMode('payments');
  }

  function handleSelectAttendance(courseId: string, date: string) {
    setSelectedAttendanceCourseId(courseId);
    setSelectedAttendanceDate(date);
    setViewMode('attendance-detail');
  }

  function handleBackToAttendance() {
    setSelectedAttendanceCourseId(null);
    setSelectedAttendanceDate(null);
    setViewMode('attendance');
  }

  function handleSelectGradebookCourse(courseId: string) {
    setSelectedGradebookCourseId(courseId);
    setViewMode('gradebook-detail');
  }

  function handleBackToGradebook() {
    setSelectedGradebookCourseId(null);
    setViewMode('gradebook');
  }

  function handleViewStudentTranscript(studentId: string, studentName: string) {
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
    setViewMode('gradebook-transcript');
  }

  function handleBackFromTranscript() {
    setSelectedStudentId(null);
    setSelectedStudentName('');
    setViewMode('gradebook');
  }

  function handleSelectStudent(student: Student) {
    setSelectedStudent(student);
    setViewMode('students-detail');
  }

  function handleBackToStudents() {
    setSelectedStudent(null);
    setViewMode('students');
  }

  function handleSendMessage(studentId: string, studentName: string) {
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
    setShowMessageModal(true);
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <p>Loading School Desk...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>Unable to load</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>Access denied</h2>
          <p>Profile not found.</p>
        </div>
      </div>
    );
  }

  function isStudentsView() {
    return viewMode === 'students' || viewMode === 'students-detail' || viewMode === 'send-message';
  }

  function isRegistrationView() {
    return viewMode === 'intake' || viewMode === 'list' || viewMode === 'detail';
  }

  function isNewsView() {
    return (
      viewMode === 'news' ||
      viewMode === 'news-detail' ||
      viewMode === 'news-create' ||
      viewMode === 'news-edit'
    );
  }

  function isBroadcastView() {
    return (
      viewMode === 'broadcasts' ||
      viewMode === 'broadcasts-detail' ||
      viewMode === 'broadcasts-create'
    );
  }

  function isReportCardsView() {
    return (
      viewMode === 'report-cards' ||
      viewMode === 'report-cards-detail' ||
      viewMode === 'report-cards-create' ||
      viewMode === 'report-cards-edit'
    );
  }

  function isPaymentsView() {
    return (
      viewMode === 'payments' ||
      viewMode === 'payments-detail' ||
      viewMode === 'payments-create'
    );
  }

  function isAttendanceView() {
    return (
      viewMode === 'attendance' ||
      viewMode === 'attendance-detail' ||
      viewMode === 'attendance-mark'
    );
  }

  function isGradebookView() {
    return (
      viewMode === 'gradebook' ||
      viewMode === 'gradebook-detail' ||
      viewMode === 'gradebook-create-assignment' ||
      viewMode === 'gradebook-enter-grades' ||
      viewMode === 'gradebook-transcript'
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>School Desk</h1>
          <p style={styles.subtitle}>Registration, News, Broadcasts & Gradebook — {profile.name}</p>
        </div>
        <NotificationCenter userId={profile.id} />
      </header>

      <nav style={styles.nav}>
        <button
          type="button"
          style={isStudentsView() ? styles.navButtonActive : styles.navButton}
          onClick={() => setViewMode('students')}
        >
          Students
        </button>
        <button
          type="button"
          style={isRegistrationView() ? styles.navButtonActive : styles.navButton}
          onClick={() => setViewMode('list')}
        >
          Registrations
        </button>
        <button
          type="button"
          style={isNewsView() ? styles.navButtonActive : styles.navButton}
          onClick={() => setViewMode('news')}
        >
          News
        </button>
        <button
          type="button"
          style={isBroadcastView() ? styles.navButtonActive : styles.navButton}
          onClick={() => setViewMode('broadcasts')}
        >
          Broadcasts
        </button>
        <button
          type="button"
          style={isReportCardsView() ? styles.navButtonActive : styles.navButton}
          onClick={() => setViewMode('report-cards')}
        >
          Report Cards
        </button>
        <button
          type="button"
          style={isPaymentsView() ? styles.navButtonActive : styles.navButton}
          onClick={() => setViewMode('payments')}
        >
          Payments
        </button>
        <button
          type="button"
          style={isAttendanceView() ? styles.navButtonActive : styles.navButton}
          onClick={() => setViewMode('attendance')}
        >
          Attendance
        </button>
        <button
          type="button"
          style={isGradebookView() ? styles.navButtonActive : styles.navButton}
          onClick={() => setViewMode('gradebook')}
        >
          Gradebook
        </button>
      </nav>

      <main style={styles.main}>
        {/* Students views */}
        {viewMode === 'students' && profile.tenant_id && (
          <StudentList
            tenantId={profile.tenant_id}
            onSelect={handleSelectStudent}
          />
        )}
        {viewMode === 'students-detail' && selectedStudent && (
          <StudentDetail
            student={selectedStudent}
            onBack={handleBackToStudents}
            onSendMessage={handleSendMessage}
          />
        )}

        {/* Registration views */}
        {viewMode === 'intake' && profile.tenant_id && (
          <RegistrationIntakeForm
            tenantId={profile.tenant_id}
            onSuccess={() => setViewMode('list')}
          />
        )}
        {viewMode === 'list' && profile.tenant_id && (
          <div>
            <div style={styles.sectionHeader}>
              <button
                type="button"
                onClick={() => setViewMode('intake')}
                style={styles.createButton}
              >
                + New Registration
              </button>
            </div>
            <RegistrationList
              tenantId={profile.tenant_id}
              onSelect={handleSelectRegistration}
            />
          </div>
        )}
        {viewMode === 'detail' && selectedRegistration && (
          <RegistrationDetail
            registration={selectedRegistration}
            onBack={handleBackToList}
          />
        )}

        {/* News views */}
        {viewMode === 'news' && profile.tenant_id && (
          <div>
            <div style={styles.sectionHeader}>
              <button
                type="button"
                onClick={() => setViewMode('news-create')}
                style={styles.createButton}
              >
                + Create News
              </button>
            </div>
            <NewsList
              tenantId={profile.tenant_id}
              onSelect={handleSelectNews}
            />
          </div>
        )}
        {viewMode === 'news-detail' && selectedNews && (
          <NewsDetail
            newsId={selectedNews.id}
            currentUserId={profile.id}
            onBack={handleBackToNewsList}
            onEdit={handleEditNews}
          />
        )}
        {viewMode === 'news-create' && profile.tenant_id && (
          <NewsForm
            tenantId={profile.tenant_id}
            userId={profile.id}
            onSuccess={() => setViewMode('news')}
            onCancel={() => setViewMode('news')}
          />
        )}
        {viewMode === 'news-edit' && selectedNews && profile.tenant_id && (
          <NewsForm
            tenantId={profile.tenant_id}
            userId={profile.id}
            news={selectedNews}
            onSuccess={() => setViewMode('news')}
            onCancel={() => setViewMode('news')}
          />
        )}

        {/* Broadcast views */}
        {viewMode === 'broadcasts' && profile.tenant_id && (
          <div>
            <div style={styles.sectionHeader}>
              <button
                type="button"
                onClick={() => setViewMode('broadcasts-create')}
                style={styles.createButton}
              >
                + Send Broadcast
              </button>
            </div>
            <BroadcastList
              tenantId={profile.tenant_id}
              onSelect={handleSelectBroadcast}
            />
          </div>
        )}
        {viewMode === 'broadcasts-detail' && selectedBroadcast && (
          <BroadcastDetail
            broadcastId={selectedBroadcast.id}
            onBack={handleBackToBroadcasts}
          />
        )}
        {viewMode === 'broadcasts-create' && profile.tenant_id && (
          <BroadcastForm
            tenantId={profile.tenant_id}
            userId={profile.id}
            onSuccess={() => setViewMode('broadcasts')}
            onCancel={() => setViewMode('broadcasts')}
          />
        )}

        {/* Report Card views */}
        {viewMode === 'report-cards' && profile.tenant_id && (
          <div>
            <div style={styles.sectionHeader}>
              <button
                type="button"
                onClick={() => setViewMode('report-cards-create')}
                style={styles.createButton}
              >
                + Create Report Card
              </button>
            </div>
            <ReportCardList
              tenantId={profile.tenant_id}
              userId={profile.id}
              onSelect={handleSelectReportCard}
            />
          </div>
        )}
        {viewMode === 'report-cards-detail' && selectedReportCardId && (
          <ReportCardDetail
            cardId={selectedReportCardId}
            onBack={handleBackToReportCards}
            onEdit={handleEditReportCard}
          />
        )}
        {viewMode === 'report-cards-create' && profile.tenant_id && (
          <ReportCardForm
            tenantId={profile.tenant_id}
            userId={profile.id}
            onSuccess={() => setViewMode('report-cards')}
            onCancel={() => setViewMode('report-cards')}
          />
        )}
        {viewMode === 'report-cards-edit' && selectedReportCardId && (
          <ReportCardDetail
            cardId={selectedReportCardId}
            onBack={handleBackToReportCards}
            onEdit={handleEditReportCard}
          />
        )}

        {/* Payment views */}
        {viewMode === 'payments' && profile.tenant_id && (
          <div>
            <div style={styles.sectionHeader}>
              <button
                type="button"
                onClick={() => setViewMode('payments-create')}
                style={styles.createButton}
              >
                + Create Payment Request
              </button>
            </div>
            <PaymentList
              tenantId={profile.tenant_id}
              onSelect={handleSelectPayment}
            />
          </div>
        )}
        {viewMode === 'payments-detail' && selectedPaymentId && (
          <PaymentDetail
            paymentId={selectedPaymentId}
            onBack={handleBackToPayments}
          />
        )}
        {viewMode === 'payments-create' && profile.tenant_id && (
          <PaymentRequestForm
            tenantId={profile.tenant_id}
            userId={profile.id}
            onSuccess={() => setViewMode('payments')}
            onCancel={() => setViewMode('payments')}
          />
        )}

        {/* Attendance views */}
        {viewMode === 'attendance' && profile.tenant_id && (
          <div>
            <div style={styles.sectionHeader}>
              <button
                type="button"
                onClick={() => setViewMode('attendance-mark')}
                style={styles.createButton}
              >
                + Mark Attendance
              </button>
            </div>
            <AttendanceList
              tenantId={profile.tenant_id}
              onSelect={handleSelectAttendance}
            />
          </div>
        )}
        {viewMode === 'attendance-detail' &&
          selectedAttendanceCourseId &&
          selectedAttendanceDate && (
            <AttendanceDetail
              courseId={selectedAttendanceCourseId}
              classDate={selectedAttendanceDate}
              onBack={handleBackToAttendance}
            />
          )}
        {viewMode === 'attendance-mark' && profile.tenant_id && (
          <AttendanceForm
            tenantId={profile.tenant_id}
            userId={profile.id}
            onSuccess={() => setViewMode('attendance')}
            onCancel={() => setViewMode('attendance')}
          />
        )}

        {/* Gradebook views */}
        {viewMode === 'gradebook' && profile.tenant_id && (
          <GradebookList
            tenantId={profile.tenant_id}
            userId={profile.id}
            onSelectCourse={handleSelectGradebookCourse}
            onSelectAssignment={() => {}}
            onEnterGrades={() => setViewMode('gradebook-enter-grades')}
            onCreateAssignment={() => setViewMode('gradebook-create-assignment')}
          />
        )}
        {viewMode === 'gradebook-detail' && selectedGradebookCourseId && (
          <GradebookDetail
            courseId={selectedGradebookCourseId}
            courseTitle="Course"
            onBack={handleBackToGradebook}
            tenantId={profile.tenant_id!}
          />
        )}
        {viewMode === 'gradebook-create-assignment' && profile.tenant_id && (
          <AssignmentForm
            tenantId={profile.tenant_id}
            userId={profile.id}
            onSuccess={() => setViewMode('gradebook')}
            onCancel={() => setViewMode('gradebook')}
          />
        )}
        {viewMode === 'gradebook-enter-grades' && profile.tenant_id && (
          <GradebookForm
            tenantId={profile.tenant_id}
            userId={profile.id}
            onSuccess={() => setViewMode('gradebook')}
            onCancel={() => setViewMode('gradebook')}
          />
        )}
        {viewMode === 'gradebook-transcript' && selectedStudentId && (
          <StudentTranscript
            studentId={selectedStudentId}
            studentName={selectedStudentName}
            tenantId={profile.tenant_id!}
            onBack={handleBackFromTranscript}
          />
        )}

        {/* Send Message Modal */}
        {showMessageModal && selectedStudentId && profile && (
          <SendMessageModal
            studentId={selectedStudentId}
            studentName={selectedStudentName}
            tenantId={profile.tenant_id!}
            senderName={profile.name}
            onSent={() => {
              setShowMessageModal(false);
              setSelectedStudentId(null);
              setSelectedStudentName('');
            }}
            onCancel={() => {
              setShowMessageModal(false);
              setSelectedStudentId(null);
              setSelectedStudentName('');
            }}
          />
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    backgroundColor: '#1a365d',
    color: 'white',
    padding: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    opacity: 0.9,
    margin: '0',
  },
  nav: {
    display: 'flex',
    backgroundColor: '#2d3748',
    padding: '0 24px',
    gap: '4px',
  },
  navButton: {
    padding: '12px 24px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#a0aec0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    borderBottom: '2px solid transparent',
  },
  navButtonActive: {
    padding: '12px 24px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    borderBottom: '2px solid #4299e1',
  },
  main: {
    padding: '24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '16px',
  },
  createButton: {
    padding: '8px 16px',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096',
  },
  error: {
    padding: '48px',
    textAlign: 'center',
    color: '#e53e3e',
  },
};
