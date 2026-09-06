import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';

type MainTab = 'overview' | 'front-desk' | 'family-accounts' | 'in-house' | 'business' | 'alumni';
type SubTab = 'all' | 'cambridge' | 'ib' | 'senior-school' | 'junior-school' | 'home-school';

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'overview', label: 'OVERVIEW' },
  { key: 'front-desk', label: 'FRONT DESK' },
  { key: 'family-accounts', label: 'FAMILY ACCOUNTS' },
  { key: 'in-house', label: 'IN-HOUSE (OFFICE & SCHOOL DESK)' },
  { key: 'business', label: 'BUSINESS' },
  { key: 'alumni', label: 'ALUMNI' },
];

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'cambridge', label: 'Cambridge' },
  { key: 'ib', label: 'IB' },
  { key: 'senior-school', label: 'Senior-School' },
  { key: 'junior-school', label: 'Junior-School' },
  { key: 'home-school', label: 'Home-School' },
];

const MOCK_FAMILIES = [
  { id: 'ACC-9921-R', name: 'The Montgomery Family', email: 'sarah.montgomery@gmail.com', enrolled: '01 Sep 2021', adults: 2, students: 2, status: 'Active' },
  { id: 'ACC-1234-A', name: 'The Chen Family', email: 'sarah.chen@email.com', enrolled: '24 Aug 2026', adults: 2, students: 2, status: 'Active' },
  { id: 'ACC-2345-B', name: 'The Müller Family', email: 'hans.muller@email.com', enrolled: '20 Aug 2026', adults: 2, students: 3, status: 'Active' },
  { id: 'ACC-3456-C', name: 'The Okafor Family', email: 'chidinma.okafor@email.com', enrolled: '18 Aug 2026', adults: 1, students: 1, status: 'Active' },
  { id: 'ACC-4567-D', name: 'The Patel Family', email: 'raj.patel@email.com', enrolled: '15 Aug 2026', adults: 2, students: 2, status: 'Pending' },
  { id: 'ACC-5678-E', name: 'The Sato Family', email: 'yuki.sato@email.com', enrolled: '12 Aug 2026', adults: 2, students: 1, status: 'Active' },
  { id: 'ACC-6789-F', name: 'The Williams Family', email: 'james.williams@email.com', enrolled: '10 Aug 2026', adults: 2, students: 4, status: 'Inactive' },
  { id: 'ACC-7890-G', name: 'The Dubois Family', email: 'marie.dubois@email.com', enrolled: '08 Aug 2026', adults: 1, students: 2, status: 'Active' },
  { id: 'ACC-8901-H', name: 'The Kim Family', email: 'minho.kim@email.com', enrolled: '05 Aug 2026', adults: 2, students: 2, status: 'Active' },
];

const MOCK_ACTIVITIES = [
  { id: 1, actor: 'Eleanor V.', action: 'completed Zaradama call with', target: 'Theodore R.', time: '10 mins ago', outcome: 'Connected', note: '"Parent is very interested in the immersion program. Send brochure."' },
  { id: 2, actor: 'Web Form', action: 'submitted by', target: 'Clara H.', time: '2 hours ago', status: 'New' },
  { id: 3, actor: 'Sarah K.', action: 'booked a tour for', target: 'The Patel Family', time: 'Yesterday, 2:30 PM', status: 'Tour Booked' },
];

