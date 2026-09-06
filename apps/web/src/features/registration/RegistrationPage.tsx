// features/registration/RegistrationPage.tsx
// Row 92 — /register page: wraps RegistrationForm + handles submission to Edge Function

import { useState } from 'react';
import RegistrationForm from './RegistrationForm';
import type { RegistrationFormValues, PaymentSessionResponse } from './types';

const EF_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function RegistrationPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentSessionResponse | null>(null);

  async function handleSubmit(values: RegistrationFormValues) {
    setServerError(null);

    const res = await fetch(`${EF_BASE}/website-lead-payment-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        family_email: values.family_email,
        child_name: values.child_name,
        child_dob: values.child_dob,
        amount_cents: values.amount_cents,
        payment_method: values.payment_method,
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      setServerError(body.detail || body.error || 'Something went wrong. Please try again.');
      return;
    }

    setResult(body as PaymentSessionResponse);
  }

  // Redirect to payment processor
  if (result?.redirect_url) {
    window.location.href = result.redirect_url;
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.redirecting}>Redirecting to payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <header style={styles.header}>
          <h1 style={styles.title}>Register Your Child</h1>
          <p style={styles.subtitle}>
            Complete the form below to begin the registration process.
          </p>
        </header>

        <RegistrationForm onSubmit={handleSubmit} serverError={serverError} />

        <footer style={styles.footer}>
          <p style={styles.footerText}>
            Secure payment processed by Stripe or PayPal. Your information is encrypted.
          </p>
        </footer>
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
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#273946',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b6b6b',
    margin: '0',
  },
  redirecting: {
    textAlign: 'center',
    color: '#6b6b6b',
    padding: '24px 0',
  },
  footer: {
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #e8e4dc',
  },
  footerText: {
    fontSize: '12px',
    color: '#6b6b6b',
    margin: '0',
    textAlign: 'center',
  },
};
