-- Migration 122: Create school_desk.payment_requests table (Row 72)
-- Payment integration for School Front Desk — Stripe Checkout Sessions

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- PAYMENT REQUESTS — teacher-initiated payment links
-- Status flow: pending → paid / expired / cancelled
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_desk.payment_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id),
  registration_id   uuid NOT NULL REFERENCES office_desk.registrations(id),
  amount            numeric(12,2) NOT NULL CHECK (amount > 0),
  currency          text NOT NULL DEFAULT 'USD',
  description       text,
  stripe_session_id text,
  stripe_payment_url text,
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'paid',
      'expired',
      'cancelled'
    )),
  created_by        uuid NOT NULL REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  paid_at           timestamptz,
  expired_at        timestamptz,
  cancelled_at      timestamptz,
  deleted_at        timestamptz
);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_payment_requests_tenant
  ON school_desk.payment_requests (tenant_id);

CREATE INDEX IF NOT EXISTS idx_payment_requests_registration
  ON school_desk.payment_requests (registration_id);

CREATE INDEX IF NOT EXISTS idx_payment_requests_status
  ON school_desk.payment_requests (status);

CREATE INDEX IF NOT EXISTS idx_payment_requests_tenant_created
  ON school_desk.payment_requests (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_requests_stripe_session
  ON school_desk.payment_requests (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════
ALTER TABLE school_desk.payment_requests ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS school_desk_payment_requests_admin_all ON school_desk.payment_requests;
CREATE POLICY school_desk_payment_requests_admin_all
  ON school_desk.payment_requests FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Teachers SELECT: read payment requests for registrations in own tenant
DROP POLICY IF EXISTS school_desk_payment_requests_select ON school_desk.payment_requests;
CREATE POLICY school_desk_payment_requests_select
  ON school_desk.payment_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'teacher'
        AND p.tenant_id = payment_requests.tenant_id
    )
  );

-- Teachers INSERT: create payment requests for registrations in own tenant
DROP POLICY IF EXISTS school_desk_payment_requests_insert ON school_desk.payment_requests;
CREATE POLICY school_desk_payment_requests_insert
  ON school_desk.payment_requests FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'teacher'
        AND p.tenant_id = payment_requests.tenant_id
    )
    AND EXISTS (
      SELECT 1 FROM office_desk.registrations r
      WHERE r.id = payment_requests.registration_id
        AND r.tenant_id = payment_requests.tenant_id
    )
  );

-- Teachers UPDATE: update own pending requests
DROP POLICY IF EXISTS school_desk_payment_requests_update ON school_desk.payment_requests;
CREATE POLICY school_desk_payment_requests_update
  ON school_desk.payment_requests FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'teacher'
        AND p.tenant_id = payment_requests.tenant_id
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'teacher'
        AND p.tenant_id = payment_requests.tenant_id
    )
  );

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT ALL ON school_desk.payment_requests TO service_role;
GRANT SELECT ON school_desk.payment_requests TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════
COMMENT ON TABLE school_desk.payment_requests IS
  'Row 72: Teacher-initiated payment requests linked to registrations. Stripe Checkout Session integration.';
COMMENT ON COLUMN school_desk.payment_requests.stripe_session_id IS
  'Stripe Checkout Session ID — used to match webhook confirmations';
COMMENT ON COLUMN school_desk.payment_requests.stripe_payment_url IS
  'Stripe hosted payment page URL — shareable via QR code or link';

COMMIT;
