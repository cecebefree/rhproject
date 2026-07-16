-- 058: Remove auto-assignment of tenant_id on signup
-- Per Ruling R20: new users get tenant_id = NULL (pending state)
-- Edge Function assign_tenant is the ONLY writer of tenant_id

BEGIN;

-- Revert handle_new_user() to NOT set tenant_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    'student',
    NULL  -- R20: pending state, no auto-assignment
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
