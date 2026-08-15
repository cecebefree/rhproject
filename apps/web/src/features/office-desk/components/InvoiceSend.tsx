// InvoiceSend — Modal to send invoice email (Row 78)

import { useState } from 'react';
import { sendInvoiceEmail, type Invoice } from '../services/supabase';

interface InvoiceSendProps {
  invoice: Invoice;
  clientEmail: string;
  clientName: string;
  onSent?: () => void;
  onCancel: () => void;
}

export function InvoiceSend({ invoice, clientEmail, clientName, onSent, onCancel }: InvoiceSendProps) {
  const [to, setTo] = useState(clientEmail);
  const [subject, setSubject] = useState(`Invoice ${invoice.invoice_number || ''} from VAS Studio`);
  const [body, setBody] = useState(
    `Dear ${clientName},\n\nPlease find attached invoice ${invoice.invoice_number || 'N/A'} for ${invoice.currency} ${invoice.amount.toFixed(2)}.\n\nDue date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}\n\nPlease make payment by the due date.\n\nKind regards,\nVAS Studio`
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    if (!to.trim()) { setError('Recipient email is required'); return; }
    setSending(true);
    setError(null);

    const { data, error: sendError } = await sendInvoiceEmail(invoice.id, to, subject, body);

    setSending(false);
    if (sendError) {
      setError(sendError.message || 'Failed to send');
    } else if (data?.success === false) {
      setError(data.error || 'Failed to send');
    } else {
      setSuccess(true);
      setTimeout(() => onSent?.(), 1500);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', maxWidth: '500px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#2d3748' }}>Send Invoice</h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#718096' }}>&times;</button>
        </div>

        {error && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}
        {success && <div style={{ padding: '12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', fontSize: '14px', marginBottom: '16px' }}>Invoice sent successfully!</div>}

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#4a5568', marginBottom: '4px' }}>To</label>
          <input type="email" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#4a5568', marginBottom: '4px' }}>Subject</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#4a5568', marginBottom: '4px' }}>Body</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: 'white', fontSize: '14px', color: '#4a5568', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSend} disabled={sending || success} style={{ padding: '8px 16px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: sending || success ? 'not-allowed' : 'pointer', opacity: sending || success ? 0.6 : 1 }}>
            {sending ? 'Sending...' : success ? 'Sent!' : 'Send Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
