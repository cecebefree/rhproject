// NotificationCenter — bell icon + dropdown panel for notifications (Row 74)
// Shows unread count badge, 10 most recent notifications, mark as read

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification } from '../features/office-desk/services/notifications';

interface NotificationCenterProps {
  userId: string;
}

const TYPE_ICONS: Record<string, string> = {
  announcement: '📢',
  enrolment: '🎓',
  schedule: '📅',
  system: '⚙️',
  mention: '💬',
  registration_approved: '✅',
  grade_posted: '📝',
  attendance_logged: '📋',
  message_received: '✉️',
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleToggle = () => setOpen((prev) => !prev);

  const handleClickNotification = async (id: string) => {
    await markRead(id);
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  return (
    <div ref={panelRef} style={styles.container}>
      {/* Bell button */}
      <button onClick={handleToggle} style={styles.bellButton} aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} style={styles.markAllButton}>
                Mark all read
              </button>
            )}
          </div>

          <div style={styles.panelBody}>
            {notifications.length === 0 ? (
              <div style={styles.empty}>No notifications yet.</div>
            ) : (
              notifications.slice(0, 10).map((n: Notification) => (
                <div
                  key={n.id}
                  onClick={() => handleClickNotification(n.id)}
                  style={{
                    ...styles.notifItem,
                    backgroundColor: n.read_at ? 'white' : '#f0f5ff',
                  }}
                >
                  <span style={styles.notifIcon}>
                    {TYPE_ICONS[n.type] ?? '🔔'}
                  </span>
                  <div style={styles.notifContent}>
                    <div style={styles.notifTitle}>{n.title}</div>
                    <div style={styles.notifBody}>{n.message}</div>
                    <div style={styles.notifTime}>{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.read_at && <span style={styles.unreadDot} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
  },
  bellButton: {
    position: 'relative',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    color: 'inherit',
    display: 'flex',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: '0',
    right: '0',
    backgroundColor: '#e53e3e',
    color: 'white',
    fontSize: '10px',
    fontWeight: '700',
    borderRadius: '10px',
    padding: '1px 5px',
    minWidth: '16px',
    textAlign: 'center',
    lineHeight: '14px',
  },
  panel: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    width: '360px',
    maxHeight: '480px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    border: '1px solid #e2e8f0',
    zIndex: 1000,
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
  },
  panelTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#2d3748',
  },
  markAllButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#3182ce',
    fontWeight: '500',
  },
  panelBody: {
    maxHeight: '420px',
    overflowY: 'auto',
  },
  empty: {
    padding: '32px 16px',
    textAlign: 'center',
    color: '#a0aec0',
    fontStyle: 'italic',
    fontSize: '14px',
  },
  notifItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #f7fafc',
    transition: 'background-color 0.15s',
  },
  notifIcon: {
    fontSize: '18px',
    flexShrink: 0,
    marginTop: '2px',
  },
  notifContent: {
    flex: 1,
    minWidth: 0,
  },
  notifTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '2px',
  },
  notifBody: {
    fontSize: '12px',
    color: '#718096',
    lineHeight: '1.3',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  notifTime: {
    fontSize: '11px',
    color: '#a0aec0',
    marginTop: '2px',
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#3182ce',
    flexShrink: 0,
    marginTop: '6px',
  },
};
