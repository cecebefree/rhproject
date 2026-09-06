import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { DeepLinkProvider } from './components/DeepLinkProvider';
import { NavigationGuard } from './components/NavigationGuard';
import { RealtimeProvider } from './contexts/RealtimeProvider';
import { FrontDeskPage } from './features/front-desk';
import FrontDeskLeadDetailPage from './features/front-desk/pages/FrontDeskLeadDetailPage';
import OfficeDeskBillingPage from './features/lms/pages/OfficeDeskBillingPage';
import OfficeDeskInvoiceDetailPage from './features/lms/pages/OfficeDeskInvoiceDetailPage';
import OfficeDeskInvoicesPage from './features/lms/pages/OfficeDeskInvoicesPage';
import OfficeDeskLeadDetailPage from './features/lms/pages/OfficeDeskLeadDetailPage';
import OfficeDeskLeadsPage from './features/lms/pages/OfficeDeskLeadsPage';
import OfficeDeskPage from './features/lms/pages/OfficeDeskPage';
import { FamilyAccountsDefault } from './features/office-desk/components/FamilyAccountsDefault';
import OfficeDeskRegistrationsPage from './features/lms/pages/OfficeDeskRegistrationsPage';
import OfficeDeskContractsPage from './features/lms/pages/OfficeDeskContractsPage';
import OfficeDeskDebitOrdersPage from './features/lms/pages/OfficeDeskDebitOrdersPage';
import OfficeDeskReportsPage from './features/lms/pages/OfficeDeskReportsPage';
import OfficeDeskSettingsPage from './features/lms/pages/OfficeDeskSettingsPage';
import SchoolDeskPage from './features/lms/pages/SchoolDeskPage';
import ParentPortalPage from './features/parent-portal/pages/ParentPortalPage';
import WebhookManagementPage from './features/office-desk/components/WebhookManagementPage';
import AnalyticsPage from './features/office-desk/components/AnalyticsPage';
import RegistrationPage from './features/registration/RegistrationPage';
import RegistrationSuccess from './features/registration/RegistrationSuccess';
import RegistrationCancel from './features/registration/RegistrationCancel';
import AdminCoursesPage from './features/admin/components/AdminCoursesPage';
import { FrontDeskAdmin } from './pages/admin/FrontDeskAdmin';
import CRMPage from './pages/CRMPage';
import FamilyProfilePage from './pages/FamilyProfilePage';
import AdultProfilePage from './pages/AdultProfilePage';
import ServiceDeskLogin from './pages/ServiceDeskLogin';
import ServiceDeskPage from './pages/ServiceDeskPage';
import StaffProfilePage from './pages/StaffProfilePage';
import StudentProfilePage from './pages/StudentProfilePage';
import SchoolDeskStudentProfilePage from './features/lms/pages/StudentProfilePage';
import SchoolDeskAttendancePage from './features/lms/pages/SchoolDeskAttendancePage';
import SchoolDeskChatPage from './features/lms/pages/SchoolDeskChatPage';
import TeacherDashboardPage from './features/lms/pages/TeacherDashboardPage';

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
      <RealtimeProvider>
        <DeepLinkProvider>
          <Routes>
            <Route path="/" element={<IndexPage />} />
            <Route path="/service-desk" element={<ServiceDeskLogin />} />
            <Route path="/service/service-desk" element={<ServiceDeskPage />} />
            <Route path="/service/crm" element={<CRMPage />} />
            <Route path="/service/crm/family/:familyId" element={<FamilyProfilePage />} />
            <Route path="/service/crm/family/:familyId/adult/:adultId" element={<AdultProfilePage />} />
            <Route path="/service/crm/family/:familyId/student/:studentId" element={<StudentProfilePage />} />
            <Route path="/service/staff/:staffId" element={<StaffProfilePage />} />
            <Route path="/service/front-desk" element={<FrontDeskPage />} />
            <Route path="/service/front-desk/lead/:leadId" element={<FrontDeskLeadDetailPage />} />
            <Route path="/service/school-desk" element={<SchoolDeskPage />} />
            <Route path="/service/school-desk/student/:studentId" element={<SchoolDeskStudentProfilePage />} />
            <Route path="/service/school-desk/attendance" element={<SchoolDeskAttendancePage />} />
            <Route path="/service/school-desk/chat" element={<SchoolDeskChatPage />} />
            <Route path="/service/teacher" element={<TeacherDashboardPage />} />

            {/* LMS deferred — route stubs only, zero components (post-MVP) */}
            <Route path="/lms" element={<Navigate to="/service/school-desk" replace />} />
            <Route path="/lms/courses" element={<Navigate to="/service/school-desk" replace />} />
            <Route path="/lms/courses/:courseId" element={<Navigate to="/service/school-desk" replace />} />
            <Route path="/lms/courses/:courseId/lessons/:lessonId" element={<Navigate to="/service/school-desk" replace />} />
            <Route path="/lms/progress" element={<Navigate to="/service/school-desk" replace />} />
            <Route path="/lms/certificates" element={<Navigate to="/service/school-desk" replace />} />

            {/* Office Desk with nested routes */}
            <Route
              path="/service/office-desk"
              element={<OfficeDeskPage />}
            >
              {/* Default redirect to family accounts */}
              <Route index element={<FamilyAccountsDefault />} />

              {/* Leads routes */}
              <Route path="leads" element={<OfficeDeskLeadsPage />} />
              <Route path="leads/:leadId" element={<OfficeDeskLeadDetailPage />} />

              {/* Invoices routes */}
              <Route path="invoices" element={<OfficeDeskInvoicesPage />} />
              <Route path="invoices/:invoiceId" element={<OfficeDeskInvoiceDetailPage />} />

              {/* Registrations routes */}
              <Route path="registrations" element={<OfficeDeskRegistrationsPage />} />
              <Route path="registrations/:registrationId" element={<OfficeDeskRegistrationsPage />} />

              {/* Contracts routes */}
              <Route path="contracts" element={<OfficeDeskContractsPage />} />

              {/* Debit Orders routes */}
              <Route path="debit-orders" element={<OfficeDeskDebitOrdersPage />} />

              {/* Other tabs */}
              <Route path="billing" element={<OfficeDeskBillingPage />} />
              <Route path="reports" element={<OfficeDeskReportsPage />} />
              <Route path="settings" element={<OfficeDeskSettingsPage />} />
              <Route path="webhooks" element={<WebhookManagementPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>

            <Route path="/service" element={<Navigate to="/service/front-desk" replace />} />
            <Route path="/admin/front-desk" element={<FrontDeskAdmin />} />
            <Route path="/service/admin/courses" element={
              <NavigationGuard><AdminCoursesPage /></NavigationGuard>
            } />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/register/success" element={<RegistrationSuccess />} />
            <Route path="/register/cancel" element={<RegistrationCancel />} />
            <Route path="/parent-portal" element={<ParentPortalPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </DeepLinkProvider>
      </RealtimeProvider>
    </BrowserRouter>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
