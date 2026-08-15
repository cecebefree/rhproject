// PaymentForm — Dual processor payment form (Row 27)
// Supports Stripe (card/ACH) and PayPal checkout

import { useState } from 'react';
import {
  createPaymentIntent,
  confirmPayment,
  type Invoice,
  type PaymentProcessor,
  type PaymentMethod,
} from '../services/supabase';

interface PaymentFormProps {
  invoice: Pick<Invoice, 'id' | 'amount' | 'amount_paid' | 'invoice_number'>;
  tenantId: string;
  availableProcessors?: PaymentProcessor[];
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

type PaymentStatus = 'idle' | 'processing' | 'requires_action' | 'succeeded' | 'failed';

export function PaymentForm({
  invoice,
  tenantId,
  availableProcessors = ['stripe', 'paypal'],
  onPaymentSuccess,
  onCancel,
}: PaymentFormProps) {
  const [selectedProcessor, setSelectedProcessor] = useState<PaymentProcessor>(
    availableProcessors[0] || 'stripe'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const amountDue = Math.max(0, (invoice.amount || 0) - (invoice.amount_paid || 0));

  const handleStripePayment = async () => {
    setStatus('processing');
    setError(null);

    const { data, error: createError } = await createPaymentIntent({
      invoice_id: invoice.id,
      tenant_id: tenantId,
      processor: 'stripe',
      payment_method: paymentMethod,
    });

    if (createError || !data?.success) {
      setError(createError?.message || data?.error || 'Failed to create payment');
      setStatus('failed');
      return;
    }

    if (data.status === 'requires_action') {
      setStatus('requires_action');
      return;
    }

    // Confirm payment
    const { data: confirmData, error: confirmError } = await confirmPayment({
      invoice_id: invoice.id,
      processor: 'stripe',
      payment_intent_id: data.payment_intent_id,
    });

    if (confirmError || !confirmData?.success) {
      setError(confirmError?.message || confirmData?.error || 'Payment failed');
      setStatus('failed');
      return;
    }

    if (confirmData.status === 'paid') {
      setStatus('succeeded');
      onPaymentSuccess();
    } else if (confirmData.status === 'requires_action') {
      setStatus('requires_action');
    } else {
      setError(confirmData.error || 'Payment failed');
      setStatus('failed');
    }
  };

  const handlePayPalPayment = async () => {
    setStatus('processing');
    setError(null);

    const { data, error: createError } = await createPaymentIntent({
      invoice_id: invoice.id,
      tenant_id: tenantId,
      processor: 'paypal',
      payment_method: 'paypal',
    });

    if (createError || !data?.success) {
      setError(createError?.message || data?.error || 'Failed to create PayPal order');
      setStatus('failed');
      return;
    }

    if (data.approval_url) {
      // Redirect to PayPal
      window.location.href = data.approval_url;
    } else {
      setError('No PayPal approval URL returned');
      setStatus('failed');
    }
  };

  const handleSubmit = () => {
    if (selectedProcessor === 'stripe') {
      handleStripePayment();
    } else if (selectedProcessor === 'paypal') {
      handlePayPalPayment();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#2d3748' }}>
        Pay Invoice {invoice.invoice_number || ''}
      </h3>

      <div style={{ fontSize: '14px', color: '#718096' }}>
        Amount due: <strong style={{ color: '#2d3748' }}>${amountDue.toFixed(2)}</strong>
      </div>

      {/* Processor selector */}
      {availableProcessors.length > 1 && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {availableProcessors.map((proc) => (
            <button
              key={proc}
              type="button"
              onClick={() => setSelectedProcessor(proc)}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: `2px solid ${selectedProcessor === proc ? '#3182ce' : '#e2e8f0'}`,
                borderRadius: '8px',
                backgroundColor: selectedProcessor === proc ? '#ebf8ff' : 'white',
                color: selectedProcessor === proc ? '#2b6cb0' : '#4a5568',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {proc === 'stripe' ? 'Stripe' : 'PayPal'}
            </button>
          ))}
        </div>
      )}

      {/* Stripe payment method */}
      {selectedProcessor === 'stripe' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#4a5568' }}>
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            style={{
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="card">Credit/Debit Card</option>
            <option value="ach">ACH Bank Transfer</option>
          </select>
          <p style={{ fontSize: '12px', color: '#a0aec0', margin: 0 }}>
            Card input will be handled by Stripe's secure checkout.
          </p>
        </div>
      )}

      {/* PayPal info */}
      {selectedProcessor === 'paypal' && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fffbeb',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#92400e',
        }}>
          You will be redirected to PayPal to complete the payment securely.
        </div>
      )}

      {/* Error display */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fee2e2',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#991b1b',
        }}>
          {error}
        </div>
      )}

      {/* Status display */}
      {status === 'processing' && (
        <div style={{ fontSize: '14px', color: '#718096', textAlign: 'center' }}>
          Processing payment...
        </div>
      )}

      {status === 'requires_action' && (
        <div style={{ fontSize: '14px', color: '#d69e2e', textAlign: 'center' }}>
          Additional authentication required. Please complete the verification.
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={status === 'processing'}
          style={{
            padding: '10px 20px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            backgroundColor: 'white',
            color: '#4a5568',
            cursor: status === 'processing' ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          Cancel
        </button>
        {status !== 'succeeded' && status !== 'requires_action' && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === 'processing' || amountDue <= 0}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: selectedProcessor === 'stripe' ? '#635bff' : '#0070ba',
              color: 'white',
              cursor: status === 'processing' ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: status === 'processing' || amountDue <= 0 ? 0.6 : 1,
            }}
          >
            {status === 'processing'
              ? 'Processing...'
              : selectedProcessor === 'stripe'
                ? `Pay $${amountDue.toFixed(2)} with Card`
                : `Pay $${amountDue.toFixed(2)} with PayPal`}
          </button>
        )}
      </div>
    </div>
  );
}