export default function CRMPage() {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('family-accounts');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFamilies = MOCK_FAMILIES.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout activeDesk="crm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: '"EB Garamond", serif', fontSize: '28px', fontWeight: 500, color: '#1A242B' }}>
            CRM
          </h1>
          <p className="text-sm mt-1" style={{ color: '#54626C' }}>
            Unified client relations management.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors duration-200 cursor-pointer"
            style={{ border: '1px solid rgba(195,199,204,0.5)', backgroundColor: '#fff', color: '#1A242B', fontSize: '11px', letterSpacing: '0.12em' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>filter_list</span>
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors duration-200 cursor-pointer"
            style={{ backgroundColor: '#273946', color: '#ffffff', fontSize: '11px', letterSpacing: '0.12em' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            New Entry
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="overflow-x-auto shrink-0 -mb-[1px]">
        <nav className="flex" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)' }}>
          {MAIN_TABS.map((tab) => {
            const isActive = activeMainTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveMainTab(tab.key)}
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

      {/* Sub-tabs */}
      {activeMainTab === 'family-accounts' && (
        <div className="flex items-center gap-6 overflow-x-auto shrink-0 pb-1"
          style={{ borderBottom: '1px solid rgba(195,199,204,0.2)' }}>
          {SUB_TABS.map((tab) => {
            const isActive = activeSubTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveSubTab(tab.key)}
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
      )}

      {/* Search */}
      {activeMainTab === 'family-accounts' && (
        <div className="flex items-center rounded px-3 py-2"
          style={{ backgroundColor: '#f4f3f0', border: '1px solid rgba(195,199,204,0.3)' }}>
          <span className="material-symbols-outlined mr-2" style={{ fontSize: '18px', color: '#54626C' }}>search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-full p-0"
            placeholder="Search families by name or email..."
            style={{ fontFamily: '"Source Sans 3", sans-serif' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Family Accounts Table */}
      {activeMainTab === 'family-accounts' && (
        <section>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(39,57,70,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-8 py-6 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(195,199,204,0.2)' }}>
              <h2 style={{ fontFamily: '"EB Garamond", serif', fontSize: '20px', fontWeight: 500, color: '#1A242B' }}>Family Accounts</h2>
              <div className="flex items-center gap-4">
                <span className="uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>
                  Total: {filteredFamilies.length}
                </span>
                <button className="hover:opacity-70 transition-opacity cursor-pointer">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#54626C' }}>more_vert</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    {['Family / Account', 'ID', 'Enrolled', 'Adults', 'Students', 'Status'].map((h) => (
                      <th key={h} className="px-8 py-4 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C', borderBottom: '1px solid rgba(195,199,204,0.2)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredFamilies.map((family, i) => (
                    <tr key={family.id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                      style={{ borderBottom: i < filteredFamilies.length - 1 ? '1px solid rgba(195,199,204,0.1)' : undefined, height: '52px' }}>
                      <td className="px-8 py-4">
                        <Link to={`/service/crm/family/${family.id}`} className="block no-underline hover:underline">
                          <div className="font-medium" style={{ color: '#273946', fontSize: '14px' }}>{family.name}</div>
                          <div className="text-xs" style={{ color: '#54626C' }}>{family.email}</div>
                        </Link>
                      </td>
                      <td className="px-8 py-4 text-sm" style={{ color: '#54626C' }}>{family.id}</td>
                      <td className="px-8 py-4 text-sm" style={{ color: '#54626C' }}>{family.enrolled}</td>
                      <td className="px-8 py-4 text-center text-sm" style={{ color: '#1A242B' }}>{family.adults}</td>
                      <td className="px-8 py-4 text-center text-sm" style={{ color: '#1A242B' }}>{family.students}</td>
                      <td className="px-8 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                          style={{
                            fontSize: '10px',
                            backgroundColor: family.status === 'Active' ? 'rgba(39,57,70,0.05)' : family.status === 'Pending' ? 'rgba(232,160,32,0.1)' : 'rgba(195,199,204,0.2)',
                            color: family.status === 'Active' ? '#273946' : family.status === 'Pending' ? '#E8A020' : '#54626C',
                            border: `1px solid ${family.status === 'Active' ? 'rgba(39,57,70,0.1)' : family.status === 'Pending' ? 'rgba(232,160,32,0.2)' : 'rgba(195,199,204,0.3)'}`,
                          }}>
                          {family.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredFamilies.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-sm" style={{ color: '#54626C' }}>
                        No families found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Recent Activities */}
      {activeMainTab === 'family-accounts' && (
        <section>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(39,57,70,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(195,199,204,0.2)', backgroundColor: '#faf9f6' }}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#273946' }}>rss_feed</span>
                <h2 style={{ fontFamily: '"EB Garamond", serif', fontSize: '20px', fontWeight: 500, color: '#1A242B' }}>Recent Activities</h2>
              </div>
              <div className="flex items-center gap-4">
                <p className="uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>
                  Total Activities: 142 | Inquiry: 45%, Application: 30%, Assessment: 15%, Enrolled: 10%
                </p>
                <button className="hover:opacity-70 transition-opacity cursor-pointer">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#54626C' }}>more_vert</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {MOCK_ACTIVITIES.map((activity, i) => (
                <div key={activity.id} className="flex gap-4 relative">
                  {i < MOCK_ACTIVITIES.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-[-24px] w-px" style={{ backgroundColor: 'rgba(195,199,204,0.3)' }} />
                  )}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10"
                    style={{
                      backgroundColor: activity.id === 1 ? '#f4f3f0' : activity.id === 2 ? 'rgba(232,160,32,0.1)' : 'rgba(39,57,70,0.1)',
                      border: activity.id === 1 ? '1px solid rgba(195,199,204,0.5)' : activity.id === 2 ? '1px solid rgba(232,160,32,0.3)' : '1px solid rgba(39,57,70,0.3)',
                    }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: '14px',
                      color: activity.id === 1 ? '#1A242B' : activity.id === 2 ? '#E8A020' : '#273946',
                    }}>{activity.id === 1 ? 'call_made' : activity.id === 2 ? 'assignment_turned_in' : 'event_available'}</span>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: '#1A242B' }}>
                      <span className="font-semibold" style={{ color: '#273946' }}>{activity.actor}</span> {activity.action} <span className="font-semibold">{activity.target}</span>
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#54626C' }}>
                      {activity.time}{activity.outcome ? ` • Outcome: ${activity.outcome}` : activity.status ? ` • Status updated to ${activity.status}` : ''}
                    </p>
                    {activity.note && (
                      <div className="mt-3 p-3 rounded text-xs italic"
                        style={{ backgroundColor: '#faf9f6', border: '1px solid rgba(195,199,204,0.2)', borderLeft: '2px solid #273946', color: '#54626C' }}>
                        {activity.note}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Placeholder for other tabs */}
      {activeMainTab !== 'family-accounts' && (
        <div className="flex-1 flex items-center justify-center rounded-xl"
          style={{ border: '1px solid rgba(39,57,70,0.1)', backgroundColor: '#ffffff', minHeight: '400px' }}>
          <div className="text-center">
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'rgba(39,57,70,0.15)' }}>
              {activeMainTab === 'overview' ? 'dashboard' :
               activeMainTab === 'front-desk' ? 'concierge' :
               activeMainTab === 'in-house' ? 'corporate_fare' :
               activeMainTab === 'business' ? 'business_center' : 'school'}
            </span>
            <p className="text-sm mt-2" style={{ color: '#54626C' }}>
              {MAIN_TABS.find(t => t.key === activeMainTab)?.label} — Coming soon
            </p>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
