// AdvancedFilterPanel — Filter builder with date picker, status, tags (Row 2)

import { useState } from 'react';
import type { SearchEntityType, SearchFilters, SearchFilter } from '../services/searchService';

interface AdvancedFilterPanelProps {
  entityType: SearchEntityType;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}

const STATUS_OPTIONS: Record<SearchEntityType, { value: string; label: string }[]> = {
  all: [],
  contacts: [
    { value: 'lead', label: 'Lead' },
    { value: 'prospect', label: 'Prospect' },
    { value: 'customer', label: 'Customer' },
    { value: 'inactive', label: 'Inactive' },
  ],
  leads: [
    { value: 'enquiry', label: 'Enquiry' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'invoiced', label: 'Invoiced' },
    { value: 'handed_off', label: 'Handed Off' },
  ],
  invoices: [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
};

const OPERATOR_OPTIONS: { value: SearchFilter['operator']; label: string }[] = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not equals' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less or equal' },
  { value: 'like', label: 'Contains' },
  { value: 'ilike', label: 'Contains (case-insensitive)' },
];

const CUSTOM_FIELD_OPTIONS: Record<SearchEntityType, { value: string; label: string }[]> = {
  all: [],
  contacts: [
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'company', label: 'Company' },
    { value: 'position', label: 'Position' },
  ],
  leads: [
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'company', label: 'Company' },
    { value: 'source', label: 'Source' },
  ],
  invoices: [
    { value: 'invoice_number', label: 'Invoice Number' },
    { value: 'description', label: 'Description' },
    { value: 'amount', label: 'Amount' },
  ],
};

export function AdvancedFilterPanel({
  entityType,
  filters,
  onFiltersChange,
  onApply,
  onClear,
  onClose,
}: AdvancedFilterPanelProps) {
  const [dateFrom, setDateFrom] = useState(filters.date_from || '');
  const [dateTo, setDateTo] = useState(filters.date_to || '');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(filters.status || []);
  const [conditions, setConditions] = useState<SearchFilter[]>(filters.conditions || []);

  const statusOptions = STATUS_OPTIONS[entityType] || [];
  const fieldOptions = CUSTOM_FIELD_OPTIONS[entityType] || [];

  const handleToggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handleAddCondition = () => {
    setConditions((prev) => [
      ...prev,
      { field: fieldOptions[0]?.value || '', operator: 'eq', value: '' },
    ]);
  };

  const handleUpdateCondition = (index: number, updates: Partial<SearchFilter>) => {
    setConditions((prev) =>
      prev.map((cond, i) => (i === index ? { ...cond, ...updates } : cond))
    );
  };

  const handleRemoveCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApply = () => {
    const newFilters: SearchFilters = {};

    if (dateFrom) newFilters.date_from = dateFrom;
    if (dateTo) newFilters.date_to = dateTo;
    if (selectedStatuses.length > 0) newFilters.status = selectedStatuses;
    if (conditions.length > 0) {
      const validConditions = conditions.filter((c) => c.field && c.value !== '');
      if (validConditions.length > 0) {
        newFilters.conditions = validConditions;
      }
    }

    onFiltersChange(newFilters);
    onApply();
  };

  const handleClear = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedStatuses([]);
    setConditions([]);
    onClear();
  };

  const activeFilterCount = [
    dateFrom || dateTo ? 1 : 0,
    selectedStatuses.length > 0 ? 1 : 0,
    conditions.filter((c) => c.field && c.value !== '').length,
  ].reduce((a, b) => a + b, 0);

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f7fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      marginBottom: '16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Advanced Filters</h3>
          {activeFilterCount > 0 && (
            <span style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: '#3182ce',
              color: 'white',
            }}>
              {activeFilterCount} active
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: '#718096',
          }}
        >
          ×
        </button>
      </div>

      {/* Date Range */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
          Date Range
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#718096' }}>From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#718096' }}>To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>
      </div>

      {/* Status Filter */}
      {statusOptions.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
            Status
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {statusOptions.map((status) => (
              <button
                key={status.value}
                onClick={() => handleToggleStatus(status.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  backgroundColor: selectedStatuses.includes(status.value) ? '#3182ce' : 'white',
                  color: selectedStatuses.includes(status.value) ? 'white' : '#4a5568',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Conditions */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500' }}>Custom Conditions</label>
          <button
            onClick={handleAddCondition}
            style={{
              padding: '4px 8px',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#3182ce',
            }}
          >
            + Add
          </button>
        </div>

        {conditions.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', color: '#718096', fontSize: '13px', backgroundColor: 'white', borderRadius: '6px', border: '1px dashed #e2e8f0' }}>
            No custom conditions. Click "Add" to create one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {conditions.map((condition, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={condition.field}
                  onChange={(e) => handleUpdateCondition(index, { field: e.target.value })}
                  style={{
                    flex: 2,
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                >
                  <option value="">Select field</option>
                  {fieldOptions.map((field) => (
                    <option key={field.value} value={field.value}>{field.label}</option>
                  ))}
                </select>

                <select
                  value={condition.operator}
                  onChange={(e) => handleUpdateCondition(index, { operator: e.target.value as SearchFilter['operator'] })}
                  style={{
                    flex: 2,
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                >
                  {OPERATOR_OPTIONS.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={condition.value as string}
                  onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                  placeholder="Value"
                  style={{
                    flex: 2,
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                />

                <button
                  onClick={() => handleRemoveCondition(index)}
                  style={{
                    padding: '8px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    color: '#e53e3e',
                    fontSize: '16px',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={handleClear}
          style={{
            padding: '8px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#4a5568',
          }}
        >
          Clear All
        </button>
        <button
          onClick={handleApply}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#3182ce',
            cursor: 'pointer',
            fontSize: '14px',
            color: 'white',
            fontWeight: '500',
          }}
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
