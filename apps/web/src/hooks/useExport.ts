// useExport — Hook for exporting data and managing report templates (Row 12)

import { useState, useCallback } from 'react';
import {
  exportToCSV,
  exportToPDF,
  downloadBlob,
  selectReportTemplates,
  selectScheduledReports,
  selectReportLogs,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
  type ExportEntityType,
  type ExportFormat,
  type ExportOptions,
  type ReportTemplate,
  type ScheduledReport,
  type ReportLog,
} from '../features/office-desk/services/exportService';
import { useRbac } from './useRbac';

interface UseExportOptions {
  tenantId: string;
  userId: string;
  deskId: string;
}

export function useExport({ tenantId, userId, deskId }: UseExportOptions) {
  const { hasPermission } = useRbac({ userId, deskId });
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [reportLogs, setReportLogs] = useState<ReportLog[]>([]);

  // Export data
  const exportData = useCallback(async (
    entityType: ExportEntityType,
    format: ExportFormat,
    options?: Partial<Omit<ExportOptions, 'entity_type' | 'format' | 'tenant_id'>>
  ) => {
    if (!hasPermission('reports.export')) {
      setError('You do not have permission to export data');
      return null;
    }

    setExporting(true);
    setError(null);

    try {
      const exportOptions: ExportOptions = {
        entity_type: entityType,
        format,
        tenant_id: tenantId,
        ...options,
      };

      const result = format === 'csv'
        ? await exportToCSV(exportOptions)
        : await exportToPDF(exportOptions);

      if (result.success && result.data && result.filename) {
        downloadBlob(result.data as Blob, result.filename);
        return result.row_count;
      } else {
        setError(result.error || 'Export failed');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      return null;
    } finally {
      setExporting(false);
    }
  }, [tenantId, hasPermission]);

  // Load templates
  const loadTemplates = useCallback(async (entityType?: ExportEntityType) => {
    const { data, error: fetchError } = await selectReportTemplates(tenantId, entityType);
    if (!fetchError && data) {
      setTemplates(data);
    }
  }, [tenantId]);

  // Create template
  const createTemplate = useCallback(async (template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>) => {
    if (!hasPermission('settings.edit')) {
      setError('You do not have permission to create templates');
      return null;
    }

    const { data, error: createError } = await createReportTemplate({
      ...template,
      tenant_id: tenantId,
      created_by: userId,
    });

    if (!createError && data) {
      setTemplates((prev) => [...prev, data]);
      return data;
    }
    return null;
  }, [tenantId, userId, hasPermission]);

  // Update template
  const updateTemplate = useCallback(async (templateId: string, updates: Partial<ReportTemplate>) => {
    if (!hasPermission('settings.edit')) {
      setError('You do not have permission to update templates');
      return null;
    }

    const { data, error: updateError } = await updateReportTemplate(templateId, updates);
    if (!updateError && data) {
      setTemplates((prev) => prev.map((t) => (t.id === templateId ? data : t)));
      return data;
    }
    return null;
  }, [hasPermission]);

  // Delete template
  const deleteTemplate = useCallback(async (templateId: string) => {
    if (!hasPermission('settings.edit')) {
      setError('You do not have permission to delete templates');
      return false;
    }

    const { error: deleteError } = await deleteReportTemplate(templateId);
    if (!deleteError) {
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      return true;
    }
    return false;
  }, [hasPermission]);

  // Load scheduled reports
  const loadScheduledReports = useCallback(async () => {
    const { data, error: fetchError } = await selectScheduledReports(tenantId);
    if (!fetchError && data) {
      setScheduledReports(data);
    }
  }, [tenantId]);

  // Create scheduled report
  const createScheduledReport_ = useCallback(async (report: Omit<ScheduledReport, 'id' | 'created_at' | 'updated_at' | 'template' | 'tenant_id'>) => {
    if (!hasPermission('settings.edit')) {
      setError('You do not have permission to create scheduled reports');
      return null;
    }

    const { data, error: createError } = await createScheduledReport({
      ...report,
      tenant_id: tenantId,
      created_by: userId,
    });

    if (!createError && data) {
      setScheduledReports((prev) => [...prev, data]);
      return data;
    }
    return null;
  }, [tenantId, userId, hasPermission]);

  // Update scheduled report
  const updateScheduledReport_ = useCallback(async (reportId: string, updates: Partial<ScheduledReport>) => {
    if (!hasPermission('settings.edit')) {
      setError('You do not have permission to update scheduled reports');
      return null;
    }

    const { data, error: updateError } = await updateScheduledReport(reportId, updates);
    if (!updateError && data) {
      setScheduledReports((prev) => prev.map((r) => (r.id === reportId ? data : r)));
      return data;
    }
    return null;
  }, [hasPermission]);

  // Delete scheduled report
  const deleteScheduledReport_ = useCallback(async (reportId: string) => {
    if (!hasPermission('settings.edit')) {
      setError('You do not have permission to delete scheduled reports');
      return false;
    }

    const { error: deleteError } = await deleteScheduledReport(reportId);
    if (!deleteError) {
      setScheduledReports((prev) => prev.filter((r) => r.id !== reportId));
      return true;
    }
    return false;
  }, [hasPermission]);

  // Load report logs
  const loadReportLogs = useCallback(async (limit?: number) => {
    const { data, error: fetchError } = await selectReportLogs(tenantId, limit);
    if (!fetchError && data) {
      setReportLogs(data);
    }
  }, [tenantId]);

  return {
    exporting,
    error,
    templates,
    scheduledReports,
    reportLogs,
    exportData,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    loadScheduledReports,
    createScheduledReport: createScheduledReport_,
    updateScheduledReport: updateScheduledReport_,
    deleteScheduledReport: deleteScheduledReport_,
    loadReportLogs,
    canExport: hasPermission('reports.export'),
    canManageReports: hasPermission('settings.edit'),
  };
}
