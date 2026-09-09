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
  tags: string[] | null;
  time_zone: string | null;
  assigned_to: string | null;
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
  // Pipeline fields
  pipeline: 'general_enquiry' | 'registration' | 'career';
  pipeline_stage: PipelineStage;
  pipeline_notes: string | null;
  pipeline_updated_at: string | null;
  source_type: string | null;
}

export type LeadStatus = Lead['status'];

export type PipelineType = 'general_enquiry' | 'registration' | 'career';

export type PipelineStage =
  | 'new' | 'contacted' | 'qualified' | 'resolved'
  | 'fee_captured' | 'handed_off'
  | 'reviewed' | 'interview' | 'hired' | 'rejected'
  | 'archived';

export type ArchiveReason = 'enrolled' | 'withdrawn' | 'inactive' | 'duplicate' | 'other';

export const LEAD_STATUSES: LeadStatus[] = ['enquiry', 'qualified', 'invoiced', 'handed_off'];

export const PIPELINE_TYPES: { value: PipelineType; label: string }[] = [
  { value: 'general_enquiry', label: 'General Enquiry' },
  { value: 'registration', label: 'Registration' },
  { value: 'career', label: 'Career' },
];

export const PIPELINE_STAGES: Record<PipelineType, { value: PipelineStage; label: string }[]> = {
  general_enquiry: [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'archived', label: 'Archived' },
  ],
  registration: [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'fee_captured', label: 'Fee Captured' },
    { value: 'handed_off', label: 'Handed Off to School Desk' },
    { value: 'archived', label: 'Archived' },
  ],
  career: [
    { value: 'new', label: 'New' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'interview', label: 'Interview' },
    { value: 'hired', label: 'Hired' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'archived', label: 'Archived' },
  ],
};

export const PIPELINE_STAGE_COLORS: Record<PipelineStage, { bg: string; text: string }> = {
  new: { bg: '#EBF5FF', text: '#1D4ED8' },
  contacted: { bg: '#FFF7ED', text: '#C2410C' },
  qualified: { bg: '#F0FDF4', text: '#15803D' },
  resolved: { bg: '#F5F3FF', text: '#6D28D9' },
  fee_captured: { bg: '#ECFDF5', text: '#047857' },
  handed_off: { bg: '#FEF3C7', text: '#92400E' },
  reviewed: { bg: '#EFF6FF', text: '#1E40AF' },
  interview: { bg: '#FDF4FF', text: '#9333EA' },
  hired: { bg: '#D1FAE5', text: '#065F46' },
  rejected: { bg: '#FEE2E2', text: '#991B1B' },
  archived: { bg: '#F3F4F6', text: '#6B7280' },
};

export const ARCHIVE_REASONS: ArchiveReason[] = [
  'enrolled',
  'withdrawn',
  'inactive',
  'duplicate',
  'other',
];

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
  return supabase.from('front_desk.leads').select('*').eq('id', leadId).single();
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

// ═══════════════════════════════════════════════════════════
// PIPELINE FUNCTIONS
// ═══════════════════════════════════════════════════════════

export async function moveLeadToPipeline(
  leadId: string,
  pipeline: PipelineType,
  notes?: string
) {
  return supabase.rpc('move_lead_to_pipeline', {
    p_lead_id: leadId,
    p_pipeline: pipeline,
    p_notes: notes || null,
  });
}

export async function advanceLeadPipeline(
  leadId: string,
  newStage: PipelineStage,
  notes?: string
) {
  return supabase.rpc('advance_lead_pipeline', {
    p_lead_id: leadId,
    p_new_stage: newStage,
    p_notes: notes || null,
  });
}

export async function archiveLeadToPipeline(
  leadId: string,
  archiveReason: string,
  sentiment?: 'positive' | 'neutral' | 'negative',
  enquiryType?: string,
  outcomeSummary?: string
) {
  return supabase.rpc('archive_lead_to_pipeline', {
    p_lead_id: leadId,
    p_archive_reason: archiveReason,
    p_sentiment: sentiment || 'neutral',
    p_enquiry_type: enquiryType || null,
    p_outcome_summary: outcomeSummary || null,
  });
}

export async function selectPipelineLeads(
  tenantId: string,
  pipeline: PipelineType,
  stage?: PipelineStage
) {
  let query = supabase
    .from('front_desk.leads')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('pipeline', pipeline)
    .is('archived_at', null)
    .order('pipeline_updated_at', { ascending: false });

  if (stage) {
    query = query.eq('pipeline_stage', stage);
  }

  return query;
}

export async function selectPipelineArchive(
  tenantId: string,
  pipeline?: PipelineType
) {
  let query = supabase
    .from('front_desk.pipeline_archive')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('archived_at', { ascending: false });

  if (pipeline) {
    query = query.eq('pipeline', pipeline);
  }

  return query;
}

// ═══════════════════════════════════════════════════════════
// CALL LOGS
// ═══════════════════════════════════════════════════════════

