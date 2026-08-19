import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { DeepLinkProvider } from './components/DeepLinkProvider';
import { NavigationGuard } from './components/NavigationGuard';
import { RealtimeProvider } from './contexts/RealtimeProvider';
import { FrontDeskPage } from './features/front-desk';
import OfficeDeskBillingPage from './features/lms/pages/OfficeDeskBillingPage';
import OfficeDeskInvoiceDetailPage from './features/lms/pages/OfficeDeskInvoiceDetailPage';
import OfficeDeskInvoicesPage from './features/lms/pages/OfficeDeskInvoicesPage';
import OfficeDeskLeadDetailPage from './features/lms/pages/OfficeDeskLeadDetailPage';
import OfficeDeskLeadsPage from './features/lms/pages/OfficeDeskLeadsPage';
import OfficeDeskPage from './features/lms/pages/OfficeDeskPage';
import OfficeDeskRegistrationsPage from './features/lms/pages/OfficeDeskRegistrationsPage';
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

function IndexPage() {
  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>Redhouse Web</h1>
      <p>Cloudflare Pages — live deploy</p>
      <nav style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Link to="/lms/front-desk">Front Desk</Link>
        <Link to="/admin/front-desk">Front Desk Admin</Link>
        <Link to="/lms/school-desk">School Desk</Link>
        <Link to="/lms/office-desk">Office Desk</Link>
        <Link to="/lms/admin/courses">Admin — Courses</Link>
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
            <Route path="/lms/front-desk" element={<FrontDeskPage />} />
            <Route path="/lms/school-desk" element={<SchoolDeskPage />} />

            {/* Office Desk with nested routes */}
            <Route
              path="/lms/office-desk"
              element={
                <NavigationGuard>
                  <OfficeDeskPage />
                </NavigationGuard>
              }
            >
              {/* Default redirect to leads */}
              <Route index element={<Navigate to="leads" replace />} />

              {/* Leads routes */}
              <Route path="leads" element={<OfficeDeskLeadsPage />} />
              <Route path="leads/:leadId" element={<OfficeDeskLeadDetailPage />} />

              {/* Invoices routes */}
              <Route path="invoices" element={<OfficeDeskInvoicesPage />} />
              <Route path="invoices/:invoiceId" element={<OfficeDeskInvoiceDetailPage />} />

              {/* Registrations routes */}
              <Route path="registrations" element={<OfficeDeskRegistrationsPage />} />
              <Route path="registrations/:registrationId" element={<OfficeDeskRegistrationsPage />} />

              {/* Other tabs */}
              <Route path="billing" element={<OfficeDeskBillingPage />} />
              <Route path="reports" element={<OfficeDeskReportsPage />} />
              <Route path="settings" element={<OfficeDeskSettingsPage />} />
              <Route path="webhooks" element={<WebhookManagementPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>

            <Route path="/lms" element={<Navigate to="/lms/front-desk" replace />} />
            <Route path="/admin/front-desk" element={<FrontDeskAdmin />} />
            <Route path="/lms/admin/courses" element={
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
