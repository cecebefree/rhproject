// InvoiceList — Table view of invoices with search, filter, actions (Row 78)

import { useEffect, useState } from 'react';
import {
  selectInvoices,
  subscribeToInvoices,
  deleteInvoice,
  type Invoice,
  type InvoiceStatus,
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
} from '../services/supabase';
import { exportToCSV } from '../services/exportService';
import { useResponsive } from '../../../components/MobileNav';
import { useBulkSelection } from './BulkSelectionContext';

interface InvoiceListProps {
  tenantId: string;
  onSelect: (invoiceId: string) => void;
  onCreateNew: () => void;
}

export function InvoiceList({ tenantId, onSelect, onCreateNew }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const { isMobile } = useResponsive();
  const { select, deselect, toggle, isSelected, selectAllOnPage, deselectAll, selectedCount } = useBulkSelection();

  const toggleSelectAll = () => {
    if (selectedCount === invoices.length) {
      deselectAll();
    } else {
      selectAllOnPage(invoices.map((inv) => inv.id));
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await selectInvoices(tenantId, search || undefined, statusFilter || undefined);
      if (!cancelled) {
        if (data) setInvoices(data as any);
        setLoading(false);
      }
    }

    load();
    const sub = subscribeToInvoices((payload) => {
      if (payload.eventType === 'INSERT') {
        setInvoices((prev) => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setInvoices((prev) => prev.map((i) => (i.id === payload.new.id ? payload.new : i)));
      } else if (payload.eventType === 'DELETE') {
        setInvoices((prev) => prev.filter((i) => i.id !== payload.old?.id));
      }
    });

    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, [tenantId, search, statusFilter]);

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Delete this invoice?')) return;
    setDeleting(invoiceId);
    await deleteInvoice(invoiceId);
    setInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
    setDeleting(null);
  };

  const statusColors: Record<string, string> = {
    draft: '#e2e8f0',
    sent: '#dbeafe',
    paid: '#d1fae5',
    overdue: '#fee2e2',
    cancelled: '#f5f5f5',
    void: '#fef3c7',
  };

  if (loading) return <div style={{ padding: '24px', textAlign: 'center', color: '#718096' }}>Loading invoices...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        gap: isMobile ? '12px' : '0',
      }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '20px', fontWeight: '600', color: '#2d3748' }}>Invoices</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={async () => {
              await exportToCSV({
                entity_type: 'invoices',
                format: 'csv',
                tenant_id: tenantId,
                filters: statusFilter ? { status: statusFilter } : undefined,
              });
            }}
            style={{ 
              padding: isMobile ? '10px 12px' : '8px 16px', 
              backgroundColor: '#38a169', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: isMobile ? '13px' : '14px', 
              fontWeight: '500', 
              cursor: 'pointer',
              flex: isMobile ? 1 : 'none',
            }}
          >
            Export CSV
          </button>
          <button 
            onClick={onCreateNew} 
            style={{ 
              padding: isMobile ? '10px 12px' : '8px 16px', 
              backgroundColor: '#3182ce', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: isMobile ? '13px' : '14px', 
              fontWeight: '500', 
              cursor: 'pointer',
              flex: isMobile ? 1 : 'none',
            }}
          >
            + New Invoice
          </button>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '12px',
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        <input
          type="text"
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ 
            flex: 1, 
            padding: isMobile ? '12px' : '8px 12px', 
            border: '1px solid #e2e8f0', 
            borderRadius: '6px', 
            fontSize: isMobile ? '16px' : '14px',
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
          style={{ 
            padding: isMobile ? '12px' : '8px 12px', 
            border: '1px solid #e2e8f0', 
            borderRadius: '6px', 
            fontSize: isMobile ? '16px' : '14px',
          }}
        >
          <option value="">All Statuses</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>{INVOICE_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {invoices.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#718096' }}>No invoices found</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} className="hidden md:block">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f7fafc' }}>
                  <th style={{ padding: '12px 16px', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={invoices.length > 0 && selectedCount === invoices.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>Invoice #</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>Client</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>Amount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>Due Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderTop: '1px solid #f0f0f0', backgroundColor: isSelected(inv.id) ? '#ebf8ff' : undefined }}>
                    <td style={{ padding: '12px 16px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected(inv.id)}
                        onChange={() => toggle(inv.id)}
                      />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500', color: '#2d3748' }}>{inv.invoice_number || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4a5568' }}>{(inv as any).lead?.name || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#2d3748', textAlign: 'right' }}>{inv.currency} {inv.amount.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', backgroundColor: statusColors[inv.status] || '#e2e8f0' }}>
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4a5568' }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button onClick={() => onSelect(inv.id)} style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: 'white', fontSize: '12px', cursor: 'pointer', marginRight: '4px' }}>View</button>
                      <button onClick={() => handleDelete(inv.id)} disabled={deleting === inv.id} style={{ padding: '4px 8px', border: '1px solid #fed7d7', borderRadius: '4px', backgroundColor: '#fff5f5', fontSize: '12px', color: '#e53e3e', cursor: deleting === inv.id ? 'not-allowed' : 'pointer' }}>
                        {deleting === inv.id ? '...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="md:hidden">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                style={{
                  padding: '16px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
                      {inv.invoice_number || '—'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
                      {(inv as any).lead?.name || '—'}
                    </div>
                  </div>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: '500', 
                    backgroundColor: statusColors[inv.status] || '#e2e8f0' 
                  }}>
                    {INVOICE_STATUS_LABELS[inv.status]}
                  </span>
                </div>

                {/* Amount & Due Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#718096', marginBottom: '2px' }}>Amount</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#2d3748' }}>
                      {inv.currency} {inv.amount.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#718096', marginBottom: '2px' }}>Due Date</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => onSelect(inv.id)} 
                    style={{ 
                      flex: 1,
                      padding: '10px 12px', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '6px', 
                      backgroundColor: '#3182ce', 
                      color: 'white',
                      fontSize: '14px', 
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    View
                  </button>
                  <button 
                    onClick={() => handleDelete(inv.id)} 
                    disabled={deleting === inv.id} 
                    style={{ 
                      padding: '10px 12px', 
                      border: '1px solid #fed7d7', 
                      borderRadius: '6px', 
                      backgroundColor: '#fff5f5', 
                      fontSize: '14px', 
                      color: '#e53e3e', 
                      cursor: deleting === inv.id ? 'not-allowed' : 'pointer' 
                    }}
                  >
                    {deleting === inv.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
