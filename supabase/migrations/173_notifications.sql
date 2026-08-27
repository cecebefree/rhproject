-- Notification types table (new, doesn't exist yet)
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

-- Add columns to existing notifications table (created in 036_notifications.sql)
-- Original has: id, user_id, tenant_id, type, title, body, read_at, created_at
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS notification_type_id TEXT REFERENCES public.notification_types(id),
  ADD COLUMN IF NOT EXISTS channels TEXT[] DEFAULT ARRAY['email'],
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
  ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Indexes (IF NOT EXISTS to avoid conflicts)
CREATE INDEX IF NOT EXISTS idx_notifications_student_id ON public.notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type_id ON public.notifications(notification_type_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Notification preferences (new table)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  notification_type_id TEXT NOT NULL REFERENCES public.notification_types(id),
  email BOOLEAN DEFAULT TRUE,
  sms BOOLEAN DEFAULT FALSE,
  in_app BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_student_id ON public.notification_preferences(student_id);

-- RLS on new tables
ALTER TABLE public.notification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notification types: everyone can read enabled ones
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'students_view_notification_types') THEN
    CREATE POLICY "students_view_notification_types" ON public.notification_types
      FOR SELECT USING (is_enabled = TRUE);
  END IF;
END $$;

-- Notification preferences: students manage their own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'students_manage_preferences') THEN
    CREATE POLICY "students_manage_preferences" ON public.notification_preferences
      FOR ALL USING (student_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_insert_preferences') THEN
    CREATE POLICY "service_role_insert_preferences" ON public.notification_preferences
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
