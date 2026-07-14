-- 047_consent_guard_and_fixes.sql
-- Fixes:
--   1. 045 seed inserted into nonexistent 'tenants' -> redirect to tenant_mobile.
--   2. consent_self_withdraw policy: user may flip withdrawn_at on own rows.
--   3. Consent guard trigger: only withdrawn_at NULL->NOT NULL transition
--      permitted. All other columns frozen (immutable history).
--   4. admin_all bypass cannot rewrite consent history.
--
-- PREDECESSOR: 046_cert_immutability_guard.sql
--
-- OPTION A chosen (self-withdraw policy + trigger guard):
--   Simpler than EF-mediated (no service role req, no Edge Function).
--   Trigger ensures even admin_all cannot rewrite consent_given or timestamps.
--   User can withdraw consent inline; admin can only see, not tamper.

BEGIN;

-- ═════════════════════════════════════════════════════════
-- 1. SEED TENANT FIX (045 targeted 'tenants' which doesn't exist)
--    Insert into tenant_mobile instead.
-- ═════════════════════════════════════════════════════════
INSERT INTO public.tenant_mobile (id, name, slug, is_active, created_at)
VALUES ('e97e5c3a-1234-4321-abcd-000000000001', 'Redhouse Prep', 'demo', true, now())
ON CONFLICT (id) DO NOTHING;

-- ═════════════════════════════════════════════════════════
-- 2. CONSENT SELF-WITHDRAW POLICY
--    User may UPDATE withdrawn_at on their own consent rows
--    (NULL -> timestamp). Trigger ensures only withdrawn_at changes.
-- ═════════════════════════════════════════════════════════
DROP POLICY IF EXISTS consent_self_withdraw ON public.consent_records;
CREATE POLICY consent_self_withdraw ON public.consent_records
    FOR UPDATE TO authenticated
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());

-- ═════════════════════════════════════════════════════════
-- 3. CONSENT RECORD GUARD TRIGGER
--    ONLY permitted UPDATE: withdrawn_at NULL -> NOT NULL.
--    All other columns must remain unchanged.
--    Fires even on admin_all bypass -> admin cannot rewrite history.
-- ═════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.guard_consent_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- permitted: only withdrawn_at transitions NULL -> NOT NULL
  IF OLD.withdrawn_at IS NULL
     AND NEW.withdrawn_at IS NOT NULL
     AND OLD.profile_id = NEW.profile_id
     AND OLD.consent_type = NEW.consent_type
     AND OLD.consent_given = NEW.consent_given
     AND OLD.given_at = NEW.given_at
     AND OLD.ip_address IS NOT DISTINCT FROM NEW.ip_address
     AND OLD.tenant_id = NEW.tenant_id
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'consent_records are immutable -- only withdrawn_at NULL->timestamp permitted (consent %)', OLD.id;
END;
$$;

CREATE TRIGGER trg_consent_immutability
  BEFORE UPDATE ON public.consent_records
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_consent_immutability();

COMMIT;
