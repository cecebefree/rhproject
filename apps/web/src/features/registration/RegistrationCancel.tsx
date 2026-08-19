// features/registration/RegistrationCancel.tsx
// Row 94 — /register/cancel page: payment cancelled or failed

import { useSearchParams, Link } from 'react-router-dom';

export default function RegistrationCancel() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const provider = searchParams.get('provider');

  const isPayPal = provider === 'paypal';

  const reasonMessage = reason === 'cancelled'
    ? 'You cancelled the payment process. No charges were made.'
    : 'The payment could not be completed. Please try again.';

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Icon */}
        <div style={styles.iconCircle}>
          <span style={styles.xIcon}>&#10005;</span>
        </div>

        {/* Title */}
        <h1 style={styles.title}>Payment Not Completed</h1>

        {/* Subtitle */}
        <p style={styles.subtitle}>{reasonMessage}</p>

        {/* Info box */}
        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            Your card has not been charged. You can safely retry the registration.
          </p>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <Link to="/register" style={styles.retryLink}>
            Try again
          </Link>
          <Link to="/" style={styles.homeLink}>
            Return home
          </Link>
        </div>

        {/* Support */}
        <div style={styles.supportBox}>
          <p style={styles.supportTitle}>Need help?</p>
          <p style={styles.supportText}>
            If you continue to experience issues, please contact us at{' '}
            <a href="mailto:support@redhouse.com" style={styles.supportLink}>
              support@redhouse.com
            </a>
          </p>
        </div>
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
    backgroundColor: '#fef2f2',
    border: '2px solid #ef4444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  xIcon: {
    fontSize: '24px',
    color: '#ef4444',
    fontWeight: 'bold',
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#1a2330',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b6b6b',
    margin: '0 0 20px 0',
    lineHeight: '1.5',
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
  },
  infoText: {
    fontSize: '13px',
    color: '#166534',
    margin: '0',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '24px',
  },
  retryLink: {
    display: 'block',
    padding: '12px',
    backgroundColor: '#1a2330',
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
    color: '#1a2330',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    textAlign: 'center',
  },
  supportBox: {
    borderTop: '1px solid #e8e4dc',
    paddingTop: '16px',
  },
  supportTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1c1c1e',
    margin: '0 0 4px 0',
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
};
