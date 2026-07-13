-- 046_cert_immutability_guard.sql
-- Enforces certificate immutability at the DB level.
-- ONLY permitted UPDATE on an issued certificate:
--   status: 'issued' -> 'superseded' | 'revoked'
--   all other columns unchanged.
-- Without this guard, admin_all RLS bypass allowed arbitrary updates.
--
-- PREDECESSOR: 045_seed_data.sql

CREATE OR REPLACE FUNCTION public.guard_certificate_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'issued'
     AND NEW.status IN ('superseded', 'revoked')
     AND NEW IS NOT DISTINCT FROM (OLD #= hstore('status', NEW.status))
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'certificates are immutable once issued (cert %)', OLD.id;
END $$;

CREATE TRIGGER trg_certificate_immutability
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW WHEN (OLD.status = 'issued')
  EXECUTE FUNCTION public.guard_certificate_immutability();
