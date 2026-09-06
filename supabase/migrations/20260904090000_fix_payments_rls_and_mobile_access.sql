-- Fix public.payments RLS for mobile access
-- 1. Fix student SELECT policy to use students.user_id
-- 2. Add tenant_id based policy
-- 3. Create payment_history view for mobile app

-- 1. Drop old student policy and recreate with correct logic
DROP POLICY IF EXISTS student_payments_select ON public.payments;

CREATE POLICY student_payments_select ON public.payments
  FOR SELECT USING (
    -- Student can see their own payments via user_id link
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = payments.student_id
        AND s.user_id = auth.uid()
    )
  );

-- 2. Drop old parent policy and recreate
DROP POLICY IF EXISTS parent_payments_select ON public.payments;

CREATE POLICY parent_payments_select ON public.payments
  FOR SELECT USING (
    -- Parent can see payments for their linked children
    EXISTS (
      SELECT 1 FROM public.parents p
      JOIN public.students s ON s.id = p.student_id
      WHERE s.id = payments.student_id
        AND p.id = auth.uid()
    )
  );

-- 3. Create payment_history view for mobile app (joins debit order info)
CREATE OR REPLACE VIEW public.payment_history_view AS
SELECT
  p.id,
  p.student_id,
  p.amount,
  p.status,
  p.payment_type,
  p.created_at,
  p.debit_order_id,
  p.tenant_id,
  d.frequency AS debit_frequency,
  d.next_debit_date,
  d.start_date AS debit_start_date,
  d.end_date AS debit_end_date
FROM public.payments p
LEFT JOIN public.debit_orders d ON d.id = p.debit_order_id
WHERE p.debit_order_id IS NOT NULL;

COMMENT ON VIEW public.payment_history_view IS 'Payment history with debit order details for mobile app';

GRANT SELECT ON public.payment_history_view TO authenticated;
