import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../../../components/AdminLayout';
import { AdvancedFilterPanel } from '../../office-desk/components/AdvancedFilterPanel';
import { NotificationCenter } from '../../office-desk/components/NotificationCenter';
import { SearchBar } from '../../office-desk/components/SearchBar';
import type { SearchEntityType, SearchFilters } from '../../office-desk/services/searchService';
import { supabase } from '../../office-desk/services/supabase';
import { useNotifications } from '../../../hooks/useNotifications';
import { useSearch } from '../../../hooks/useSearch';

type MainTab =
  | 'enrollment'
  | 'user-profiles'
  | 'family-accounts'
  | 'ledger'
  | 'school-admin'
  | 'accounting'
  | 'payment-analytics';

type SubTab = 'pipeline' | 'registrations' | 'contracts' | 'class-assignments' | 'class-instances' | 'invoices' | 'debit-orders' | 'analytics' | 'reports' | 'settings' | 'webhooks' | 'billing' | 'email-templates' | 'contacts' | 'activity';

interface SubTabDef {
  key: SubTab;
  label: string;
  route: string;
}

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'enrollment', label: 'ENROLLMENT' },
  { key: 'user-profiles', label: 'USER PROFILES' },
  { key: 'family-accounts', label: 'FAMILY ACCOUNTS' },
  { key: 'ledger', label: 'LEDGER' },
  { key: 'school-admin', label: 'SCHOOL ADMINISTRATION' },
  { key: 'accounting', label: 'ACCOUNTING' },
  { key: 'payment-analytics', label: 'PAYMENT ANALYTICS' },
];

const SUB_TABS_BY_MAIN: Record<MainTab, SubTabDef[]> = {
  enrollment: [
    { key: 'pipeline', label: 'Pipeline', route: 'enrollment-pipeline' },
    { key: 'registrations', label: 'Registrations', route: 'registrations' },
    { key: 'contracts', label: 'Contracts', route: 'contracts' },
    { key: 'class-assignments', label: 'Class Assignments', route: 'class-assignments' },
  ],
  'user-profiles': [
    { key: 'registrations', label: 'All Profiles', route: 'registrations' },
    { key: 'contacts', label: 'Contacts', route: 'contacts' },
    { key: 'contracts', label: 'Contracts', route: 'contracts' },
  ],
  'family-accounts': [
    { key: 'registrations', label: 'Registrations', route: 'registrations' },
    { key: 'invoices', label: 'Invoices', route: 'invoices' },
    { key: 'debit-orders', label: 'Debit Orders', route: 'debit-orders' },
    { key: 'contracts', label: 'Contracts', route: 'contracts' },
  ],
  ledger: [
    { key: 'invoices', label: 'Invoices & Statements', route: 'invoices' },
    { key: 'debit-orders', label: 'Debit Orders', route: 'debit-orders' },
    { key: 'billing', label: 'Billing', route: 'billing' },
  ],
  'school-admin': [
    { key: 'class-instances', label: 'Class Instances', route: 'class-instances' },
    { key: 'class-assignments', label: 'Class Assignments', route: 'class-assignments' },
    { key: 'pipeline', label: 'Pipeline', route: 'enrollment-pipeline' },
  ],
  accounting: [
    { key: 'invoices', label: 'Invoices & Statements', route: 'invoices' },
    { key: 'debit-orders', label: 'Debit Orders', route: 'debit-orders' },
    { key: 'billing', label: 'Billing', route: 'billing' },
  ],
  'payment-analytics': [
    { key: 'analytics', label: 'Analytics', route: 'analytics' },
    { key: 'reports', label: 'Reports', route: 'reports' },
    { key: 'invoices', label: 'Invoices', route: 'invoices' },
    { key: 'activity', label: 'Activity', route: 'activity' },
    { key: 'settings', label: 'Settings', route: 'settings' },
    { key: 'webhooks', label: 'Webhooks', route: 'webhooks' },
    { key: 'email-templates', label: 'Email Templates', route: 'email-templates' },
  ],
};

