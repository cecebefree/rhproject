import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../../components/AdminLayout';
import { supabase, type Lead, subscribeToLeads } from '../services/supabase';
import { LeadIntakeForm } from '../components/LeadIntakeForm';
import { useRealtimeContext } from '../../../contexts/RealtimeProvider';

type MainTab = 'overview' | 'crm' | 'public-leads' | 'marketing' | 'careers';
type SubTab = 'all' | 'call' | 'email' | 'contact-form' | 'enrollment-call' | 'live-call' | 'chat-bot' | 'marketing' | 'reserve-call';

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'overview', label: 'OVERVIEW' },
  { key: 'crm', label: 'FRONTDESK CRM' },
  { key: 'public-leads', label: 'PUBLIC LEADS' },
  { key: 'marketing', label: 'MARKETING CAMPAIGNS' },
  { key: 'careers', label: 'CAREERS & APPLICATIONS' },
];

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'all', label: 'All leads' },
  { key: 'call', label: 'Call' },
  { key: 'email', label: 'Email' },
  { key: 'contact-form', label: 'Contact Form' },
  { key: 'enrollment-call', label: 'Enrollment Call' },
  { key: 'live-call', label: 'Live Call' },
  { key: 'chat-bot', label: 'Chat Bot' },
  { key: 'reserve-call', label: 'Reserve a Call' },
  { key: 'marketing', label: 'Marketing' },
];

const SOURCE_FILTER_MAP: Record<SubTab, string | null> = {
  all: null,
  call: 'Call',
  email: 'Email',
  'contact-form': 'Contact Form',
  'enrollment-call': 'Enrollment Call',
  'live-call': 'Live Call',
  'chat-bot': 'Chat Bot',
  'reserve-call': 'Reserve a Call',
  marketing: 'Marketing',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  enquiry: { bg: 'rgba(232,160,32,0.1)', text: '#E8A020', border: 'rgba(232,160,32,0.3)' },
  qualified: { bg: 'rgba(39,57,70,0.05)', text: '#273946', border: 'rgba(39,57,70,0.1)' },
  invoiced: { bg: 'rgba(59,130,246,0.1)', text: '#3B82F6', border: 'rgba(59,130,246,0.3)' },
  handed_off: { bg: 'rgba(34,197,94,0.1)', text: '#22C55E', border: 'rgba(34,197,94,0.3)' },
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + `, ${time}`;
}

function getSourceIcon(source: string | null): string {
  switch (source) {
    case 'Web Inquiry':
    case 'Contact Form':
      return 'mail';
    case 'Call':
    case 'Enrollment Call':
      return 'call';
    case 'Live Call':
      return 'phone_in_talk';
    case 'Reserve a Call':
      return 'event';
    case 'Chat Bot':
      return 'chat';
    case 'Marketing':
      return 'campaign';
    default:
      return 'person_add';
  }
}

