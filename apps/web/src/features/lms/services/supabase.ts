import type { Database } from '@redhouse/shared';
// T014 — LMS feature Supabase client configuration (fail-loud).
// Typed via @redhouse/shared (P2-001 import law): never a relative/deep path.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'LMS Supabase client init failed: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must both be set'
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// Untyped client for office_desk schema (not in shared Database type)
// biome-ignore lint/suspicious/noExplicitAny: office_desk schema not in shared types
export const supabaseUntyped = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as any;

export type LmsSupabaseClient = typeof supabase;

// ═══════════════════════════════════════════════════════════
// REGISTRATION TYPES & QUERIES (Row 67)
// ═══════════════════════════════════════════════════════════

export type RegistrationStatus =
  | 'pending_init'
  | 'pending_review'
  | 'approved'
  | 'active'
  | 'withdrawn'
  | 'rejected';

export const REGISTRATION_STATUSES: RegistrationStatus[] = [
  'pending_init',
  'pending_review',
  'approved',
  'active',
  'withdrawn',
  'rejected',
];

export interface Registration {
  id: string;
  tenant_id: string;
  lead_reference_id: string | null;
  student_name: string;
  student_email: string;
  student_phone: string | null;
  course_name: string | null;
  status: RegistrationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  payment_attached_at: string | null;
  stripe_customer_id: string | null;
  stripe_charge_id: string | null;
  paypal_transaction_id: string | null;
}

export async function selectRegistrations(
  tenantId: string,
  search?: string,
  statusFilter?: RegistrationStatus,
) {
  let query = supabaseUntyped
    .from('office_desk.registrations')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(
      `student_name.ilike.%${search}%,student_email.ilike.%${search}%`,
    );
  }

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  return query;
}

export async function insertRegistration(reg: {
  tenant_id: string;
  student_name: string;
  student_email: string;
  student_phone?: string;
  course_name?: string;
  notes?: string;
  lead_reference_id?: string;
}) {
  return supabaseUntyped
    .from('office_desk.registrations')
    .insert({
      tenant_id: reg.tenant_id,
      student_name: reg.student_name,
      student_email: reg.student_email,
      student_phone: reg.student_phone || null,
      course_name: reg.course_name || null,
      notes: reg.notes || null,
      lead_reference_id: reg.lead_reference_id || null,
      status: 'pending_init',
    })
    .select()
    .single();
}

export async function updateRegistrationStatus(
  registrationId: string,
  status: RegistrationStatus,
) {
  return supabaseUntyped
    .from('office_desk.registrations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', registrationId)
    .select()
    .single();
}

export async function getRegistrationById(registrationId: string) {
  return supabaseUntyped
    .from('office_desk.registrations')
    .select('*')
    .eq('id', registrationId)
    .single();
}

export function subscribeToRegistrations(
  callback: (payload: {
    eventType: string;
    new: Registration;
    old: Registration | null;
  }) => void,
) {
  return supabaseUntyped
    .channel('office_desk.registrations-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'office_desk', table: 'registrations' },
      callback as (payload: Record<string, unknown>) => void,
    )
    .subscribe();
}

// ═══════════════════════════════════════════════════════════
// NEWS TYPES & QUERIES (Row 68)
// ═══════════════════════════════════════════════════════════

export interface News {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
}

export async function selectNews(
  tenantId: string,
  search?: string,
  options?: { includeDrafts?: boolean; createdBy?: string },
) {
  let query = supabaseUntyped
    .from('school_desk.news')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  if (!options?.includeDrafts) {
    query = query.not('published_at', 'is', null);
  }

  if (options?.createdBy) {
    query = query.eq('created_by', options.createdBy);
  }

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  query = query.order('published_at', { ascending: false });

  return query;
}

export async function insertNews(news: {
  tenant_id: string;
  title: string;
  content: string;
  created_by: string;
  publish?: boolean;
}) {
  return supabaseUntyped
    .from('school_desk.news')
    .insert({
      tenant_id: news.tenant_id,
      title: news.title,
      content: news.content,
      created_by: news.created_by,
      published_at: news.publish ? new Date().toISOString() : null,
    })
    .select()
    .single();
}

