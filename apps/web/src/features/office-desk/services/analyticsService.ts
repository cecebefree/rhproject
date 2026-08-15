/**
 * AnalyticsService — Query functions for activity stats, conversion rates,
 * revenue trends, and pipeline data.
 */

import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type ActivityEventType =
  | 'page_view'
  | 'button_click'
  | 'form_submit'
  | 'search'
  | 'export'
  | 'import'
  | 'login'
  | 'logout'
  | 'api_call';

export type ActivityEventCategory =
  | 'navigation'
  | 'interaction'
  | 'data'
  | 'auth'
  | 'system';

export type ConversionType =
  | 'lead_to_contact'
  | 'contact_to_invoice'
  | 'lead_to_invoice'
  | 'invoice_paid'
  | 'lead_convert';

export type MetricPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type LeadStage =
  | 'enquiry'
  | 'qualified'
  | 'invoiced'
  | 'handed_off';

export interface UserActivityLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  session_id: string | null;
  event_type: ActivityEventType;
  event_category: ActivityEventCategory;
  page_path: string | null;
  element_id: string | null;
  element_text: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ConversionEvent {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  contact_id: string | null;
  invoice_id: string | null;
  conversion_type: ConversionType;
  source_status: string | null;
  target_status: string | null;
  conversion_value: number | null;
  currency: string;
  conversion_time_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RevenueMetric {
  id: string;
  tenant_id: string;
  metric_date: string;
  metric_period: MetricPeriod;
  total_revenue: number;
  paid_revenue: number;
  pending_revenue: number;
  invoice_count: number;
  paid_invoice_count: number;
  average_invoice_value: number;
  new_contacts: number;
  new_leads: number;
  converted_leads: number;
  conversion_rate: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  totalContacts: number;
  totalLeads: number;
  conversionRate: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  averageInvoiceValue: number;
  recentActivity: UserActivityLog[];
  revenueTrend: RevenueMetric[];
  pipelineByStage: { stage: string; label: string; count: number; totalValue: number; paidValue: number }[];
  conversionFunnel: { stage: string; count: number; rate: number }[];
}

export interface DateRange {
  start: string;
  end: string;
}

export const LEAD_STAGES: LeadStage[] = ['enquiry', 'qualified', 'invoiced', 'handed_off'];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  enquiry: 'Enquiry',
  qualified: 'Qualified',
  invoiced: 'Invoiced',
  handed_off: 'Handed Off',
};

export const CONVERSION_TYPE_LABELS: Record<ConversionType, string> = {
  lead_to_contact: 'Lead to Contact',
  contact_to_invoice: 'Contact to Invoice',
  lead_to_invoice: 'Lead to Invoice',
  invoice_paid: 'Invoice Paid',
  lead_convert: 'Lead Converted',
};

// ═══════════════════════════════════════════════════════════
// ACTIVITY LOG QUERIES
// ═══════════════════════════════════════════════════════════

export async function logActivity(
  tenantId: string,
  userId: string,
  eventType: ActivityEventType,
  eventCategory: ActivityEventCategory,
  pagePath?: string,
  elementId?: string,
  elementText?: string,
  metadata?: Record<string, unknown>
) {
  return supabase.from('office_desk.user_activity_log').insert({
    tenant_id: tenantId,
    user_id: userId,
    event_type: eventType,
    event_category: eventCategory,
    page_path: pagePath || null,
    element_id: elementId || null,
    element_text: elementText || null,
    metadata: metadata || {},
  });
}

export async function selectActivityLog(
  tenantId: string,
  dateRange?: DateRange,
  limit = 100,
  offset = 0
) {
  let query = supabase
    .from('office_desk.user_activity_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);
  }

  return query;
}

export async function selectActivityByType(
  tenantId: string,
  eventType: ActivityEventType,
  dateRange?: DateRange,
  limit = 100
) {
  let query = supabase
    .from('office_desk.user_activity_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('event_type', eventType)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);
  }

  return query;
}

export async function selectActivityByPage(
  tenantId: string,
  pagePath: string,
  dateRange?: DateRange,
  limit = 100
) {
  let query = supabase
    .from('office_desk.user_activity_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('page_path', pagePath)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);
  }

  return query;
}

// ═══════════════════════════════════════════════════════════
// CONVERSION EVENT QUERIES
// ═══════════════════════════════════════════════════════════

export async function recordConversion(
  tenantId: string,
  leadId: string,
  conversionType: ConversionType,
  sourceStatus?: string,
  targetStatus?: string,
  conversionValue?: number,
  metadata?: Record<string, unknown>
) {
  return supabase.from('office_desk.conversion_events').insert({
    tenant_id: tenantId,
    lead_id: leadId,
    conversion_type: conversionType,
    source_status: sourceStatus || null,
    target_status: targetStatus || null,
    conversion_value: conversionValue || null,
    metadata: metadata || {},
  });
}

