-- ============================================================================
-- Office Desk RPCs: approve_registration, record_payment, get_financial_summary
-- ============================================================================

-- 1. approve_registration(p_registration_id UUID)
-- Updates registration status to 'approved', creates student profile, creates invoice if missing
CREATE OR REPLACE FUNCTION public.approve_registration(p_registration_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_registration office_desk.registrations%ROWTYPE;
  v_student_id UUID;
  v_invoice_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Role check
  IF (auth.jwt()-> 'app_metadata' ->> 'role') NOT IN ('admin', 'office') THEN
    RAISE EXCEPTION 'Unauthorized: only admin or office can approve registrations';
  END IF;

  -- Fetch registration
  SELECT * INTO v_registration
  FROM office_desk.registrations
  WHERE id = p_registration_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found: %', p_registration_id;
  END IF;

  IF v_registration.status NOT IN ('pending_init', 'pending_review') THEN
    RAISE EXCEPTION 'Registration cannot be approved from status: %', v_registration.status;
  END IF;

  v_tenant_id := v_registration.tenant_id;

  -- 1. Update registration status
  UPDATE office_desk.registrations
  SET status = 'approved',
      updated_at = now()
  WHERE id = p_registration_id;

  -- 2. Create student profile if not exists
  IF v_registration.id NOT IN (SELECT registration_id FROM public.students WHERE registration_id = v_registration.id) THEN
    INSERT INTO public.students (
      first_name,
      last_name,
      email,
      enrollment_status,
      registration_id,
      created_by,
      updated_by
    ) VALUES (
      split_part(v_registration.student_name, ' ', 1),
      CASE WHEN array_length(string_to_array(v_registration.student_name, ' '), 1) > 1
           THEN split_part(v_registration.student_name, ' ', 2)
           ELSE ''
      END,
      v_registration.student_email,
      'pending',
      v_registration.id,
      auth.uid(),
      auth.uid()
    ) RETURNING id INTO v_student_id;
  ELSE
    SELECT id INTO v_student_id
    FROM public.students
    WHERE registration_id = v_registration.id
    LIMIT 1;
  END IF;

  -- 3. Create invoice if none exists
  SELECT id INTO v_invoice_id
  FROM office_desk.invoices
  WHERE registration_id = p_registration_id
    AND deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO office_desk.invoices (
      tenant_id,
      registration_id,
      amount,
      currency,
      status,
      issued_at
    ) VALUES (
      v_tenant_id,
      p_registration_id,
      0, -- Placeholder amount, to be updated by office staff
      'ZAR',
      'draft',
      now()
    ) RETURNING id INTO v_invoice_id;
  END IF;

  -- 4. Log to audit_log
  INSERT INTO public.audit_log (table_name, operation, old_values, new_values, user_id)
  VALUES (
    'registrations',
    'UPDATE',
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', 'approved', 'student_id', v_student_id, 'invoice_id', v_invoice_id),
    auth.uid()
  );

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'registration_id', p_registration_id,
    'student_id', v_student_id,
    'invoice_id', v_invoice_id,
    'status', 'approved'
  );
END;
$$;


