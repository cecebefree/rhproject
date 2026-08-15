-- Migration 131: Dual payment processor integration (Row 27)
-- Adds: Stripe + PayPal columns to invoices, stripe_customers table (dual), subscriptions table (dual)
-- RLS: admin_all, office select/insert/update, service_role bypass for webhooks

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- INVOICES — dual processor columns
-- ═══════════════════════════════════════════════════════════

ALTER TABLE office_desk.invoices
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_charge_id text,
  ADD COLUMN IF NOT EXISTS stripe_error_message text,
  ADD COLUMN IF NOT EXISTS paypal_order_id text,
  ADD COLUMN IF NOT EXISTS paypal_capture_id text,
  ADD COLUMN IF NOT EXISTS paypal_error_message text,
  ADD COLUMN IF NOT EXISTS payment_processor text CHECK (payment_processor IN ('stripe', 'paypal')),
  ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('card', 'ach', 'paypal')),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_invoices_stripe_payment_intent
  ON office_desk.invoices (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_paypal_order
  ON office_desk.invoices (paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_paid_at
  ON office_desk.invoices (paid_at)
  WHERE paid_at IS NOT NULL;

COMMENT ON COLUMN office_desk.invoices.stripe_payment_intent_id IS 'Stripe PaymentIntent ID';
COMMENT ON COLUMN office_desk.invoices.stripe_charge_id IS 'Stripe Charge ID on success';
COMMENT ON COLUMN office_desk.invoices.stripe_error_message IS 'Last Stripe payment error';
COMMENT ON COLUMN office_desk.invoices.paypal_order_id IS 'PayPal Order ID';
COMMENT ON COLUMN office_desk.invoices.paypal_capture_id IS 'PayPal Capture ID on success';
COMMENT ON COLUMN office_desk.invoices.paypal_error_message IS 'Last PayPal payment error';
COMMENT ON COLUMN office_desk.invoices.payment_processor IS 'Which processor handled this invoice: stripe or paypal';
COMMENT ON COLUMN office_desk.invoices.payment_method IS 'Payment method: card, ach, or paypal';
COMMENT ON COLUMN office_desk.invoices.paid_at IS 'Timestamp when payment was confirmed';

-- ═══════════════════════════════════════════════════════════
-- STRIPE_CUSTOMERS — tenant billing identity (dual processor)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.stripe_customers (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL REFERENCES public.tenant_lms(id) UNIQUE,
  stripe_customer_id      text,
  paypal_customer_id      text,
  billing_email           text,
  billing_address_line1   text,
  billing_address_line2   text,
  billing_city            text,
  billing_state           text,
  billing_postal_code     text,
  billing_country         text DEFAULT 'ZA',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_tenant
  ON office_desk.stripe_customers (tenant_id);

COMMENT ON TABLE office_desk.stripe_customers IS 'Tenant billing identity — holds both Stripe and PayPal customer IDs';
COMMENT ON COLUMN office_desk.stripe_customers.stripe_customer_id IS 'Stripe customer ID (cus_...)';
COMMENT ON COLUMN office_desk.stripe_customers.paypal_customer_id IS 'PayPal customer ID';

-- ═══════════════════════════════════════════════════════════
-- SUBSCRIPTIONS — dual processor plan subscriptions
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.subscriptions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES public.tenant_lms(id),
  stripe_subscription_id    text,
  paypal_plan_id            text,
  processor                 text NOT NULL CHECK (processor IN ('stripe', 'paypal')),
  plan_id                   text NOT NULL CHECK (plan_id IN ('starter', 'pro', 'enterprise')),
  status                    text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'unpaid', 'cancelled')),
  amount_monthly            numeric(12,2) NOT NULL,
  billing_interval          text NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month', 'year')),
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  cancel_at_period_end      boolean NOT NULL DEFAULT false,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant
  ON office_desk.subscriptions (tenant_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription
  ON office_desk.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_plan
  ON office_desk.subscriptions (paypal_plan_id)
  WHERE paypal_plan_id IS NOT NULL;

COMMENT ON TABLE office_desk.subscriptions IS 'Tenant subscriptions — dual processor (Stripe + PayPal)';
COMMENT ON COLUMN office_desk.subscriptions.processor IS 'Which processor manages this subscription';
COMMENT ON COLUMN office_desk.subscriptions.plan_id IS 'Plan tier: starter, pro, or enterprise';
COMMENT ON COLUMN office_desk.subscriptions.cancel_at_period_end IS 'If true, subscription ends at period close';

-- ═══════════════════════════════════════════════════════════
-- RLS: STRIPE_CUSTOMERS
-- ═══════════════════════════════════════════════════════════

ALTER TABLE office_desk.stripe_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sc_admin_all ON office_desk.stripe_customers;
CREATE POLICY sc_admin_all ON office_desk.stripe_customers
  FOR ALL TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS sc_office_select ON office_desk.stripe_customers;
CREATE POLICY sc_office_select ON office_desk.stripe_customers
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════
-- RLS: SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════════

ALTER TABLE office_desk.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sub_admin_all ON office_desk.subscriptions;
CREATE POLICY sub_admin_all ON office_desk.subscriptions
  FOR ALL TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS sub_office_select ON office_desk.subscriptions;
CREATE POLICY sub_office_select ON office_desk.subscriptions
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGERS
-- ═══════════════════════════════════════════════════════════

CREATE TRIGGER trg_stripe_customers_updated_at
  BEFORE UPDATE ON office_desk.stripe_customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON office_desk.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE ON office_desk.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON office_desk.stripe_customers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON office_desk.subscriptions TO authenticated;

GRANT ALL ON office_desk.invoices TO service_role;
GRANT ALL ON office_desk.stripe_customers TO service_role;
GRANT ALL ON office_desk.subscriptions TO service_role;

COMMIT;
