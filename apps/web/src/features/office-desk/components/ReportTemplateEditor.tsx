// ReportTemplateEditor — Create and edit report templates (Row 12)

import { useState, useEffect } from 'react';
import type { ReportTemplate, ExportEntityType } from '../services/exportService';

interface ReportTemplateEditorProps {
  template?: ReportTemplate | null;
  onSave: (template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at' | 'tenant_id' | 'created_by'>) => Promise<ReportTemplate | null>;
  onCancel: () => void;
}

const ENTITY_TYPES: ExportEntityType[] = ['contacts', 'leads', 'invoices'];

const AVAILABLE_COLUMNS: Record<ExportEntityType, string[]> = {
  contacts: ['name', 'email', 'phone', 'company', 'position', 'status', 'tags', 'notes', 'created_at', 'updated_at'],
  leads: ['name', 'email', 'phone', 'company', 'status', 'source', 'assigned_to', 'call_count', 'email_count', 'created_at'],
  invoices: ['invoice_number', 'contact_name', 'amount', 'amount_paid', 'status', 'due_date', 'paid_at', 'created_at'],
};

const COLUMN_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  company: 'Company',
  position: 'Position',
  status: 'Status',
  tags: 'Tags',
  notes: 'Notes',
  source: 'Source',
  assigned_to: 'Assigned To',
  call_count: 'Call Count',
  email_count: 'Email Count',
  invoice_number: 'Invoice #',
  contact_name: 'Contact',
  amount: 'Amount',
  amount_paid: 'Amount Paid',
  due_date: 'Due Date',
  paid_at: 'Paid At',
  created_at: 'Created',
  updated_at: 'Updated',
};

export function ReportTemplateEditor({ template, onSave, onCancel }: ReportTemplateEditorProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'custom'>(template?.report_type || 'summary');
  const [entityType, setEntityType] = useState<ExportEntityType>(template?.entity_type || 'contacts');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(template?.columns || []);
  const [sortBy, setSortBy] = useState(template?.sort_by || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(template?.sort_order || 'desc');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setReportType(template.report_type);
      setEntityType(template.entity_type);
      setSelectedColumns(template.columns);
      setSortBy(template.sort_by);
      setSortOrder(template.sort_order);
    }
  }, [template]);

  const handleToggleColumn = (col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleSave = async () => {
    if (!name || selectedColumns.length === 0) return;

    setSaving(true);
    await onSave({
      name,
      description: description || null,
      report_type: reportType,
      entity_type: entityType,
      columns: selectedColumns,
      filters: {},
      sort_by: sortBy,
      sort_order: sortOrder,
      group_by: null,
      is_default: false,
    });
    setSaving(false);
  };

  const availableCols = AVAILABLE_COLUMNS[entityType] || [];

  return (
    <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
        {template ? 'Edit Template' : 'Create Template'}
      </h3>

      {/* Name */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Template Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Weekly Contact Summary"
          style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Description (Optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this report template"
          rows={2}
          style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }}
        />
      </div>

      {/* Entity Type */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Data Source</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {ENTITY_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => {
                setEntityType(type);
                setSelectedColumns([]);
              }}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                backgroundColor: entityType === type ? '#3182ce' : 'white',
                color: entityType === type ? 'white' : '#333',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Report Type */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Report Type</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['summary', 'detailed', 'custom'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                backgroundColor: reportType === type ? '#805ad5' : 'white',
                color: reportType === type ? 'white' : '#333',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Columns */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
          Columns ({selectedColumns.length} selected)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {availableCols.map((col) => (
            <button
              key={col}
              onClick={() => handleToggleColumn(col)}
              style={{
                padding: '6px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                backgroundColor: selectedColumns.includes(col) ? '#38a169' : 'white',
                color: selectedColumns.includes(col) ? 'white' : '#333',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {COLUMN_LABELS[col] || col}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
          >
            {availableCols.map((col) => (
              <option key={col} value={col}>{COLUMN_LABELS[col] || col}</option>
            ))}
          </select>
        </div>
        <div style={{ width: '120px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Order</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleSave}
          disabled={saving || !name || selectedColumns.length === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3182ce',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {saving ? 'Saving...' : 'Save Template'}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '10px 20px',
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
  );
}
