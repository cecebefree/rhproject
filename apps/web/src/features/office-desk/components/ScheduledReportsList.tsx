// ScheduledReportsList — List and manage scheduled reports (Row 12)

import { useEffect } from 'react';
import type { ScheduledReport } from '../services/exportService';

interface ScheduledReportsListProps {
  scheduledReports: ScheduledReport[];
  onToggleActive: (reportId: string, isActive: boolean) => void;
  onDelete: (reportId: string) => void;
  onLoad: () => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

const FORMAT_LABELS: Record<string, string> = {
  csv: 'CSV',
  pdf: 'PDF',
  both: 'CSV + PDF',
};

export function ScheduledReportsList({ scheduledReports, onToggleActive, onDelete, onLoad }: ScheduledReportsListProps) {
  useEffect(() => {
    onLoad();
  }, [onLoad]);

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Scheduled Reports</h3>

      {scheduledReports.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#718096', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
          No scheduled reports yet. Use the Report Builder to create one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {scheduledReports.map((report) => (
            <div
              key={report.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: report.is_active ? 'white' : '#f7fafc',
                opacity: report.is_active ? 1 : 0.7,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', fontSize: '15px' }}>{report.name}</span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: report.is_active ? '#c6f6d5' : '#e2e8f0',
                      color: report.is_active ? '#276748' : '#718096',
                    }}
                  >
                    {report.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>
                {report.description && (
                  <div style={{ color: '#718096', fontSize: '13px', marginBottom: '4px' }}>
                    {report.description}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#4a5568' }}>
                  <span>Frequency: {FREQUENCY_LABELS[report.frequency]}</span>
                  <span>Format: {FORMAT_LABELS[report.format]}</span>
                  <span>Recipients: {report.recipients.length}</span>
                  {report.last_run_at && (
                    <span>Last run: {new Date(report.last_run_at).toLocaleDateString()}</span>
                  )}
                  <span>Next run: {new Date(report.next_run_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => onToggleActive(report.id, !report.is_active)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: report.is_active ? '#fff5f5' : '#f0fff4',
                    color: report.is_active ? '#e53e3e' : '#38a169',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {report.is_active ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this scheduled report?')) {
                      onDelete(report.id);
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: '#fff5f5',
                    color: '#e53e3e',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
