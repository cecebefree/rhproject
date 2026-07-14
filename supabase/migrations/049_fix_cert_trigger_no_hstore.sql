-- 049_fix_cert_trigger_no_hstore.sql
-- Replaces guard_certificate_immutability() to use explicit
-- column comparisons instead of hstore. Removes WHEN clause so
-- all statuses are protected (issued, superseded, revoked).
--
-- PREDECESSOR: 048_fix_tenant_id_jwt_path.sql

DROP TRIGGER IF EXISTS trg_certificate_immutability ON public.certificates;

CREATE OR REPLACE FUNCTION public.guard_certificate_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Permitted: issued -> superseded | revoked, all other columns identical
  IF OLD.status = 'issued'
     AND NEW.status IN ('superseded', 'revoked')
     AND OLD.user_id = NEW.user_id
     AND OLD.cert_class = NEW.cert_class
     AND OLD.title = NEW.title
     AND OLD.description IS NOT DISTINCT FROM NEW.description
     AND OLD.source_ref IS NOT DISTINCT FROM NEW.source_ref
     AND OLD.issued_at = NEW.issued_at
     AND OLD.signatory = NEW.signatory
     AND OLD.file_url IS NOT DISTINCT FROM NEW.file_url
     AND OLD.tenant_id = NEW.tenant_id
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'certificates are immutable once issued (cert %)', OLD.id;
END $$;

CREATE TRIGGER trg_certificate_immutability
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_certificate_immutability();
