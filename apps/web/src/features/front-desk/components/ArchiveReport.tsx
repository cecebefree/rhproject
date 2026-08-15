import { useEffect, useState } from 'react';
import {
  type ArchiveAuditLogEntry,
  type ArchiveStats,
  selectArchiveAuditLogWithLead,
  selectArchiveStats,
} from '../services/supabase';

interface ArchiveReportProps {
  tenantId: string;
}

const REASON_COLORS: Record<string, string> = {
  enrolled: '#48bb78',
  withdrawn: '#f56565',
  inactive: '#a0aec0',
  duplicate: '#ed8936',
  other: '#9f7aea',
};

const REASON_LABELS: Record<string, string> = {
  enrolled: 'Enrolled',
  withdrawn: 'Withdrawn',
  inactive: 'Inactive',
  duplicate: 'Duplicate',
  other: 'Other',
};

export function ArchiveReport({ tenantId }: ArchiveReportProps) {
  const [stats, setStats] = useState<ArchiveStats[]>([]);
  const [auditLog, setAuditLog] = useState<ArchiveAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [statsResult, auditResult] = await Promise.all([
      selectArchiveStats(tenantId, dateFrom || undefined, dateTo || undefined),
      selectArchiveAuditLogWithLead(tenantId, dateFrom || undefined, dateTo || undefined),
    ]);

    if (statsResult.error) {
      setError(statsResult.error.message);
    } else if (statsResult.data) {
      setStats(statsResult.data);
    }

    if (auditResult.error) {
      setError(auditResult.error.message);
    } else if (auditResult.data) {
      setAuditLog(auditResult.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [tenantId, dateFrom, dateTo]);

  const totalCount = stats.reduce((sum, s) => sum + s.count, 0);
  const maxCount = Math.max(...stats.map((s) => s.count), 1);

  if (loading) return <div>Loading archive report...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2>Archive Report</h2>

      {error && (
        <div style={{ color: 'red', padding: '8px', background: '#fee', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {/* Date range filter */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <label>
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ display: 'block', padding: '6px', marginTop: '4px' }}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ display: 'block', padding: '6px', marginTop: '4px' }}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setDateFrom('');
            setDateTo('');
          }}
          style={{
            padding: '6px 12px',
            background: '#eee',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '18px',
          }}
        >
          Clear
        </button>
      </div>

      {/* Summary */}
      <div style={{ padding: '16px', background: '#f7fafc', borderRadius: '8px' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2d3748' }}>{totalCount}</div>
        <div style={{ color: '#718096' }}>Total archived leads</div>
      </div>

      {/* Bar chart by reason */}
      {totalCount > 0 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>By Reason</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats
              .filter((s) => s.count > 0)
              .map((s) => (
                <div key={s.reason} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '100px', fontSize: '14px', color: '#4a5568' }}>
                    {REASON_LABELS[s.reason] || s.reason}
                  </div>
                  <div
                    style={{ flex: 1, background: '#e2e8f0', borderRadius: '4px', height: '24px' }}
                  >
                    <div
                      style={{
                        width: `${(s.count / maxCount) * 100}%`,
                        background: REASON_COLORS[s.reason] || '#3182ce',
                        borderRadius: '4px',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '8px',
                        fontSize: '12px',
                        color: 'white',
                        fontWeight: '500',
                      }}
                    >
                      {s.count}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Audit log */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Activity Log</h3>
        {auditLog.length === 0 ? (
          <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '4px' }}>
            No archive activity found for the selected period.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px 4px', color: '#718096' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '8px 4px', color: '#718096' }}>Lead</th>
                  <th style={{ textAlign: 'left', padding: '8px 4px', color: '#718096' }}>
                    Action
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 4px', color: '#718096' }}>
                    Reason
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 4px', color: '#718096' }}>Actor</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid #f7fafc' }}>
                    <td style={{ padding: '8px 4px' }}>
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      {entry.lead_name || '—'}
                      {entry.lead_email && (
                        <div style={{ fontSize: '12px', color: '#718096' }}>{entry.lead_email}</div>
                      )}
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: entry.action === 'archive' ? '#fed7d7' : '#c6f6d5',
                          color: entry.action === 'archive' ? '#9b2c2c' : '#276749',
                        }}
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      {entry.reason ? REASON_LABELS[entry.reason] || entry.reason : '—'}
                    </td>
                    <td style={{ padding: '8px 4px', fontSize: '12px', color: '#718096' }}>
                      {entry.actor_id ? `${entry.actor_id.slice(0, 8)}...` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
