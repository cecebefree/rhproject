import { useState, useEffect } from 'react';
import { supabase } from '../../lms/services/supabase';

interface Notification {
  id: string;
  registration_id: string;
  notification_type: string;
  sent_at: string;
  email_to: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface NotificationCenterProps {
  onClose: () => void;
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'failed'>('all');

  useEffect(() => {
    loadNotifications();
    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: '*', schema: 'office_desk', table: 'notifications' }, () => {
        loadNotifications();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadNotifications() {
    setLoading(true);
    const { data } = await supabase
      .from('office_desk.notifications' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data as any) ?? []);
    setLoading(false);
  }

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.status === filter);
  const failedCount = notifications.filter(n => n.status === 'failed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative mt-16 mr-4 w-96 max-h-[70vh] bg-white rounded-xl shadow-2xl border flex flex-col overflow-hidden"
        style={{ borderColor: 'rgba(195,199,204,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: 'rgba(195,199,204,0.3)' }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm" style={{ color: '#273946' }}>notifications</span>
            <h3 className="text-sm font-semibold" style={{ color: '#1A242B' }}>Notifications</h3>
            {failedCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#FEE2E2', color: '#C8281E' }}>
                {failedCount} failed
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 cursor-pointer">
            <span className="material-symbols-outlined text-sm" style={{ color: '#54626C' }}>close</span>
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-4 py-2 border-b" style={{ borderColor: 'rgba(195,199,204,0.3)' }}>
          {(['all', 'sent', 'failed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer"
              style={{
                backgroundColor: filter === f ? '#273946' : 'transparent',
                color: filter === f ? '#fff' : '#54626C',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: '#54626C' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: '#54626C' }}>No notifications</div>
          ) : (
            filtered.map(n => (
              <div key={n.id} className="px-4 py-3 border-b hover:bg-gray-50 transition-colors" style={{ borderColor: 'rgba(195,199,204,0.15)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="material-symbols-outlined text-sm"
                        style={{ color: n.status === 'failed' ? '#C8281E' : '#059669' }}
                      >
                        {n.status === 'failed' ? 'error' : 'mail'}
                      </span>
                      <span className="text-xs font-medium truncate" style={{ color: '#1A242B' }}>
                        {n.notification_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs mt-1 truncate" style={{ color: '#54626C' }}>{n.email_to}</p>
                    {n.error_message && (
                      <p className="text-xs mt-1 truncate" style={{ color: '#C8281E' }}>{n.error_message}</p>
                    )}
                  </div>
                  <span className="text-xs whitespace-nowrap ml-2" style={{ color: '#9CA3AF' }}>
                    {formatTime(n.created_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}
