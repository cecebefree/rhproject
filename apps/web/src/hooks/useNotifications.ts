import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../features/office-desk/services/supabase';

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

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  failedCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => void;
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('office_desk.notifications' as never)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'office_desk', table: 'notifications' },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;
  const failedCount = notifications.filter((n) => n.status === 'failed').length;

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
  }, []);

  return {
    notifications,
    unreadCount,
    failedCount,
    loading,
    refresh: loadNotifications,
    markRead,
  };
}
