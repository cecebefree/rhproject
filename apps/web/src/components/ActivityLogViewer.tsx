import { useState, useEffect } from 'react';
import { supabase } from '../features/lms/services/supabase';

interface ActivityEntry {
  id: string;
  inquiry_id: string;
  desk: string;
  action: string;
  timestamp: string;
  performed_by: string | null;
  data: Record<string, any>;
}

interface ActivityLogViewerProps {
  desk?: 'front' | 'office' | 'school';
  limit?: number;
}

const ACTION_ICONS: Record<string, string> = {
  call_logged: 'call',
  email_sent: 'mail',
  sms_sent: 'sms',
  document_uploaded: 'upload',
  status_updated: 'swap_horiz',
  ai_categorized: 'smart_toy',
  counselor_assigned: 'person_add',
  escalated: 'priority_high',
  note_added: 'note',
  callback_scheduled: 'schedule',
  moved_to_office: 'business_center',
};

const ACTION_COLORS: Record<string, string> = {
  call_logged: '#059669',
  email_sent: '#2563EB',
  sms_sent: '#7C3AED',
  status_updated: '#D97706',
  escalated: '#C8281E',
  callback_scheduled: '#0891B2',
  moved_to_office: '#273946',
};

export function ActivityLogViewer({ desk, limit = 50 }: ActivityLogViewerProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadActivity();
  }, [desk]);

  async function loadActivity() {
    setLoading(true);
    let query = supabase
      .from('front_desk.activity_log' as any)
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (desk) {
      query = query.eq('desk', desk);
    }

    const { data } = await query;
    setEntries((data as any) ?? []);
    setLoading(false);
  }

  const actions = Array.from(new Set(entries.map(e => e.action)));
  const filtered = filter === 'all' ? entries : entries.filter(e => e.action === filter);

  return (
    <div className="rounded-xl" style={{ border: '1px solid rgba(195,199,204,0.3)', backgroundColor: '#ffffff' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: 'rgba(195,199,204,0.3)' }}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm" style={{ color: '#273946' }}>history</span>
          <h3 className="text-sm font-semibold" style={{ color: '#1A242B' }}>Activity Log</h3>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>({entries.length})</span>
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 py-2 border-b flex gap-1 overflow-x-auto" style={{ borderColor: 'rgba(195,199,204,0.15)' }}>
        <button
          onClick={() => setFilter('all')}
          className="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors cursor-pointer"
          style={{
            backgroundColor: filter === 'all' ? '#273946' : 'transparent',
            color: filter === 'all' ? '#fff' : '#54626C',
          }}
        >
          All
        </button>
        {actions.map(a => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors cursor-pointer"
            style={{
              backgroundColor: filter === a ? '#273946' : 'transparent',
              color: filter === a ? '#fff' : '#54626C',
            }}
          >
            {a.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#54626C' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: '#54626C' }}>No activity recorded</div>
        ) : (
          filtered.map(entry => (
            <div key={entry.id} className="px-4 py-3 border-b hover:bg-gray-50 transition-colors flex items-start gap-3" style={{ borderColor: 'rgba(195,199,204,0.1)' }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${ACTION_COLORS[entry.action] ?? '#54626C'}15` }}
              >
                <span className="material-symbols-outlined text-sm" style={{ color: ACTION_COLORS[entry.action] ?? '#54626C' }}>
                  {ACTION_ICONS[entry.action] ?? 'info'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: '#1A242B' }}>
                  {entry.action.replace(/_/g, ' ')}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>
                    {new Date(entry.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f4f3f0', color: '#54626C' }}>
                    {entry.desk} desk
                  </span>
                </div>
                {entry.data && Object.keys(entry.data).length > 0 && (
                  <p className="text-xs mt-1 truncate" style={{ color: '#9CA3AF' }}>
                    {JSON.stringify(entry.data).slice(0, 80)}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
