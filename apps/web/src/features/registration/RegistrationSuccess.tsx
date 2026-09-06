// features/registration/RegistrationSuccess.tsx
// Row 94 — /register/success page: payment confirmation + registration status polling

import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type PollStatus = 'polling' | 'confirmed' | 'not_found' | 'error';

interface RegistrationInfo {
  student_name: string;
  student_email: string;
  status: string;
}

export default function RegistrationSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const provider = searchParams.get('provider');
  const leadId = searchParams.get('lead_id');

  const [pollStatus, setPollStatus] = useState<PollStatus>('polling');
  const [registration, setRegistration] = useState<RegistrationInfo | null>(null);
  const [attempts, setAttempts] = useState(0);

  const isStripe = !!sessionId;
  const isPayPal = provider === 'paypal';

  useEffect(() => {
    if (!leadId) {
      setPollStatus('not_found');
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      if (cancelled) return;

      const { data } = await supabase
        .from('website_leads')
        .select('registration_id, archived_at, family_email, child_name')
        .eq('id', leadId)
        .single();

      if (cancelled) return;

      if (data?.archived_at && data?.registration_id) {
        // Lead archived → registration created (legacy path)
        const { data: reg } = await supabase
          .schema('office_desk')
          .from('registrations')
          .select('student_name, student_email, status')
          .eq('id', data.registration_id)
          .single();

        if (!cancelled) {
          setRegistration(
            reg
              ? { student_name: reg.student_name, student_email: reg.student_email, status: reg.status }
              : { student_name: data.child_name || 'Student', student_email: data.family_email || '', status: 'created' }
          );
          setPollStatus('confirmed');
        }
        return;
      }

      // Check office_desk.registrations directly (webhook may have created it)
      const { data: reg } = await supabase
        .schema('office_desk')
        .from('registrations')
        .select('student_name, student_email, status')
        .eq('lead_reference_id', leadId)
        .single();

      if (reg) {
        if (!cancelled) {
          setRegistration({
            student_name: reg.student_name,
            student_email: reg.student_email,
            status: reg.status,
          });
          setPollStatus('confirmed');
        }
        return;
      }

      const nextAttempt = attempts + 1;
      if (nextAttempt >= 30) {
        // 30 attempts × 2s = 60s max
        if (!cancelled) setPollStatus('not_found');
        return;
      }

      if (!cancelled) {
        setAttempts(nextAttempt);
        timer = setTimeout(poll, 2000);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [leadId, attempts]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Icon */}
        <div style={styles.iconCircle}>
          {pollStatus === 'confirmed' ? (
            <span style={styles.checkIcon}>&#10003;</span>
          ) : pollStatus === 'polling' ? (
            <span style={styles.spinnerIcon}>&#8987;</span>
          ) : (
            <span style={styles.pendingIcon}>&#9679;</span>
          )}
        </div>

        {/* Title */}
        <h1 style={styles.title}>
          {pollStatus === 'confirmed'
            ? 'Registration Confirmed'
            : pollStatus === 'polling'
              ? 'Payment Received'
              : 'Payment Received'}
        </h1>

        {/* Subtitle */}
        <p style={styles.subtitle}>
          {pollStatus === 'confirmed'
            ? 'Your child has been registered. You will receive a confirmation email shortly.'
            : pollStatus === 'polling'
              ? 'We are verifying your payment. This usually takes a few seconds...'
              : 'Your payment was successful. We are setting up your registration.'}
        </p>

        {/* Payment details */}
        <div style={styles.detailsBox}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Payment method</span>
            <span style={styles.detailValue}>{isStripe ? 'Credit / Debit Card' : 'PayPal'}</span>
          </div>
          {sessionId && (
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Session</span>
              <span style={styles.detailValueMono}>{sessionId.substring(0, 20)}...</span>
            </div>
          )}
          {registration && (
            <>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Student</span>
                <span style={styles.detailValue}>{registration.student_name}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Status</span>
                <span style={styles.statusBadge}>{registration.status}</span>
              </div>
            </>
          )}
        </div>

        {/* Polling indicator */}
        {pollStatus === 'polling' && (
          <div style={styles.pollingBar}>
            <div style={styles.pollingDot} />
            <span style={styles.pollingText}>Checking registration status...</span>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          {pollStatus === 'confirmed' && (
            <div style={styles.downloadBox}>
              <p style={styles.downloadTitle}>Download the Redhouse App</p>
              <p style={styles.downloadSubtitle}>
                Access your child's schedule, grades, and more from your phone.
              </p>
              <div style={styles.downloadButtons}>
                <a href="https://apps.apple.com/app/redhouse" style={styles.downloadBtn} target="_blank" rel="noopener noreferrer">
                  App Store
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.redhouse" style={styles.downloadBtn} target="_blank" rel="noopener noreferrer">
                  Google Play
                </a>
              </div>
            </div>
          )}
          <Link to="/register" style={styles.link}>
            Register another child
          </Link>
          <Link to="/" style={styles.homeLink}>
            Return home
          </Link>
        </div>

        {/* Support note */}
        <p style={styles.supportText}>
          Did not receive an email? Check your spam folder or{' '}
          <a href="mailto:support@redhouse.com" style={styles.supportLink}>
            contact support
          </a>.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(26, 35, 48, 0.08)',
    padding: '32px',
    textAlign: 'center',
  },
  iconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#f0fdf4',
    border: '2px solid #22c55e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  checkIcon: {
    fontSize: '28px',
    color: '#22c55e',
    fontWeight: 'bold',
  },
  spinnerIcon: {
    fontSize: '24px',
    color: '#2563eb',
  },
  pendingIcon: {
    fontSize: '24px',
    color: '#f59e0b',
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#273946',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b6b6b',
    margin: '0 0 24px 0',
    lineHeight: '1.5',
  },
  detailsBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    textAlign: 'left',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
  },
  detailLabel: {
    fontSize: '13px',
    color: '#6b6b6b',
  },
  detailValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1c1c1e',
  },
  detailValueMono: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#1c1c1e',
    fontFamily: 'monospace',
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  pollingBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  pollingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  pollingText: {
    fontSize: '13px',
    color: '#2563eb',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px',
  },
  link: {
    display: 'block',
    padding: '12px',
    backgroundColor: '#273946',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center',
  },
  homeLink: {
    display: 'block',
    padding: '12px',
    backgroundColor: 'transparent',
    color: '#273946',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    textAlign: 'center',
  },
  supportText: {
    fontSize: '12px',
    color: '#6b6b6b',
    margin: '0',
  },
  supportLink: {
    color: '#2563eb',
    textDecoration: 'underline',
  },
  downloadBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  downloadTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#166534',
    margin: '0 0 4px 0',
  },
  downloadSubtitle: {
    fontSize: '13px',
    color: '#166534',
    margin: '0 0 12px 0',
  },
  downloadButtons: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
  },
  downloadBtn: {
    display: 'inline-block',
    padding: '8px 16px',
    backgroundColor: '#166534',
    color: '#fff',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    textDecoration: 'none',
  },
};
