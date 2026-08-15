import { useEffect, useState } from 'react';
import { type ArchiveStats, selectArchiveStats, selectArchivedCount } from '../services/supabase';

interface ArchiveStatsWidgetProps {
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

export function ArchiveStatsWidget({ tenantId }: ArchiveStatsWidgetProps) {
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<ArchiveStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [countResult, statsResult] = await Promise.all([
        selectArchivedCount(tenantId),
        selectArchiveStats(tenantId),
      ]);

      if (countResult.count != null) {
        setTotalCount(countResult.count);
      }
      if (statsResult.data) {
        setStats(statsResult.data);
      }
      setLoading(false);
    }
    load();
  }, [tenantId]);

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ color: '#718096', fontSize: '14px' }}>Loading...</div>
      </div>
    );
  }

  const maxCount = Math.max(...stats.map((s) => s.count), 1);
  const topReasons = stats.filter((s) => s.count > 0).sort((a, b) => b.count - a.count);

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
          Archived Leads
        </h3>
        <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#3182ce' }}>{totalCount}</span>
      </div>

      {topReasons.length === 0 ? (
        <div style={{ color: '#718096', fontSize: '14px' }}>No archived leads</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {topReasons.slice(0, 4).map((s) => (
            <div key={s.reason} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: REASON_COLORS[s.reason] || '#3182ce',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, fontSize: '13px', color: '#4a5568' }}>
                {REASON_LABELS[s.reason] || s.reason}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#2d3748' }}>{s.count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  padding: '16px',
  background: 'white',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  minWidth: '200px',
};