export async function selectConversionEvents(
  tenantId: string,
  dateRange?: DateRange,
  conversionType?: ConversionType,
  limit = 100,
  offset = 0
) {
  let query = supabase
    .from('office_desk.conversion_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);
  }

  if (conversionType) {
    query = query.eq('conversion_type', conversionType);
  }

  return query;
}

export async function selectConversionStats(
  tenantId: string,
  dateRange?: DateRange
) {
  let query = supabase
    .from('office_desk.conversion_events')
    .select('conversion_type')
    .eq('tenant_id', tenantId);

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);
  }

  const { data, error } = await query;
  if (error || !data) return { data: null, error };

  const stats = {
    total: data.length,
    lead_to_contact: data.filter((e) => e.conversion_type === 'lead_to_contact').length,
    contact_to_invoice: data.filter((e) => e.conversion_type === 'contact_to_invoice').length,
    lead_to_invoice: data.filter((e) => e.conversion_type === 'lead_to_invoice').length,
    invoice_paid: data.filter((e) => e.conversion_type === 'invoice_paid').length,
    lead_convert: data.filter((e) => e.conversion_type === 'lead_convert').length,
  };

  return { data: stats, error: null };
}

// ═══════════════════════════════════════════════════════════
// REVENUE METRIC QUERIES
// ═══════════════════════════════════════════════════════════

export async function selectRevenueMetrics(
  tenantId: string,
  period: MetricPeriod,
  dateRange?: DateRange,
  limit = 30
) {
  let query = supabase
    .from('office_desk.revenue_metrics')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('metric_period', period)
    .order('metric_date', { ascending: false })
    .limit(limit);

  if (dateRange) {
    query = query
      .gte('metric_date', dateRange.start)
      .lte('metric_date', dateRange.end);
  }

  return query;
}

export async function selectLatestRevenueMetric(tenantId: string) {
  return supabase
    .from('office_desk.revenue_metrics')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('metric_date', { ascending: false })
    .limit(1)
    .single();
}

// ═══════════════════════════════════════════════════════════
// PIPELINE DATA
// ═══════════════════════════════════════════════════════════

export async function selectPipelineByStage(tenantId: string) {
  const { data: leads, error } = await supabase
    .from('front_desk.leads')
    .select('status')
    .eq('tenant_id', tenantId)
    .is('archived_at', null);

  if (error || !leads) return { data: null, error };

  const pipeline = LEAD_STAGES.map((stage) => ({
    stage,
    label: LEAD_STAGE_LABELS[stage],
    count: leads.filter((l) => l.status === stage).length,
  }));

  return { data: pipeline, error: null };
}

export async function selectPipelineValue(tenantId: string) {
  const { data: invoices, error } = await supabase
    .from('office_desk.invoices')
    .select('lead_id, amount, status')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  if (error || !invoices) return { data: null, error };

  // Group by lead and sum amounts
  const leadTotals = new Map<string, { total: number; paid: number }>();
  
  for (const invoice of invoices) {
    if (!invoice.lead_id) continue;
    const existing = leadTotals.get(invoice.lead_id) || { total: 0, paid: 0 };
    existing.total += invoice.amount;
    if (invoice.status === 'paid') {
      existing.paid += invoice.amount;
    }
    leadTotals.set(invoice.lead_id, existing);
  }

  // Get leads with their status
  const { data: leads } = await supabase
    .from('front_desk.leads')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .is('archived_at', null);

  if (!leads) return { data: null, error: null };

  const pipeline = LEAD_STAGES.map((stage) => {
    const stageLeads = leads.filter((l) => l.status === stage);
    const totalValue = stageLeads.reduce((sum, l) => {
      const totals = leadTotals.get(l.id);
      return sum + (totals?.total || 0);
    }, 0);
    const paidValue = stageLeads.reduce((sum, l) => {
      const totals = leadTotals.get(l.id);
      return sum + (totals?.paid || 0);
    }, 0);

    return {
      stage,
      label: LEAD_STAGE_LABELS[stage],
      count: stageLeads.length,
      totalValue,
      paidValue,
    };
  });

  return { data: pipeline, error: null };
}

// ═══════════════════════════════════════════════════════════
// CONVERSION FUNNEL DATA
// ═══════════════════════════════════════════════════════════

