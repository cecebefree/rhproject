import { useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../../../components/AdminLayout';

type MainTab = 'enrollment' | 'user-profiles' | 'family-accounts' | 'ledger' | 'school-admin' | 'accounting' | 'payment-analytics';
type SubTab = 'debit-orders' | 'invoices' | 'contracts';

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'enrollment', label: 'ENROLLMENT' },
  { key: 'user-profiles', label: 'USER PROFILES' },
  { key: 'family-accounts', label: 'FAMILY ACCOUNTS' },
  { key: 'ledger', label: 'LEDGER' },
  { key: 'school-admin', label: 'SCHOOL ADMINISTRATION' },
  { key: 'accounting', label: 'ACCOUNTING' },
  { key: 'payment-analytics', label: 'PAYMENT ANALYTICS' },
];

const SUB_TABS: { key: SubTab; label: string; route: string }[] = [
  { key: 'debit-orders', label: 'Debit Orders', route: 'debit-orders' },
  { key: 'invoices', label: 'Invoices & Statements', route: 'invoices' },
  { key: 'contracts', label: 'Contracts', route: 'contracts' },
];

export default function OfficeDeskPage() {
  const { deskId } = useParams<{ deskId: string }>();
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<MainTab>('family-accounts');

  // Derive active sub-tab from URL
  const currentPath = window.location.pathname;
  const activeSubTab = SUB_TABS.find((t) => currentPath.includes(t.route))?.key ?? 'invoices';

  return (
    <AdminLayout activeDesk="office-desk">
      {/* Header + Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="mb-1" style={{ fontFamily: '"EB Garamond", serif', fontSize: '36px', lineHeight: '44px', fontWeight: 500, color: '#273946', letterSpacing: '-0.01em' }}>
            Office Desk
          </h2>
          <p style={{ fontSize: '14px', lineHeight: '20px', color: '#54626C' }}>
            Manage family accounts, invoices, and financial records.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded flex items-center gap-2 transition-colors"
            style={{ border: '1px solid #273946', color: '#273946', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', fontFamily: '"Source Sans 3", sans-serif' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(39,57,70,0.05)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>filter_list</span>
            Filter
          </button>
          <button className="px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors"
            style={{ backgroundColor: '#273946', color: '#ffffff', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', fontFamily: '"Source Sans 3", sans-serif' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#112430'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#273946'; }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            New Enrollment
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="overflow-x-auto shrink-0">
        <nav className="flex" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)' }}>
          {MAIN_TABS.map((tab) => {
            const isActive = tab.key === mainTab;
            return (
              <button key={tab.key} onClick={() => setMainTab(tab.key)}
                className="px-6 py-3 whitespace-nowrap transition-colors relative"
                style={{
                  fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', fontFamily: '"Source Sans 3", sans-serif',
                  color: isActive ? '#273946' : '#54626C',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  borderTop: isActive ? '1px solid rgba(39,57,70,0.1)' : '1px solid transparent',
                  borderLeft: isActive ? '1px solid rgba(39,57,70,0.1)' : '1px solid transparent',
                  borderRight: isActive ? '1px solid rgba(39,57,70,0.1)' : '1px solid transparent',
                  borderRadius: isActive ? '0.25rem 0.25rem 0 0' : undefined,
                  zIndex: isActive ? 10 : undefined,
                }}>
                {isActive && (
                  <span className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: '#E8A020' }} />
                )}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-6 overflow-x-auto shrink-0 pb-1"
        style={{ borderBottom: '1px solid rgba(195,199,204,0.2)' }}>
        {SUB_TABS.map((tab) => {
          const isActive = tab.key === activeSubTab;
          return (
            <button key={tab.key} onClick={() => navigate(`/service/office-desk/${tab.route}`)}
              className="whitespace-nowrap py-3 px-1 transition-colors"
              style={{
                fontFamily: '"EB Garamond", serif', fontSize: '14px', fontWeight: isActive ? 700 : 500,
                color: isActive ? '#273946' : '#54626C',
                borderBottom: isActive ? '2px solid #E8A020' : '2px solid transparent',
              }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content — renders child routes via Outlet, or default view */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-12">
        <Outlet context={{ tenantId: deskId, mainTab, subTab: activeSubTab }} />
      </div>
    </AdminLayout>
  );
}