export function FrontDeskPage() {
  const navigate = useNavigate();
  const { userId } = useRealtimeContext();
  const [mainTab, setMainTab] = useState<MainTab>('public-leads');
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Resolve tenant ID from current user's JWT
  useEffect(() => {
    async function getTenant() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.app_metadata?.tenant_id) {
        setTenantId(user.app_metadata.tenant_id);
      }
    }
    getTenant();
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    const sourceFilter = SOURCE_FILTER_MAP[subTab];

    let query = supabase
      .from('front_desk.leads')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (sourceFilter) {
      query = query.eq('source', sourceFilter);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  }, [subTab]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Real-time subscription
  useEffect(() => {
    const sub = subscribeToLeads((payload) => {
      if (payload.eventType === 'INSERT') {
        setLeads((prev) => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setLeads((prev) =>
          prev.map((l) => (l.id === payload.new.id ? payload.new : l))
        );
      } else if (payload.eventType === 'DELETE') {
        setLeads((prev) => prev.filter((l) => l.id !== payload.old?.id));
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, []);

  const handleLeadClick = (leadId: string) => {
    navigate(`/service/front-desk/lead/${leadId}`);
  };

  const totalLeads = leads.length;
  const assignedCount = leads.filter((l) => l.assigned_to).length;
  const callbackCount = leads.filter((l) => l.callback_scheduled_at).length;

  return (
    <AdminLayout activeDesk="front-desk">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="mb-1" style={{ fontFamily: '"EB Garamond", serif', fontSize: '36px', lineHeight: '44px', fontWeight: 500, color: '#273946', letterSpacing: '-0.01em' }}>
            Front Desk
          </h2>
          <p style={{ fontSize: '14px', lineHeight: '20px', color: '#54626C' }}>
            Pipeline management for incoming student inquiries.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchLeads()}
            className="px-4 py-2 rounded flex items-center gap-2 transition-colors"
            style={{ border: '1px solid #273946', color: '#273946', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', fontFamily: '"Source Sans 3", sans-serif' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(39,57,70,0.05)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
            Refresh
          </button>
          <button
            onClick={() => setShowNewLeadModal(true)}
            className="px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors"
            style={{ backgroundColor: '#273946', color: '#ffffff', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', fontFamily: '"Source Sans 3", sans-serif' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#112430'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#273946'; }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            New Lead
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="overflow-x-auto shrink-0 -mb-[1px]">
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
          const isActive = tab.key === subTab;
          return (
            <button key={tab.key} onClick={() => setSubTab(tab.key)}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-12 space-y-6">
        {/* Stats Bar */}
        <div className="flex items-center gap-6 px-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#54626C' }}>people</span>
            <span style={{ fontSize: '12px', color: '#54626C' }}>
              <span style={{ fontWeight: 600, color: '#1A242B' }}>{totalLeads}</span> leads
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#54626C' }}>assignment_ind</span>
            <span style={{ fontSize: '12px', color: '#54626C' }}>
              <span style={{ fontWeight: 600, color: '#1A242B' }}>{assignedCount}</span> assigned
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#54626C' }}>event</span>
            <span style={{ fontSize: '12px', color: '#54626C' }}>
              <span style={{ fontWeight: 600, color: '#1A242B' }}>{callbackCount}</span> callbacks scheduled
            </span>
          </div>
        </div>

        {/* Leads Table */}
        <div className="overflow-hidden rounded-xl" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(195,199,204,0.2)', backgroundColor: '#faf9f6' }}>
            <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '20px', lineHeight: '28px', fontWeight: 500, color: '#1A242B' }}>
              Incoming Leads
            </h3>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center" style={{ color: '#54626C' }}>Loading leads...</div>
            ) : error ? (
              <div className="p-8 text-center" style={{ color: '#C8281E' }}>Error: {error}</div>
            ) : leads.length === 0 ? (
              <div className="p-8 text-center" style={{ color: '#54626C' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'rgba(39,57,70,0.15)', display: 'block', marginBottom: '8px' }}>inbox</span>
                No leads found
              </div>
            ) : (
              <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(195,199,204,0.2)', backgroundColor: '#F8F7F4' }}>
                    {['Date', 'Lead', 'Source', 'Status', 'Callback', 'Assigned'].map((h) => (
                      <th key={h} className={`py-3 px-6 font-semibold ${h === 'Assigned' ? 'text-right' : ''}`}
                        style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: '#54626C', fontFamily: '"Source Sans 3", sans-serif' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const statusColor = STATUS_COLORS[lead.status] || STATUS_COLORS.enquiry;
                    const hasCallback = lead.callback_scheduled_at && lead.callback_status === 'scheduled';
                    const callbackDate = hasCallback ? new Date(lead.callback_scheduled_at!) : null;
                    const isCallbackPast = callbackDate ? callbackDate < new Date() : false;

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => handleLeadClick(lead.id)}
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: '1px solid rgba(195,199,204,0.1)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f4f3f0'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'; }}>
                        <td className="py-4 px-6" style={{ color: '#54626C', fontSize: '12px' }}>
                          {formatRelativeTime(lead.created_at)}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor: 'rgba(39,57,70,0.05)', border: '1px solid rgba(39,57,70,0.1)' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#273946' }}>
                                {getSourceIcon(lead.source)}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium" style={{ color: '#273946', fontSize: '13px' }}>
                                {lead.name || 'Unknown'}
                              </div>
                              <div style={{ color: '#54626C', fontSize: '11px' }}>
                                {lead.email || lead.phone || '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span style={{ fontSize: '12px', color: '#54626C' }}>
                            {lead.source || '—'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2 py-0.5 rounded"
                            style={{
                              fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em',
                              fontFamily: '"Source Sans 3", sans-serif',
                              backgroundColor: statusColor.bg,
                              color: statusColor.text,
                              border: `1px solid ${statusColor.border}`,
                            }}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {hasCallback ? (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: isCallbackPast ? '#C8281E' : '#22C55E' }}>
                                {isCallbackPast ? 'warning' : 'check_circle'}
                              </span>
                              <span style={{ fontSize: '11px', color: isCallbackPast ? '#C8281E' : '#54626C' }}>
                                {callbackDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                                {callbackDate?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#54626C' }}>—</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right" style={{ fontSize: '12px' }}>
                          {lead.assigned_to ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded"
                              style={{ fontSize: '10px', fontWeight: 600, backgroundColor: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>
                              Assigned
                            </span>
                          ) : (
                            <span style={{ color: '#54626C', fontSize: '11px' }}>Unassigned</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="overflow-hidden rounded-xl" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(195,199,204,0.2)', backgroundColor: '#faf9f6' }}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#273946' }}>rss_feed</span>
              <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '20px', lineHeight: '28px', fontWeight: 500, color: '#1A242B' }}>
                Recent Activity
              </h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {leads.slice(0, 5).map((lead, i) => (
              <div
                key={lead.id}
                onClick={() => handleLeadClick(lead.id)}
                className="flex gap-4 relative cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors">
                {i < Math.min(leads.length, 5) - 1 && (
                  <div className="absolute left-6 top-10 bottom-[-16px] w-px" style={{ backgroundColor: 'rgba(195,199,204,0.3)' }} />
                )}
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10"
                  style={{ backgroundColor: '#ffffff', border: '1px solid #c3c7cc' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#273946' }}>
                    {getSourceIcon(lead.source)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: '13px', lineHeight: '18px', color: '#1A242B' }}>
                    <span className="font-semibold" style={{ color: '#273946' }}>{lead.name || 'Unknown'}</span>
                    {' '}via <span style={{ fontWeight: 600 }}>{lead.source || 'Unknown'}</span>
                  </p>
                  <p className="mt-0.5" style={{ fontSize: '11px', color: '#54626C' }}>
                    {formatRelativeTime(lead.created_at)} · {lead.status}
                    {lead.callback_scheduled_at && ` · Callback ${formatRelativeTime(lead.callback_scheduled_at)}`}
                  </p>
                </div>
              </div>
            ))}
            {leads.length === 0 && (
              <p className="text-center" style={{ color: '#54626C', fontSize: '13px' }}>No activity yet</p>
            )}
          </div>
        </div>
      </div>

      {/* New Lead Modal */}
      {showNewLeadModal && tenantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-40"
            onClick={() => setShowNewLeadModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '20px', fontWeight: 500, color: '#1A242B' }}>
                New Lead
              </h3>
              <button
                onClick={() => setShowNewLeadModal(false)}
                className="p-1 rounded hover:bg-gray-100 transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#54626C' }}>close</span>
              </button>
            </div>
            <LeadIntakeForm
              tenantId={tenantId}
              onSuccess={() => {
                setShowNewLeadModal(false);
                fetchLeads();
              }}
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
