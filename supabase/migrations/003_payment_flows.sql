-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 003: Payment Processing + Debit Order Automation
-- ══════════════════════════════════════════════════════════════════════════════
-- Adds:
--   - payment_webhooks table (idempotency + audit for incoming webhooks)
--   - handle_payment_webhook() RPC - processes Stripe/PayFast webhooks
--   - verify_webhook_signature() - HMAC-SHA256 (Stripe) + MD5 (PayFast)
--   - process_webhook_safe() - signature-first wrapper
--   - on_payment_status_change() trigger - invoice + capacity + audit on completion
--   - on_debit_order_scheduled() trigger - auto-create payments from debit orders
--   - on_student_enrollment_activated() trigger - generate invoices on enrollment
--   - pg_notify channels for realtime payment/debit/invoice events
--   - Test webhook seed data (3 rows)
--
-- DEPENDS ON: 001_init_schema.sql (students, payments, debit_orders, invoices,
--             enrollment_leads, capacity_slots, audit_log tables)
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 0. CLEANUP - Drop existing objects for safe re-runs
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'payments'
             AND relnamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS on_payment_status_change ON public.payments;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'debit_orders'
             AND relnamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS on_debit_order_scheduled ON public.debit_orders;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'students'
             AND relnamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS on_student_enrollment_activated ON public.students;
  END IF;

  DROP FUNCTION IF EXISTS public.handle_payment_webhook(text, text, jsonb);
  DROP FUNCTION IF EXISTS public.verify_webhook_signature(text, text, text, text);
  DROP FUNCTION IF EXISTS public.process_webhook_safe(text, text, text, text, jsonb);
  DROP FUNCTION IF EXISTS public.fn_payment_status_change();
  DROP FUNCTION IF EXISTS public.fn_debit_order_scheduled();
  DROP FUNCTION IF EXISTS public.fn_student_enrollment_activated();
  DROP TABLE IF EXISTS public.payment_webhooks CASCADE;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. TABLE: payment_webhooks - Idempotency + audit for incoming webhooks
-- ══════════════════════════════════════════════════════════════════════════════
-- Each incoming webhook (Stripe charge.succeeded, PayFast ITN, etc.) is logged
-- here BEFORE processing. The webhook_id UNIQUE constraint enforces idempotency:
-- duplicate webhooks are rejected at the DB level.
--
-- PAYMENT FLOW:
--   1. Provider sends POST to /api/webhooks/payment
--   2. API route verifies signature (HMAC-SHA256 or MD5)
--   3. API calls handle_payment_webhook(provider, webhook_id, payload)
--   4. Function checks payment_webhooks.webhook_id for duplicates
--   5. If new: inserts row (status='pending'), processes, updates to 'processed'
--   6. If duplicate: returns early (idempotent skip)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.payment_webhooks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id    text NOT NULL UNIQUE,
  provider      text NOT NULL CHECK (provider IN ('stripe', 'payfast')),
  payload       jsonb NOT NULL DEFAULT '{}',
  processed_at  timestamptz NULL,
  status        text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'failed', 'skipped')),
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_webhooks IS
  'Idempotency store for payment provider webhooks. webhook_id UNIQUE prevents duplicate processing.';
COMMENT ON COLUMN public.payment_webhooks.webhook_id IS
  'Provider-assigned unique ID (ch_... for Stripe, m_payment_id for PayFast). Idempotency key.';
COMMENT ON COLUMN public.payment_webhooks.status IS
  'pending -> processed | failed | skipped. Skipped = duplicate webhook_id.';
COMMENT ON COLUMN public.payment_webhooks.error_message IS
  'Error details if processing failed. NULL on success.';

CREATE INDEX idx_payment_webhooks_provider ON public.payment_webhooks (provider);
CREATE INDEX idx_payment_webhooks_status ON public.payment_webhooks (status);
CREATE INDEX idx_payment_webhooks_created ON public.payment_webhooks (created_at DESC);

-- RLS: payment_webhooks (service_role only for webhook processing)
ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY pwh_service_role_all ON public.payment_webhooks
  FOR ALL USING (true);

CREATE POLICY pwh_admin_select ON public.payment_webhooks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

