-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 004: Core RPCs — Enrollment, Payments, Invoicing
-- ══════════════════════════════════════════════════════════════════════════════
-- Adds:
--   - enroll_student() — Create student + reserve capacity slot
--   - create_payment() — Insert payment with status='pending'
--   - generate_invoice() — Create invoice with auto-incremented number
--
-- DEPENDS ON: 001_init_schema.sql (students, payments, invoices,
--             capacity_slots, audit_log tables)
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 0. CLEANUP — Drop existing functions for safe re-runs
-- ══════════════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.enroll_student(text, text, uuid);
DROP FUNCTION IF EXISTS public.create_payment(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.generate_invoice(uuid, numeric, date);

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. FUNCTION: enroll_student(p_first_name, p_last_name, p_academic_group_id)
-- ══════════════════════════════════════════════════════════════════════════════
-- Creates a student record and reserves a capacity slot.
--
-- ADAPTED FROM DAY 3 TASK:
--   Original: enroll_student(p_family_id, p_grade, p_academic_group_id)
--   Adapted:  Uses existing students table columns (first_name, last_name, grade)
--             No 'families' table exists in current schema.
--
-- FLOW:
--   1. Validate academic group exists (via supabase.organizations)
--   2. Validate capacity slot exists and has available capacity
--   3. Create student record with enrollment_status='pending'
--   4. Reserve capacity slot (increment reserved_slots)
--   5. Return student_id, enrollment_status, error
--
-- ARGS:
--   p_first_name       - Student's first name
--   p_last_name        - Student's last name
--   p_academic_group_id - FK to supabase.organizations
--
-- RETURNS: TABLE(student_id UUID, status TEXT, error TEXT)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.enroll_student(
  p_first_name        text,
  p_last_name         text,
  p_academic_group_id uuid
)
RETURNS TABLE(student_id uuid, status text, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_student_id uuid;
  v_grade      text;
  v_capacity   record;
BEGIN
  -- ── Validate academic group exists ──
  IF NOT EXISTS (
    SELECT 1 FROM supabase.organizations WHERE id = p_academic_group_id
  ) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 'Academic group not found'::text;
    RETURN;
  END IF;

  -- ── Find first available capacity slot for this academic group ──
  -- Uses the first grade with available capacity (reserved_slots < total_slots)
  SELECT cs.id, cs.grade, cs.total_slots, cs.reserved_slots
    INTO v_capacity
    FROM public.capacity_slots cs
   WHERE cs.academic_group_id = p_academic_group_id
     AND cs.reserved_slots < cs.total_slots
   ORDER BY cs.grade ASC
   LIMIT 1;

  IF v_capacity IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 'No capacity available in any grade'::text;
    RETURN;
  END IF;

  v_grade := v_capacity.grade;

  -- ── Create student record ──
  INSERT INTO public.students (
    first_name, last_name, grade, academic_group_id,
    enrollment_status, created_by, updated_by
  ) VALUES (
    p_first_name, p_last_name, v_grade, p_academic_group_id,
    'pending', auth.uid(), auth.uid()
  )
  RETURNING id INTO v_student_id;

  -- ── Reserve capacity slot (increment reserved_slots) ──
  UPDATE public.capacity_slots
  SET reserved_slots = reserved_slots + 1,
      updated_at = now()
  WHERE id = v_capacity.id;

  -- ── Audit the enrollment ──
  INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
  VALUES ('students', 'INSERT', jsonb_build_object(
    'action', 'ENROLLMENT_CREATED',
    'student_id', v_student_id,
    'first_name', p_first_name,
    'last_name', p_last_name,
    'grade', v_grade,
    'academic_group_id', p_academic_group_id
  ), auth.uid());

  RETURN QUERY SELECT v_student_id, 'pending'::text, NULL::text;
END;
$$;

COMMENT ON FUNCTION public.enroll_student(text, text, uuid) IS
  'Enroll a student: create record + reserve capacity slot. Status=pending until payment completes.';

GRANT EXECUTE ON FUNCTION public.enroll_student(text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_student(text, text, uuid) TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. FUNCTION: create_payment(p_student_id, p_amount, p_payment_method)
-- ══════════════════════════════════════════════════════════════════════════════
-- Creates a payment record with status='pending', awaiting Stripe webhook.
--
-- ADAPTED FROM DAY 3 TASK:
--   Original: create_payment_transaction(p_student_id, p_amount, p_payment_method)
--   Adapted:  Uses existing 'payments' table (not 'payment_transactions')
--
-- FLOW:
--   1. Validate student exists
--   2. Create payment record with status='pending'
--   3. Return payment_id, status, error
--
-- ARGS:
--   p_student_id     - FK to students(id)
--   p_amount         - Payment amount (positive decimal)
--   p_payment_method - 'stripe', 'payfast', 'cash', 'bank_transfer'
--
-- RETURNS: TABLE(payment_id UUID, status TEXT, error TEXT)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_payment(
  p_student_id     uuid,
  p_amount         numeric,
  p_payment_method text
)
RETURNS TABLE(payment_id uuid, status text, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  -- ── Validate student exists ──
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = p_student_id) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 'Student not found'::text;
    RETURN;
  END IF;

  -- ── Validate amount ──
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 'Amount must be positive'::text;
    RETURN;
  END IF;

  -- ── Create payment record (status = pending, awaiting Stripe callback) ──
  INSERT INTO public.payments (
    student_id, amount, payment_type, status,
    created_by, updated_by
  ) VALUES (
    p_student_id, p_amount, p_payment_method, 'pending',
    auth.uid(), auth.uid()
  )
  RETURNING id INTO v_payment_id;

  -- ── Audit the payment creation ──
  INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
  VALUES ('payments', 'INSERT', jsonb_build_object(
    'action', 'PAYMENT_CREATED',
    'payment_id', v_payment_id,
    'student_id', p_student_id,
    'amount', p_amount,
    'payment_method', p_payment_method
  ), auth.uid());

  RETURN QUERY SELECT v_payment_id, 'pending'::text, NULL::text;
END;
$$;

COMMENT ON FUNCTION public.create_payment(uuid, numeric, text) IS
  'Create a pending payment record. Awaits Stripe/PayFast webhook to complete.';

GRANT EXECUTE ON FUNCTION public.create_payment(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment(uuid, numeric, text) TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. FUNCTION: generate_invoice(p_student_id, p_amount, p_due_date)
-- ══════════════════════════════════════════════════════════════════════════════
-- Creates an invoice with auto-incremented invoice_number (INV-1001, INV-1002, ...).
--
-- ADAPTED FROM DAY 3 TASK:
--   Original: generate_invoice(p_student_id, p_amount, p_due_date)
--   Adapted:  Uses existing 'invoices' table + invoice_number_seq sequence
--             Format: INV-{sequence_number} (e.g., INV-1001, INV-1002)
--
-- FLOW:
--   1. Validate student exists
--   2. Generate invoice number from sequence
--   3. Create invoice with status='unpaid'
--   4. Return invoice_id, invoice_number, status, error
--
-- ARGS:
--   p_student_id - FK to students(id)
--   p_amount     - Invoice amount (positive decimal)
--   p_due_date   - Payment deadline
--
-- RETURNS: TABLE(invoice_id UUID, invoice_number TEXT, status TEXT, error TEXT)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.generate_invoice(
  p_student_id uuid,
  p_amount     numeric,
  p_due_date   date
)
RETURNS TABLE(invoice_id uuid, invoice_number text, status text, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_invoice_id     uuid;
  v_invoice_number text;
BEGIN
  -- ── Validate student exists ──
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = p_student_id) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, 'Student not found'::text;
    RETURN;
  END IF;

  -- ── Validate amount ──
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, 'Amount must be positive'::text;
    RETURN;
  END IF;

  -- ── Generate invoice number from sequence ──
  v_invoice_number := 'INV-' || nextval('public.invoice_number_seq');

  -- ── Create invoice ──
  INSERT INTO public.invoices (
    student_id, invoice_number, amount, status, due_date,
    created_by, updated_by
  ) VALUES (
    p_student_id, v_invoice_number, p_amount, 'unpaid', p_due_date,
    auth.uid(), auth.uid()
  )
  RETURNING id INTO v_invoice_id;

  -- ── Audit the invoice generation ──
  INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
  VALUES ('invoices', 'INSERT', jsonb_build_object(
    'action', 'INVOICE_CREATED',
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'student_id', p_student_id,
    'amount', p_amount,
    'due_date', p_due_date
  ), auth.uid());

  RETURN QUERY SELECT v_invoice_id, v_invoice_number, 'unpaid'::text, NULL::text;
END;
$$;

COMMENT ON FUNCTION public.generate_invoice(uuid, numeric, date) IS
  'Generate an invoice with auto-incremented number (INV-1001, INV-1002, ...). Status=unpaid.';

GRANT EXECUTE ON FUNCTION public.generate_invoice(uuid, numeric, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice(uuid, numeric, date) TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. GRANT EXECUTE ON SEQUENCES (for invoice number generation)
-- ══════════════════════════════════════════════════════════════════════════════
GRANT USAGE, SELECT ON SEQUENCE public.invoice_number_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.invoice_number_seq TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. VALIDATION NOTES
-- ══════════════════════════════════════════════════════════════════════════════
--
-- ENROLLMENT FLOW:
-- ────────────────
-- 1. enroll_student() creates student with enrollment_status='pending'
-- 2. create_payment() creates pending payment record
-- 3. Stripe/PayFast webhook calls handle_payment_webhook() (from 003)
-- 4. on_payment_status_change trigger fires:
--    - Updates payments.status to 'completed'
--    - Activates student (enrollment_status='active')
--    - Generates invoice (paid)
--    - Updates capacity_slots (reserved → used)
--
-- CAPACITY TRACKING:
-- ──────────────────
-- enroll_student(): reserved_slots += 1 (slot held for pending enrollment)
-- on_payment_status_change(): used_slots += 1, reserved_slots -= 1
-- on_payment_failure: NO capacity change (slot stays reserved for retry)
--
-- AUDIT TRAIL:
-- ────────────
-- All 3 RPCs write to audit_log with descriptive operations:
--   ENROLLMENT_CREATED, PAYMENT_CREATED, INVOICE_CREATED
-- Triggers from 001/003 also fire for downstream updates.
--
-- RLS ENFORCEMENT:
-- ────────────────
-- RPCs are SECURITY DEFINER — they run with owner privileges.
-- RLS on underlying tables still applies for direct queries.
-- Only authenticated + service_role can execute these RPCs.
--
-- ══════════════════════════════════════════════════════════════════════════════

COMMIT;
