import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GlobalSearch } from '../features/lms/components/GlobalSearch';

export type DeskRole = 'service-desk' | 'front-desk' | 'office-desk' | 'school-desk' | 'crm';

interface AdminLayoutProps {
  children: ReactNode;
  activeDesk: DeskRole;
}

const DESK_NAV_ITEMS = [
  { key: 'front-desk', label: 'Front Desk', icon: 'concierge', href: '/service/front-desk' },
  { key: 'office-desk', label: 'Office Desk', icon: 'business_center', href: '/service/office-desk' },
  { key: 'school-desk', label: 'School Desk', icon: 'school', href: '/service/school-desk' },
] as const;

const CRM_NAV_ITEM = { key: 'crm', label: 'CRM', icon: 'person_search', href: '/service/crm' } as const;

const DESK_VISIBILITY: Record<DeskRole, string[]> = {
  'service-desk': ['front-desk', 'office-desk', 'school-desk', 'crm'],
  'front-desk': ['front-desk', 'crm'],
  'office-desk': ['office-desk', 'crm'],
  'school-desk': ['school-desk', 'crm'],
  'crm': ['front-desk', 'office-desk', 'school-desk', 'crm'],
};

const FOOTER_ITEMS = [
  { label: 'Settings', icon: 'settings', href: '#' },
  { label: 'Support', icon: 'contact_support', href: '#' },
];

