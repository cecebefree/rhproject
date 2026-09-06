// RegistrationForm — Pattern A: registration + payment in single event (Row 75)
// Public-facing form for website registration with integrated payment
// Calls register-with-payment EF

import { useState } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface RegistrationFormData {
  tenant_id: string;
  lead_reference_id?: string;
  student_name: string;
  student_email: string;
  student_phone: string;
  course_name: string;
  notes: string;
}

interface InvoiceFormData {
  amount: number;
  currency: string;
  description: string;
}

interface PaymentFormData {
  method: 'stripe' | 'paypal';
  token: string;
}

interface RegistrationResult {
  status: 'success';
  registration: { id: string; status: string; created_at: string };
  invoice: { id: string; status: string };
  payment: { id: string | null; status: string };
  temp_credentials: { email: string; temp_password: string; expires_at: string };
}

interface RegistrationFormProps {
  tenantId: string;
  leadReferenceId?: string;
  courseName?: string;
  amount?: number;
  onSuccess?: (result: RegistrationResult) => void;
  onError?: (error: string, code?: string) => void;
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export function RegistrationForm({
  tenantId,
  leadReferenceId,
  courseName = '',
  amount = 0,
  onSuccess,
  onError,
}: RegistrationFormProps) {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationResult | null>(null);

  const [form, setForm] = useState<RegistrationFormData>({
    tenant_id: tenantId,
    lead_reference_id: leadReferenceId,
    student_name: '',
    student_email: '',
    student_phone: '',
    course_name: courseName,
    notes: '',
  });

  const [invoice, setInvoice] = useState<InvoiceFormData>({
    amount,
    currency: 'ZAR',
    description: '',
  });

  const [payment, setPayment] = useState<PaymentFormData>({
    method: 'stripe',
    token: '',
  });

  const updateForm = (field: keyof RegistrationFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateInvoice = (field: keyof InvoiceFormData, value: string | number) => {
    setInvoice((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): string | null => {
    if (!form.student_name.trim()) return 'Student name is required';
    if (!form.student_email.trim()) return 'Student email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.student_email)) return 'Invalid email address';
    if (!form.course_name.trim()) return 'Program / Subject name is required';
    if (invoice.amount <= 0) return 'Amount must be greater than 0';
    if (!payment.token) return 'Payment token is required (complete payment first)';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setErrorCode('VALIDATION_ERROR');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setError(null);
    setErrorCode(null);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/register-with-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          registration: {
            tenant_id: form.tenant_id,
            lead_reference_id: form.lead_reference_id || undefined,
            student_name: form.student_name.trim(),
            student_email: form.student_email.trim(),
            student_phone: form.student_phone.trim() || undefined,
            course_name: form.course_name.trim(),
            notes: form.notes.trim() || undefined,
          },
          invoice: {
            amount: invoice.amount,
            currency: invoice.currency,
            description:
              invoice.description || `Registration: ${form.student_name} - ${form.course_name}`,
          },
          payment: {
            method: payment.method,
            token: payment.token,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status === 'error') {
        const msg = data.message || 'Registration failed';
        const code = data.code || 'UNKNOWN_ERROR';
        setError(msg);
        setErrorCode(code);
        setStatus('error');
        onError?.(msg, code);
        return;
      }

      setResult(data as RegistrationResult);
      setStatus('success');
      onSuccess?.(data as RegistrationResult);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
      setErrorCode('NETWORK_ERROR');
      setStatus('error');
      onError?.(msg, 'NETWORK_ERROR');
    }
  };

  if (status === 'success' && result) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <h3 className="text-lg font-semibold text-green-800">Registration Successful</h3>
        <div className="mt-4 space-y-2 text-sm text-green-700">
          <p>
            <strong>Registration ID:</strong> {result.registration.id}
          </p>
          <p>
            <strong>Status:</strong> {result.registration.status}
          </p>
          <p>
            <strong>Invoice:</strong> {result.invoice.status}
          </p>
          <p>
            <strong>Payment:</strong> {result.payment.status}
          </p>
        </div>
        <div className="mt-4 rounded border border-green-300 bg-white p-4">
          <h4 className="font-medium text-green-800">Temporary Credentials</h4>
          <p className="mt-1 text-sm text-gray-600">
            Email: <code className="bg-gray-100 px-1">{result.temp_credentials.email}</code>
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Password:{' '}
            <code className="bg-gray-100 px-1">{result.temp_credentials.temp_password}</code>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Expires: {new Date(result.temp_credentials.expires_at).toLocaleString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Student Registration</h2>
        <p className="mt-1 text-sm text-gray-500">
          Complete the form below to register and pay in one step.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>{errorCode}:</strong> {error}
        </div>
      )}

      {/* Student Details */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-700">Student Details</legend>

        <div>
          <label htmlFor="student_name" className="block text-sm font-medium text-gray-700">
            Full Name *
          </label>
          <input
            id="student_name"
            type="text"
            required
            value={form.student_name}
            onChange={(e) => updateForm('student_name', e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Jane Doe"
          />
        </div>

        <div>
          <label htmlFor="student_email" className="block text-sm font-medium text-gray-700">
            Email *
          </label>
          <input
            id="student_email"
            type="email"
            required
            value={form.student_email}
            onChange={(e) => updateForm('student_email', e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. jane@example.com"
          />
        </div>

        <div>
          <label htmlFor="student_phone" className="block text-sm font-medium text-gray-700">
            Phone (optional)
          </label>
          <input
            id="student_phone"
            type="tel"
            value={form.student_phone}
            onChange={(e) => updateForm('student_phone', e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. +27 82 123 4567"
          />
        </div>
      </fieldset>

      {/* Program / Subject Details */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-700">Program / Subject Details</legend>

        <div>
          <label htmlFor="course_name" className="block text-sm font-medium text-gray-700">
            Program / Subject *
          </label>
          <input
            id="course_name"
            type="text"
            required
            value={form.course_name}
            onChange={(e) => updateForm('course_name', e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Cambridge Grade 10 Mathematics"
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount (ZAR) *
          </label>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={invoice.amount || ''}
            onChange={(e) => updateInvoice('amount', Number.parseFloat(e.target.value) || 0)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. 1500.00"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => updateForm('notes', e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Any additional notes..."
          />
        </div>
      </fieldset>

      {/* Payment Method */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-700">Payment Method</legend>

        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="payment_method"
              value="stripe"
              checked={payment.method === 'stripe'}
              onChange={() => setPayment((prev) => ({ ...prev, method: 'stripe' }))}
              className="h-4 w-4 text-blue-600"
            />
            <span className="text-sm">Card (Stripe)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="payment_method"
              value="paypal"
              checked={payment.method === 'paypal'}
              onChange={() => setPayment((prev) => ({ ...prev, method: 'paypal' }))}
              className="h-4 w-4 text-blue-600"
            />
            <span className="text-sm">PayPal</span>
          </label>
        </div>

        <p className="text-xs text-gray-500">
          Payment will be processed securely. A payment token must be obtained from Stripe.js or
          PayPal SDK before submitting.
        </p>
      </fieldset>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'submitting' ? 'Processing...' : 'Register & Pay'}
        </button>
      </div>
    </form>
  );
}

export type { RegistrationResult, RegistrationFormProps };
