import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import OfficeDeskPage from './features/lms/pages/OfficeDeskPage';
import SchoolDeskPage from './features/lms/pages/SchoolDeskPage';
import { FrontDeskPage } from './features/front-desk';

function IndexPage() {
  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>Redhouse Web</h1>
      <p>Cloudflare Pages — live deploy</p>
      <nav style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Link to="/lms/front-desk">Front Desk</Link>
        <Link to="/lms/school-desk">School Desk</Link>
        <Link to="/lms/office-desk">Office Desk</Link>
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
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/lms/front-desk" element={<FrontDeskPage />} />
        <Route path="/lms/school-desk" element={<SchoolDeskPage />} />
        <Route path="/lms/office-desk" element={<OfficeDeskPage />} />
        <Route path="/lms" element={<Navigate to="/lms/front-desk" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
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
