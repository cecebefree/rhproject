// ExportService — CSV/PDF export methods for contacts, leads, invoices (Row 12)

import { supabase, supabaseUntyped } from './supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type ExportEntityType = 'contacts' | 'leads' | 'invoices';
export type ExportFormat = 'csv' | 'pdf';

export interface ExportOptions {
  entity_type: ExportEntityType;
  format: ExportFormat;
  columns?: string[];
  filters?: Record<string, unknown>;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  tenant_id: string;
}

export interface ExportResult {
  success: boolean;
  data?: string | Blob;
  filename?: string;
  row_count?: number;
  error?: string;
}

export interface ReportTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  report_type: 'summary' | 'detailed' | 'custom';
  entity_type: ExportEntityType;
  columns: string[];
  filters: Record<string, unknown>;
  sort_by: string;
  sort_order: 'asc' | 'desc';
  group_by: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledReport {
  id: string;
  tenant_id: string;
  template_id: string | null;
  name: string;
  description: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  format: 'csv' | 'pdf' | 'both';
  filters: Record<string, unknown>;
  last_run_at: string | null;
  next_run_at: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  template?: ReportTemplate;
}

export interface ReportLog {
  id: string;
  tenant_id: string;
  scheduled_report_id: string | null;
  template_id: string | null;
  report_type: string;
  entity_type: string;
  format: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  row_count: number;
  file_size_bytes: number;
  file_path: string | null;
  error_message: string | null;
  triggered_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════════════════

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function arrayToCSV(data: Record<string, unknown>[], columns: string[]): string {
  const headers = columns.join(',');
  const rows = data.map((row) =>
    columns.map((col) => escapeCSV(row[col])).join(',')
  );
  return [headers, ...rows].join('\n');
}

export async function exportToCSV(options: ExportOptions): Promise<ExportResult> {
  try {
    const { entity_type, columns, filters, sort_by, sort_order, tenant_id } = options;

    // Default columns per entity type
    const defaultColumns: Record<ExportEntityType, string[]> = {
      contacts: ['name', 'email', 'phone', 'company', 'position', 'status', 'created_at'],
      leads: ['name', 'email', 'phone', 'company', 'status', 'source', 'created_at'],
      invoices: ['invoice_number', 'contact_name', 'amount', 'status', 'due_date', 'created_at'],
    };

    const selectedColumns = columns || defaultColumns[entity_type];

    // Build query based on entity type
    let query;
    switch (entity_type) {
      case 'contacts':
        query = supabaseUntyped
          .from('front_desk.leads')
          .select(selectedColumns.join(', '))
          .eq('tenant_id', tenant_id)
          .is('deleted_at', null);
        break;
      case 'leads':
        query = supabaseUntyped
          .from('front_desk.leads')
          .select(selectedColumns.join(', '))
          .eq('tenant_id', tenant_id)
          .is('deleted_at', null);
        break;
      case 'invoices':
        query = supabaseUntyped
          .from('office_desk.invoices')
          .select(selectedColumns.join(', '))
          .eq('tenant_id', tenant_id)
          .is('deleted_at', null);
        break;
    }

    // Apply filters
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      }
    }

