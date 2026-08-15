// InvoiceDetail — Full invoice view with edit, status transitions, items (Row 78)

import { useEffect, useState } from 'react';
import {
  getInvoiceById,
  updateInvoice,
  selectInvoiceItems,
  insertInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem,
  type Invoice,
  type InvoiceItem,
  INVOICE_STATUS_LABELS,
} from '../services/supabase';

interface InvoiceDetailProps {
  invoiceId: string;
  onBack: () => void;
  onDeleted?: () => void;
}

export function InvoiceDetail({ invoiceId, onBack, onDeleted }: InvoiceDetailProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [status, setStatus] = useState<Invoice['status']>('draft');
  const [dueDate, setDueDate] = useState('');

  // New item form
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await getInvoiceById(invoiceId);
      if (!cancelled) {
        if (fetchError) {
          setError(fetchError.message);
        } else if (data) {
          const d = data as any;
          setInvoice(d);
          setInvoiceNumber(d.invoice_number || '');
          setDescription(d.description || '');
          setAmount(d.amount);
          setAmountPaid(d.amount_paid);
          setStatus(d.status);
          setDueDate(d.due_date ? d.due_date.split('T')[0] : '');
          if (d.items) setItems(d.items);
        }
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [invoiceId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const { error: saveError } = await updateInvoice(invoiceId, {
      invoice_number: invoiceNumber || undefined,
      description: description || undefined,
      amount,
      amount_paid: amountPaid,
      status,
      due_date: dueDate || undefined,
    });
    if (saveError) setError(saveError.message);
    setSaving(false);
  };

  const handleMarkPaid = async () => {
    setSaving(true);
    const { error } = await updateInvoice(invoiceId, {
      status: 'paid',
      amount_paid: amount,
      issued_at: new Date().toISOString(),
    });
    if (error) setError(error.message);
    else { setStatus('paid'); setAmountPaid(amount); }
    setSaving(false);
  };

  const handleSend = async () => {
    setSaving(true);
    const { error } = await updateInvoice(invoiceId, { status: 'sent', issued_at: new Date().toISOString() });
    if (error) setError(error.message);
    else setStatus('sent');
    setSaving(false);
  };

  const handleCancel = async () => {
    setSaving(true);
    const { error } = await updateInvoice(invoiceId, { status: 'cancelled' });
    if (error) setError(error.message);
    else setStatus('cancelled');
    setSaving(false);
  };

  const handleAddItem = async () => {
    if (!newItemDesc.trim()) return;
    const { data, error } = await insertInvoiceItem({
      tenant_id: invoice!.tenant_id,
      invoice_id: invoiceId,
      description: newItemDesc,
      quantity: newItemQty,
      unit_price: newItemPrice,
    });
    if (error) { setError(error.message); return; }
    if (data) {
      setItems((prev) => [...prev, data]);
      // Recalculate total
      const newTotal = items.reduce((sum, i) => sum + i.total_price, 0) + data.total_price;
      setAmount(newTotal);
      await updateInvoice(invoiceId, { amount: newTotal });
    }
    setNewItemDesc('');
    setNewItemQty(1);
    setNewItemPrice(0);
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteInvoiceItem(itemId);
    const updated = items.filter((i) => i.id !== itemId);
    setItems(updated);
    const newTotal = updated.reduce((sum, i) => sum + i.total_price, 0);
    setAmount(newTotal);
    await updateInvoice(invoiceId, { amount: newTotal });
  };

  const computedTotal = items.reduce((sum, i) => sum + i.total_price, 0);

  if (loading) return <div style={{ padding: '24px', textAlign: 'center', color: '#718096' }}>Loading invoice...</div>;
  if (error && !invoice) return <div style={{ padding: '24px', color: '#e53e3e' }}>{error}</div>;
  if (!invoice) return <div style={{ padding: '24px' }}>Invoice not found</div>;

  const statusColors: Record<string, string> = {
    draft: '#e2e8f0', sent: '#dbeafe', paid: '#d1fae5', overdue: '#fee2e2', cancelled: '#f5f5f5', void: '#fef3c7',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{ padding: '4px 8px' }}>&larr; Back</button>
        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', backgroundColor: statusColors[status] || '#e2e8f0' }}>
          {INVOICE_STATUS_LABELS[status]}
        </span>
      </div>

      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#2d3748' }}>Invoice Detail</h2>

      {error && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '14px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          Invoice Number
          <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-001" style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as Invoice['status'])} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          Amount Total
          <input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} step="0.01" style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          Amount Paid
          <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)} step="0.01" style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          Due Date
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          Client
          <input type="text" value={(invoice as any).lead?.name || ''} disabled style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', backgroundColor: '#f7fafc' }} />
        </label>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
      </label>

      {/* Line Items */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748', marginBottom: '8px' }}>Line Items</h3>
        {items.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px', color: '#718096' }}>Description</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', color: '#718096' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', color: '#718096' }}>Unit Price</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', color: '#718096' }}>Total</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f7fafc' }}>
                  <td style={{ padding: '8px 4px' }}>{item.description}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{item.unit_price.toFixed(2)}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '500' }}>{item.total_price.toFixed(2)}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                    <button onClick={() => handleDeleteItem(item.id)} style={{ border: 'none', background: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '12px' }}>&times;</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '12px' }}>
          <input type="text" placeholder="Description" value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} style={{ flex: 2, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
          <input type="number" placeholder="Qty" value={newItemQty} onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)} min="1" style={{ flex: 0.5, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
          <input type="number" placeholder="Unit Price" value={newItemPrice} onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)} step="0.01" min="0" style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }} />
          <button onClick={handleAddItem} style={{ padding: '8px 12px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Add</button>
        </div>

        <div style={{ textAlign: 'right', fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
          Total: {invoice.currency} {computedTotal.toFixed(2)}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
        <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        {status === 'draft' && (
          <button onClick={handleSend} disabled={saving} style={{ padding: '8px 16px', backgroundColor: '#805ad5', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Send</button>
        )}
        {status !== 'paid' && status !== 'cancelled' && (
          <button onClick={handleMarkPaid} disabled={saving} style={{ padding: '8px 16px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Mark Paid</button>
        )}
        {status !== 'paid' && status !== 'cancelled' && (
          <button onClick={handleCancel} disabled={saving} style={{ padding: '8px 16px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
        )}
      </div>
    </div>
  );
}
