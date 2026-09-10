import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { DeepLinkProvider } from './components/DeepLinkProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NavigationGuard } from './components/NavigationGuard';
import { ToastProvider } from './components/Toast';
import { RealtimeProvider } from './contexts/RealtimeProvider';
import { ServiceDeskAuthProvider, useServiceDeskAuth } from './contexts/ServiceDeskAuthProvider';
import { QueryProvider } from './providers/QueryProvider';

// ─── LAZY-LOADED PAGES ─────────────────────────────────────
const AdminCoursesPage = lazy(() => import('./features/admin/components/AdminCoursesPage'));
const FrontDeskPage = lazy(() => import('./features/front-desk').then(m => ({ default: m.FrontDeskPage })));
const FrontDeskLeadDetailPage = lazy(() => import('./features/front-desk/pages/FrontDeskLeadDetailPage'));
const OfficeDeskBillingPage = lazy(() => import('./features/lms/pages/OfficeDeskBillingPage'));
const OfficeDeskClassAssignmentsPage = lazy(() => import('./features/lms/pages/OfficeDeskClassAssignmentsPage'));
const OfficeDeskClassInstancesPage = lazy(() => import('./features/lms/pages/OfficeDeskClassInstancesPage'));
const OfficeDeskContractsPage = lazy(() => import('./features/lms/pages/OfficeDeskContractsPage'));
const OfficeDeskDebitOrdersPage = lazy(() => import('./features/lms/pages/OfficeDeskDebitOrdersPage'));
const OfficeDeskEnrollmentPipelinePage = lazy(() => import('./features/lms/pages/OfficeDeskEnrollmentPipelinePage'));
const OfficeDeskInvoiceDetailPage = lazy(() => import('./features/lms/pages/OfficeDeskInvoiceDetailPage'));
const OfficeDeskInvoicesPage = lazy(() => import('./features/lms/pages/OfficeDeskInvoicesPage'));
const OfficeDeskLeadDetailPage = lazy(() => import('./features/lms/pages/OfficeDeskLeadDetailPage'));
const OfficeDeskLeadsPage = lazy(() => import('./features/lms/pages/OfficeDeskLeadsPage'));
const OfficeDeskPage = lazy(() => import('./features/lms/pages/OfficeDeskPage'));
const OfficeDeskRegistrationsPage = lazy(() => import('./features/lms/pages/OfficeDeskRegistrationsPage'));
const OfficeDeskReportsPage = lazy(() => import('./features/lms/pages/OfficeDeskReportsPage'));
const OfficeDeskSettingsPage = lazy(() => import('./features/lms/pages/OfficeDeskSettingsPage'));
const SchoolDeskAttendancePage = lazy(() => import('./features/lms/pages/SchoolDeskAttendancePage'));
const SchoolDeskChatPage = lazy(() => import('./features/lms/pages/SchoolDeskChatPage'));
const SchoolDeskPage = lazy(() => import('./features/lms/pages/SchoolDeskPage'));
const SchoolDeskStudentProfilePage = lazy(() => import('./features/lms/pages/StudentProfilePage'));
const TeacherDashboardPage = lazy(() => import('./features/lms/pages/TeacherDashboardPage'));
const AnalyticsPage = lazy(() => import('./features/office-desk/components/AnalyticsPage'));
const FamilyAccountsDefault = lazy(() => import('./features/office-desk/components/FamilyAccountsDefault').then(m => ({ default: m.FamilyAccountsDefault })));
const WebhookManagementPage = lazy(() => import('./features/office-desk/components/WebhookManagementPage'));
const ParentPortalPage = lazy(() => import('./features/parent-portal/pages/ParentPortalPage'));
const RegistrationCancel = lazy(() => import('./features/registration/RegistrationCancel'));
const RegistrationPage = lazy(() => import('./features/registration/RegistrationPage'));
const RegistrationSuccess = lazy(() => import('./features/registration/RegistrationSuccess'));
const AdultProfilePage = lazy(() => import('./pages/AdultProfilePage'));
const ContractSignerPage = lazy(() => import('./pages/ContractSignerPage'));
const ContactFormPage = lazy(() => import('./pages/ContactFormPage'));
const CRMPage = lazy(() => import('./pages/CRMPage'));
const FamilyProfilePage = lazy(() => import('./pages/FamilyProfilePage'));
const ServiceDeskLogin = lazy(() => import('./pages/ServiceDeskLogin'));
const ServiceDeskPage = lazy(() => import('./pages/ServiceDeskPage'));
const StaffProfilePage = lazy(() => import('./pages/StaffProfilePage'));
const StudentProfilePage = lazy(() => import('./pages/StudentProfilePage'));
const FrontDeskAdmin = lazy(() => import('./pages/admin/FrontDeskAdmin').then(m => ({ default: m.FrontDeskAdmin })));

// ─── LOADING SPINNER ───────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#F8F7F4' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-[#E8A020] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm" style={{ color: '#54626C' }}>Loading...</span>
      </div>
    </div>
  );
}

// ─── SKIP TO CONTENT ───────────────────────────────────────
function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      style={{ backgroundColor: '#1A242B', color: '#ffffff' }}
    >
      Skip to main content
    </a>
  );
}

