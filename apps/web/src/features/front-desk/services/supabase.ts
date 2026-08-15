import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Front Desk Supabase client init failed: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must both be set'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface Lead {
  id: string;
  tenant_id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  notes: string | null;
  status: 'enquiry' | 'qualified' | 'invoiced' | 'handed_off';
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  callback_scheduled_at: string | null;
  callback_status: string | null;
  callback_notes: string | null;
}

export type LeadStatus = Lead['status'];

export type ArchiveReason = 'enrolled' | 'withdrawn' | 'inactive' | 'duplicate' | 'other';

export const LEAD_STATUSES: LeadStatus[] = ['enquiry', 'qualified', 'invoiced', 'handed_off'];

export const ARCHIVE_REASONS: ArchiveReason[] = ['enrolled', 'withdrawn', 'inactive', 'duplicate', 'other'];

export const ARCHIVE_REASON_LABELS: Record<ArchiveReason, string> = {
  enrolled: 'Enrolled',
  withdrawn: 'Withdrawn',
  inactive: 'Inactive',
  duplicate: 'Duplicate',
  other: 'Other',
};

export async function selectLeads(
  tenantId: string,
  search?: string,
  statusFilter?: LeadStatus,
  sourceFilter?: string,
  dateFrom?: string,
  dateTo?: string
) {
  let query = supabase
    .from('front_desk.leads')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
  }

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  if (sourceFilter) {
    query = query.eq('source', sourceFilter);
  }

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  return query;
}

export async function selectArchivedLeads(tenantId: string) {
  return supabase
    .from('front_desk.leads')
    .select('*')
    .eq('tenant_id', tenantId)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });
}

export async function insertLead(lead: {
  tenant_id: string;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
}) {
  return supabase
    .from('front_desk.leads')
    .insert({
      tenant_id: lead.tenant_id,
      name: lead.name || null,
      company: lead.company || null,
      email: lead.email || null,
      phone: lead.phone || null,
      notes: lead.notes || null,
      status: 'enquiry',
    })
    .select()
    .single();
}

export async function updateLead(
  leadId: string,
  updates: {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    source?: string;
    notes?: string;
    status?: LeadStatus;
  }
) {
  return supabase
    .from('front_desk.leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .select()
    .single();
}

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  return supabase
    .from('front_desk.leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .select()
    .single();
}

export async function getLeadById(leadId: string) {
  return supabase
    .from('front_desk.leads')
    .select('*')
    .eq('id', leadId)
    .single();
}

export async function archiveLead(leadId: string, reason: ArchiveReason) {
  return supabase.rpc('archive_lead', {
    p_lead_id: leadId,
    p_action: 'archive',
    p_reason: reason,
    p_notes: null,
  });
}

export async function unarchiveLead(leadId: string) {
  return supabase.rpc('archive_lead', {
    p_lead_id: leadId,
    p_action: 'unarchive',
    p_reason: null,
    p_notes: null,
  });
}

export function subscribeToLeads(
  callback: (payload: { eventType: string; new: Lead; old: Lead | null }) => void
) {
  return supabase
    .channel('front_desk.leads-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'front_desk', table: 'leads' },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}

export function subscribeToArchivedLeads(
  callback: (payload: { eventType: string; new: Lead; old: Lead | null }) => void
) {
  return supabase
    .channel('front_desk.leads-archived-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'front_desk', table: 'leads' },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}
