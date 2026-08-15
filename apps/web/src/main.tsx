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
import OfficeDeskReportsPage from './features/lms/pages/OfficeDeskReportsPage';
import OfficeDeskSettingsPage from './features/lms/pages/OfficeDeskSettingsPage';
import SchoolDeskPage from './features/lms/pages/SchoolDeskPage';
import ParentPortalPage from './features/parent-portal/pages/ParentPortalPage';

function IndexPage() {
  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>Redhouse Web</h1>
      <p>Cloudflare Pages — live deploy</p>
      <nav style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Link to="/lms/front-desk">Front Desk</Link>
        <Link to="/lms/school-desk">School Desk</Link>
        <Link to="/lms/office-desk">Office Desk</Link>
        <Link to="/parent-portal">Parent Portal</Link>
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

              {/* Other tabs */}
              <Route path="billing" element={<OfficeDeskBillingPage />} />
              <Route path="reports" element={<OfficeDeskReportsPage />} />
              <Route path="settings" element={<OfficeDeskSettingsPage />} />
            </Route>

            <Route path="/lms" element={<Navigate to="/lms/front-desk" replace />} />
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
