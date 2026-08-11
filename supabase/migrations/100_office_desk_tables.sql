-- Migration 100: Create desk schemas + office_desk tables (Row 51/53)
-- Creates all three desk schemas if they don't exist
-- Tables: invoices, payments, registrations in office_desk
-- RLS: DEFERRED (row 55, separate migration)
-- FK: registrations.lead_reference_id → front_desk.leads (row 80)

BEGIN;

-- Create desk schemas (Row 51)
CREATE SCHEMA IF NOT EXISTS front_desk;
CREATE SCHEMA IF NOT EXISTS school_desk;
CREATE SCHEMA IF NOT EXISTS office_desk;

-- Grant USAGE so authenticated/anon can access via PostgREST
GRANT USAGE ON SCHEMA front_desk, school_desk, office_desk TO authenticated, anon;

-- Move leads to front_desk (Row 52) — must happen before registrations FK
ALTER TABLE public.leads SET SCHEMA front_desk;

-- ═══════════════════════════════════════════════════════════
-- REGISTRATIONS — core registration record (Office Desk owns)
-- Status flow: pending_init → pending_review → approved → active
-- Terminal states: withdrawn, rejected
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.registrations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id),
  lead_reference_id uuid REFERENCES front_desk.leads(id),
  student_name      text NOT NULL,
  student_email     text NOT NULL,
  student_phone     text,
  course_name       text,
  status            text NOT NULL DEFAULT 'pending_init'
    CHECK (status IN (
      'pending_init',
      'pending_review',
      'approved',
      'active',
      'withdrawn',
      'rejected'
    )),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_registrations_tenant ON office_desk.registrations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON office_desk.registrations (status);
CREATE INDEX IF NOT EXISTS idx_registrations_lead_ref ON office_desk.registrations (lead_reference_id);

-- ═══════════════════════════════════════════════════════════
-- INVOICES — manual/ad-hoc invoice creation (row 78)
-- Linked to registration; payment confirmation triggers status flip
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id),
  registration_id   uuid NOT NULL REFERENCES office_desk.registrations(id),
  invoice_number    text,
  amount            numeric(12,2) NOT NULL,
  currency          text NOT NULL DEFAULT 'ZAR',
  description       text,
  status            text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'sent',
      'paid',
      'void'
    )),
  issued_at         timestamptz,
  due_at            timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON office_desk.invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_registration ON office_desk.invoices (registration_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON office_desk.invoices (status);

-- ═══════════════════════════════════════════════════════════
-- PAYMENTS — payment confirmation records (row 79)
-- Pattern A: payment arrives with form → single write
-- Pattern B: payment arrives later → EF lookup-and-attach
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id),
  invoice_id        uuid NOT NULL REFERENCES office_desk.invoices(id),
  amount            numeric(12,2) NOT NULL,
  currency          text NOT NULL DEFAULT 'ZAR',
  payment_method    text,
  reference         text,
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'confirmed',
      'failed',
      'refunded'
    )),
  paid_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON office_desk.payments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON office_desk.payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON office_desk.payments (status);

COMMIT;
