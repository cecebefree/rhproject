-- Migration 20260904020000: Enable RLS on notification_types
-- Security advisory: table was exposed to anon/authenticated without RLS

BEGIN;

-- Enable RLS
ALTER TABLE public.notification_types ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read notification types (reference data)
CREATE POLICY notification_types_select ON public.notification_types
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can modify notification types
CREATE POLICY notification_types_admin_all ON public.notification_types
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

COMMIT;
