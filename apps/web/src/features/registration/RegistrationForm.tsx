// features/registration/RegistrationForm.tsx
// Row 92 — Registration form with client-side validation + payment method selection

import { useState } from 'react';
import type {
  RegistrationFormValues,
  RegistrationFormErrors,
  PaymentMethod,
} from './types';
import { INITIAL_FORM_VALUES } from './types';

interface RegistrationFormProps {
  onSubmit: (values: RegistrationFormValues) => Promise<void>;
  serverError?: string | null;
}

function validate(values: RegistrationFormValues): RegistrationFormErrors {
  const errors: RegistrationFormErrors = {};

  // Email
  if (!values.family_email.trim()) {
    errors.family_email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.family_email.trim())) {
    errors.family_email = 'Enter a valid email address';
  }

  // Child name
  if (!values.child_name.trim()) {
    errors.child_name = "Child's name is required";
  }

  // DOB
  if (!values.child_dob) {
    errors.child_dob = 'Date of birth is required';
  } else {
    const dob = new Date(values.child_dob);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(dob.getTime())) {
      errors.child_dob = 'Enter a valid date';
    } else if (dob >= today) {
      errors.child_dob = 'Date of birth must be in the past';
    }
  }

  // Amount
  if (!values.amount_cents) {
    errors.amount_cents = 'Amount is required';
  } else if (!Number.isInteger(values.amount_cents) || values.amount_cents <= 0) {
    errors.amount_cents = 'Amount must be greater than 0';
  }

  // Payment method
  if (!values.payment_method) {
    errors.payment_method = 'Select a payment method';
  }

  return errors;
}

