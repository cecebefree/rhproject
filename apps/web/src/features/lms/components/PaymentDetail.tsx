// PaymentDetail — Full payment request view with QR code and status
// Row 72: Full payment request view for teacher workflow

import { useEffect, useState } from 'react';
import {
  getPaymentRequestById,
  type PaymentRequestWithRelations,
} from '../services/supabase';
import { StatusBadge } from './StatusBadge';

interface PaymentDetailProps {
  paymentId: string;
  onBack: () => void;
}

function generateQrCodeSvg(url: string, size: number = 200): string {
  // Simple QR code generation using API
  const encodedUrl = encodeURIComponent(url);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}`;
}

export function PaymentDetail({ paymentId, onBack }: PaymentDetailProps) {
  const [request, setRequest] = useState<PaymentRequestWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await getPaymentRequestById(paymentId);
      if (!cancelled) {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setRequest(data);
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  function handleCopyLink() {
    if (request?.stripe_payment_url) {
      navigator.clipboard.writeText(request.stripe_payment_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) return <div style={styles.loading}>Loading payment request...</div>;
  if (error) return <div style={styles.error}>{error}</div>;
  if (!request) return <div style={styles.error}>Payment request not found.</div>;

  const isPending = request.status === 'pending';
  const isPaid = request.status === 'paid';

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>
          Back to List
        </button>
      </div>

      <div style={styles.statusRow}>
        <StatusBadge status={request.status as 'pending' | 'paid' | 'expired' | 'cancelled'} />
      </div>

      <h2 style={styles.title}>
        Payment Request — {request.registrations?.student_name ?? 'Student'}
      </h2>

      <div style={styles.grid}>
        <div style={styles.field}>
          <div style={styles.label}>Student</div>
          <div style={styles.value}>{request.registrations?.student_name ?? 'Unknown'}</div>
        </div>
        <div style={styles.field}>
          <div style={styles.label}>Email</div>
          <div style={styles.value}>{request.registrations?.student_email ?? '—'}</div>
        </div>
        <div style={styles.field}>
          <div style={styles.label}>Amount</div>
          <div style={styles.value}>
            {request.currency} {request.amount.toFixed(2)}
          </div>
        </div>
        <div style={styles.field}>
          <div style={styles.label}>Description</div>
          <div style={styles.value}>{request.description || '—'}</div>
        </div>
      </div>

      {isPending && request.stripe_payment_url && (
        <div style={styles.qrSection}>
          <h3 style={styles.qrTitle}>Payment Link & QR Code</h3>
          <p style={styles.qrDescription}>
            Share this QR code or link with the student to collect payment.
          </p>
          <div style={styles.qrContainer}>
            <img
              src={generateQrCodeSvg(request.stripe_payment_url)}
              alt="Payment QR Code"
              style={styles.qrImage}
            />
          </div>
          <div style={styles.linkBox}>
            <input
              type="text"
              value={request.stripe_payment_url}
              readOnly
              style={styles.linkInput}
            />
            <button onClick={handleCopyLink} style={styles.copyButton}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {isPaid && (
        <div style={styles.paidBanner}>
          <div style={styles.paidIcon}>✓</div>
          <div>
            <div style={styles.paidTitle}>Payment Confirmed</div>
            <div style={styles.paidDate}>
              Paid on {request.paid_at ? new Date(request.paid_at).toLocaleString() : '—'}
            </div>
          </div>
        </div>
      )}

      <div style={styles.datesSection}>
        <h3 style={styles.datesTitle}>Timeline</h3>
        <div style={styles.timeline}>
          <div style={styles.timelineItem}>
            <div style={styles.timelineDot} />
            <div>
              <div style={styles.timelineLabel}>Created</div>
              <div style={styles.timelineDate}>
                {new Date(request.created_at).toLocaleString()}
              </div>
            </div>
          </div>
          {request.paid_at && (
            <div style={styles.timelineItem}>
              <div style={{ ...styles.timelineDot, backgroundColor: '#38a169' }} />
              <div>
                <div style={styles.timelineLabel}>Paid</div>
                <div style={styles.timelineDate}>
                  {new Date(request.paid_at).toLocaleString()}
                </div>
              </div>
            </div>
          )}
          {request.expired_at && (
            <div style={styles.timelineItem}>
              <div style={{ ...styles.timelineDot, backgroundColor: '#e53e3e' }} />
              <div>
                <div style={styles.timelineLabel}>Expired</div>
                <div style={styles.timelineDate}>
                  {new Date(request.expired_at).toLocaleString()}
                </div>
              </div>
            </div>
          )}
          {request.cancelled_at && (
            <div style={styles.timelineItem}>
              <div style={{ ...styles.timelineDot, backgroundColor: '#e53e3e' }} />
              <div>
                <div style={styles.timelineLabel}>Cancelled</div>
                <div style={styles.timelineDate}>
                  {new Date(request.cancelled_at).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {request.stripe_session_id && (
        <div style={styles.metaSection}>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Stripe Session ID:</span>
            <span style={styles.metaValue}>{request.stripe_session_id}</span>
          </div>
        </div>
      )}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  backButton: {
    padding: '8px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    fontSize: '14px',
    color: '#4a5568',
    cursor: 'pointer',
  },
  statusRow: {
    marginBottom: '8px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 24px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  value: {
    fontSize: '16px',
    color: '#2d3748',
  },
  qrSection: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
    marginBottom: '24px',
  },
  qrTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 8px 0',
  },
  qrDescription: {
    fontSize: '14px',
    color: '#718096',
    margin: '0 0 16px 0',
  },
  qrContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  qrImage: {
    width: '200px',
    height: '200px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
  },
  linkBox: {
    display: 'flex',
    gap: '8px',
  },
  linkInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#4a5568',
  },
  copyButton: {
    padding: '8px 16px',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  paidBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#d1fae5',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  paidIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#059669',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  paidTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#065f46',
  },
  paidDate: {
    fontSize: '14px',
    color: '#047857',
  },
  datesSection: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
  },
  datesTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 12px 0',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  timelineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    flexShrink: 0,
  },
  timelineLabel: {
    fontSize: '14px',
    color: '#4a5568',
  },
  timelineDate: {
    fontSize: '12px',
    color: '#718096',
  },
  metaSection: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
    marginTop: '16px',
  },
  metaItem: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
  },
  metaLabel: {
    color: '#718096',
  },
  metaValue: {
    color: '#4a5568',
    fontFamily: 'monospace',
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: '#718096',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '14px',
  },
};
