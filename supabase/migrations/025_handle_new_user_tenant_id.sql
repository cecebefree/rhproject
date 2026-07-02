-- Migration 025: handle_new_user() sets tenant_id on signup
-- Fixes D15: new signups no longer get NULL tenant_id.
-- Sets Redhouse as default tenant for all new users.
-- App layer can override tenant_id later if needed.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    'student',
    '00000000-0000-0000-0000-000000000001'::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
