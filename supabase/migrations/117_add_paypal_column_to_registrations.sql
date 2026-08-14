-- Migration 117: Add PayPal transaction ID column to office_desk.registrations

BEGIN;

ALTER TABLE office_desk.registrations
ADD COLUMN IF NOT EXISTS paypal_transaction_id text;

COMMENT ON COLUMN office_desk.registrations.paypal_transaction_id IS 'PayPal transaction ID for audit trail';

CREATE INDEX IF NOT EXISTS idx_registrations_paypal_transaction_id ON office_desk.registrations(paypal_transaction_id);

COMMIT;