-- 2. record_payment(p_invoice_id UUID, p_amount NUMERIC, p_method TEXT, p_reference TEXT, p_notes TEXT)
-- Records a payment against an invoice, updates invoice totals
CREATE OR REPLACE FUNCTION public.record_payment(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_method TEXT DEFAULT 'card',
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice office_desk.invoices%ROWTYPE;
  v_payment_id UUID;
  v_new_amount_paid NUMERIC;
BEGIN
  -- Role check
  IF (auth.jwt()-> 'app_metadata' ->> 'role') NOT IN ('admin', 'office') THEN
    RAISE EXCEPTION 'Unauthorized: only admin or office can record payments';
  END IF;

  -- Fetch invoice
  SELECT * INTO v_invoice
  FROM office_desk.invoices
  WHERE id = p_invoice_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
  END IF;

  IF v_invoice.status IN ('cancelled', 'void') THEN
    RAISE EXCEPTION 'Cannot record payment against invoice with status: %', v_invoice.status;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;

  -- 1. Insert payment
  INSERT INTO office_desk.payments (
    tenant_id,
    invoice_id,
    amount,
    currency,
    payment_method,
    reference,
    status,
    paid_at,
    family_account_id
  ) VALUES (
    v_invoice.tenant_id,
    p_invoice_id,
    p_amount,
    v_invoice.currency,
    p_method,
    p_reference,
    'confirmed',
    now(),
    v_invoice.family_account_id
  ) RETURNING id INTO v_payment_id;

  -- 2. Update invoice amount_paid
  v_new_amount_paid := v_invoice.amount_paid + p_amount;

  UPDATE office_desk.invoices
  SET amount_paid = v_new_amount_paid,
      status = CASE
        WHEN v_new_amount_paid >= amount THEN 'paid'
        WHEN v_new_amount_paid > 0 THEN 'sent'
        ELSE status
      END,
      paid_at = CASE
        WHEN v_new_amount_paid >= amount THEN now()
        ELSE paid_at
      END,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_invoice_id;

  -- 3. Update registration payment_status if linked
  IF v_invoice.registration_id IS NOT NULL THEN
    UPDATE office_desk.registrations
    SET updated_at = now()
    WHERE id = v_invoice.registration_id;
  END IF;

  -- 4. Log to audit_log
  INSERT INTO public.audit_log (table_name, operation, old_values, new_values, user_id)
  VALUES (
    'payments',
    'INSERT',
    NULL,
    jsonb_build_object(
      'payment_id', v_payment_id,
      'invoice_id', p_invoice_id,
      'amount', p_amount,
      'method', p_method,
      'new_amount_paid', v_new_amount_paid,
      'invoice_status', CASE WHEN v_new_amount_paid >= v_invoice.amount THEN 'paid' ELSE 'sent' END
    ),
    auth.uid()
  );

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'invoice_id', p_invoice_id,
    'amount_paid', v_new_amount_paid,
    'amount_due', v_invoice.amount - v_new_amount_paid,
    'invoice_status', CASE WHEN v_new_amount_paid >= v_invoice.amount THEN 'paid' ELSE 'sent' END
  );
END;
$$;


-- 3. get_financial_summary(p_tenant_id UUID)
-- Returns financial metrics for a tenant
CREATE OR REPLACE FUNCTION public.get_financial_summary(p_tenant_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_tenant UUID;
  v_result JSONB;
BEGIN
  -- Role check
  IF (auth.jwt()-> 'app_metadata' ->> 'role') NOT IN ('admin', 'office') THEN
    RAISE EXCEPTION 'Unauthorized: only admin or office can view financial summary';
  END IF;

  -- Use provided tenant or JWT tenant
  v_tenant := COALESCE(p_tenant_id, (auth.jwt()-> 'app_metadata' ->> 'tenant_id')::uuid);

  SELECT jsonb_build_object(
    'tenant_id', v_tenant,
    'total_registrations', (
      SELECT count(*) FROM office_desk.registrations
      WHERE tenant_id = v_tenant AND deleted_at IS NULL
    ),
    'total_approved', (
      SELECT count(*) FROM office_desk.registrations
      WHERE tenant_id = v_tenant AND status = 'approved' AND deleted_at IS NULL
    ),
    'total_active', (
      SELECT count(*) FROM office_desk.registrations
      WHERE tenant_id = v_tenant AND status = 'active' AND deleted_at IS NULL
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(p.amount), 0) FROM office_desk.payments p
      JOIN office_desk.invoices i ON p.invoice_id = i.id
      WHERE i.tenant_id = v_tenant AND p.status = 'confirmed'
    ),
    'outstanding_amount', (
      SELECT COALESCE(SUM(i.amount - i.amount_paid), 0) FROM office_desk.invoices i
      WHERE i.tenant_id = v_tenant AND i.status NOT IN ('paid', 'cancelled', 'void')
    ),
    'overdue_count', (
      SELECT count(*) FROM office_desk.invoices
      WHERE tenant_id = v_tenant AND status = 'overdue'
    ),
    'by_status', (
      SELECT jsonb_agg(jsonb_build_object('status', status, 'count', cnt))
      FROM (
        SELECT status, count(*) as cnt
        FROM office_desk.registrations
        WHERE tenant_id = v_tenant AND deleted_at IS NULL
        GROUP BY status
      ) sub
    ),
    'recent_payments', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'amount', p.amount,
        'status', p.status,
        'created_at', p.created_at
      ))
      FROM (
        SELECT * FROM office_desk.payments
        WHERE tenant_id = v_tenant
        ORDER BY created_at DESC
        LIMIT 10
      ) p
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
