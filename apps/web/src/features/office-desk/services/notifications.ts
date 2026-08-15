/**
 * Notification service — Handle mention notifications for contact notes.
 */

import { supabase } from './supabase';

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

interface MentionNotificationData {
  type: 'mention';
  note_id: string;
  contact_id: string;
  author_id: string;
  contact_name: string;
}

/**
 * Create mention notifications for users mentioned in a note.
 */
export async function createMentionNotifications(
  tenantId: string,
  authorId: string,
  authorName: string,
  contactId: string,
  contactName: string,
  noteId: string,
  mentionedUserIds: string[]
): Promise<{ error: Error | null }> {
  if (mentionedUserIds.length === 0) return { error: null };

  const notifications = mentionedUserIds.map((userId) => ({
    tenant_id: tenantId,
    user_id: userId,
    type: 'mention',
    title: 'You were mentioned',
    message: `${authorName} mentioned you in a note on ${contactName}`,
    data: {
      type: 'mention' as const,
      note_id: noteId,
      contact_id: contactId,
      author_id: authorId,
      contact_name: contactName,
    } as MentionNotificationData,
  }));

  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (insertError) {
    return { error: new Error(insertError.message) };
  }

  return { error: null };
}

/**
 * Get notifications for a user.
 */
export async function getNotifications(
  userId: string,
  limit = 20,
  offset = 0
) {
  return supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
}

/**
 * Get unread notification count.
 */
export async function getUnreadCount(userId: string) {
  return supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
}

/**
 * Mark notification as read.
 */
export async function markAsRead(notificationId: string) {
  return supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string) {
  return supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
}

/**
 * Subscribe to new notifications.
 */
export function subscribeToNotifications(
  userId: string,
  callback: (payload: { eventType: string; new: Notification; old: Notification | null }) => void
) {
  return supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}
