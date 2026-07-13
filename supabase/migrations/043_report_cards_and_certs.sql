-- 043_report_cards_and_certs.sql (ITEM 11)
-- Report Cards + Certificates: status lifecycle per R18 frozen surface
-- and immutable certificate issuance per ITEM-002.
--
-- PREDECESSOR: 042_consent_suppression.sql
--
-- STATUS MODEL (matches frozen R18 screens exactly):
--   report_cards.status: draft -> released -> visible
--   draft   = teacher writes, learner cannot see
--   released = office confirmed, learner cannot see yet
--   visible  = published, learner can see
--
-- CERTIFICATE IMMUTABILITY:
--   certificates.status: issued | superseded | revoked
--   Once issued, a certificate row is NEVER UPDATED (no UPDATE path).
--   Corrections: insert new row with status='issued', supersede_old_id
--   pointing at the old row, then UPDATE old row status='superseded'.
--   Edge Functions enforce this; the schema allows UPDATE via admin bypass
--   but the business rule is: EFs never issue UPDATE on issued certs.
--
-- TENANT SCOPING: Both tables carry tenant_id as plain uuid (no FK,
-- consistent with D12/041 pattern). Both link to profiles for role/tenant
-- derivation.
--
-- RLS: ENABLED at creation (deny-by-default). Admin_all bypass only.
-- Granular policies deferred to item 12.

BEGIN;

-- ═══════════════════════════════════════════════
-- 1. REPORT CARDS
-- Status lifecycle: draft (teacher) -> released (office) -> visible (learner)
-- Frozen screen fields: id, term, subject, grade, status
-- plus RLS/governance: student_id, tenant_id, created_by, released_by
-- ═══════════════════════════════════════════════
CREATE TABLE public.report_cards (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    term            text NOT NULL,
    subject         text NOT NULL,
    grade           text,
    status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'released', 'visible')),
    created_by      uuid NOT NULL REFERENCES public.profiles(id),
    released_by     uuid REFERENCES public.profiles(id),
    released_at     timestamptz,
    visible_at      timestamptz,
    tenant_id       uuid NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_student_term_subject UNIQUE (student_id, term, subject)
);

COMMENT ON TABLE  public.report_cards IS 'Per-student, per-term, per-subject report cards — status lifecycle draft->released->visible';
COMMENT ON COLUMN public.report_cards.grade IS 'Nullable — draft cards may not have a grade yet';
COMMENT ON COLUMN public.report_cards.status IS 'Lifecycle: draft (teacher) -> released (office) -> visible (learner)';
COMMENT ON COLUMN public.report_cards.created_by IS 'Teacher who drafted the card';
COMMENT ON COLUMN public.report_cards.released_by IS 'Office who released the card (null until released)';
COMMENT ON COLUMN public.report_cards.tenant_id IS 'Tenant scope — plain uuid, no FK';

CREATE INDEX idx_report_cards_student  ON public.report_cards (student_id);
CREATE INDEX idx_report_cards_tenant   ON public.report_cards (tenant_id);
CREATE INDEX idx_report_cards_status   ON public.report_cards (status);

-- ═══════════════════════════════════════════════
-- 2. CERTIFICATES (per ITEM-002)
-- IMMUTABLE once issued — no UPDATE path.
-- Reissue + supersede: new row with supersede_old_id.
-- ═══════════════════════════════════════════════
CREATE TABLE public.certificates (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cert_class      text NOT NULL CHECK (cert_class IN (
                        'club_attendance',
                        'enrichment',
                        'core_subject',
                        'year_completion',
                        'graduation'
                    )),
    title           text NOT NULL,
    description     text,
    source_ref      uuid,  -- FK to source table (report_cards.id, enrichment.id, etc.)
    issued_at       timestamptz NOT NULL DEFAULT now(),
    signatory       text NOT NULL,
    file_url        text,
    status          text NOT NULL DEFAULT 'issued'
                    CHECK (status IN ('issued', 'superseded', 'revoked')),
    supersede_old_id uuid REFERENCES public.certificates(id),
    tenant_id       uuid NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_certificate_issuance UNIQUE (user_id, cert_class, source_ref)
);

COMMENT ON TABLE  public.certificates IS 'Issued certificates — immutable once issued, reissue via supersede pattern';
COMMENT ON COLUMN public.certificates.cert_class IS 'Five-tier recognition ladder: club_attendance (modest) -> graduation (flagship)';
COMMENT ON COLUMN public.certificates.source_ref IS 'Optional FK to originating record (report_card, enrichment enrolment, etc.)';
COMMENT ON COLUMN public.certificates.signatory IS 'Name/title of the signatory authority (Head, Club Lead, Teacher)';
COMMENT ON COLUMN public.certificates.file_url IS 'Signed Storage URL at V1; external URL at V0';
COMMENT ON COLUMN public.certificates.status IS 'issued (current) | superseded (replaced by newer row) | revoked (invalidated)';
COMMENT ON COLUMN public.certificates.supersede_old_id IS 'Self-referential FK: points to the previous version when reissued';
COMMENT ON COLUMN public.certificates.tenant_id IS 'Tenant scope — plain uuid, no FK';

CREATE INDEX idx_certificates_user   ON public.certificates (user_id);
CREATE INDEX idx_certificates_tenant ON public.certificates (tenant_id);
CREATE INDEX idx_certificates_status ON public.certificates (status);

-- ═══════════════════════════════════════════════
-- 3. RLS: ENABLE at creation (deny-by-default)
--    Admin_all bypass only. Granular policies at item 12.
-- ═══════════════════════════════════════════════

-- Report cards
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY rc_admin_all ON public.report_cards
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

-- Certificates
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY cert_admin_all ON public.certificates
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
-- ═══════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;

-- ═══════════════════════════════════════════════
-- 5. UPDATED_AT TRIGGERS
-- ═══════════════════════════════════════════════
CREATE TRIGGER trg_report_cards_updated_at
    BEFORE UPDATE ON public.report_cards
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_certificates_updated_at
    BEFORE UPDATE ON public.certificates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