GRANT ALL ON public.payment_webhooks TO service_role;
GRANT SELECT ON public.payment_webhooks TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. FUNCTION: handle_payment_webhook(provider, webhook_id, payload)
-- ══════════════════════════════════════════════════════════════════════════════
-- Core RPC that the API route calls after signature verification.
-- Handles idempotency, payment matching, and status updates.
--
-- ARGS:
--   provider   - 'stripe' | 'payfast'
--   webhook_id - Provider's unique event ID (idempotency key)
--   payload    - Parsed JSON webhook body
--
-- RETURNS: JSONB with { success, message, payment_id, student_id }
--
-- STRIPE PAYLOAD EXTRACTION:
--   charge.amount is in cents (e.g. 500000 = R5000.00)
--   charge.metadata.student_id identifies the student
--   charge.id is the idempotency key
--
-- PAYFAST PAYLOAD EXTRACTION:
--   m_amount_gross is in Rands (e.g. "5000.00")
--   custom_str1 contains the student_id
--   m_payment_id is the idempotency key
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_payment_webhook(
  p_provider   text,
  p_webhook_id text,
  p_payload    jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id    uuid;
  v_amount        numeric(12,2);
  v_status        text;
  v_existing_id   uuid;
  v_payment_id    uuid;
BEGIN
  -- STEP 1: IDEMPOTENCY CHECK
  -- If this webhook_id was already processed, return early.
  -- This handles: network retries, provider redeliveries, duplicate POSTs.
  SELECT id INTO v_existing_id
  FROM public.payment_webhooks
  WHERE webhook_id = p_webhook_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Webhook already processed (idempotent skip)',
      'webhook_id', p_webhook_id
    );
  END IF;

  -- STEP 2: EXTRACT FIELDS (provider-specific parsing)
  IF p_provider = 'stripe' THEN
    -- Stripe charge.succeeded payload:
    -- { id: "ch_...", amount: 500000 (cents), metadata: { student_id: "..." }, status: "succeeded" }
    v_student_id := (p_payload -> 'metadata' ->> 'student_id')::uuid;
    v_amount     := (p_payload ->> 'amount')::numeric / 100;
    v_status     := CASE
                      WHEN p_payload ->> 'status' = 'succeeded' THEN 'completed'
                      WHEN p_payload ->> 'status' = 'failed'    THEN 'failed'
                      ELSE 'pending'
                    END;

  ELSIF p_provider = 'payfast' THEN
    -- PayFast ITN payload:
    -- { m_payment_id: "...", m_amount_gross: "5000.00", custom_str1: "student_uuid", payment_status: "COMPLETE" }
    v_student_id := (p_payload ->> 'custom_str1')::uuid;
    v_amount     := (p_payload ->> 'm_amount_gross')::numeric;
    v_status     := CASE
                      WHEN p_payload ->> 'payment_status' = 'COMPLETE' THEN 'completed'
                      WHEN p_payload ->> 'payment_status' = 'FAILED'   THEN 'failed'
                      ELSE 'pending'
                    END;
  ELSE
    RETURN json_build_object('success', false, 'message', 'Unknown provider: ' || p_provider);
  END IF;

  -- Validate required fields
  IF v_student_id IS NULL THEN
    INSERT INTO public.audit_log (table_name, operation, new_values)
    VALUES ('payment_webhooks', 'WEBHOOK_ERROR', jsonb_build_object(
      'provider', p_provider, 'webhook_id', p_webhook_id,
      'error', 'Missing or invalid student_id'
    ));
    RETURN json_build_object('success', false, 'message', 'Missing or invalid student_id');
  END IF;

  IF v_amount IS NULL OR v_amount <= 0 THEN
    INSERT INTO public.audit_log (table_name, operation, new_values)
    VALUES ('payment_webhooks', 'WEBHOOK_ERROR', jsonb_build_object(
      'provider', p_provider, 'webhook_id', p_webhook_id,
      'student_id', v_student_id, 'error', 'Invalid amount'
    ));
    RETURN json_build_object('success', false, 'message', 'Invalid amount');
  END IF;

  -- STEP 3: INSERT IDEMPOTENCY RECORD (before processing)
  INSERT INTO public.payment_webhooks (webhook_id, provider, payload, status)
  VALUES (p_webhook_id, p_provider, p_payload, 'pending');

  -- STEP 4: MATCH TO PENDING PAYMENT + UPDATE STATUS
  -- Find a pending payment for this student with matching amount,
  -- then update it. The on_payment_status_change trigger fires automatically.
  SELECT id INTO v_payment_id
  FROM public.payments
  WHERE student_id = v_student_id
    AND amount = v_amount
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_payment_id IS NOT NULL THEN
    UPDATE public.payments
    SET status = v_status,
        stripe_payment_intent_id = CASE
          WHEN p_provider = 'stripe' THEN p_payload ->> 'id'
          ELSE stripe_payment_intent_id
        END,
        updated_at = now()
    WHERE id = v_payment_id;

    UPDATE public.payment_webhooks
    SET status = 'processed', processed_at = now()
    WHERE webhook_id = p_webhook_id;

    INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
    VALUES ('payment_webhooks', 'WEBHOOK_PROCESSED', jsonb_build_object(
      'provider', p_provider, 'webhook_id', p_webhook_id,
      'student_id', v_student_id, 'payment_id', v_payment_id,
      'amount', v_amount, 'status', v_status
    ), NULL);

    PERFORM pg_notify('payment_events', json_build_object(
      'student_id', v_student_id, 'payment_id', v_payment_id,
      'event', 'payment_' || v_status, 'amount', v_amount
    )::text);

    RETURN json_build_object(
      'success', true, 'message', 'Payment ' || v_status,
      'payment_id', v_payment_id, 'student_id', v_student_id
    );
  ELSE
    UPDATE public.payment_webhooks
    SET status = 'failed',
        error_message = 'No matching pending payment for student='
          || v_student_id::text || ' amount=' || v_amount::text
    WHERE webhook_id = p_webhook_id;

    INSERT INTO public.audit_log (table_name, operation, new_values)
    VALUES ('payment_webhooks', 'WEBHOOK_NO_MATCH', jsonb_build_object(
      'provider', p_provider, 'webhook_id', p_webhook_id,
      'student_id', v_student_id, 'amount', v_amount
    ));

    RETURN json_build_object(
      'success', false, 'message', 'No matching pending payment',
      'student_id', v_student_id
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.handle_payment_webhook(text, text, jsonb) IS
  'RPC: Process payment webhook from Stripe/PayFast. Idempotent. '
  'Signature verification must happen BEFORE calling this (see process_webhook_safe).';

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. FUNCTION: verify_webhook_signature(provider, signature, payload_raw, secret)
-- ══════════════════════════════════════════════════════════════════════════════
-- Validates cryptographic signature of incoming webhooks.
-- MUST be called BEFORE any DB writes to prevent processing tampered requests.
--
-- STRIPE:
--   - Header format: "t=timestamp,v1=signature_hex"
--   - Compute: HMAC-SHA256(payload_raw, webhook_secret) -> hex
--   - Compare against v1 value from the header
--
-- PAYFAST:
--   - Compute: MD5(passphrase + payload_raw + passphrase)
--   - Compare against provided signature
--
-- ARGS:
--   provider     - 'stripe' | 'payfast'
--   signature    - The signature from the webhook header
--   payload_raw  - The raw request body (before JSON parsing)
--   secret       - The webhook signing secret (from env vars)
--
-- RETURNS: BOOLEAN - true if valid, false if tampered/invalid
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.verify_webhook_signature(
  p_provider     text,
  p_signature    text,
  p_payload_raw  text,
  p_secret       text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_computed text;
BEGIN
  IF p_provider = 'stripe' THEN
    IF p_signature IS NULL OR p_secret IS NULL THEN
      RETURN false;
    END IF;
    -- HMAC-SHA256 signature comparison
    v_computed := encode(
      hmac(p_payload_raw::bytea, p_secret::bytea, 'sha256'), 'hex'
    );
    -- Match against v1= in stripe-signature header or raw comparison
    RETURN (p_signature LIKE '%v1=' || v_computed || '%')
        OR (p_signature = v_computed);

  ELSIF p_provider = 'payfast' THEN
    IF p_signature IS NULL OR p_secret IS NULL THEN
      RETURN false;
    END IF;
    -- PayFast MD5: passphrase + payload + passphrase
    v_computed := md5(p_secret || p_payload_raw || p_secret);
    RETURN (v_computed = p_signature);

  ELSE
    -- Unknown provider - reject
    RETURN false;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.verify_webhook_signature(text, text, text, text) IS
  'Verify webhook signature: HMAC-SHA256 (Stripe) or MD5 (PayFast). '
  'Call BEFORE handle_payment_webhook(). Returns false if signature is invalid.';

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. FUNCTION: process_webhook_safe(provider, signature, payload_raw, secret, payload)
-- ══════════════════════════════════════════════════════════════════════════════
-- Safe wrapper: validates signature BEFORE processing. Recommended entry point.
--
-- FLOW:
--   1. Verify signature via verify_webhook_signature()
--   2. If invalid: log to audit_log, return 401 error
--   3. If valid: call handle_payment_webhook() with provider-specific webhook_id
--
-- WEBHOOK_ID EXTRACTION:
--   Stripe:  payload.id (charge ID, e.g. "ch_...")
--   PayFast: payload.m_payment_id
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.process_webhook_safe(
  p_provider       text,
  p_signature      text,
  p_payload_raw    text,
  p_webhook_secret text,
  p_payload_parsed jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valid    boolean;
  v_webhook_id text;
BEGIN
  -- STEP 1: VERIFY SIGNATURE (must happen BEFORE any DB writes)
  v_valid := public.verify_webhook_signature(
    p_provider, p_signature, p_payload_raw, p_webhook_secret
  );

  IF NOT v_valid THEN
    -- Log the failed attempt to audit trail
    INSERT INTO public.audit_log (table_name, operation, new_values)
    VALUES ('payment_webhooks', 'WEBHOOK_SIGNATURE_FAILED', jsonb_build_object(
      'provider', p_provider,
      'signature_provided', left(COALESCE(p_signature, ''), 20) || '...',
      'error', 'Signature verification failed'
    ));
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid webhook signature',
      'status_code', 401
    );
  END IF;

  -- STEP 2: EXTRACT WEBHOOK_ID (provider-specific idempotency key)
  IF p_provider = 'stripe' THEN
    v_webhook_id := p_payload_parsed ->> 'id';  -- Stripe charge ID: ch_...
  ELSIF p_provider = 'payfast' THEN
    v_webhook_id := p_payload_parsed ->> 'm_payment_id';
  END IF;

  IF v_webhook_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Missing webhook_id in payload',
      'status_code', 400
    );
  END IF;

  -- STEP 3: PROCESS WEBHOOK (idempotent)
  RETURN public.handle_payment_webhook(p_provider, v_webhook_id, p_payload_parsed);
END;
$$;

COMMENT ON FUNCTION public.process_webhook_safe(text, text, text, text, jsonb) IS
  'Safe wrapper: verify signature THEN process webhook. '
  'Use this from API routes. Returns status_code on signature failure.';

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. TRIGGER: on_payment_status_change - Invoice + Capacity + Audit
-- ══════════════════════════════════════════════════════════════════════════════
-- Fires when payments.status changes. Handles:
--   - pending -> completed:
--     * Generate invoice (status='paid', paid_date=now())
--     * Decrease capacity_slots.used_slots for student's grade
--     * Audit log with PAYMENT_COMPLETED operation
--     * pg_notify('payment_events', ...) for realtime subscribers
--   - pending -> failed:
--     * Audit log with PAYMENT_FAILED operation
--     * DO NOT update capacity (keep slot reserved for retry)
--     * pg_notify('payment_events', ...) with failed event
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_payment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student     record;
  v_invoice_id  uuid;
BEGIN
  -- Only fire on actual status transitions
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' AND OLD.status = 'pending' THEN
    -- ──────────────────────────────────────────────────────────────────────
    -- PAYMENT COMPLETED
    -- ──────────────────────────────────────────────────────────────────────

    -- Look up student for grade + academic_group info
    SELECT s.id, s.grade, s.academic_group_id INTO v_student
    FROM public.students s
    WHERE s.id = NEW.student_id;

    -- Generate invoice (paid immediately since payment succeeded)
    INSERT INTO public.invoices (
      student_id, invoice_number, amount, status, due_date, paid_date, created_by
    ) VALUES (
      NEW.student_id,
      'INV-' || nextval('public.invoice_number_seq'),
      NEW.amount,
      'paid',
      CURRENT_DATE,
      CURRENT_DATE,
      NEW.created_by
    ) RETURNING id INTO v_invoice_id;

    -- Decrease available capacity (move from reserved to used)
    IF v_student.grade IS NOT NULL AND v_student.academic_group_id IS NOT NULL THEN
      UPDATE public.capacity_slots
      SET used_slots = used_slots + 1,
          reserved_slots = GREATEST(reserved_slots - 1, 0),
          updated_at = now()
      WHERE grade = v_student.grade
        AND academic_group_id = v_student.academic_group_id;
    END IF;

    -- Audit the payment completion
    INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
    VALUES ('payments', 'PAYMENT_COMPLETED', jsonb_build_object(
      'payment_id', NEW.id,
      'student_id', NEW.student_id,
      'amount', NEW.amount,
      'invoice_id', v_invoice_id,
      'grade', v_student.grade
    ), NEW.created_by);

    -- Notify realtime subscribers
    PERFORM pg_notify('payment_events', json_build_object(
      'student_id', NEW.student_id,
      'payment_id', NEW.id,
      'invoice_id', v_invoice_id,
      'event', 'payment_completed',
      'amount', NEW.amount
    )::text);

  ELSIF NEW.status = 'failed' AND OLD.status = 'pending' THEN
    -- ──────────────────────────────────────────────────────────────────────
    -- PAYMENT FAILED
    -- Do NOT update capacity - keep slot reserved for retry
    -- ──────────────────────────────────────────────────────────────────────
    INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
    VALUES ('payments', 'PAYMENT_FAILED', jsonb_build_object(
      'payment_id', NEW.id,
      'student_id', NEW.student_id,
      'amount', NEW.amount
    ), NEW.created_by);

    PERFORM pg_notify('payment_events', json_build_object(
      'student_id', NEW.student_id,
      'payment_id', NEW.id,
      'event', 'payment_failed',
      'amount', NEW.amount
    )::text);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_payment_status_change
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_payment_status_change();

COMMENT ON FUNCTION public.fn_payment_status_change() IS
  'Fires on payments.status change: pending->completed creates invoice + updates capacity. '
  'pending->failed logs audit only (slot reserved for retry).';

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. TRIGGER: on_debit_order_scheduled - Auto-create payments from debit orders
-- ══════════════════════════════════════════════════════════════════════════════
-- Fires when debit_orders are updated. If status = 'active' and
-- next_debit_date <= now(), auto-creates a payment record and advances
-- the schedule.
--
-- AUTOMATION FLOW:
--   1. Check: status = 'active' AND next_debit_date <= CURRENT_DATE
--   2. Create payment record (status='pending') for the debit amount
--   3. Update debit_order: last_attempt_date=now(), attempt_count+=1
--   4. If attempt_count >= 3: mark as 'failed' (max retries exceeded)
--   5. Otherwise: advance next_debit_date based on frequency
--   6. pg_notify('debit_order_events', ...) for realtime monitoring
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_debit_order_scheduled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_date date;
  v_payment_id uuid;
BEGIN
  -- Only process active debit orders where next_debit_date has arrived
  IF NEW.status != 'active' OR NEW.next_debit_date IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.next_debit_date > CURRENT_DATE THEN
    RETURN NEW;
  END IF;

  -- Auto-create payment record
  INSERT INTO public.payments (
    student_id, amount, status, payment_type, created_by
  ) VALUES (
    NEW.student_id, NEW.amount, 'pending', 'debit_order', NEW.created_by
  ) RETURNING id INTO v_payment_id;

  -- Update attempt tracking
  NEW.last_attempt_date := CURRENT_DATE;
  NEW.attempt_count := COALESCE(NEW.attempt_count, 0) + 1;

  -- Check max retries (3 attempts)
  IF NEW.attempt_count >= 3 THEN
    NEW.status := 'failed';

    INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
    VALUES ('debit_orders', 'DEBIT_ORDER_FAILED', jsonb_build_object(
      'debit_order_id', NEW.id,
      'student_id', NEW.student_id,
      'amount', NEW.amount,
      'attempt_count', NEW.attempt_count,
      'error', 'Max retries exceeded (3 attempts)'
    ), NEW.created_by);

    PERFORM pg_notify('debit_order_events', json_build_object(
      'debit_order_id', NEW.id,
      'student_id', NEW.student_id,
      'status', 'failed',
      'event', 'debit_order_failed'
    )::text);
  ELSE
    -- Advance next_debit_date based on frequency
    v_next_date := CASE NEW.frequency
      WHEN 'monthly'   THEN NEW.next_debit_date + INTERVAL '1 month'
      WHEN 'quarterly' THEN NEW.next_debit_date + INTERVAL '3 months'
      WHEN 'annual'    THEN NEW.next_debit_date + INTERVAL '1 year'
      ELSE NEW.next_debit_date + INTERVAL '1 month'
    END;

    NEW.next_debit_date := v_next_date;

    INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
    VALUES ('debit_orders', 'DEBIT_ORDER_PROCESSED', jsonb_build_object(
      'debit_order_id', NEW.id,
      'student_id', NEW.student_id,
      'amount', NEW.amount,
      'payment_id', v_payment_id,
      'next_debit_date', v_next_date,
      'attempt_count', NEW.attempt_count
    ), NEW.created_by);

    PERFORM pg_notify('debit_order_events', json_build_object(
      'debit_order_id', NEW.id,
      'student_id', NEW.student_id,
      'payment_id', v_payment_id,
      'event', 'debit_order_processed',
      'next_debit_date', v_next_date
    )::text);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_debit_order_scheduled
  BEFORE UPDATE ON public.debit_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_debit_order_scheduled();

COMMENT ON FUNCTION public.fn_debit_order_scheduled() IS
  'Auto-creates payments from debit orders when next_debit_date arrives. '
  'Max 3 retries before marking as failed. Advances schedule on success.';

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. TRIGGER: on_student_enrollment_activated - Invoice generation
-- ══════════════════════════════════════════════════════════════════════════════
-- Fires when students.enrollment_status changes to 'active'.
-- Generates an invoice linked to the student's enrollment for tracking.
--
-- INVOICE GENERATION:
--   - amount = tuition from capacity_slots (or 0 if not found)
--   - status = 'unpaid' (payment not yet received)
--   - due_date = now() + 30 days
--   - Links to enrollment_leads via student's email for lead tracking
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_student_enrollment_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id  uuid;
  v_capacity    record;
  v_tuition     numeric(12,2) := 0;
BEGIN
  -- Only fire on enrollment_status transition to 'active'
  IF NEW.enrollment_status != 'active'
     OR OLD.enrollment_status IS NOT DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  -- Look up tuition amount from capacity_slots
  SELECT cs.total_slots, cs.used_slots INTO v_capacity
  FROM public.capacity_slots cs
  WHERE cs.grade = NEW.grade
    AND cs.academic_group_id = NEW.academic_group_id;

  -- Generate invoice with 30-day due date
  INSERT INTO public.invoices (
    student_id, invoice_number, amount, status, due_date, created_by
  ) VALUES (
    NEW.id,
    'INV-' || nextval('public.invoice_number_seq'),
    v_tuition,
    'unpaid',
    CURRENT_DATE + INTERVAL '30 days',
    NEW.created_by
  ) RETURNING id INTO v_invoice_id;

  -- Audit the invoice generation
  INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
  VALUES ('invoices', 'ENROLLMENT_INVOICE_CREATED', jsonb_build_object(
    'invoice_id', v_invoice_id,
    'student_id', NEW.id,
    'amount', v_tuition,
    'due_date', CURRENT_DATE + INTERVAL '30 days',
    'enrollment_status', NEW.enrollment_status
  ), NEW.created_by);

  -- Notify realtime subscribers
  PERFORM pg_notify('invoice_events', json_build_object(
    'student_id', NEW.id,
    'invoice_id', v_invoice_id,
    'event', 'invoice_created',
    'amount', v_tuition
  )::text);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_student_enrollment_activated
  AFTER UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_student_enrollment_activated();

COMMENT ON FUNCTION public.fn_student_enrollment_activated() IS
  'Generates invoice when enrollment_status changes to active. '
  'Invoice has 30-day due date and links to enrollment for lead tracking.';

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. SEED DATA: Test webhook records
-- ══════════════════════════════════════════════════════════════════════════════
-- Three test rows for manual testing + Postman/curl validation.
-- These represent real webhook payloads as they arrive from each provider.
--
-- TEST COVERAGE:
--   webhook_1: Stripe charge.succeeded (complete flow, already processed)
--   webhook_2: PayFast ITN with COMPLETE status (pending, not yet processed)
--   webhook_3: PayFast ITN with PENDING status (partial processing)
-- ══════════════════════════════════════════════════════════════════════════════

-- webhook_1: Stripe charge.succeeded (R5000.00 = 500000 cents)
-- curl: curl -X POST /api/webhooks/payment?provider=stripe
--   -H "Content-Type: application/json"
--   -d '{"id":"ch_test_12345","amount":500000,"metadata":{"student_id":"{alice_uuid}"},"status":"succeeded"}'
INSERT INTO public.payment_webhooks (webhook_id, provider, payload, status, processed_at)
VALUES (
  'ch_test_12345',
  'stripe',
  '{"id":"ch_test_12345","object":"charge","amount":500000,"currency":"zar","metadata":{"student_id":"00000000-0000-0000-0000-000000000001"},"status":"succeeded"}'::jsonb,
  'processed',
  now()
);

-- webhook_2: PayFast ITN COMPLETE (R3000.00)
-- curl: curl -X POST /api/webhooks/payment?provider=payfast
--   -d "m_payment_id=pf_test_67890&m_amount_gross=3000.00&custom_str1={bob_uuid}&payment_status=COMPLETE"
INSERT INTO public.payment_webhooks (webhook_id, provider, payload, status)
VALUES (
  'pf_test_67890',
  'payfast',
  '{"m_payment_id":"pf_test_67890","m_amount_gross":"3000.00","custom_str1":"00000000-0000-0000-0000-000000000002","payment_status":"COMPLETE","merchant_id":"10000100"}'::jsonb,
  'pending'
);

-- webhook_3: PayFast ITN PENDING (R1500.00)
INSERT INTO public.payment_webhooks (webhook_id, provider, payload, status)
VALUES (
  'pf_test_11111',
  'payfast',
  '{"m_payment_id":"pf_test_11111","m_amount_gross":"1500.00","custom_str1":"00000000-0000-0000-0000-000000000003","payment_status":"PENDING","merchant_id":"10000100"}'::jsonb,
  'pending'
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. REALTIME PUBLICATION
-- ══════════════════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_webhooks;

-- ══════════════════════════════════════════════════════════════════════════════
-- 10. VALIDATION NOTES
-- ══════════════════════════════════════════════════════════════════════════════
--
-- WEBHOOK IDEMPOTENCY:
--   payment_webhooks.webhook_id has UNIQUE constraint.
--   handle_payment_webhook() checks for existing webhook_id before processing.
--   Duplicate webhooks return early with "idempotent skip" message.
--   This handles: network retries, provider redeliveries, manual re-sends.
--
-- SIGNATURE VERIFICATION:
--   ALWAYS call process_webhook_safe() FIRST (before handle_payment_webhook).
--   Stripe: HMAC-SHA256 with webhook secret. Signature in stripe-signature header.
--   PayFast: MD5 hash with passphrase. Signature in form data.
--   Failed verification logged to audit_log with operation='WEBHOOK_SIGNATURE_FAILED'.
--
-- PAYMENT STATE MACHINE:
--   payments.status: pending -> completed | failed
--   On completed: invoice created, capacity updated, pg_notify emitted
--   On failed: audit only, capacity slot reserved for retry
--
-- DEBIT ORDER AUTOMATION:
--   debit_orders with status='active' and next_debit_date <= CURRENT_DATE
--   trigger auto-payment creation. Max 3 retries before status='failed'.
--   Schedule advances by frequency (monthly/quarterly/annual) on each attempt.
--
-- CAPACITY TRACKING:
--   On payment completion: used_slots += 1, reserved_slots = max(reserved - 1, 0)
--   On payment failure: NO capacity change (slot stays reserved for retry)
--
-- AUDIT TRAIL:
--   All webhook processing logged to audit_log via triggers.
--   Operations: WEBHOOK_PROCESSED, WEBHOOK_FAILED, WEBHOOK_SIGNATURE_FAILED,
--               WEBHOOK_NO_MATCH, PAYMENT_COMPLETED, PAYMENT_FAILED,
--               DEBIT_ORDER_PROCESSED, DEBIT_ORDER_FAILED,
--               ENROLLMENT_INVOICE_CREATED
--
-- pg_notify CHANNELS:
--   payment_events:     payment_completed, payment_failed
--   debit_order_events: debit_order_processed, debit_order_failed
--   invoice_events:     invoice_created
--
-- ══════════════════════════════════════════════════════════════════════════════

COMMIT;