function hasErrors(errors: RegistrationFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export default function RegistrationForm({ onSubmit, serverError }: RegistrationFormProps) {
  const [values, setValues] = useState<RegistrationFormValues>(INITIAL_FORM_VALUES);
  const [errors, setErrors] = useState<RegistrationFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(field: keyof RegistrationFormValues, value: string | number) {
    const next = { ...values, [field]: value };
    setValues(next);

    // Clear error for this field on change
    if (touched[field]) {
      const nextErrors = validate(next);
      setErrors((prev) => {
        const copy = { ...prev };
        if (nextErrors[field]) {
          copy[field] = nextErrors[field];
        } else {
          delete copy[field];
        }
        return copy;
      });
    }
  }

  function handleBlur(field: keyof RegistrationFormValues) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const fieldErrors = validate(values);
    if (fieldErrors[field]) {
      setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate all fields
    const allErrors = validate(values);
    setErrors(allErrors);
    setTouched({
      family_email: true,
      child_name: true,
      child_dob: true,
      amount_cents: true,
      payment_method: true,
    });

    if (hasErrors(allErrors)) return;

    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  const formValid = hasErrors(validate(values));

  return (
    <form onSubmit={handleSubmit} style={styles.form} noValidate>
      {serverError && (
        <div style={styles.serverError}>
          <p style={styles.serverErrorText}>{serverError}</p>
        </div>
      )}

      {/* Family Email */}
      <div style={styles.field}>
        <label htmlFor="family_email" style={styles.label}>
          Parent / Guardian Email
        </label>
        <input
          id="family_email"
          type="email"
          placeholder="you@example.com"
          value={values.family_email}
          onChange={(e) => handleChange('family_email', e.target.value)}
          onBlur={() => handleBlur('family_email')}
          style={errors.family_email && touched.family_email ? styles.inputError : styles.input}
          autoComplete="email"
        />
        {errors.family_email && touched.family_email && (
          <p style={styles.errorText}>{errors.family_email}</p>
        )}
      </div>

      {/* Child Name */}
      <div style={styles.field}>
        <label htmlFor="child_name" style={styles.label}>
          Child's Full Name
        </label>
        <input
          id="child_name"
          type="text"
          placeholder="e.g. Sarah Johnson"
          value={values.child_name}
          onChange={(e) => handleChange('child_name', e.target.value)}
          onBlur={() => handleBlur('child_name')}
          style={errors.child_name && touched.child_name ? styles.inputError : styles.input}
          autoComplete="name"
        />
        {errors.child_name && touched.child_name && (
          <p style={styles.errorText}>{errors.child_name}</p>
        )}
      </div>

      {/* Child DOB */}
      <div style={styles.field}>
        <label htmlFor="child_dob" style={styles.label}>
          Child's Date of Birth
        </label>
        <input
          id="child_dob"
          type="date"
          value={values.child_dob}
          onChange={(e) => handleChange('child_dob', e.target.value)}
          onBlur={() => handleBlur('child_dob')}
          style={errors.child_dob && touched.child_dob ? styles.inputError : styles.input}
        />
        {errors.child_dob && touched.child_dob && (
          <p style={styles.errorText}>{errors.child_dob}</p>
        )}
      </div>

      {/* Amount */}
      <div style={styles.field}>
        <label htmlFor="amount_cents" style={styles.label}>
          Registration Fee (USD)
        </label>
        <div style={styles.amountWrapper}>
          <span style={styles.amountPrefix}>$</span>
          <input
            id="amount_cents"
            type="number"
            min="1"
            step="1"
            placeholder="50"
            value={values.amount_cents || ''}
            onChange={(e) => {
              const dollars = parseFloat(e.target.value);
              handleChange('amount_cents', isNaN(dollars) ? 0 : Math.round(dollars * 100));
            }}
            onBlur={() => handleBlur('amount_cents')}
            style={
              errors.amount_cents && touched.amount_cents
                ? { ...styles.input, ...styles.amountInput, ...styles.inputError }
                : { ...styles.input, ...styles.amountInput }
            }
          />
        </div>
        {errors.amount_cents && touched.amount_cents && (
          <p style={styles.errorText}>{errors.amount_cents}</p>
        )}
      </div>

      {/* Payment Method */}
      <div style={styles.field}>
        <label style={styles.label}>Payment Method</label>
        <div style={styles.radioGroup}>
          <label
            style={
              values.payment_method === 'stripe' ? styles.radioCardActive : styles.radioCard
            }
          >
            <input
              type="radio"
              name="payment_method"
              value="stripe"
              checked={values.payment_method === 'stripe'}
              onChange={() => handleChange('payment_method', 'stripe' as PaymentMethod)}
              style={styles.radioInput}
            />
            <div>
              <span style={styles.radioLabel}>Credit / Debit Card</span>
              <span style={styles.radioSublabel}>Powered by Stripe</span>
            </div>
          </label>

          <label
            style={
              values.payment_method === 'paypal' ? styles.radioCardActive : styles.radioCard
            }
          >
            <input
              type="radio"
              name="payment_method"
              value="paypal"
              checked={values.payment_method === 'paypal'}
              onChange={() => handleChange('payment_method', 'paypal' as PaymentMethod)}
              style={styles.radioInput}
            />
            <div>
              <span style={styles.radioLabel}>PayPal</span>
              <span style={styles.radioSublabel}>Pay with PayPal account</span>
            </div>
          </label>
        </div>
        {errors.payment_method && touched.payment_method && (
          <p style={styles.errorText}>{errors.payment_method}</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || formValid}
        style={submitting || formValid ? styles.submitDisabled : styles.submit}
      >
        {submitting ? 'Processing...' : 'Continue to Payment'}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1c1c1e',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    color: '#1c1c1e',
    backgroundColor: '#fff',
    outline: 'none',
    transition: 'border-color 150ms',
  },
  inputError: {
    padding: '10px 12px',
    border: '1px solid #e53e3e',
    borderRadius: '8px',
    fontSize: '16px',
    color: '#1c1c1e',
    backgroundColor: '#fff',
    outline: 'none',
  },
  errorText: {
    fontSize: '13px',
    color: '#e53e3e',
    margin: '0',
  },
  amountWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
  },
  amountPrefix: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRight: 'none',
    borderRadius: '8px 0 0 8px',
    fontSize: '16px',
    color: '#6b6b6b',
    backgroundColor: '#f9fafb',
  },
  amountInput: {
    borderRadius: '0 8px 8px 0',
    flex: 1,
  },
  radioGroup: {
    display: 'flex',
    gap: '12px',
  },
  radioCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'border-color 150ms, background-color 150ms',
    backgroundColor: '#fff',
  },
  radioCardActive: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    border: '2px solid #1a2330',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'border-color 150ms, background-color 150ms',
    backgroundColor: '#f8f7f4',
  },
  radioInput: {
    margin: 0,
    accentColor: '#1a2330',
  },
  radioLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1c1c1e',
  },
  radioSublabel: {
    display: 'block',
    fontSize: '12px',
    color: '#6b6b6b',
    marginTop: '2px',
  },
  submit: {
    padding: '14px 24px',
    backgroundColor: '#1a2330',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 150ms',
    marginTop: '8px',
  },
  submitDisabled: {
    padding: '14px 24px',
    backgroundColor: '#d1d5db',
    color: '#9ca3af',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'not-allowed',
    marginTop: '8px',
  },
  serverError: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
  },
  serverErrorText: {
    margin: 0,
    fontSize: '14px',
    color: '#b91c1c',
  },
};
