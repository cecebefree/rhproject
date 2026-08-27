-- 177: Idempotent version — everything here is already created by 173.
-- This migration is a safety net; all statements use IF NOT EXISTS / DO guards.

CREATE TABLE IF NOT EXISTS public.notification_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('payment', 'invoice', 'debit_order', 'enrollment', 'general')),
  template_subject TEXT,
  template_body TEXT,
  channels TEXT[] DEFAULT ARRAY['email'],
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO public.notification_types(id, name, description, category, template_subject, template_body, channels)
VALUES
  ('payment_succeeded', 'Payment Succeeded', 'Notified when payment is completed', 'payment',
   'Payment Received - {{student_name}}', 'Your payment of {{amount}} has been successfully received.', ARRAY['email', 'in_app']),
  ('payment_failed', 'Payment Failed', 'Notified when payment fails', 'payment',
   'Payment Failed - {{student_name}}', 'Your payment of {{amount}} failed. Please retry.', ARRAY['email', 'in_app']),
  ('invoice_issued', 'Invoice Issued', 'Notified when invoice is issued', 'invoice',
   'New Invoice {{invoice_number}}', 'Invoice {{invoice_number}} for {{amount}} is due on {{due_date}}.', ARRAY['email', 'in_app']),
  ('invoice_overdue', 'Invoice Overdue', 'Notified when invoice is overdue', 'invoice',
   'Invoice Overdue - {{invoice_number}}', 'Invoice {{invoice_number}} is now overdue. Please settle immediately.', ARRAY['email', 'sms']),
  ('debit_order_created', 'Debit Order Created', 'Notified when debit order is created', 'debit_order',
   'Debit Order Setup - {{student_name}}', 'A debit order has been set up for {{amount}} {{frequency}}.', ARRAY['email', 'in_app']),
  ('debit_order_activated', 'Debit Order Activated', 'Notified when debit order is activated', 'debit_order',
   'Debit Order Activated - {{student_name}}', 'Your debit order mandate is now active.', ARRAY['email', 'in_app']),
  ('debit_order_failed', 'Debit Order Failed', 'Notified when debit attempt fails', 'debit_order',
   'Debit Order Failed - {{student_name}}', 'Debit attempt on {{attempt_date}} failed. Retry scheduled for {{retry_date}}.', ARRAY['email', 'sms']),
  ('enrollment_confirmed', 'Enrollment Confirmed', 'Notified when enrollment is confirmed', 'enrollment',
   'Enrollment Confirmed - {{course_name}}', 'Your enrollment in {{course_name}} is confirmed.', ARRAY['email', 'in_app'])
ON CONFLICT (id) DO NOTHING;

-- All ALTER TABLE / CREATE INDEX / CREATE POLICY already applied in 173
-- This file intentionally does nothing on re-run.
