// Office Desk — Reports tab (child route of OfficeDeskPage)
// Uses ReportBuilder, ScheduledReportsList, ReportTemplateEditor, and ReportPreviewPage

import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useExport } from '../../../hooks/useExport';
import { ReportBuilder } from '../../office-desk/components/ReportBuilder';
import { ReportPreviewPage } from '../../office-desk/components/ReportPreviewPage';
import { ReportTemplateEditor } from '../../office-desk/components/ReportTemplateEditor';
import { ScheduledReportsList } from '../../office-desk/components/ScheduledReportsList';
import type { ReportTemplate } from '../../office-desk/services/exportService';
import { supabase } from '../../office-desk/services/supabase';

interface DeskContext {
  tenantId: string;
  deskId: string;
}

type ReportView = 'builder' | 'scheduled' | 'templates';

export default function OfficeDeskReportsPage() {
  const { tenantId, deskId } = useOutletContext<DeskContext>();
  const [userId, setUserId] = useState<string>('');
  const [activeView, setActiveView] = useState<ReportView>('builder');
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  const {
    templates,
    scheduledReports,
    exporting,
    error,
    exportData,
    loadTemplates,
    createScheduledReport,
    deleteScheduledReport,
    createTemplate,
    updateTemplate,
  } = useExport({ tenantId, userId, deskId });

  const handleExport = async (
    entityType: 'contacts' | 'leads' | 'invoices',
    format: 'csv' | 'pdf',
    options?: Record<string, unknown>
  ): Promise<number | null> => {
    const result = await exportData(entityType, format, options);
    return result ?? null;
  };

  const handleSaveTemplate = async (
    template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at' | 'tenant_id' | 'created_by'>
  ) => {
    const templateWithUser = { ...template, created_by: userId };
    if (editingTemplate) {
      return updateTemplate(editingTemplate.id, templateWithUser);
    }
    return createTemplate(templateWithUser);
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => { setActiveView('builder'); setEditingTemplate(null); }}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            border: '1px solid #e2e8f0',
            backgroundColor: activeView === 'builder' ? '#273946' : 'white',
            color: activeView === 'builder' ? 'white' : '#4a5568',
            cursor: 'pointer',
          }}
        >
          Report Builder
        </button>
        <button
          type="button"
          onClick={() => { setActiveView('scheduled'); setEditingTemplate(null); }}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            border: '1px solid #e2e8f0',
            backgroundColor: activeView === 'scheduled' ? '#273946' : 'white',
            color: activeView === 'scheduled' ? 'white' : '#4a5568',
            cursor: 'pointer',
          }}
        >
          Scheduled Reports
        </button>
        <button
          type="button"
          onClick={() => { setActiveView('templates'); setEditingTemplate(null); }}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            border: '1px solid #e2e8f0',
            backgroundColor: activeView === 'templates' ? '#273946' : 'white',
            color: activeView === 'templates' ? 'white' : '#4a5568',
            cursor: 'pointer',
          }}
        >
          Templates
        </button>
      </div>

      {/* Content */}
      {activeView === 'builder' && (
        <ReportBuilder
          templates={templates}
          scheduledReports={scheduledReports}
          onExport={handleExport}
          onCreateScheduled={createScheduledReport}
          onLoadTemplates={loadTemplates}
        />
      )}

      {activeView === 'scheduled' && (
        <ScheduledReportsList
          scheduledReports={scheduledReports}
          onToggleActive={(reportId, isActive) => {
            console.log('Toggle report:', reportId, isActive);
          }}
          onDelete={deleteScheduledReport}
          onLoad={() => loadTemplates()}
        />
      )}

      {activeView === 'templates' && (
        <ReportTemplateEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => { setEditingTemplate(null); setActiveView('builder'); }}
        />
      )}

      {error && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fee2e2', borderRadius: '6px', color: '#991b1b' }}>
          {error}
        </div>
      )}
    </div>
  );
}
