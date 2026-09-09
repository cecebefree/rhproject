import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { supabase } from '../lib/crmClient';
import type { FamilyProfile } from '../lib/crmClient';

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

interface FamilyRow {
  id: string;
  name: string;
  email: string;
  enrolled: string;
  adults: number;
  students: number;
  status: string;
}

interface ActivityRow {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  outcome?: string;
  status?: string;
  note?: string;
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function mapStatus(dbStatus: string): string {
  switch (dbStatus) {
    case 'active':
      return 'Active';
    case 'suspended':
      return 'Pending';
    case 'closed':
      return 'Inactive';
    default:
      return dbStatus;
  }
}

export default function CRMPage() {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('family-accounts');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all family accounts
        const { data: familyAccounts, error: faError } = await supabase
          .from('office_desk.family_accounts')
          .select('*');

        if (faError) throw faError;

        // Fetch all users linked to families (for adults/students counts + email)
        const { data: familyUsers } = await supabase
          .from('office_desk.users')
          .select('family_account_id, user_type, email, first_name, last_name');

        // Build lookup maps
        const adultsByFamily = new Map<string, number>();
        const studentsByFamily = new Map<string, number>();
        const emailByFamily = new Map<string, string>();
        const lastNameByFamily = new Map<string, string>();

        for (const user of familyUsers || []) {
          const faId = user.family_account_id;
          if (user.user_type === 'adult') {
            adultsByFamily.set(faId, (adultsByFamily.get(faId) || 0) + 1);
            if (!emailByFamily.has(faId) && user.email) {
              emailByFamily.set(faId, user.email);
            }
            if (!lastNameByFamily.has(faId) && user.last_name) {
              lastNameByFamily.set(faId, user.last_name);
            }
          } else if (user.user_type === 'student') {
            studentsByFamily.set(faId, (studentsByFamily.get(faId) || 0) + 1);
          }
        }

        // Build family rows
        const rows: FamilyRow[] = (familyAccounts || []).map(
          (fa: FamilyProfile & { created_at: string }) => {
            const lastName = lastNameByFamily.get(fa.id);
            return {
              id: fa.family_code || fa.id,
              name: lastName
                ? `The ${lastName} Family`
                : fa.family_code || `Family ${fa.id.slice(0, 8)}`,
              email: emailByFamily.get(fa.id) || '',
              enrolled: fa.created_at ? formatDate(fa.created_at) : '',
              adults: adultsByFamily.get(fa.id) || 0,
              students: studentsByFamily.get(fa.id) || 0,
              status: mapStatus(fa.status),
            };
          }
        );

        setFamilies(rows);

        // Fetch recent activities from front_desk.activity_log
        const { data: activityData } = await supabase
          .from('front_desk.activity_log')
          .select('id, action, timestamp, performed_by, data')
          .order('timestamp', { ascending: false })
          .limit(10);

        if (activityData && activityData.length > 0) {
          // Fetch profile names for actors
          const actorIds = [
            ...new Set(
              activityData
                .map((a: { performed_by: string | null }) => a.performed_by)
                .filter(Boolean)
            ),
          ] as string[];
          const { data: profiles } =
            actorIds.length > 0
              ? await supabase.from('profiles').select('id, name').in('id', actorIds)
              : { data: [] };

          const profileMap = new Map(
            (profiles || []).map((p: { id: string; name: string }) => [p.id, p.name])
          );

          const actRows: ActivityRow[] = activityData.map(
            (a: {
              id: string;
              action: string;
              timestamp: string;
              performed_by: string | null;
              data: Record<string, unknown>;
            }) => ({
              id: a.id,
              actor: (a.performed_by && profileMap.get(a.performed_by)) || 'System',
              action: a.action?.replace(/_/g, ' ') || 'performed action',
              target: '',
              time: formatTimeAgo(a.timestamp),
              outcome: (a.data as { outcome?: string })?.outcome,
              status: (a.data as { new_status?: string })?.new_status,
              note: (a.data as { notes?: string })?.notes,
            })
          );
          setActivities(actRows);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load CRM data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredFamilies = families.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout activeDesk="crm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            style={{
              fontFamily: '"EB Garamond", serif',
              fontSize: '28px',
              fontWeight: 500,
              color: '#1A242B',
            }}
          >
            CRM
          </h1>
          <p className="text-sm mt-1" style={{ color: '#54626C' }}>
            Unified client relations management.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button"
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors duration-200 cursor-pointer"
            style={{
              border: '1px solid rgba(195,199,204,0.5)',
              backgroundColor: '#fff',
              color: '#1A242B',
              fontSize: '11px',
              letterSpacing: '0.12em',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              filter_list
            </span>
            Filter
          </button>
          <button type="button"
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors duration-200 cursor-pointer"
            style={{
              backgroundColor: '#273946',
              color: '#ffffff',
              fontSize: '11px',
              letterSpacing: '0.12em',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              add
            </span>
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
              <button type="button"
                key={tab.key}
                onClick={() => setActiveMainTab(tab.key)}
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

      {/* Sub-tabs */}
      {activeMainTab === 'family-accounts' && (
        <div
          className="flex items-center gap-6 overflow-x-auto shrink-0 pb-1"
          style={{ borderBottom: '1px solid rgba(195,199,204,0.2)' }}
        >
          {SUB_TABS.map((tab) => {
            const isActive = activeSubTab === tab.key;
            return (
              <button type="button"
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
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
      )}

      {/* Search */}
      {activeMainTab === 'family-accounts' && (
        <div
          className="flex items-center rounded px-3 py-2"
          style={{ backgroundColor: '#f4f3f0', border: '1px solid rgba(195,199,204,0.3)' }}
        >
          <span
            className="material-symbols-outlined mr-2"
            style={{ fontSize: '18px', color: '#54626C' }}
          >
            search
          </span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-full p-0"
            placeholder="Search families by name or email..."
            style={{ fontFamily: '"Source Sans 3", sans-serif' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Loading State */}
      {activeMainTab === 'family-accounts' && loading && (
        <div className="flex items-center justify-center py-12">
          <span
            className="material-symbols-outlined animate-spin"
            style={{ fontSize: '24px', color: '#54626C' }}
          >
            progress_activity
          </span>
          <span className="ml-3 text-sm" style={{ color: '#54626C' }}>
            Loading families...
          </span>
        </div>
      )}

      {/* Error State */}
      {activeMainTab === 'family-accounts' && error && (
        <div className="flex items-center justify-center py-12">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '24px', color: '#dc3545' }}
          >
            error
          </span>
          <span className="ml-3 text-sm" style={{ color: '#dc3545' }}>
            {error}
          </span>
        </div>
      )}

      {/* Family Accounts Table */}
      {activeMainTab === 'family-accounts' && !loading && !error && (
        <section>
          <div
            className="rounded-xl overflow-hidden"
            style={{
              border: '1px solid rgba(39,57,70,0.1)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div
              className="px-8 py-6 flex justify-between items-center"
              style={{ borderBottom: '1px solid rgba(195,199,204,0.2)' }}
            >
              <h2
                style={{
                  fontFamily: '"EB Garamond", serif',
                  fontSize: '20px',
                  fontWeight: 500,
                  color: '#1A242B',
                }}
              >
                Family Accounts
              </h2>
              <div className="flex items-center gap-4">
                <span
                  className="uppercase"
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    fontWeight: 600,
                    color: '#54626C',
                  }}
                >
                  Total: {filteredFamilies.length}
                </span>
                <button type="button" className="hover:opacity-70 transition-opacity cursor-pointer">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '16px', color: '#54626C' }}
                  >
                    more_vert
                  </span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    {['Family / Account', 'ID', 'Enrolled', 'Adults', 'Students', 'Status'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-8 py-4 uppercase"
                          style={{
                            fontSize: '11px',
                            letterSpacing: '0.12em',
                            fontWeight: 600,
                            color: '#54626C',
                            borderBottom: '1px solid rgba(195,199,204,0.2)',
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredFamilies.map((family, i) => (
                    <tr
                      key={family.id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                      style={{
                        borderBottom:
                          i < filteredFamilies.length - 1
                            ? '1px solid rgba(195,199,204,0.1)'
                            : undefined,
                        height: '52px',
                      }}
                    >
                      <td className="px-8 py-4">
                        <Link
                          to={`/service/crm/family/${family.id}`}
                          className="block no-underline hover:underline"
                        >
                          <div
                            className="font-medium"
                            style={{ color: '#273946', fontSize: '14px' }}
                          >
                            {family.name}
                          </div>
                          <div className="text-xs" style={{ color: '#54626C' }}>
                            {family.email}
                          </div>
                        </Link>
                      </td>
                      <td className="px-8 py-4 text-sm" style={{ color: '#54626C' }}>
                        {family.id}
                      </td>
                      <td className="px-8 py-4 text-sm" style={{ color: '#54626C' }}>
                        {family.enrolled}
                      </td>
                      <td className="px-8 py-4 text-center text-sm" style={{ color: '#1A242B' }}>
                        {family.adults}
                      </td>
                      <td className="px-8 py-4 text-center text-sm" style={{ color: '#1A242B' }}>
                        {family.students}
                      </td>
                      <td className="px-8 py-4">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                          style={{
                            fontSize: '10px',
                            backgroundColor:
                              family.status === 'Active'
                                ? 'rgba(39,57,70,0.05)'
                                : family.status === 'Pending'
                                  ? 'rgba(232,160,32,0.1)'
                                  : 'rgba(195,199,204,0.2)',
                            color:
                              family.status === 'Active'
                                ? '#273946'
                                : family.status === 'Pending'
                                  ? '#E8A020'
                                  : '#54626C',
                            border: `1px solid ${family.status === 'Active' ? 'rgba(39,57,70,0.1)' : family.status === 'Pending' ? 'rgba(232,160,32,0.2)' : 'rgba(195,199,204,0.3)'}`,
                          }}
                        >
                          {family.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredFamilies.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-8 py-12 text-center text-sm"
                        style={{ color: '#54626C' }}
                      >
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
          <div
            className="rounded-xl overflow-hidden"
            style={{
              border: '1px solid rgba(39,57,70,0.1)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div
              className="px-6 py-4 flex justify-between items-center"
              style={{
                borderBottom: '1px solid rgba(195,199,204,0.2)',
                backgroundColor: '#faf9f6',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '18px', color: '#273946' }}
                >
                  rss_feed
                </span>
                <h2
                  style={{
                    fontFamily: '"EB Garamond", serif',
                    fontSize: '20px',
                    fontWeight: 500,
                    color: '#1A242B',
                  }}
                >
                  Recent Activities
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <p
                  className="uppercase"
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    fontWeight: 600,
                    color: '#54626C',
                  }}
                >
                  Total Activities: 142 | Inquiry: 45%, Application: 30%, Assessment: 15%, Enrolled:
                  10%
                </p>
                <button type="button" className="hover:opacity-70 transition-opacity cursor-pointer">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '16px', color: '#54626C' }}
                  >
                    more_vert
                  </span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {activities.length > 0 ? (
                activities.map((activity, i) => (
                  <div key={activity.id} className="flex gap-4 relative">
                    {i < activities.length - 1 && (
                      <div
                        className="absolute left-4 top-8 bottom-[-24px] w-px"
                        style={{ backgroundColor: 'rgba(195,199,204,0.3)' }}
                      />
                    )}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10"
                      style={{
                        backgroundColor:
                          i === 0
                            ? '#f4f3f0'
                            : i === 1
                              ? 'rgba(232,160,32,0.1)'
                              : 'rgba(39,57,70,0.1)',
                        border:
                          i === 0
                            ? '1px solid rgba(195,199,204,0.5)'
                            : i === 1
                              ? '1px solid rgba(232,160,32,0.3)'
                              : '1px solid rgba(39,57,70,0.3)',
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '14px',
                          color: i === 0 ? '#1A242B' : i === 1 ? '#E8A020' : '#273946',
                        }}
                      >
                        {i === 0
                          ? 'call_made'
                          : i === 1
                            ? 'assignment_turned_in'
                            : 'event_available'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: '#1A242B' }}>
                        <span className="font-semibold" style={{ color: '#273946' }}>
                          {activity.actor}
                        </span>{' '}
                        {activity.action}{' '}
                        {activity.target && (
                          <span className="font-semibold">{activity.target}</span>
                        )}
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#54626C' }}>
                        {activity.time}
                        {activity.outcome
                          ? ` \u2022 Outcome: ${activity.outcome}`
                          : activity.status
                            ? ` \u2022 Status updated to ${activity.status}`
                            : ''}
                      </p>
                      {activity.note && (
                        <div
                          className="mt-3 p-3 rounded text-xs italic"
                          style={{
                            backgroundColor: '#faf9f6',
                            border: '1px solid rgba(195,199,204,0.2)',
                            borderLeft: '2px solid #273946',
                            color: '#54626C',
                          }}
                        >
                          {activity.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-center py-4" style={{ color: '#54626C' }}>
                  No recent activities.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Placeholder for other tabs */}
      {activeMainTab !== 'family-accounts' && (
        <div
          className="flex-1 flex items-center justify-center rounded-xl"
          style={{
            border: '1px solid rgba(39,57,70,0.1)',
            backgroundColor: '#ffffff',
            minHeight: '400px',
          }}
        >
          <div className="text-center">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '48px', color: 'rgba(39,57,70,0.15)' }}
            >
              {activeMainTab === 'overview'
                ? 'dashboard'
                : activeMainTab === 'front-desk'
                  ? 'concierge'
                  : activeMainTab === 'in-house'
                    ? 'corporate_fare'
                    : activeMainTab === 'business'
                      ? 'business_center'
                      : 'school'}
            </span>
            <p className="text-sm mt-2" style={{ color: '#54626C' }}>
              {MAIN_TABS.find((t) => t.key === activeMainTab)?.label} — Coming soon
            </p>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
