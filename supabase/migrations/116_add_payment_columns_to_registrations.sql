-- Migration 116: Add payment tracking columns to office_desk.registrations

BEGIN;

ALTER TABLE office_desk.registrations
ADD COLUMN IF NOT EXISTS payment_attached_at timestamptz,
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_charge_id text;

COMMENT ON COLUMN office_desk.registrations.payment_attached_at IS 'Timestamp when payment was successfully attached via Stripe/PayPal webhook';
COMMENT ON COLUMN office_desk.registrations.stripe_customer_id IS 'Stripe customer ID for recurring payments (deferred post-MVP)';
COMMENT ON COLUMN office_desk.registrations.stripe_charge_id IS 'Stripe charge ID for audit trail';

CREATE INDEX IF NOT EXISTS idx_registrations_student_email ON office_desk.registrations(student_email);
CREATE INDEX IF NOT EXISTS idx_registrations_stripe_charge_id ON office_desk.registrations(stripe_charge_id);

COMMIT;
