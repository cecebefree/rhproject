/**
 * EmailTemplateService — CRUD operations, variable substitution, preview.
 * Handles email template management and usage logging.
 */

import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type TemplateUsageStatus = 'pending' | 'sent' | 'failed';

export interface EmailTemplate {
  id: string;
  tenant_id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  created_by: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EmailTemplateUsage {
  id: string;
  template_id: string;
  tenant_id: string;
  contact_id: string | null;
  sent_at: string;
  status: TemplateUsageStatus;
  variables_used: Record<string, string>;
  created_at: string;
}

export interface EmailTemplateCreateInput {
  name: string;
  subject: string;
  body: string;
  variables?: string[];
  active?: boolean;
}

export interface EmailTemplateUpdateInput {
  name?: string;
  subject?: string;
  body?: string;
  variables?: string[];
  active?: boolean;
}

export const TEMPLATE_USAGE_STATUS_LABELS: Record<TemplateUsageStatus, string> = {
  pending: 'Pending',
  sent: 'Sent',
  failed: 'Failed',
};

// ═══════════════════════════════════════════════════════════
// VARIABLE SUBSTITUTION
// ═══════════════════════════════════════════════════════════

/**
 * Substitute {{variable_name}} placeholders with values
 */
export function substituteVariables(
  text: string,
  variables: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

/**
 * Extract variable names from template content
 */
export function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

/**
 * Render template with variable substitution and return HTML
 */
export function renderPreview(
  template: { subject: string; body: string },
  variables: Record<string, string>
): { subject: string; body: string; html: string } {
  const subject = substituteVariables(template.subject, variables);
  const body = substituteVariables(template.body, variables);

  // Convert simple markdown-like syntax to HTML
  const html = body
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/\n/g, '<br>');

  return { subject, body, html };
}

// ═══════════════════════════════════════════════════════════
// TEMPLATE CRUD QUERIES
// ═══════════════════════════════════════════════════════════

export async function selectTemplates(tenantId: string, includeInactive = false) {
  let query = supabase
    .from('office_desk.email_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('active', true);
  }

  return query;
}

export async function getTemplateById(templateId: string) {
  return supabase
    .from('office_desk.email_templates')
    .select('*')
    .eq('id', templateId)
    .is('deleted_at', null)
    .single();
}

export async function insertTemplate(
  template: EmailTemplateCreateInput,
  tenantId: string,
  userId?: string
) {
  return supabase
    .from('office_desk.email_templates')
    .insert({
      tenant_id: tenantId,
      name: template.name,
      subject: template.subject,
      body: template.body,
      variables: template.variables || [],
      active: template.active ?? true,
      created_by: userId || null,
    })
    .select()
    .single();
}

export async function updateTemplate(
  templateId: string,
  updates: EmailTemplateUpdateInput
) {
  return supabase
    .from('office_desk.email_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .select()
    .single();
}

export async function deleteTemplate(templateId: string) {
  return supabase
    .from('office_desk.email_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', templateId);
}

// ═══════════════════════════════════════════════════════════
// USAGE LOGGING QUERIES
// ═══════════════════════════════════════════════════════════

export async function logTemplateUsage(
  templateId: string,
  contactId: string | null,
  tenantId: string,
  status: TemplateUsageStatus,
  variablesUsed: Record<string, string> = {}
) {
  return supabase
    .from('office_desk.email_template_usage')
    .insert({
      template_id: templateId,
      contact_id: contactId,
      tenant_id: tenantId,
      status,
      variables_used: variablesUsed,
    })
    .select()
    .single();
}

export async function updateTemplateUsageStatus(
  usageId: string,
  status: TemplateUsageStatus
) {
  return supabase
    .from('office_desk.email_template_usage')
    .update({ status })
    .eq('id', usageId)
    .select()
    .single();
}

export async function selectTemplateUsage(
  templateId: string,
  limit = 50,
  offset = 0
) {
  return supabase
    .from('office_desk.email_template_usage')
    .select('*')
    .eq('template_id', templateId)
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1);
}

export async function selectAllTemplateUsage(
  tenantId: string,
  limit = 50,
  offset = 0,
  statusFilter?: TemplateUsageStatus
) {
  let query = supabase
    .from('office_desk.email_template_usage')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  return query;
}

// ═══════════════════════════════════════════════════════════
// TEMPLATE STATISTICS
// ═══════════════════════════════════════════════════════════

export async function getTemplateStats(tenantId: string) {
  const { data, error } = await supabase
    .from('office_desk.email_templates')
    .select('active')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  if (error || !data) {
    return { total: 0, active: 0, inactive: 0 };
  }

  return {
    total: data.length,
    active: data.filter((t: { active: boolean }) => t.active).length,
    inactive: data.filter((t: { active: boolean }) => !t.active).length,
  };
}

export async function getTemplateUsageStats(templateId: string) {
  const { data, error } = await supabase
    .from('office_desk.email_template_usage')
    .select('status')
    .eq('template_id', templateId);

  if (error || !data) {
    return { total: 0, sent: 0, failed: 0, pending: 0 };
  }

  return {
    total: data.length,
    sent: data.filter((u: { status: string }) => u.status === 'sent').length,
    failed: data.filter((u: { status: string }) => u.status === 'failed').length,
    pending: data.filter((u: { status: string }) => u.status === 'pending').length,
  };
}

// ═══════════════════════════════════════════════════════════
// REALTIME SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════

export function subscribeToTemplates(
  tenantId: string,
  callback: (payload: { eventType: string; new: EmailTemplate; old: EmailTemplate | null }) => void
) {
  return supabase
    .channel(`email_templates-${tenantId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'office_desk', table: 'email_templates', filter: `tenant_id=eq.${tenantId}` },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}

export function subscribeToTemplateUsage(
  tenantId: string,
  callback: (payload: { eventType: string; new: EmailTemplateUsage; old: EmailTemplateUsage | null }) => void
) {
  return supabase
    .channel(`email_template_usage-${tenantId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'office_desk', table: 'email_template_usage', filter: `tenant_id=eq.${tenantId}` },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}
