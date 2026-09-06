-- Add stripe_session_id to office_desk.invoices for webhook lookup
ALTER TABLE office_desk.invoices ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

COMMENT ON COLUMN office_desk.invoices.stripe_session_id IS 'Stripe Checkout Session ID for webhook matching';
