-- Migration: 20260910030000_contracts_table.sql
-- Enrollment Pipeline: contracts table for enrollment terms + payment mandate

BEGIN;

-- ============================================================
-- contracts — enrollment and teacher contracts
-- ============================================================
CREATE TABLE IF NOT EXISTS office_desk.contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  pipeline_id UUID REFERENCES office_desk.enrollment_pipelines(id),
  family_account_id UUID REFERENCES office_desk.family_accounts(id),
  contract_type TEXT NOT NULL CHECK (contract_type IN ('enrollment', 'teacher', 'renewal')),
  version INTEGER DEFAULT 1,
  template_version TEXT NOT NULL,
  pdf_storage_path TEXT,
  signed_pdf_storage_path TEXT,
  signature_method TEXT CHECK (signature_method IN ('digital', 'pdf_upload')),
  signed_by UUID,
  signed_at TIMESTAMPTZ,
  signature_data JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'expired', 'voided')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE office_desk.contracts OWNER TO postgres;

COMMENT ON TABLE office_desk.contracts IS 'Enrollment and teacher contracts with digital signature support';

-- Now add the FK from enrollment_pipelines to contracts (was deferred due to circular dependency)
ALTER TABLE office_desk.enrollment_pipelines
  DROP CONSTRAINT IF EXISTS enrollment_pipelines_contract_id_fkey,
  ADD CONSTRAINT enrollment_pipelines_contract_id_fkey
    FOREIGN KEY (contract_id) REFERENCES office_desk.contracts(id);

COMMIT;
