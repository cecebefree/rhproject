// ReportBuilder — Template selector, filters, scheduling for reports (Row 12)

import { useEffect, useState } from 'react';
import type { ExportEntityType, ExportFormat, ReportTemplate, ScheduledReport } from '../services/exportService';

interface ReportBuilderProps {
  templates: ReportTemplate[];
  scheduledReports: ScheduledReport[];
  onExport: (entityType: ExportEntityType, format: ExportFormat, options?: Record<string, unknown>) => Promise<number | null>;
  onCreateScheduled: (report: Omit<ScheduledReport, 'id' | 'created_at' | 'updated_at' | 'template' | 'tenant_id'>) => Promise<ScheduledReport | null>;
  onLoadTemplates: (entityType?: ExportEntityType) => Promise<void>;
}

const ENTITY_LABELS: Record<ExportEntityType, string> = {
  contacts: 'Contacts',
  leads: 'Leads',
  invoices: 'Invoices',
};

export function ReportBuilder({ templates, scheduledReports, onExport, onCreateScheduled, onLoadTemplates }: ReportBuilderProps) {
  const [selectedEntityType, setSelectedEntityType] = useState<ExportEntityType>('contacts');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [schedulerName, setSchedulerName] = useState('');
  const [schedulerFrequency, setSchedulerFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('weekly');
  const [schedulerRecipients, setSchedulerRecipients] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    onLoadTemplates(selectedEntityType);
  }, [selectedEntityType, onLoadTemplates]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const template = templates.find((t) => t.id === selectedTemplate);
      const options = template ? {
        columns: template.columns,
        filters: template.filters,
        sort_by: template.sort_by,
        sort_order: template.sort_order,
      } : undefined;

      await onExport(selectedEntityType, selectedFormat, options);
    } finally {
      setExporting(false);
    }
  };

  const handleSchedule = async () => {
    if (!schedulerName) return;

    const template = templates.find((t) => t.id === selectedTemplate);
    const nextRun = new Date();
    switch (schedulerFrequency) {
      case 'daily': nextRun.setDate(nextRun.getDate() + 1); break;
      case 'weekly': nextRun.setDate(nextRun.getDate() + 7); break;
      case 'monthly': nextRun.setMonth(nextRun.getMonth() + 1); break;
      case 'quarterly': nextRun.setMonth(nextRun.getMonth() + 3); break;
    }

    await onCreateScheduled({
      template_id: selectedTemplate || null,
      name: schedulerName,
      description: `Scheduled ${schedulerFrequency} report for ${ENTITY_LABELS[selectedEntityType]}`,
      frequency: schedulerFrequency,
      recipients: schedulerRecipients.split(',').map((r) => r.trim()).filter(Boolean),
      format: selectedFormat,
      filters: template?.filters || {},
      last_run_at: null,
      next_run_at: nextRun.toISOString(),
      is_active: true,
      created_by: null,
    });

    setShowScheduler(false);
    setSchedulerName('');
    setSchedulerRecipients('');
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Report Builder</h3>

      {/* Entity Type Selector */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Data Source</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(Object.keys(ENTITY_LABELS) as ExportEntityType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedEntityType(type)}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                backgroundColor: selectedEntityType === type ? '#3182ce' : 'white',
                color: selectedEntityType === type ? 'white' : '#333',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {ENTITY_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Template Selector */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Template (Optional)</label>
        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
        >
          <option value="">No template (use defaults)</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.report_type})</option>
          ))}
        </select>
      </div>

      {/* Format Selector */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Export Format</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSelectedFormat('csv')}
            style={{
              padding: '8px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: selectedFormat === 'csv' ? '#38a169' : 'white',
              color: selectedFormat === 'csv' ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            CSV
          </button>
          <button
            onClick={() => setSelectedFormat('pdf')}
            style={{
              padding: '8px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: selectedFormat === 'pdf' ? '#e53e3e' : 'white',
              color: selectedFormat === 'pdf' ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            PDF
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3182ce',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: exporting ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {exporting ? 'Exporting...' : 'Export Now'}
        </button>
        <button
          onClick={() => setShowScheduler(!showScheduler)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#805ad5',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Schedule Report
        </button>
      </div>

      {/* Scheduler Form */}
      {showScheduler && (
        <div style={{ padding: '16px', backgroundColor: '#f7fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Schedule Report</h4>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Report Name</label>
            <input
              type="text"
              value={schedulerName}
              onChange={(e) => setSchedulerName(e.target.value)}
              placeholder="e.g., Weekly Lead Report"
              style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Frequency</label>
            <select
              value={schedulerFrequency}
              onChange={(e) => setSchedulerFrequency(e.target.value as typeof schedulerFrequency)}
              style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Recipients (comma-separated emails)</label>
            <input
              type="text"
              value={schedulerRecipients}
              onChange={(e) => setSchedulerRecipients(e.target.value)}
              placeholder="user1@example.com, user2@example.com"
              style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSchedule}
              disabled={!schedulerName}
              style={{
                padding: '8px 16px',
                backgroundColor: '#38a169',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: schedulerName ? 'pointer' : 'not-allowed',
                fontSize: '14px',
              }}
            >
              Create Schedule
            </button>
            <button
              onClick={() => setShowScheduler(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#e2e8f0',
                color: '#333',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Scheduled Reports Summary */}
      {scheduledReports.length > 0 && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0fff4', borderRadius: '8px', border: '1px solid #c6f6d5' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#276749' }}>Active Scheduled Reports</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#2d3748' }}>
            {scheduledReports.filter((r) => r.is_active).slice(0, 3).map((r) => (
              <li key={r.id}>
                {r.name} — {r.frequency} ({r.format.toUpperCase()})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
