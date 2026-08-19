-- Migration 152: Stripe webhook events + refunds + payment_status (Row 102)
-- Adds: payment_status enum to registrations, stripe_events table, refunds table

-- ═══════════════════════════════════════════════════════════
-- PAYMENT_STATUS ENUM ON REGISTRATIONS
-- ═══════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE office_desk.registration_payment_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE office_desk.registrations
  ADD COLUMN IF NOT EXISTS payment_status office_desk.registration_payment_status
  NOT NULL DEFAULT 'pending';

COMMENT ON COLUMN office_desk.registrations.payment_status
  IS 'Stripe payment lifecycle: pending → paid/failed → refunded';

CREATE INDEX IF NOT EXISTS idx_registrations_payment_status
  ON office_desk.registrations (payment_status);

-- ═══════════════════════════════════════════════════════════
-- STRIPE_EVENTS — idempotency + audit trail for incoming webhooks
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.stripe_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type      text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}',
  processed_at    timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'skipped', 'error')),
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN office_desk.stripe_events.stripe_event_id
  IS 'Stripe event ID (evt_...) — used for idempotency';

CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id
  ON office_desk.stripe_events (stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type
  ON office_desk.stripe_events (event_type);

CREATE INDEX IF NOT EXISTS idx_stripe_events_created
  ON office_desk.stripe_events (created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- REFUNDS — tracks individual refund records
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.refunds (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_refund_id  text NOT NULL UNIQUE,
  registration_id   uuid NOT NULL REFERENCES office_desk.registrations(id) ON DELETE CASCADE,
  stripe_charge_id  text NOT NULL,
  amount            numeric(12,2) NOT NULL,
  currency          text NOT NULL DEFAULT 'zar',
  reason            text,
  status            text NOT NULL DEFAULT 'succeeded'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN office_desk.refunds.stripe_refund_id
  IS 'Stripe refund ID (re_...)';

CREATE INDEX IF NOT EXISTS idx_refunds_registration
  ON office_desk.refunds (registration_id);

CREATE INDEX IF NOT EXISTS idx_refunds_charge
  ON office_desk.refunds (stripe_charge_id);

CREATE INDEX IF NOT EXISTS idx_refunds_created
  ON office_desk.refunds (created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE office_desk.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.refunds ENABLE ROW LEVEL SECURITY;

-- Service role (EFs) can do everything
CREATE POLICY stripe_events_service_role ON office_desk.stripe_events
  FOR ALL USING (true);

CREATE POLICY refunds_service_role ON office_desk.refunds
  FOR ALL USING (true);

-- Admin/office can read stripe events (audit trail)
CREATE POLICY stripe_events_admin_select ON office_desk.stripe_events
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'office')
  );

-- Admin/office can read refunds
CREATE POLICY refunds_admin_select ON office_desk.refunds
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'office')
  );

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════

GRANT ALL ON office_desk.stripe_events TO service_role;
GRANT ALL ON office_desk.refunds TO service_role;
GRANT SELECT ON office_desk.stripe_events TO authenticated;
GRANT SELECT ON office_desk.refunds TO authenticated;