    // Apply sorting
    if (sort_by) {
      query = query.order(sort_by, { ascending: sort_order === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;

    const csv = arrayToCSV(data || [], selectedColumns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const filename = `${entity_type}_export_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      success: true,
      data: blob,
      filename,
      row_count: data?.length || 0,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Export failed',
    };
  }
}

// ═══════════════════════════════════════════════════════════
// PDF EXPORT (using browser print)
// ═══════════════════════════════════════════════════════════

function generatePDFHTML(data: Record<string, unknown>[], columns: string[], title: string): string {
  const headers = columns.map((col) => `<th style="padding: 8px; border-bottom: 2px solid #333; text-align: left; background: #f5f5f5;">${col}</th>`).join('');
  const rows = data.map((row) =>
    `<tr>${columns.map((col) => `<td style="padding: 8px; border-bottom: 1px solid #ddd;">${escapeCSV(row[col])}</td>`).join('')}</tr>`
  ).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; font-size: 24px; }
    .meta { color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Generated: ${new Date().toLocaleString()} | Rows: ${data.length}</div>
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

export async function exportToPDF(options: ExportOptions): Promise<ExportResult> {
  try {
    const { entity_type, columns, filters, sort_by, sort_order, tenant_id } = options;

    // Default columns per entity type
    const defaultColumns: Record<ExportEntityType, string[]> = {
      contacts: ['name', 'email', 'phone', 'company', 'position', 'status', 'created_at'],
      leads: ['name', 'email', 'phone', 'company', 'status', 'source', 'created_at'],
      invoices: ['invoice_number', 'contact_name', 'amount', 'status', 'due_date', 'created_at'],
    };

    const selectedColumns = columns || defaultColumns[entity_type];

    // Build query based on entity type
    let query;
    switch (entity_type) {
      case 'contacts':
        query = supabaseUntyped
          .from('front_desk.leads')
          .select(selectedColumns.join(', '))
          .eq('tenant_id', tenant_id)
          .is('deleted_at', null);
        break;
      case 'leads':
        query = supabaseUntyped
          .from('front_desk.leads')
          .select(selectedColumns.join(', '))
          .eq('tenant_id', tenant_id)
          .is('deleted_at', null);
        break;
      case 'invoices':
        query = supabaseUntyped
          .from('office_desk.invoices')
          .select(selectedColumns.join(', '))
          .eq('tenant_id', tenant_id)
          .is('deleted_at', null);
        break;
    }

    // Apply filters
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      }
    }

    // Apply sorting
    if (sort_by) {
      query = query.order(sort_by, { ascending: sort_order === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;

    const title = `${entity_type.charAt(0).toUpperCase() + entity_type.slice(1)} Report`;
    const html = generatePDFHTML(data || [], selectedColumns, title);
    const blob = new Blob([html], { type: 'text/html' });
    const filename = `${entity_type}_report_${new Date().toISOString().split('T')[0]}.html`;

    return {
      success: true,
      data: blob,
      filename,
      row_count: data?.length || 0,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Export failed',
    };
  }
}

// ═══════════════════════════════════════════════════════════
// DOWNLOAD HELPER
// ═══════════════════════════════════════════════════════════

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════
// TEMPLATE QUERIES
// ═══════════════════════════════════════════════════════════

export async function selectReportTemplates(tenantId: string, entityType?: ExportEntityType) {
  let query = supabaseUntyped
    .from('office_desk.report_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  return query;
}

export async function getReportTemplate(templateId: string) {
  return supabaseUntyped
    .from('office_desk.report_templates')
    .select('*')
    .eq('id', templateId)
    .single();
}

export async function createReportTemplate(template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at'>) {
  return supabaseUntyped
    .from('office_desk.report_templates')
    .insert(template)
    .select()
    .single();
}

export async function updateReportTemplate(templateId: string, updates: Partial<ReportTemplate>) {
  return supabaseUntyped
    .from('office_desk.report_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();
}

export async function deleteReportTemplate(templateId: string) {
  return supabaseUntyped
    .from('office_desk.report_templates')
    .delete()
    .eq('id', templateId);
}

// ═══════════════════════════════════════════════════════════
// SCHEDULED REPORT QUERIES
// ═══════════════════════════════════════════════════════════

export async function selectScheduledReports(tenantId: string) {
  return supabaseUntyped
    .from('office_desk.scheduled_reports')
    .select('*, template:office_desk.report_templates(*)')
    .eq('tenant_id', tenantId)
    .order('next_run_at');
}

export async function getScheduledReport(reportId: string) {
  return supabaseUntyped
    .from('office_desk.scheduled_reports')
    .select('*, template:office_desk.report_templates(*)')
    .eq('id', reportId)
    .single();
}

export async function createScheduledReport(report: Omit<ScheduledReport, 'id' | 'created_at' | 'updated_at' | 'template'>) {
  return supabaseUntyped
    .from('office_desk.scheduled_reports')
    .insert(report)
    .select()
    .single();
}

export async function updateScheduledReport(reportId: string, updates: Partial<ScheduledReport>) {
  return supabaseUntyped
    .from('office_desk.scheduled_reports')
    .update(updates)
    .eq('id', reportId)
    .select()
    .single();
}

export async function deleteScheduledReport(reportId: string) {
  return supabaseUntyped
    .from('office_desk.scheduled_reports')
    .delete()
    .eq('id', reportId);
}

// ═══════════════════════════════════════════════════════════
// REPORT LOG QUERIES
// ═══════════════════════════════════════════════════════════

export async function selectReportLogs(tenantId: string, limit = 50) {
  return supabaseUntyped
    .from('office_desk.report_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

export async function createReportLog(log: Omit<ReportLog, 'id' | 'created_at'>) {
  return supabaseUntyped
    .from('office_desk.report_logs')
    .insert(log)
    .select()
    .single();
}

export async function updateReportLog(logId: string, updates: Partial<ReportLog>) {
  return supabaseUntyped
    .from('office_desk.report_logs')
    .update(updates)
    .eq('id', logId)
    .select()
    .single();
}