export async function updateNews(
  newsId: string,
  updates: {
    title?: string;
    content?: string;
    publish?: boolean;
  },
) {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.publish !== undefined) {
    updateData.published_at = updates.publish
      ? new Date().toISOString()
      : null;
  }

  return supabaseUntyped
    .from('school_desk.news')
    .update(updateData)
    .eq('id', newsId)
    .select()
    .single();
}

export async function deleteNews(newsId: string) {
  return supabaseUntyped
    .from('school_desk.news')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', newsId);
}

export async function getNewsById(newsId: string) {
  return supabaseUntyped
    .from('school_desk.news')
    .select('*')
    .eq('id', newsId)
    .is('deleted_at', null)
    .single();
}

export function subscribeToNews(
  callback: (payload: {
    eventType: string;
    new: News;
    old: News | null;
  }) => void,
) {
  return supabaseUntyped
    .channel('school_desk.news-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'school_desk', table: 'news' },
      callback as (payload: Record<string, unknown>) => void,
    )
    .subscribe();
}

// ═══════════════════════════════════════════════════════════
// BROADCAST TYPES & QUERIES (Row 69)
// ═══════════════════════════════════════════════════════════

export interface Broadcast {
  id: string;
  tenant_id: string;
  group_id: string;
  title: string;
  message: string;
  created_by: string;
  created_at: string;
  sent_at: string | null;
  deleted_at: string | null;
}

export interface BroadcastWithGroup extends Broadcast {
  conversations?: { id: string; category: string } | null;
  profiles?: { id: string; name: string } | null;
}

export async function selectBroadcasts(
  tenantId: string,
  options?: { groupId?: string; includeDrafts?: boolean },
) {
  let query = supabaseUntyped
    .from('school_desk.broadcasts')
    .select('*, conversations(id, category), profiles(id, name)')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  if (!options?.includeDrafts) {
    query = query.not('sent_at', 'is', null);
  }

  if (options?.groupId) {
    query = query.eq('group_id', options.groupId);
  }

  query = query.order('sent_at', { ascending: false });

  return query;
}

export async function insertBroadcast(broadcast: {
  tenant_id: string;
  group_id: string;
  title: string;
  message: string;
  created_by: string;
  send?: boolean;
}) {
  return supabaseUntyped
    .from('school_desk.broadcasts')
    .insert({
      tenant_id: broadcast.tenant_id,
      group_id: broadcast.group_id,
      title: broadcast.title,
      message: broadcast.message,
      created_by: broadcast.created_by,
      sent_at: broadcast.send ? new Date().toISOString() : null,
    })
    .select()
    .single();
}

export async function updateBroadcast(
  broadcastId: string,
  updates: {
    title?: string;
    message?: string;
    send?: boolean;
  },
) {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.message !== undefined) updateData.message = updates.message;
  if (updates.send !== undefined) {
    updateData.sent_at = updates.send ? new Date().toISOString() : null;
  }

  return supabaseUntyped
    .from('school_desk.broadcasts')
    .update(updateData)
    .eq('id', broadcastId)
    .select()
    .single();
}

export async function deleteBroadcast(broadcastId: string) {
  return supabaseUntyped
    .from('school_desk.broadcasts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', broadcastId);
}

export async function getBroadcastById(broadcastId: string) {
  return supabaseUntyped
    .from('school_desk.broadcasts')
    .select('*, conversations(id, category), profiles(id, name)')
    .eq('id', broadcastId)
    .is('deleted_at', null)
    .single();
}

export function subscribeToBroadcasts(
  callback: (payload: {
    eventType: string;
    new: Broadcast;
    old: Broadcast | null;
  }) => void,
) {
  return supabaseUntyped
    .channel('school_desk.broadcasts-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'school_desk', table: 'broadcasts' },
      callback as (payload: Record<string, unknown>) => void,
    )
    .subscribe();
}