export default function OfficeDeskPage() {
  const { deskId } = useParams<{ deskId: string }>();
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<MainTab>('enrollment');
  const [showFilter, setShowFilter] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [filterEntity, setFilterEntity] = useState<SearchEntityType>('all');
  const [userId, setUserId] = useState<string>('');

  // Notifications hook
  const { unreadCount, failedCount } = useNotifications();

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Search hook
  const searchHook = useSearch({ tenantId: deskId || '', userId });

  const currentPath = window.location.pathname;
  const subTabs = SUB_TABS_BY_MAIN[mainTab];
  const activeSubTab = subTabs.find((t) => currentPath.includes(t.route))?.key ?? subTabs[0]?.key;

  return (
    <AdminLayout activeDesk="office-desk">
      {/* Header + Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2
            className="mb-1"
            style={{
              fontFamily: '"EB Garamond", serif',
              fontSize: '36px',
              lineHeight: '44px',
              fontWeight: 500,
              color: '#273946',
              letterSpacing: '-0.01em',
            }}
          >
            Office Desk
          </h2>
          <p style={{ fontSize: '14px', lineHeight: '20px', color: '#54626C' }}>
            Manage family accounts, invoices, and financial records.
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar
          query={searchHook.query}
          entityType={searchHook.entityType}
          suggestions={searchHook.suggestions}
          searchHistory={searchHook.searchHistory}
          loadingSuggestions={searchHook.loadingSuggestions}
          onQueryChange={searchHook.setQuery}
          onSearch={searchHook.executeSearch}
          onEntityTypeChange={searchHook.setEntityType}
          onFetchSuggestions={searchHook.fetchSuggestions}
          onApplyHistory={searchHook.applyHistory}
          onQuickFilter={({ field, operator, value }) => {
            // Quick filter handler
            console.log('Quick filter:', field, operator, value);
          }}
          onShowFilters={() => setShowFilter(true)}
          hasActiveFilters={searchHook.loading}
        />

        <div className="flex gap-3">
          {/* Notification Bell */}
          <button type="button"
            onClick={() => setShowNotifications(true)}
            className="relative px-3 py-2 rounded flex items-center gap-2 transition-colors"
            style={{
              border: '1px solid #273946',
              color: '#273946',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(39,57,70,0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              notifications
            </span>
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: failedCount > 0 ? '#FEE2E2' : '#DBEAFE',
                  color: failedCount > 0 ? '#C8281E' : '#1D4ED8',
                  fontSize: '10px',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          <button type="button"
            onClick={() => setShowFilter(!showFilter)}
            className="px-4 py-2 rounded flex items-center gap-2 transition-colors"
            style={{
              border: '1px solid #273946',
              color: '#273946',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              fontFamily: '"Source Sans 3", sans-serif',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(39,57,70,0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              filter_list
            </span>
            Filter
          </button>
          <button type="button"
            onClick={() => navigate('/service/office-desk/registrations')}
            className="px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors"
            style={{
              backgroundColor: '#273946',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              fontFamily: '"Source Sans 3", sans-serif',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#112430';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#273946';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              add
            </span>
            New Enrollment
          </button>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {showFilter && (
        <div className="shrink-0">
          <AdvancedFilterPanel
            entityType={filterEntity}
            filters={filters}
            onFiltersChange={setFilters}
            onApply={() => {/* filters applied via context */}}
            onClear={() => setFilters({})}
            onClose={() => setShowFilter(false)}
          />
        </div>
      )}

      {/* Notification Center */}
      {showNotifications && (
        <NotificationCenter onClose={() => setShowNotifications(false)} />
      )}

      {/* Main Tabs */}
      <div className="overflow-x-auto shrink-0">
        <nav className="flex" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)' }}>
          {MAIN_TABS.map((tab) => {
            const isActive = tab.key === mainTab;
            return (
              <button type="button"
                key={tab.key}
                onClick={() => setMainTab(tab.key)}
                className="px-6 py-3 whitespace-nowrap transition-colors relative"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  fontFamily: '"Source Sans 3", sans-serif',
                  color: isActive ? '#273946' : '#54626C',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  borderTop: isActive ? '1px solid rgba(39,57,70,0.1)' : '1px solid transparent',
                  borderLeft: isActive ? '1px solid rgba(39,57,70,0.1)' : '1px solid transparent',
                  borderRight: isActive ? '1px solid rgba(39,57,70,0.1)' : '1px solid transparent',
                  borderRadius: isActive ? '0.25rem 0.25rem 0 0' : undefined,
                  zIndex: isActive ? 10 : undefined,
                }}
              >
                {isActive && (
                  <span
                    className="absolute top-0 left-0 w-full h-1"
                    style={{ backgroundColor: '#E8A020' }}
                  />
                )}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sub Tabs */}
      <div
        className="flex items-center gap-6 overflow-x-auto shrink-0 pb-1"
        style={{ borderBottom: '1px solid rgba(195,199,204,0.2)' }}
      >
        {subTabs.map((tab) => {
          const isActive = tab.key === activeSubTab;
          return (
            <button type="button"
              key={tab.key}
              onClick={() => navigate(`/service/office-desk/${tab.route}`)}
              className="whitespace-nowrap py-3 px-1 transition-colors"
              style={{
                fontFamily: '"EB Garamond", serif',
                fontSize: '14px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#273946' : '#54626C',
                borderBottom: isActive ? '2px solid #E8A020' : '2px solid transparent',
              }}
            >
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
