// InvoiceCreate — New invoice form with line items (Row 78)

import { useEffect, useState } from 'react';
import {
  insertInvoice,
  insertInvoiceItem,
  type InvoiceStatus,
} from '../services/supabase';
import { supabase } from '../services/supabase';

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface InvoiceCreateProps {
  tenantId: string;
  onCreated?: (invoiceId: string) => void;
  onCancel: () => void;
}

export function InvoiceCreate({ tenantId, onCreated, onCancel }: InvoiceCreateProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadId, setLeadId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('draft');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeads() {
      const { data } = await supabase
        .from('front_desk.leads')
        .select('id, name, email')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');
      if (data) setLeads(data);
    }
    loadLeads();
  }, [tenantId]);

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleItemChange = (id: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const { data: invoice, error: invoiceError } = await insertInvoice({
      tenant_id: tenantId,
      lead_id: leadId || undefined,
      invoice_number: invoiceNumber || undefined,
      amount: total,
      description: description || undefined,
      status,
      due_date: dueDate || undefined,
      issued_at: new Date().toISOString(),
    });

    if (invoiceError) {
      setError(invoiceError.message);
      setLoading(false);
      return;
    }

    // Insert line items
    for (const item of items) {
      if (!item.description.trim()) continue;
      await insertInvoiceItem({
        tenant_id: tenantId,
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      });
    }

    onCreated?.(invoice.id);
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#2d3748' }}>Create Invoice</h2>
        <button onClick={onCancel} style={{ padding: '4px 8px' }}>&larr; Cancel</button>
      </div>

      {error && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '14px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          Invoice Number
          <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Auto-generated if empty" style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          Client
          <select value={leadId} onChange={(e) => setLeadId(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}>
            <option value="">Select client...</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>{l.name || l.email || 'Unknown'}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          Due Date
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
        </label>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
      </label>

      {/* Line Items */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748', marginBottom: '8px' }}>Line Items</h3>
        {items.map((item, idx) => (
          <div key={item.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-end' }}>
            <input type="text" placeholder="Description" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} style={{ flex: 2, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
            <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)} min="1" style={{ flex: 0.5, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
            <input type="number" placeholder="Unit Price" value={item.unit_price} onChange={(e) => handleItemChange(item.id, 'unit_price', parseFloat(e.target.value) || 0)} step="0.01" min="0" style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
            <span style={{ flex: 0.7, padding: '8px 4px', fontSize: '14px', textAlign: 'right' }}>R {(item.quantity * item.unit_price).toFixed(2)}</span>
            <button onClick={() => removeItem(item.id)} disabled={items.length <= 1} style={{ padding: '8px', border: 'none', background: 'none', color: '#e53e3e', cursor: items.length <= 1 ? 'not-allowed' : 'pointer', fontSize: '16px' }}>&times;</button>
          </div>
        ))}
        <button onClick={addItem} style={{ padding: '6px 12px', border: '1px dashed #e2e8f0', borderRadius: '6px', backgroundColor: 'white', fontSize: '14px', color: '#718096', cursor: 'pointer', marginBottom: '12px' }}>+ Add Item</button>
        <div style={{ textAlign: 'right', fontSize: '18px', fontWeight: '600', color: '#2d3748' }}>Total: R {total.toFixed(2)}</div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
        <button onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: 'white', fontSize: '14px', color: '#4a5568', cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSubmit} disabled={loading} style={{ padding: '8px 16px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>
    </div>
  );
}
