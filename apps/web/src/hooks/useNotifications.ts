// useNotifications — hook for fetching + subscribing to notifications (Row 74)
// Wraps the existing notification service from office-desk

import { useEffect, useState, useCallback } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
  type Notification,
} from '../features/office-desk/services/notifications';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(userId: string | null): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchErr } = await getNotifications(userId, 15);
      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setNotifications((data as Notification[]) ?? []);
      }

      const { count, error: countErr } = await getUnreadCount(userId);
      if (!countErr) {
        setUnreadCount(count ?? 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = subscribeToNotifications(userId, (payload) => {
      if (payload.eventType === 'INSERT') {
        setNotifications((prev) => [payload.new, ...prev]);
        setUnreadCount((prev) => prev + 1);
      }
    });

    return () => {
      if (channel && typeof channel === 'object' && 'unsubscribe' in channel) {
        (channel as { unsubscribe: () => void }).unsubscribe();
      }
    };
  }, [userId]);

  const markRead = useCallback(async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await markAllAsRead(userId);
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
    );
    setUnreadCount(0);
  }, [userId]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    refresh: fetchNotifications,
  };
}
