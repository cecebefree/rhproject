// PaymentRequestForm — Create Stripe payment link for registration
// Row 72: Teacher workflow - select registration, enter amount, generate payment link

import { useEffect, useState } from 'react';
import { supabaseUntyped, createPaymentSession } from '../services/supabase';

interface Registration {
  id: string;
  student_name: string;
  student_email: string;
}

interface PaymentRequestFormProps {
  tenantId: string;
  userId: string;
  onSuccess?: (paymentUrl: string) => void;
  onCancel?: () => void;
}

export function PaymentRequestForm({
  tenantId,
  userId,
  onSuccess,
  onCancel,
}: PaymentRequestFormProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [registrationId, setRegistrationId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRegistrations, setLoadingRegistrations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRegistrations() {
      const { data, error } = await supabaseUntyped
        .from('office_desk.registrations')
        .select('id, student_name, student_email')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (!cancelled) {
        if (error) {
          setError(error.message);
        } else {
          setRegistrations(data ?? []);
        }
        setLoadingRegistrations(false);
      }
    }

    loadRegistrations();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPaymentUrl(null);

    const { data, error: createError } = await createPaymentSession({
      registration_id: registrationId,
      amount: parseFloat(amount),
      currency,
      description: description || undefined,
    });

    setLoading(false);

    if (createError) {
      setError(createError.message);
    } else if (data?.payment_url) {
      setPaymentUrl(data.payment_url);
      onSuccess?.(data.payment_url);
    }
  }

  function handleCopyLink() {
    if (paymentUrl) {
      navigator.clipboard.writeText(paymentUrl);
    }
  }

  if (paymentUrl) {
    return (
      <div style={styles.card}>
        <h2 style={styles.title}>Payment Link Created</h2>
        <div style={styles.successBox}>
          <p style={styles.successText}>Share this payment link with the student:</p>
          <div style={styles.urlBox}>
            <code style={styles.url}>{paymentUrl}</code>
          </div>
          <div style={styles.buttonRow}>
            <button onClick={handleCopyLink} style={styles.copyButton}>
              Copy Link
            </button>
            <button
              onClick={() => window.open(paymentUrl, '_blank')}
              style={styles.openButton}
            >
              Open in New Tab
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            setPaymentUrl(null);
            setRegistrationId('');
            setAmount('');
            setDescription('');
          }}
          style={styles.anotherButton}
        >
          Create Another Payment Request
        </button>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Create Payment Request</h2>
      <p style={styles.description}>
        Generate a Stripe payment link for a student registration.
      </p>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Registration *</label>
          {loadingRegistrations ? (
            <div style={styles.loadingText}>Loading registrations...</div>
          ) : (
            <select
              value={registrationId}
              onChange={(e) => setRegistrationId(e.target.value)}
              required
              style={styles.select}
            >
              <option value="">Select a registration...</option>
              {registrations.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.student_name} ({r.student_email})
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Currency *</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={styles.select}
            >
              <option value="USD">USD — US Dollar</option>
              <option value="ZAR">ZAR — South African Rand</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
            </select>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Term 1 Tuition Fee"
            style={styles.input}
          />
        </div>

        <div style={styles.buttonRow}>
          {onCancel && (
            <button type="button" onClick={onCancel} style={styles.cancelButton}>
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || loadingRegistrations}
            style={styles.submitButton}
          >
            {loading ? 'Creating...' : 'Create Payment Link'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 8px 0',
  },
  description: {
    fontSize: '14px',
    color: '#718096',
    margin: '0 0 24px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  field: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  loadingText: {
    padding: '8px 12px',
    color: '#718096',
    fontSize: '14px',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  cancelButton: {
    padding: '8px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    fontSize: '14px',
    color: '#4a5568',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '8px 16px',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  successBox: {
    padding: '16px',
    backgroundColor: '#d1fae5',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  successText: {
    fontSize: '14px',
    color: '#065f46',
    margin: '0 0 12px 0',
  },
  urlBox: {
    padding: '8px 12px',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid #a7f3d0',
    marginBottom: '12px',
    overflowX: 'auto',
  },
  url: {
    fontSize: '12px',
    color: '#065f46',
    wordBreak: 'break-all',
  },
  copyButton: {
    padding: '6px 12px',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    marginRight: '8px',
  },
  openButton: {
    padding: '6px 12px',
    backgroundColor: 'white',
    color: '#059669',
    border: '1px solid #059669',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  anotherButton: {
    padding: '8px 16px',
    backgroundColor: 'white',
    color: '#3182ce',
    border: '1px solid #3182ce',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
  },
};
