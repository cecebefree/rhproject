-- Migration 181: Office Desk Corrected Schema — Tables
-- Normalized: family_accounts -> users -> students
-- Invoice-first payment ledger, family billing anchor
-- Supabase-only (no HubSpot), admin panels for all desks

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- CLEANUP: Drop old denormalized tables from migration 100/179
-- These conflict with the corrected schema (different columns/FKs)
-- ══════════════════════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS trg_invoices_updated_at ON office_desk.invoices;
DROP TRIGGER IF EXISTS trg_payments_updated_at ON office_desk.payments;
DROP TABLE IF EXISTS office_desk.invoices CASCADE;
DROP TABLE IF EXISTS office_desk.payments CASCADE;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. FAMILY_ACCOUNTS — billing anchor (one login, multiple students)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.family_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenant_lms(id),
  family_code       TEXT UNIQUE NOT NULL,
  registration_reference TEXT,
  status            TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'closed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. USERS — family members (adults + students) + teachers/admins (phase 2)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenant_lms(id),
  family_account_id UUID NOT NULL REFERENCES office_desk.family_accounts(id) ON DELETE CASCADE,
  auth_user_id      UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  user_type         TEXT NOT NULL DEFAULT 'adult'
    CHECK (user_type IN ('adult', 'student', 'teacher', 'admin')),
  role              TEXT
    CHECK (role IS NULL OR role IN ('father', 'mother', 'guardian', 'grandparent', 'family_member', 'sponsor', 'other')),
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  id_number         TEXT,
  date_of_birth     DATE,
  status            TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. STUDENTS — academic profiles linked to family + user
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.students (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenant_lms(id),
  family_account_id UUID NOT NULL REFERENCES office_desk.family_accounts(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES office_desk.users(id) ON DELETE CASCADE,
  grade             TEXT,
  pack_choice       TEXT
    CHECK (pack_choice IN ('junior_standard', 'senior_standard', 'enrichment')),
  year_selection    TEXT
    CHECK (year_selection IN ('annual', 'termly')),
  enrollment_date   DATE,
  status            TEXT NOT NULL DEFAULT 'pending_init'
    CHECK (status IN ('pending_init', 'pending_review', 'approved', 'active', 'paused', 'inactive', 'withdrawn')),
  access_expiry     DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. PACKAGES — pricing tiers for debit orders
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.packages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenant_lms(id),
  package_name      TEXT UNIQUE NOT NULL,
  grade             TEXT,
  base_amount       NUMERIC(10,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'ZAR',
  billing_cycle     TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'termly', 'annual')),
  status            TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. INVOICES — admin/service charges (invoice-first payment ledger)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenant_lms(id),
  family_account_id UUID NOT NULL REFERENCES office_desk.family_accounts(id) ON DELETE CASCADE,
  invoice_number    TEXT UNIQUE NOT NULL,
  invoice_type      TEXT NOT NULL DEFAULT 'enrollment'
    CHECK (invoice_type IN ('enrollment', 'service_provider', 'ad_hoc', 'debit_adjustment')),
  description       TEXT,
  amount            NUMERIC(10,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'ZAR',
  service_provider_invoice_url TEXT,
  status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'issued', 'paid', 'overdue', 'disputed', 'void')),
  issued_date       DATE,
  due_date          DATE,
  paid_date         DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. DEBIT_ORDERS — recurring payment execution against invoices
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.debit_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenant_lms(id),
  family_account_id UUID NOT NULL REFERENCES office_desk.family_accounts(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES office_desk.students(id) ON DELETE CASCADE,
  package_id        UUID REFERENCES office_desk.packages(id) ON DELETE SET NULL,
  invoice_id        UUID REFERENCES office_desk.invoices(id) ON DELETE SET NULL,
  amount            NUMERIC(10,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'ZAR',
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'paused', 'processed', 'failed', 'refunded', 'cancelled')),
  debit_date        DATE,
  next_debit_date   DATE,
  failure_count     INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. PAYMENTS — standalone payment records (tied to family, not invoice)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenant_lms(id),
  family_account_id UUID NOT NULL REFERENCES office_desk.family_accounts(id) ON DELETE CASCADE,
  payment_type      TEXT NOT NULL DEFAULT 'registration'
    CHECK (payment_type IN ('registration', 'debit_order', 'ad_hoc', 'service_provider')),
  amount            NUMERIC(10,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'ZAR',
  reference_code    TEXT,
  bank_confirmation TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
  payment_date      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. ADD_ON_PAYMENTS — extra services (tech, enrichment, service providers)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.add_on_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenant_lms(id),
  family_account_id UUID NOT NULL REFERENCES office_desk.family_accounts(id) ON DELETE CASCADE,
  student_id        UUID REFERENCES office_desk.students(id) ON DELETE SET NULL,
  invoice_id        UUID REFERENCES office_desk.invoices(id) ON DELETE SET NULL,
  add_on_type       TEXT NOT NULL,
  description       TEXT,
  amount            NUMERIC(10,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'ZAR',
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'invoiced', 'paid', 'archived')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. FAMILY_ACTIVITY — immutable audit trail
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.family_activity (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenant_lms(id),
  family_account_id UUID NOT NULL REFERENCES office_desk.family_accounts(id) ON DELETE CASCADE,
  student_id        UUID REFERENCES office_desk.students(id) ON DELETE SET NULL,
  invoice_id        UUID REFERENCES office_desk.invoices(id) ON DELETE SET NULL,
  debit_order_id    UUID REFERENCES office_desk.debit_orders(id) ON DELETE SET NULL,
  action            TEXT NOT NULL,
  amount            NUMERIC(10,2),
  details           JSONB DEFAULT '{}'::jsonb,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 10. VALIDATION — family_account must have >=1 adult + >=1 student
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION office_desk.validate_family_account()
RETURNS TRIGGER AS $$
DECLARE
  adult_count INT;
  student_count INT;
BEGIN
  SELECT count(*) INTO adult_count
  FROM office_desk.users
  WHERE family_account_id = NEW.family_account_id
    AND user_type = 'adult'
    AND status = 'active';

  SELECT count(*) INTO student_count
  FROM office_desk.students
  WHERE family_account_id = NEW.family_account_id
    AND status != 'inactive';

  IF adult_count < 1 THEN
    RAISE EXCEPTION 'Family account must have at least one active adult user';
  END IF;

  IF student_count < 1 THEN
    RAISE EXCEPTION 'Family account must have at least one non-inactive student';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_family_account ON office_desk.users;
CREATE CONSTRAINT TRIGGER trg_validate_family_account
  AFTER INSERT OR UPDATE ON office_desk.users
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.validate_family_account();

DROP TRIGGER IF EXISTS trg_validate_family_students ON office_desk.students;
CREATE CONSTRAINT TRIGGER trg_validate_family_students
  AFTER INSERT OR UPDATE ON office_desk.students
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.validate_family_account();

-- ══════════════════════════════════════════════════════════════════════════════
-- 11. UPDATED_AT TRIGGER — auto-set updated_at on all mutable tables
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION office_desk.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_family_accounts_updated_at ON office_desk.family_accounts;
CREATE TRIGGER trg_family_accounts_updated_at
  BEFORE UPDATE ON office_desk.family_accounts
  FOR EACH ROW EXECUTE FUNCTION office_desk.set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON office_desk.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON office_desk.users
  FOR EACH ROW EXECUTE FUNCTION office_desk.set_updated_at();

DROP TRIGGER IF EXISTS trg_students_updated_at ON office_desk.students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON office_desk.students
  FOR EACH ROW EXECUTE FUNCTION office_desk.set_updated_at();

DROP TRIGGER IF EXISTS trg_packages_updated_at ON office_desk.packages;
CREATE TRIGGER trg_packages_updated_at
  BEFORE UPDATE ON office_desk.packages
  FOR EACH ROW EXECUTE FUNCTION office_desk.set_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON office_desk.invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON office_desk.invoices
  FOR EACH ROW EXECUTE FUNCTION office_desk.set_updated_at();

DROP TRIGGER IF EXISTS trg_debit_orders_updated_at ON office_desk.debit_orders;
CREATE TRIGGER trg_debit_orders_updated_at
  BEFORE UPDATE ON office_desk.debit_orders
  FOR EACH ROW EXECUTE FUNCTION office_desk.set_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON office_desk.payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON office_desk.payments
  FOR EACH ROW EXECUTE FUNCTION office_desk.set_updated_at();

DROP TRIGGER IF EXISTS trg_add_on_payments_updated_at ON office_desk.add_on_payments;
CREATE TRIGGER trg_add_on_payments_updated_at
  BEFORE UPDATE ON office_desk.add_on_payments
  FOR EACH ROW EXECUTE FUNCTION office_desk.set_updated_at();

COMMIT;
