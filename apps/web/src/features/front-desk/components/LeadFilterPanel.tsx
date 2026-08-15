import { useState } from 'react';
import { LEAD_STATUSES, type LeadStatus } from '../services/supabase';

const STATUS_LABELS: Record<LeadStatus, string> = {
  enquiry: 'Enquiry',
  qualified: 'Qualified',
  invoiced: 'Invoiced',
  handed_off: 'Handed Off',
};

export type LeadViewTab = 'active' | 'archived';

interface LeadFilterPanelProps {
  search: string;
  statusFilter: LeadStatus | '';
  sourceFilter: string;
  dateFrom: string;
  dateTo: string;
  activeTab: LeadViewTab;
  archivedCount?: number;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: LeadStatus | '') => void;
  onSourceChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onTabChange: (tab: LeadViewTab) => void;
  onReset: () => void;
}

export function LeadFilterPanel({
  search,
  statusFilter,
  sourceFilter,
  dateFrom,
  dateTo,
  activeTab,
  archivedCount = 0,
  onSearchChange,
  onStatusChange,
  onSourceChange,
  onDateFromChange,
  onDateToChange,
  onTabChange,
  onReset,
}: LeadFilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const hasActiveFilters = statusFilter || sourceFilter || dateFrom || dateTo;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Active / Archived toggle */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e2e8f0' }}>
        <button
          type="button"
          onClick={() => onTabChange('active')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: activeTab === 'active' ? '2px solid #3182ce' : '2px solid transparent',
            background: 'transparent',
            color: activeTab === 'active' ? '#3182ce' : '#718096',
            cursor: 'pointer',
            fontWeight: activeTab === 'active' ? '600' : '400',
            marginBottom: '-2px',
          }}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => onTabChange('archived')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: activeTab === 'archived' ? '2px solid #3182ce' : '2px solid transparent',
            background: 'transparent',
            color: activeTab === 'archived' ? '#3182ce' : '#718096',
            cursor: 'pointer',
            fontWeight: activeTab === 'archived' ? '600' : '400',
            marginBottom: '-2px',
          }}
        >
          Archived {archivedCount > 0 ? `(${archivedCount})` : ''}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name, email, or company..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ flex: 1, padding: '8px' }}
        />
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: '8px 12px',
            background: hasActiveFilters ? '#3182ce' : '#eee',
            color: hasActiveFilters ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Filters {hasActiveFilters ? '(active)' : ''}
        </button>
      </div>

      {expanded && (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '12px',
            background: '#f7fafc',
            borderRadius: '4px',
          }}
        >
          <label>
            Status
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value as LeadStatus | '')}
              style={{ display: 'block', padding: '6px', marginTop: '4px' }}
            >
              <option value="">All Statuses</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Source
            <input
              type="text"
              placeholder="e.g., website, referral"
              value={sourceFilter}
              onChange={(e) => onSourceChange(e.target.value)}
              style={{ display: 'block', padding: '6px', marginTop: '4px', width: '150px' }}
            />
          </label>

          <label>
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              style={{ display: 'block', padding: '6px', marginTop: '4px' }}
            />
          </label>

          <label>
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              style={{ display: 'block', padding: '6px', marginTop: '4px' }}
            />
          </label>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="button"
              onClick={onReset}
              style={{
                padding: '6px 12px',
                background: '#e53e3e',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
