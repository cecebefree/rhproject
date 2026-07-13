-- 042_consent_suppression.sql (ITEM 10)
-- Consent + Suppression: tenant-scoped tables for data-processing consent
-- tracking and user-level suppression marks.
--
-- PREDECESSOR: 041_announcements.sql
--
-- TENANT SCOPING: Both tables carry tenant_id as a plain uuid column
-- (no FK, consistent with D12/041 pattern). Tenant_id is derivable
-- via profiles -> profiles.tenant_id lineage for every row.
-- No table in this migration legitimately lacks a tenant FK path.
--
-- SUPPRESSION CHECK PATTERN (for Edge Functions):
--   IF EXISTS (SELECT 1 FROM public.suppression_records
--              WHERE profile_id = <target_user_id>) THEN
--     RAISE EXCEPTION 'User is suppressed';
--   END IF;
-- Row exists = suppressed. Simple boolean gate.
--
-- RLS: ENABLED at creation (deny-by-default). Admin_all bypass added
-- for operational access. Item 12 will add granular policies.
--
-- CLOSE-OUT ACCEPTANCE CRITERION (converted from item 13 gate):
--   field-register CI guard script exists, wired into ci.yml,
--   and passes against this migration. (Tracked at item 15.)
--
-- CLOSE-OUT ACCEPTANCE CRITERION (converted from item 3 gate):
--   report-card demo ruling evidence attached. (Tracked at item 11.)

BEGIN;

-- ═══════════════════════════════════════════════
-- 1. CONSENT RECORDS
-- Tracks per-user, per-purpose consent grants.
-- unique(profile_id, consent_type) enforces one record per purpose.
-- ═══════════════════════════════════════════════
CREATE TABLE public.consent_records (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    consent_type    text NOT NULL CHECK (consent_type IN (
                        'data_processing',
                        'marketing',
                        'communications',
                        'research',
                        'third_party_sharing'
                    )),
    consent_given   boolean NOT NULL,
    given_at        timestamptz NOT NULL DEFAULT now(),
    ip_address      text,
    tenant_id       uuid NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_consent_per_type UNIQUE (profile_id, consent_type)
);

COMMENT ON TABLE  public.consent_records IS 'User consent tracking per purpose — GDPR/DPIA compliance';
COMMENT ON COLUMN public.consent_records.consent_type IS 'Purpose of consent: data_processing, marketing, communications, research, third_party_sharing';
COMMENT ON COLUMN public.consent_records.consent_given IS 'true = consent granted, false = consent withheld/withdrawn';
COMMENT ON COLUMN public.consent_records.tenant_id IS 'Tenant scope — plain uuid, no FK, consistent with D12 pattern';
COMMENT ON COLUMN public.consent_records.ip_address IS 'Audit: IP address at time of consent action';

CREATE INDEX idx_consent_records_profile ON public.consent_records (profile_id);
CREATE INDEX idx_consent_records_tenant  ON public.consent_records (tenant_id);

-- ═══════════════════════════════════════════════
-- 2. SUPPRESSION RECORDS
-- Row exists = user is suppressed. Hard gate for EFs.
-- One suppression record per profile enforced by unique constraint.
-- ═══════════════════════════════════════════════
CREATE TABLE public.suppression_records (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    suppressed_by   uuid NOT NULL REFERENCES public.profiles(id),
    reason          text,
    suppression_type text NOT NULL DEFAULT 'full'
                        CHECK (suppression_type IN ('full', 'communications_only', 'data_processing_only')),
    suppressed_at   timestamptz NOT NULL DEFAULT now(),
    tenant_id       uuid NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_suppression_one_per_user UNIQUE (profile_id)
);

COMMENT ON TABLE  public.suppression_records IS 'User suppression marks — row exists = suppressed, hard gate for Edge Functions';
COMMENT ON COLUMN public.suppression_records.suppressed_by IS 'Admin/office who applied the suppression';
COMMENT ON COLUMN public.suppression_records.reason IS 'Optional reason for audit trail';
COMMENT ON COLUMN public.suppression_records.suppression_type IS 'Scope: full = all processing blocked; communications_only/data_processing_only = scoped';
COMMENT ON COLUMN public.suppression_records.tenant_id IS 'Tenant scope — plain uuid, no FK';

CREATE INDEX idx_suppression_records_profile ON public.suppression_records (profile_id);
CREATE INDEX idx_suppression_records_tenant  ON public.suppression_records (tenant_id);

-- ═══════════════════════════════════════════════
-- 3. RLS: ENABLE at creation (deny-by-default)
--    Admin_all bypass for operational access.
--    Granular policies deferred to item 12.
-- ═══════════════════════════════════════════════

-- Consent records
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY consent_admin_all ON public.consent_records
    FOR ALL TO authenticated
    USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Suppression records
ALTER TABLE public.suppression_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppression_admin_all ON public.suppression_records
    FOR ALL TO authenticated
    USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- ═══════════════════════════════════════════════
-- 4. GRANTS
--    RLS gates actual access; grants enable delivery path.
-- ═══════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppression_records TO authenticated;

-- ═══════════════════════════════════════════════
-- 5. UPDATED_AT TRIGGERS
-- ═══════════════════════════════════════════════
CREATE TRIGGER trg_consent_records_updated_at
    BEFORE UPDATE ON public.consent_records
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_suppression_records_updated_at
    BEFORE UPDATE ON public.suppression_records
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
