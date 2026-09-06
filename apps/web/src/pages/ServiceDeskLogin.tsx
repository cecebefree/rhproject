import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DESK_PASSWORD = 'redhouse2026';

const DESKS = [
  { key: 'service-desk', label: 'Super Admin', icon: 'dashboard', desc: 'Super admin — access all desks', href: '/service/service-desk' },
  { key: 'front-desk', label: 'Front Desk', icon: 'concierge', desc: 'Inquiries, leads, and intake', href: '/service/front-desk' },
  { key: 'office-desk', label: 'Office Desk', icon: 'business_center', desc: 'Billing, families, and registrations', href: '/service/office-desk' },
  { key: 'school-desk', label: 'School Desk', icon: 'school', desc: 'Students, attendance, and grades', href: '/service/school-desk' },
  { key: 'crm', label: 'CRM', icon: 'person_search', desc: 'Unified client relations', href: '/service/crm' },
] as const;

export default function ServiceDeskLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === DESK_PASSWORD) {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Try again.');
      setPassword('');
    }
  };

  const handleSelectDesk = (href: string) => {
    sessionStorage.setItem('serviceDeskAuth', 'true');
    navigate(href);
  };

  if (authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#F8F7F4', fontFamily: '"Source Sans 3", sans-serif' }}>
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="text-center mb-10">
            <img src="/redhouse-logo.png" alt="Redhouse" className="w-20 h-20 mx-auto mb-4" />
            <h1 className="text-3xl font-semibold" style={{ fontFamily: '"EB Garamond", serif', color: '#1A242B' }}>
              Service Desk
            </h1>
            <p className="text-sm mt-2" style={{ color: '#54626C' }}>Select your workspace</p>
          </div>

          {/* Desk Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DESKS.map((desk) => (
              <button
                key={desk.key}
                onClick={() => handleSelectDesk(desk.href)}
                className="group p-6 rounded-xl text-left transition-all duration-200 cursor-pointer hover:shadow-lg"
                style={{ backgroundColor: '#ffffff', border: '1px solid rgba(195,199,204,0.3)' }}
              >
                <span className="material-symbols-outlined mb-3 block" style={{ fontSize: '32px', color: '#E8A020' }}>
                  {desk.icon}
                </span>
                <h3 className="text-sm font-semibold uppercase" style={{ fontSize: '12px', letterSpacing: '0.1em', color: '#1A242B' }}>
                  {desk.label}
                </h3>
                <p className="text-xs mt-1" style={{ color: '#54626C' }}>{desk.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#F8F7F4', fontFamily: '"Source Sans 3", sans-serif' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/redhouse-logo.png" alt="Redhouse" className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold" style={{ fontFamily: '"EB Garamond", serif', color: '#1A242B' }}>
            Service Desk
          </h1>
          <p className="text-sm mt-2" style={{ color: '#54626C' }}>Enter password to continue</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full px-4 py-3 rounded text-sm outline-none"
              style={{
                backgroundColor: '#ffffff',
                border: error ? '1px solid #C8281E' : '1px solid rgba(195,199,204,0.5)',
                fontFamily: '"Source Sans 3", sans-serif',
              }}
            />
            {error && (
              <p className="text-xs mt-2" style={{ color: '#C8281E' }}>{error}</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded text-sm font-semibold transition-colors duration-200 cursor-pointer"
            style={{ backgroundColor: '#273946', color: '#ffffff' }}
          >
            Enter Service Desk
          </button>
        </form>
      </div>
    </div>
  );
}