export async function selectConversionFunnel(tenantId: string, dateRange?: DateRange) {
  // Get leads count
  let leadsQuery = supabase
    .from('front_desk.leads')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('archived_at', null);

  if (dateRange) {
    leadsQuery = leadsQuery
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);
  }

  const { count: totalLeads } = await leadsQuery;

  // Get leads that converted to contacts (qualified or beyond)
  let contactsQuery = supabase
    .from('front_desk.leads')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .in('status', ['qualified', 'invoiced', 'handed_off']);

  if (dateRange) {
    contactsQuery = contactsQuery
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);
  }

  const { count: totalContacts } = await contactsQuery;

  // Get leads that have invoices
  let invoicedQuery = supabase
    .from('front_desk.leads')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .in('status', ['invoiced', 'handed_off']);

  if (dateRange) {
    invoicedQuery = invoicedQuery
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);
  }

  const { count: totalInvoiced } = await invoicedQuery;

  // Get leads that are handed off (converted)
  let convertedQuery = supabase
    .from('front_desk.leads')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .eq('status', 'handed_off');

  if (dateRange) {
    convertedQuery = convertedQuery
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);
  }

  const { count: totalConverted } = await convertedQuery;

  const funnel = [
    { stage: 'Leads', count: totalLeads || 0, rate: 100 },
    {
      stage: 'Contacts',
      count: totalContacts || 0,
      rate: totalLeads ? ((totalContacts || 0) / totalLeads) * 100 : 0,
    },
    {
      stage: 'Invoiced',
      count: totalInvoiced || 0,
      rate: totalLeads ? ((totalInvoiced || 0) / totalLeads) * 100 : 0,
    },
    {
      stage: 'Converted',
      count: totalConverted || 0,
      rate: totalLeads ? ((totalConverted || 0) / totalLeads) * 100 : 0,
    },
  ];

  return { data: funnel, error: null as string | null };
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD AGGREGATION
// ═══════════════════════════════════════════════════════════

export async function selectDashboardMetrics(
  tenantId: string,
  dateRange?: DateRange
): Promise<{ data: DashboardMetrics | null; error: string | null }> {
  try {
    // Get total contacts
    const { count: totalContacts } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // Get total leads
    const { count: totalLeads } = await supabase
      .from('front_desk.leads')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('archived_at', null);

    // Get conversion rate (handed_off / total leads)
    const { count: convertedLeads } = await supabase
      .from('front_desk.leads')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('archived_at', null)
      .eq('status', 'handed_off');

    const conversionRate = totalLeads ? ((convertedLeads || 0) / totalLeads) * 100 : 0;

    // Get revenue metrics
    let invoiceQuery = supabase
      .from('office_desk.invoices')
      .select('amount, status')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (dateRange) {
      invoiceQuery = invoiceQuery
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);
    }

    const { data: invoices } = await invoiceQuery;

    const totalRevenue = invoices?.reduce((sum, i) => sum + i.amount, 0) || 0;
    const paidRevenue = invoices?.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0) || 0;
    const pendingRevenue = invoices?.filter((i) => ['sent', 'draft'].includes(i.status)).reduce((sum, i) => sum + i.amount, 0) || 0;
    const averageInvoiceValue = invoices?.length ? totalRevenue / invoices.length : 0;

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('office_desk.user_activity_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get revenue trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: revenueTrend } = await supabase
      .from('office_desk.revenue_metrics')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('metric_period', 'daily')
      .gte('metric_date', thirtyDaysAgo)
      .order('metric_date', { ascending: true });

    // Get pipeline by stage
    const { data: pipelineByStage } = await selectPipelineValue(tenantId);

    // Get conversion funnel
    const { data: conversionFunnel } = await selectConversionFunnel(tenantId, dateRange);

    return {
      data: {
        totalContacts: totalContacts || 0,
        totalLeads: totalLeads || 0,
        conversionRate,
        totalRevenue,
        paidRevenue,
        pendingRevenue,
        averageInvoiceValue,
        recentActivity: recentActivity || [],
        revenueTrend: revenueTrend || [],
        pipelineByStage: pipelineByStage || [],
        conversionFunnel: conversionFunnel || [],
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard metrics',
    };
  }
}

// ═══════════════════════════════════════════════════════════
// REALTIME SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════

export function subscribeToActivityLog(
  tenantId: string,
  callback: (payload: { eventType: string; new: UserActivityLog; old: UserActivityLog | null }) => void
) {
  return supabase
    .channel(`activity_log-${tenantId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'office_desk', table: 'user_activity_log', filter: `tenant_id=eq.${tenantId}` },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}

export function subscribeToConversionEvents(
  tenantId: string,
  callback: (payload: { eventType: string; new: ConversionEvent; old: ConversionEvent | null }) => void
) {
  return supabase
    .channel(`conversion_events-${tenantId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'office_desk', table: 'conversion_events', filter: `tenant_id=eq.${tenantId}` },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}
