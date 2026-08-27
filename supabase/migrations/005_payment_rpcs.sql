-- Migration 005: Payment RPCs + schema alignment
-- Adds invoice_id, payment_method, paypal_transaction_id to public.payments
-- Creates create_stripe_payment_intent() and create_paypal_payment_intent() RPCs
-- Aligns public schema with Edge Function webhook expectations

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. SCHEMA ALIGNMENT — Add missing columns to public.payments
-- ═══════════════════════════════════════════════════════════

-- Add invoice_id FK (webhook uses this to find the related invoice)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE;

-- Add payment_method (stripe / paypal / manual)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'stripe'
    CHECK (payment_method IN ('stripe', 'paypal', 'manual'));

-- Add paypal_transaction_id (PayPal IPN txn_id)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS paypal_transaction_id text;

-- Add paid_date (timestamptz for webhook updates, distinct from created_at)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS paid_date timestamptz;

-- Index for webhook lookups (student_id + invoice_id)
CREATE INDEX IF NOT EXISTS idx_payments_student_invoice
  ON public.payments (student_id, invoice_id);

-- Index for PayPal transaction lookups
CREATE INDEX IF NOT EXISTS idx_payments_paypal_txn
  ON public.payments (paypal_transaction_id)
  WHERE paypal_transaction_id IS NOT NULL;

COMMENT ON COLUMN public.payments.invoice_id IS 'FK to invoices — links payment to specific invoice';
COMMENT ON COLUMN public.payments.payment_method IS 'Payment processor: stripe, paypal, or manual';
COMMENT ON COLUMN public.payments.paypal_transaction_id IS 'PayPal IPN transaction ID (txn_id)';
COMMENT ON COLUMN public.payments.paid_date IS 'Timestamp when payment was confirmed completed';

-- ═══════════════════════════════════════════════════════════
-- 2. RPCs — Create payment intents for Stripe and PayPal
-- ═══════════════════════════════════════════════════════════

-- RPC: Create Stripe payment intent
CREATE OR REPLACE FUNCTION create_stripe_payment_intent(
  p_student_id UUID,
  p_invoice_id UUID,
  p_amount DECIMAL
)
RETURNS TABLE(payment_id UUID, status TEXT, error TEXT) AS $$
DECLARE
  v_payment_id UUID;
BEGIN
  -- Verify student exists
  IF NOT EXISTS(SELECT 1 FROM public.students WHERE id = p_student_id) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'Student not found'::TEXT;
    RETURN;
  END IF;

  -- Verify invoice exists
  IF NOT EXISTS(SELECT 1 FROM public.invoices WHERE id = p_invoice_id) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'Invoice not found'::TEXT;
    RETURN;
  END IF;

  -- Create payment record with status = 'pending'
  INSERT INTO public.payments(student_id, invoice_id, amount, payment_method, status, created_at)
  VALUES(p_student_id, p_invoice_id, p_amount, 'stripe', 'pending', NOW())
  RETURNING id INTO v_payment_id;

  -- Log to audit (via trigger, but explicit entry for RPC traceability)
  INSERT INTO public.audit_log(table_name, operation, new_values, user_id, created_at)
  VALUES('payments', 'INSERT',
         jsonb_build_object('id', v_payment_id, 'student_id', p_student_id,
                           'invoice_id', p_invoice_id, 'amount', p_amount,
                           'payment_method', 'stripe', 'status', 'pending'),
         p_student_id, NOW());

  RETURN QUERY SELECT v_payment_id, 'pending'::TEXT, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::UUID, NULL::TEXT, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_stripe_payment_intent TO authenticated;

-- RPC: Create PayPal payment intent
CREATE OR REPLACE FUNCTION create_paypal_payment_intent(
  p_student_id UUID,
  p_invoice_id UUID,
  p_amount DECIMAL
)
RETURNS TABLE(payment_id UUID, status TEXT, paypal_url TEXT, error TEXT) AS $$
DECLARE
  v_payment_id UUID;
BEGIN
  -- Verify student exists
  IF NOT EXISTS(SELECT 1 FROM public.students WHERE id = p_student_id) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, 'Student not found'::TEXT;
    RETURN;
  END IF;

  -- Verify invoice exists
  IF NOT EXISTS(SELECT 1 FROM public.invoices WHERE id = p_invoice_id) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, 'Invoice not found'::TEXT;
    RETURN;
  END IF;

  -- Create payment record with status = 'pending'
  INSERT INTO public.payments(student_id, invoice_id, amount, payment_method, status, created_at)
  VALUES(p_student_id, p_invoice_id, p_amount, 'paypal', 'pending', NOW())
  RETURNING id INTO v_payment_id;

  -- Log to audit
  INSERT INTO public.audit_log(table_name, operation, new_values, user_id, created_at)
  VALUES('payments', 'INSERT',
         jsonb_build_object('id', v_payment_id, 'student_id', p_student_id,
                           'invoice_id', p_invoice_id, 'amount', p_amount,
                           'payment_method', 'paypal', 'status', 'pending'),
         p_student_id, NOW());

  -- Return placeholder URL (actual PayPal URL generated by client/Edge Function)
  RETURN QUERY SELECT v_payment_id, 'pending'::TEXT, 'https://www.paypal.com/checkoutnow?token='::TEXT, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_paypal_payment_intent TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- 3. GRANTS — Ensure service_role can write (for Edge Functions)
-- ═══════════════════════════════════════════════════════════

GRANT ALL ON public.payments TO service_role;

COMMIT;
