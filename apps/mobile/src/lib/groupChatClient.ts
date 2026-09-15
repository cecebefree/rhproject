// groupChatClient.ts — Fetch group chat + group info data
// Tables: public.group_conversations, public.group_messages
// Per DEFECT-001: Broadcast-only realtime; no Postgres Changes

import { supabase } from '../services/supabase';

export interface GroupConversation {
  id: string;
  name: string;
  category: string;
  lead: string;
  memberCount: number;
  lastMessage: string | null;
  updatedAt: string;
}

export interface GroupMessage {
  id: string;
  senderName: string;
  senderHandle: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

export interface GroupInfo {
  id: string;
  name: string;
  category: string;
  lead: string;
  memberCount: number;
  description: string | null;
  rules: string[];
}

export async function fetchGroupConversations(): Promise<GroupConversation[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Tenant ID from JWT claims (per RLS policy path, not app_metadata)
  const { data: profile } = await supabase
    .schema('public').from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.tenant_id) throw new Error('No tenant associated with this account');
  const tenantId = profile.tenant_id;

  const { data, error } = await supabase
    .schema('public').from('group_conversations')
    .select('id, name, category, lead, member_count, last_message, updated_at')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name ?? 'Unnamed Group',
    category: row.category ?? 'social',
    lead: row.lead ?? '',
    memberCount: row.member_count ?? 0,
    lastMessage: row.last_message ?? null,
    updatedAt: row.updated_at ?? '',
  }));
}

export async function fetchGroupMessages(groupId: string): Promise<GroupMessage[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .schema('public').from('group_messages')
    .select('id, sender_name, sender_handle, content, created_at, sender_id')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    senderName: row.sender_name ?? 'Unknown',
    senderHandle: row.sender_handle ?? '',
    content: row.content ?? '',
    timestamp: new Date(row.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    isOwn: row.sender_id === user.id,
  }));
}

export async function sendMessage(groupId: string, content: string): Promise<GroupMessage> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch sender name from profile
  const { data: profile } = await supabase
    .schema('public').from('profiles')
    .select('name')
    .eq('id', user.id)
    .single();

  const senderName = profile?.name ?? 'Unknown';

  const { data, error } = await supabase
    .schema('public').from('group_messages')
    .insert({
      group_id: groupId,
      sender_id: user.id,
      sender_name: senderName,
      sender_handle: user.email ?? '',
      content: content,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    senderName: data.sender_name ?? 'Unknown',
    senderHandle: data.sender_handle ?? '',
    content: data.content ?? '',
    timestamp: new Date(data.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    isOwn: data.sender_id === user.id,
  };
}

export async function fetchGroupInfo(groupId: string): Promise<GroupInfo> {
  const { data, error } = await supabase
    .schema('public').from('group_conversations')
    .select('id, name, category, lead, member_count, description, rules')
    .eq('id', groupId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name ?? 'Unnamed Group',
    category: data.category ?? 'social',
    lead: data.lead ?? '',
    memberCount: data.member_count ?? 0,
    description: data.description ?? null,
    rules: data.rules ?? [],
  };
}