// ─── PROTECTED ROUTE ───────────────────────────────────────
function ProtectedDeskRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useServiceDeskAuth();
  if (!isAuthenticated) {
    return <Navigate to="/service-desk" replace />;
  }
  return <>{children}</>;
}

function IndexPage() {
  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>Redhouse Web</h1>
      <p>Cloudflare Pages — live deploy</p>
      <nav style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Link to="/service/front-desk">Front Desk</Link>
        <Link to="/admin/front-desk">Front Desk Admin</Link>
        <Link to="/service/school-desk">School Desk</Link>
        <Link to="/service/teacher">Teacher Dashboard</Link>
        <Link to="/service/office-desk">Office Desk</Link>
        <Link to="/service/admin/courses">Core Curriculums</Link>
        <Link to="/parent-portal">Parent Portal</Link>
        <Link to="/register">Register</Link>
      </nav>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>404 — Not Found</h1>
      <Link to="/">Return home</Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SkipToContent />
      <RealtimeProvider>
        <DeepLinkProvider>
          <ServiceDeskAuthProvider>
            <Routes>
              <Route path="/" element={<IndexPage />} />
              <Route path="/contract/:contractId/sign" element={
                <Suspense fallback={<PageLoader />}>
                  <ContractSignerPage />
                </Suspense>
              } />
              <Route path="/contact" element={
                <Suspense fallback={<PageLoader />}>
                  <ContactFormPage />
                </Suspense>
              } />
              <Route path="/service-desk" element={
                <Suspense fallback={<PageLoader />}>
                  <ServiceDeskLogin />
                </Suspense>
              } />
              <Route path="/service/service-desk" element={
                <ProtectedDeskRoute>
                  <Suspense fallback={<PageLoader />}>
                    <ServiceDeskPage />
                  </Suspense>
                </ProtectedDeskRoute>
              } />
              <Route path="/service/crm" element={
                <ProtectedDeskRoute>
                  <Suspense fallback={<PageLoader />}>
                    <CRMPage />
                  </Suspense>
                </ProtectedDeskRoute>
              } />
              <Route path="/service/crm/family/:familyId" element={
                <ProtectedDeskRoute>
                  <Suspense fallback={<PageLoader />}>
                    <FamilyProfilePage />
                  </Suspense>
                </ProtectedDeskRoute>
              } />
              <Route path="/service/crm/family/:familyId/adult/:adultId" element={
                <ProtectedDeskRoute>
                  <Suspense fallback={<PageLoader />}>
                    <AdultProfilePage />
                  </Suspense>
                </ProtectedDeskRoute>
              } />
              <Route path="/service/crm/family/:familyId/student/:studentId" element={
                <ProtectedDeskRoute>
                  <Suspense fallback={<PageLoader />}>
                    <StudentProfilePage />
                  </Suspense>
                </ProtectedDeskRoute>
              } />
              <Route path="/service/staff/:staffId" element={
                <ProtectedDeskRoute>
                  <Suspense fallback={<PageLoader />}>
                    <StaffProfilePage />
                  </Suspense>
                </ProtectedDeskRoute>
              } />
              <Route path="/service/front-desk" element={
                <ProtectedDeskRoute>
                  <Suspense fallback={<PageLoader />}>
                    <FrontDeskPage />
                  </Suspense>
                </ProtectedDeskRoute>
              } />
              <Route path="/service/front-desk/lead/:leadId" element={
                <ProtectedDeskRoute>
                  <Suspense fallback={<PageLoader />}>
                    <FrontDeskLeadDetailPage />
                  </Suspense>
                </ProtectedDeskRoute>
              } />
              <Route path="/service/school-desk" element={
                <ProtectedDeskRoute>
                  <Suspense fallback={<PageLoader />}>
                    <SchoolDeskPage />
                  </Suspense>
                </ProtectedDeskRoute>
              } />
              <Route path="/service/school-desk/student/:studentId" element={
                <ProtectedDeskRoute>
                  <Suspense fallback={<PageLoader />}>
                    <SchoolDeskStudentProfilePage />
                  </Suspense>
                </ProtectedDeskRoute>
              } />
              <Route path="/service/school-desk/attendance" element={
                <ProtectedDeskRoute>
                  <Suspense fallback={<PageLoader />}>
                    <SchoolDeskAttendancePage />
                  </Suspense>
                </ProtectedDeskRoute>
              } />
              <Route path="/service/school-desk/chat" element={
                <ProtectedDeskRoute>
                  <Suspense fallback={<PageLoader />}>
                    <SchoolDeskChatPage />
                  </Suspense>
                </ProtectedDeskRoute>
              } />
              <Route path="/service/teacher" element={
                <ProtectedDeskRoute>
                  <Suspense fallback={<PageLoader />}>
                    <TeacherDashboardPage />
                  </Suspense>
                </ProtectedDeskRoute>
              } />

              {/* LMS deferred — route stubs only (post-MVP) */}
              <Route path="/lms" element={<Navigate to="/service/school-desk" replace />} />
              <Route path="/lms/courses" element={<Navigate to="/service/school-desk" replace />} />
              <Route path="/lms/courses/:courseId" element={<Navigate to="/service/school-desk" replace />} />
              <Route path="/lms/courses/:courseId/lessons/:lessonId" element={<Navigate to="/service/school-desk" replace />} />
              <Route path="/lms/progress" element={<Navigate to="/service/school-desk" replace />} />
              <Route path="/lms/certificates" element={<Navigate to="/service/school-desk" replace />} />

              {/* Office Desk with nested routes */}
              <Route path="/service/office-desk" element={
                <ProtectedDeskRoute>
                  <Suspense fallback={<PageLoader />}>
                    <OfficeDeskPage />
                  </Suspense>
                </ProtectedDeskRoute>
              }>
                <Route index element={
                  <Suspense fallback={<PageLoader />}>
                    <FamilyAccountsDefault />
                  </Suspense>
                } />
                <Route path="leads" element={
                  <Suspense fallback={<PageLoader />}>
                    <OfficeDeskLeadsPage />
                  </Suspense>
                } />
                <Route path="leads/:leadId" element={
                  <Suspense fallback={<PageLoader />}>
                    <OfficeDeskLeadDetailPage />
                  </Suspense>
                } />
                <Route path="invoices" element={
                  <Suspense fallback={<PageLoader />}>
                    <OfficeDeskInvoicesPage />
                  </Suspense>
                } />
                <Route path="invoices/:invoiceId" element={
                  <Suspense fallback={<PageLoader />}>
                    <OfficeDeskInvoiceDetailPage />
                  </Suspense>
                } />
                <Route path="registrations" element={
                  <Suspense fallback={<PageLoader />}>
                    <OfficeDeskRegistrationsPage />
                  </Suspense>
                } />
                <Route path="registrations/:registrationId" element={
                  <Suspense fallback={<PageLoader />}>
                    <OfficeDeskRegistrationsPage />
                  </Suspense>
                } />
                <Route path="contracts" element={
                  <Suspense fallback={<PageLoader />}>
                    <OfficeDeskContractsPage />
                  </Suspense>
                } />
                <Route path="class-assignments" element={
                  <Suspense fallback={<PageLoader />}>
                    <OfficeDeskClassAssignmentsPage />
                  </Suspense>
                } />
                <Route path="class-instances" element={
                  <Suspense fallback={<PageLoader />}>
                    <OfficeDeskClassInstancesPage />
                  </Suspense>
                } />
                <Route path="enrollment-pipeline" element={
                  <Suspense fallback={<PageLoader />}>
                    <OfficeDeskEnrollmentPipelinePage />
                  </Suspense>
                } />
                <Route path="debit-orders" element={
                  <Suspense fallback={<PageLoader />}>
                    <OfficeDeskDebitOrdersPage />
                  </Suspense>
                } />
                <Route path="billing" element={
                  <Suspense fallback={<PageLoader />}>
                    <OfficeDeskBillingPage />
                  </Suspense>
                } />
                <Route path="reports" element={
                  <Suspense fallback={<PageLoader />}>
                    <OfficeDeskReportsPage />
                  </Suspense>
                } />
                <Route path="settings" element={
                  <Suspense fallback={<PageLoader />}>
                    <OfficeDeskSettingsPage />
                  </Suspense>
                } />
                <Route path="webhooks" element={
                  <Suspense fallback={<PageLoader />}>
                    <WebhookManagementPage />
                  </Suspense>
                } />
                <Route path="analytics" element={
                  <Suspense fallback={<PageLoader />}>
                    <AnalyticsPage />
                  </Suspense>
                } />
              </Route>

              <Route path="/service" element={<Navigate to="/service/front-desk" replace />} />
              <Route path="/admin/front-desk" element={
                <ProtectedDeskRoute>
                  <Suspense fallback={<PageLoader />}>
                    <FrontDeskAdmin />
                  </Suspense>
                </ProtectedDeskRoute>
              } />
              <Route path="/service/admin/courses" element={
                <ProtectedDeskRoute>
                  <NavigationGuard>
                    <Suspense fallback={<PageLoader />}>
                      <AdminCoursesPage />
                    </Suspense>
                  </NavigationGuard>
                </ProtectedDeskRoute>
              } />
              <Route path="/register" element={
                <Suspense fallback={<PageLoader />}>
                  <RegistrationPage />
                </Suspense>
              } />
              <Route path="/register/success" element={
                <Suspense fallback={<PageLoader />}>
                  <RegistrationSuccess />
                </Suspense>
              } />
              <Route path="/register/cancel" element={
                <Suspense fallback={<PageLoader />}>
                  <RegistrationCancel />
                </Suspense>
              } />
              <Route path="/parent-portal" element={
                <Suspense fallback={<PageLoader />}>
                  <ParentPortalPage />
                </Suspense>
              } />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ServiceDeskAuthProvider>
        </DeepLinkProvider>
      </RealtimeProvider>
    </BrowserRouter>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <QueryProvider>
    <App />
  </QueryProvider>
);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('SW registered:', registration.scope);
      },
      (error) => {
        console.log('SW registration failed:', error);
      }
    );
  });
}
