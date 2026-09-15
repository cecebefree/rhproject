// socialClient.ts — Fetch social feed data for mobile Social tab
// Tables: public.group_conversations, public.profiles

import { supabase } from '../services/supabase';

export interface SocialGroup {
  id: string;
  name: string;
  category: string;
  lead: string;
  memberCount: number;
  lastMessage: string | null;
}

export async function fetchSocialGroups(): Promise<SocialGroup[]> {
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
  }));
}