export function AdminLayout({ children, activeDesk }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isSuperAdmin = location.pathname.startsWith('/service/');
  const visibleKeys = isSuperAdmin
    ? ['front-desk', 'office-desk', 'school-desk', 'crm']
    : DESK_VISIBILITY[activeDesk];
  const deskItems = DESK_NAV_ITEMS.filter((item) => visibleKeys.includes(item.key));
  const showCrm = visibleKeys.includes('crm');

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: '"Source Sans 3", sans-serif', color: '#1A242B' }}>
      {/* Sidebar — Desktop */}
      <nav className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 z-50"
        style={{ backgroundColor: '#273946' }}>
        {/* Logo */}
        <div className="px-6 py-8">
          <div className="flex items-center gap-3">
            <img src="/redhouse-logo.png" alt="Redhouse" className="w-10 h-10 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
            <div>
              <h1 className="text-lg font-medium" style={{ fontFamily: '"EB Garamond", serif', color: '#ffffff' }}>
                RedHouse
              </h1>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', letterSpacing: '0.12em' }}>
                {activeDesk === 'service-desk' ? 'Service Desk' : 'Premium Admin'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Nav */}
        <ul className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {deskItems.map((item) => {
            const isActive = item.key === activeDesk;
            return (
              <li key={item.key}>
                <Link
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 no-underline ${
                    isActive ? '' : 'hover:bg-white/5'
                  }`}
                  style={{
                    borderLeft: isActive ? '4px solid #E8A020' : '4px solid transparent',
                    color: isActive ? '#E8A020' : 'rgba(255,255,255,0.7)',
                    backgroundColor: isActive ? 'rgba(39,57,70,0.2)' : undefined,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{item.icon}</span>
                  <span className="text-xs font-semibold uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em' }}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}

          {showCrm && (
            <>
              <li className="pt-4 pb-2">
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }} />
              </li>
              <li>
                <Link
                  to={CRM_NAV_ITEM.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 no-underline ${
                    activeDesk === 'crm' ? '' : 'hover:bg-white/5'
                  }`}
                  style={{
                    borderLeft: activeDesk === 'crm' ? '4px solid #E8A020' : '4px solid transparent',
                    color: activeDesk === 'crm' ? '#E8A020' : 'rgba(255,255,255,0.7)',
                    backgroundColor: activeDesk === 'crm' ? 'rgba(39,57,70,0.2)' : undefined,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{CRM_NAV_ITEM.icon}</span>
                  <span className="text-xs font-semibold uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em' }}>
                    {CRM_NAV_ITEM.label}
                  </span>
                </Link>
              </li>
            </>
          )}
        </ul>

        {/* Footer Nav */}
        <ul className="px-4 py-6 mt-auto space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {FOOTER_ITEMS.map((item) => (
            <li key={item.label}>
              <Link to={item.href} className="flex items-center gap-3 px-4 py-3 rounded text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 no-underline">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{item.icon}</span>
                <span className="text-xs font-semibold uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em' }}>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <nav className="absolute left-0 top-0 h-full w-64 flex flex-col"
            style={{ backgroundColor: '#273946' }}>
            <div className="px-6 py-8">
              <div className="flex items-center gap-3">
                <img src="/redhouse-logo.png" alt="Redhouse" className="w-10 h-10 rounded-full" />
                <div>
                  <h1 className="text-lg font-medium" style={{ fontFamily: '"EB Garamond", serif', color: '#fff' }}>RedHouse</h1>
                  <p className="text-xs font-semibold uppercase" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', letterSpacing: '0.12em' }}>
                    {activeDesk === 'service-desk' ? 'Service Desk' : 'Premium Admin'}
                  </p>
                </div>
              </div>
            </div>
            <ul className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
              {deskItems.map((item) => {
                const isActive = item.key === activeDesk;
                return (
                  <li key={item.key}>
                    <Link to={item.href} onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded no-underline"
                      style={{
                        borderLeft: isActive ? '4px solid #E8A020' : '4px solid transparent',
                        color: isActive ? '#E8A020' : 'rgba(255,255,255,0.7)',
                        backgroundColor: isActive ? 'rgba(39,57,70,0.2)' : undefined,
                      }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{item.icon}</span>
                      <span className="text-xs font-semibold uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em' }}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
              {showCrm && (
                <>
                  <li className="pt-4 pb-2">
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }} />
                  </li>
                  <li>
                    <Link to={CRM_NAV_ITEM.href} onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded no-underline"
                      style={{
                        borderLeft: activeDesk === 'crm' ? '4px solid #E8A020' : '4px solid transparent',
                        color: activeDesk === 'crm' ? '#E8A020' : 'rgba(255,255,255,0.7)',
                        backgroundColor: activeDesk === 'crm' ? 'rgba(39,57,70,0.2)' : undefined,
                      }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{CRM_NAV_ITEM.icon}</span>
                      <span className="text-xs font-semibold uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em' }}>{CRM_NAV_ITEM.label}</span>
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 h-full" style={{ backgroundColor: '#F8F7F4' }}>
        {/* Top Bar */}
        <header className="border-b w-full h-16 flex justify-between items-center px-4 md:px-16 z-40 sticky top-0"
          style={{ backgroundColor: '#faf9f6', borderColor: 'rgba(195,199,204,0.3)' }}>
          <div className="flex items-center gap-4">
            <button className="md:hidden text-gray-500" onClick={() => setSidebarOpen(true)}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="hidden md:flex items-center rounded px-3 py-1.5"
              style={{ backgroundColor: '#f4f3f0', border: '1px solid rgba(195,199,204,0.3)' }}>
              <GlobalSearch />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4" style={{ color: '#112430' }}>
              <button className="hover:bg-gray-100 transition-colors duration-200 p-2 rounded-full relative cursor-pointer">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: '#C8281E', border: '1px solid #faf9f6' }} />
              </button>
              <button className="hover:bg-gray-100 transition-colors duration-200 p-2 rounded-full cursor-pointer">
                <span className="material-symbols-outlined">help</span>
              </button>
            </div>
            <div className="hidden sm:flex items-center gap-3 pl-4 cursor-pointer group"
              style={{ borderLeft: '1px solid rgba(195,199,204,0.3)' }}>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#1A242B' }}>Eleanor V.</p>
                <p className="text-xs" style={{ color: '#54626C', fontSize: '12px' }}>
                  {activeDesk === 'service-desk' ? 'Super Admin' : 'Admin Profile'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full overflow-hidden" style={{ border: '1px solid rgba(195,199,204,0.5)' }}>
                <div className="w-full h-full flex items-center justify-center text-sm font-medium" style={{ backgroundColor: '#e9e8e5', color: '#273946' }}>EV</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden flex flex-col p-4 md:p-8 pt-6 max-w-[1600px] mx-auto w-full gap-4 sm:gap-6">
          {children}
        </main>
      </div>
    </div>
  );
}
