import { useState } from 'react';
import { type LeadStatus, LEAD_STATUSES } from '../services/supabase';

const STATUS_LABELS: Record<LeadStatus, string> = {
  enquiry: 'Enquiry',
  qualified: 'Qualified',
  invoiced: 'Invoiced',
  handed_off: 'Handed Off',
};

interface LeadFilterPanelProps {
  search: string;
  statusFilter: LeadStatus | '';
  sourceFilter: string;
  dateFrom: string;
  dateTo: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: LeadStatus | '') => void;
  onSourceChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onReset: () => void;
}

export function LeadFilterPanel({
  search,
  statusFilter,
  sourceFilter,
  dateFrom,
  dateTo,
  onSearchChange,
  onStatusChange,
  onSourceChange,
  onDateFromChange,
  onDateToChange,
  onReset,
}: LeadFilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const hasActiveFilters = statusFilter || sourceFilter || dateFrom || dateTo;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
