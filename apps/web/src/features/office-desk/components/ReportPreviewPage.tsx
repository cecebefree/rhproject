// ReportPreviewPage — Preview and export report data (Row 12)

import { useEffect, useState } from 'react';
import { supabaseUntyped } from '../services/supabase';
import type { ExportEntityType } from '../services/exportService';
import { useExport } from '../../../hooks/useExport';

interface ReportPreviewPageProps {
  tenantId: string;
  userId: string;
  deskId: string;
  entityType: ExportEntityType;
}

const COLUMN_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  company: 'Company',
  position: 'Position',
  status: 'Status',
  source: 'Source',
  invoice_number: 'Invoice #',
  contact_name: 'Contact',
  amount: 'Amount',
  due_date: 'Due Date',
  paid_at: 'Paid At',
  created_at: 'Created',
  updated_at: 'Updated',
};

export function ReportPreviewPage({ tenantId, userId, deskId, entityType }: ReportPreviewPageProps) {
  const { exportData, exporting, error } = useExport({ tenantId, userId, deskId });
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      let query;
      switch (entityType) {
        case 'contacts':
        case 'leads':
          query = supabaseUntyped
            .from('front_desk.leads')
            .select('*')
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(100);
          break;
        case 'invoices':
          query = supabaseUntyped
            .from('office_desk.invoices')
            .select('*')
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(100);
          break;
      }

      const { data: results, error } = await query;
      if (!error && results) {
        setData(results);
        if (results.length > 0) {
          setColumns(Object.keys(results[0]).filter((k) => !k.startsWith('_')));
        }
      }
      setLoading(false);
    }

    loadData();
  }, [tenantId, entityType]);

  const handleExportCSV = () => exportData(entityType, 'csv', { columns });
  const handleExportPDF = () => exportData(entityType, 'pdf', { columns });

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
            {entityType.charAt(0).toUpperCase() + entityType.slice(1)} Report
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#718096', fontSize: '14px' }}>
            Preview and export your {entityType} data
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExportCSV}
            disabled={exporting || data.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: '#38a169',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting || data.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fed7d7', color: '#9b2c2c', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>Loading report data...</div>
      ) : data.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>No data available for this report</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7fafc' }}>
                {columns.map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: '2px solid #e2e8f0',
                      fontWeight: '600',
                      color: '#4a5568',
                    }}
                  >
                    {COLUMN_LABELS[col] || col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f7fafc' }}>
                  {columns.map((col) => (
                    <td
                      key={col}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #e2e8f0',
                        color: '#2d3748',
                      }}
                    >
                      {row[col] !== null && row[col] !== undefined
                        ? typeof row[col] === 'object'
                          ? JSON.stringify(row[col])
                          : String(row[col])
                        : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '16px', color: '#718096', fontSize: '13px' }}>
        Showing {data.length} rows (max 100 for preview)
      </div>
    </div>
  );
}