export interface CallLog {
  id: string;
  tenant_id: string;
  lead_id: string;
  call_id: string | null;
  duration_seconds: number | null;
  direction: 'inbound' | 'outbound';
  outcome: 'initiated' | 'answered' | 'missed' | 'declined' | 'voicemail' | 'failed';
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export async function selectCallLogs(leadId: string) {
  return supabase
    .from('front_desk.call_logs')
    .select('*')
    .eq('lead_id', leadId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
}

export async function insertCallLog(leadId: string, callId: string, outcome: CallLog['outcome']) {
  return supabase
    .from('front_desk.call_logs')
    .insert({ lead_id: leadId, call_id: callId, direction: 'outbound', outcome })
    .select()
    .single();
}

export async function updateCallLog(
  callId: string,
  updates: { duration_seconds?: number; outcome?: CallLog['outcome']; notes?: string }
) {
  return supabase
    .from('front_desk.call_logs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('call_id', callId)
    .select()
    .single();
}

export function subscribeToCallLogs(
  leadId: string,
  callback: (payload: { eventType: string; new: CallLog; old: CallLog | null }) => void
) {
  return supabase
    .channel(`front_desk.call_logs-${leadId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'front_desk', table: 'call_logs', filter: `lead_id=eq.${leadId}` },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}

// ═══════════════════════════════════════════════════════════
// EMAIL LOGS
// ═══════════════════════════════════════════════════════════

export interface EmailLog {
  id: string;
  tenant_id: string;
  lead_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  status: 'draft' | 'sent' | 'failed';
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export async function selectEmailLogs(leadId: string) {
  return supabase
    .from('front_desk.email_logs')
    .select('*')
    .eq('lead_id', leadId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
}

export async function insertEmailLog(
  leadId: string,
  recipientEmail: string,
  subject: string,
  body: string
) {
  return supabase
    .from('front_desk.email_logs')
    .insert({ lead_id: leadId, recipient_email: recipientEmail, subject, body })
    .select()
    .single();
}

export async function updateEmailLog(emailId: string, status: EmailLog['status']) {
  return supabase
    .from('front_desk.email_logs')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', emailId)
    .select()
    .single();
}

export function subscribeToEmailLogs(
  leadId: string,
  callback: (payload: { eventType: string; new: EmailLog; old: EmailLog | null }) => void
) {
  return supabase
    .channel(`front_desk.email_logs-${leadId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'front_desk', table: 'email_logs', filter: `lead_id=eq.${leadId}` },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}

// ═══════════════════════════════════════════════════════════
// EDGE FUNCTION CALLS
// ═══════════════════════════════════════════════════════════

export async function callLead(leadId: string, phoneNumber: string) {
  const { data, error } = await supabase.functions.invoke('call-lead', {
    body: { lead_id: leadId, phone_number: phoneNumber },
  });
  return { data, error };
}

export async function sendEmailToLead(leadId: string, subject: string, body: string) {
  const { data, error } = await supabase.functions.invoke('send-email-lead', {
    body: { lead_id: leadId, subject, body },
  });
  return { data, error };
}

// ═══════════════════════════════════════════════════════════
// ARCHIVE QUERIES (Row 80)
// ═══════════════════════════════════════════════════════════

export interface ArchiveAuditLogEntry {
  id: string;
  lead_id: string;
  tenant_id: string;
  action: 'archive' | 'unarchive';
  reason: ArchiveReason | null;
  notes: string | null;
  actor_id: string;
  created_at: string;
  lead_name?: string;
  lead_email?: string;
}

export interface ArchiveStats {
  reason: ArchiveReason;
  count: number;
}

export interface BulkArchiveResult {
  archived: number;
  skipped: number;
  not_found: number;
  already_archived_ids: string[];
  not_found_ids: string[];
}

export async function selectLeadsWithArchived(
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

export async function selectArchivedCount(tenantId: string) {
  return supabase
    .from('front_desk.leads')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .not('archived_at', 'is', null);
}

export async function selectArchiveStats(tenantId: string, dateFrom?: string, dateTo?: string) {
  let query = supabase
    .from('front_desk.lead_archive_log')
    .select('reason')
    .eq('tenant_id', tenantId)
    .eq('action', 'archive');

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const { data, error } = await query;
  if (error || !data) return { data: null, error };

  // Group by reason and count
  const counts = new Map<string, number>();
  for (const entry of data) {
    const r = entry.reason || 'other';
    counts.set(r, (counts.get(r) || 0) + 1);
  }

  const stats: ArchiveStats[] = ARCHIVE_REASONS.map((reason) => ({
    reason,
    count: counts.get(reason) || 0,
  }));

  return { data: stats, error: null };
}

export async function selectArchiveAuditLogWithLead(
  tenantId: string,
  dateFrom?: string,
  dateTo?: string,
  limit = 50,
  offset = 0
) {
  let query = supabase
    .from('front_desk.lead_archive_log')
    .select('*, leads!inner(name, email)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const { data, error } = await query;
  if (error || !data) return { data: null, error };

  const mapped: ArchiveAuditLogEntry[] = data.map((entry: Record<string, unknown>) => {
    const leads = entry.leads as { name: string | null; email: string | null } | null;
    return {
      id: entry.id as string,
      lead_id: entry.lead_id as string,
      tenant_id: entry.tenant_id as string,
      action: entry.action as 'archive' | 'unarchive',
      reason: entry.reason as ArchiveReason | null,
      notes: entry.notes as string | null,
      actor_id: entry.actor_id as string,
      created_at: entry.created_at as string,
      lead_name: leads?.name ?? undefined,
      lead_email: leads?.email ?? undefined,
    };
  });

  return { data: mapped, error: null };
}

export async function bulkArchiveLeads(leadIds: string[], reason: ArchiveReason, notes?: string) {
  const { data, error } = await supabase.functions.invoke<BulkArchiveResult>('bulk-archive-leads', {
    body: { lead_ids: leadIds, reason, notes },
  });
  return { data, error };
}
