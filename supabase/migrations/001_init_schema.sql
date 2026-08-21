-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 001: Office Desk Admin Enrollment + Payment System
-- ══════════════════════════════════════════════════════════════════════════════
-- Tables: students, parents, payments, debit_orders, invoices, leads,
--         capacity_slots, audit_log
-- RLS: 4 roles (office_desk_admin, school_desk_admin, student, parent)
-- Triggers: 4 audit/compliance triggers
-- Realtime: students, payments, parents
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 0. SETUP — Safe teardown for re-runs (idempotent)
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Drop triggers only if their table exists
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'students' AND relnamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS on_student_activate ON public.students;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'payments' AND relnamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS on_payment_completed ON public.payments;
    DROP TRIGGER IF EXISTS audit_trigger ON public.payments;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'parents' AND relnamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS on_parent_update ON public.parents;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'debit_orders' AND relnamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS audit_trigger ON public.debit_orders;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'invoices' AND relnamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS audit_trigger ON public.invoices;
  END IF;

  -- Drop functions (safe — no table dependency)
  DROP FUNCTION IF EXISTS public.fn_student_activate();
  DROP FUNCTION IF EXISTS public.fn_payment_completed();
  DROP FUNCTION IF EXISTS public.fn_parent_update();
  DROP FUNCTION IF EXISTS public.fn_audit_financial();
  DROP SEQUENCE IF EXISTS public.invoice_number_seq;

  -- Drop tables in reverse dependency order
  DROP TABLE IF EXISTS public.audit_log CASCADE;
  DROP TABLE IF EXISTS public.capacity_slots CASCADE;
  DROP TABLE IF EXISTS public.enrollment_leads CASCADE;
  DROP TABLE IF EXISTS public.invoices CASCADE;
  DROP TABLE IF EXISTS public.debit_orders CASCADE;
  DROP TABLE IF EXISTS public.payments CASCADE;
  DROP TABLE IF EXISTS public.parents CASCADE;
  DROP TABLE IF EXISTS public.students CASCADE;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. DEPENDENCIES — Create supabase.organizations if it doesn't exist
-- ══════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS supabase;

CREATE TABLE IF NOT EXISTS supabase.organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE supabase.organizations IS 'Academic groups / organizations — FK target for students, leads, capacity_slots';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 2.1 STUDENTS — Core enrollment record
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.students (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name        text NOT NULL,
  last_name         text NOT NULL,
  grade             text NOT NULL,
  academic_group_id uuid NOT NULL REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  enrollment_status text NOT NULL DEFAULT 'pending'
    CHECK (enrollment_status IN ('pending', 'active', 'suspended', 'completed')),
  enrollment_date   timestamptz,
  created_by        uuid REFERENCES auth.users(id),
  updated_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.students IS 'Core student enrollment records linked to academic groups';
COMMENT ON COLUMN public.students.enrollment_status IS 'pending → active → suspended/completed';
COMMENT ON COLUMN public.students.academic_group_id IS 'FK to supabase.organizations — the academic group/school';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.2 PARENTS — Parent/guardian contact information
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.parents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  email             text NOT NULL,
  first_name        text NOT NULL,
  last_name         text NOT NULL,
  phone             text,
  primary_contact   boolean NOT NULL DEFAULT false,
  created_by        uuid REFERENCES auth.users(id),
  updated_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.parents IS 'Parent/guardian contacts linked to students';
COMMENT ON COLUMN public.parents.primary_contact IS 'True if this parent is the primary emergency contact';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.3 PAYMENTS — Payment transaction records
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.payments (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount                    numeric(12,2) NOT NULL CHECK (amount > 0),
  status                    text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_type              text NOT NULL DEFAULT 'one_time',
  stripe_payment_intent_id  text,
  created_by                uuid REFERENCES auth.users(id),
  updated_by                uuid REFERENCES auth.users(id),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payments IS 'Payment transactions — linked to Stripe payment intents';
COMMENT ON COLUMN public.payments.payment_type IS 'one_time, tuition, deposit, fee';
COMMENT ON COLUMN public.payments.stripe_payment_intent_id IS 'Stripe PaymentIntent ID (pi_...)';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.4 DEBIT ORDERS — Recurring payment instructions
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.debit_orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount            numeric(12,2) NOT NULL CHECK (amount > 0),
  frequency         text NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('monthly', 'quarterly', 'annual')),
  status            text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'cancelled')),
  next_debit_date   date,
  created_by        uuid REFERENCES auth.users(id),
  updated_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.debit_orders IS 'Recurring debit order instructions for student fees';
COMMENT ON COLUMN public.debit_orders.frequency IS 'monthly, quarterly, or annual billing cycle';
COMMENT ON COLUMN public.debit_orders.next_debit_date IS 'Next scheduled debit date';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.5 INVOICES — Generated invoices with auto-incrementing numbers
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  invoice_number    text NOT NULL,
  amount            numeric(12,2) NOT NULL CHECK (amount > 0),
  status            text NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'paid', 'overdue')),
  due_date          date NOT NULL,
  paid_date         date,
  created_by        uuid REFERENCES auth.users(id),
  updated_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invoices IS 'Student invoices with auto-incrementing INV-XXXX numbers';
COMMENT ON COLUMN public.invoices.invoice_number IS 'Auto-generated: INV-1001, INV-1002, etc.';
COMMENT ON COLUMN public.invoices.due_date IS 'Payment deadline';
COMMENT ON COLUMN public.invoices.paid_date IS 'Set when status = paid';

-- ────────────────────────────────────────────────────────────────────────────
-- 2.6 ENROLLMENT_LEADS — Pre-enrollment inquiry pipeline
--     (named enrollment_leads to avoid conflict with public.leads from migration 078)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.enrollment_leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name        text NOT NULL,
  last_name         text NOT NULL,
  email             text NOT NULL,
  phone             text,
  academic_group_id uuid NOT NULL REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.enrollment_leads IS 'Pre-enrollment leads from website/inquiries';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.7 CAPACITY SLOTS — Grade/class capacity tracking
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.capacity_slots (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade             text NOT NULL,
  academic_group_id uuid NOT NULL REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  total_slots       integer NOT NULL CHECK (total_slots > 0),
  reserved_slots    integer NOT NULL DEFAULT 0 CHECK (reserved_slots >= 0),
  used_slots        integer NOT NULL DEFAULT 0 CHECK (used_slots >= 0),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_slots_check CHECK (reserved_slots <= total_slots AND used_slots <= total_slots)
);

COMMENT ON TABLE public.capacity_slots IS 'Tracks enrollment capacity per grade per academic group';
COMMENT ON COLUMN public.capacity_slots.reserved_slots IS 'Held for pending enrollments';
COMMENT ON COLUMN public.capacity_slots.used_slots IS 'Confirmed active enrollments';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.8 AUDIT LOG — Immutable audit trail for financial tables
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  text NOT NULL,
  operation   text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values  jsonb,
  new_values  jsonb,
  user_id     uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_log IS 'Immutable audit trail — every financial DML logged here';
COMMENT ON COLUMN public.audit_log.old_values IS 'JSONB snapshot of row BEFORE change (NULL for INSERT)';
COMMENT ON COLUMN public.audit_log.new_values IS 'JSONB snapshot of row AFTER change (NULL for DELETE)';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. SEQUENCES
-- ══════════════════════════════════════════════════════════════════════════════

-- Invoice number auto-increment: INV-1001, INV-1002, ...
CREATE SEQUENCE public.invoice_number_seq
  START WITH 1001
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. INDEXES (17 total)
-- ══════════════════════════════════════════════════════════════════════════════

-- Students (3 indexes)
CREATE INDEX idx_students_academic_group_status
  ON public.students (academic_group_id, enrollment_status);
CREATE INDEX idx_students_created_at
  ON public.students (created_at DESC);
CREATE INDEX idx_students_grade
  ON public.students (grade);

-- Parents (3 indexes)
CREATE INDEX idx_parents_student_id
  ON public.parents (student_id);
CREATE UNIQUE INDEX idx_parents_email
  ON public.parents (email);
CREATE INDEX idx_parents_primary_contact
  ON public.parents (primary_contact);

-- Payments (3 indexes)
CREATE INDEX idx_payments_student_created
  ON public.payments (student_id, created_at DESC);
CREATE INDEX idx_payments_status
  ON public.payments (status);
CREATE UNIQUE INDEX idx_payments_stripe_intent
  ON public.payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Debit Orders (3 indexes)
CREATE INDEX idx_debit_orders_student_status
  ON public.debit_orders (student_id, status);
CREATE INDEX idx_debit_orders_next_date
  ON public.debit_orders (next_debit_date);
CREATE INDEX idx_debit_orders_frequency
  ON public.debit_orders (frequency);

-- Invoices (4 indexes)
CREATE INDEX idx_invoices_student_status
  ON public.invoices (student_id, status);
CREATE UNIQUE INDEX idx_invoices_number
  ON public.invoices (invoice_number);
CREATE INDEX idx_invoices_due_date
  ON public.invoices (due_date);
CREATE INDEX idx_invoices_paid_date
  ON public.invoices (paid_date)
  WHERE paid_date IS NOT NULL;

-- Leads (2 indexes)
CREATE UNIQUE INDEX idx_enrollment_leads_email
  ON public.enrollment_leads (email);
CREATE INDEX idx_enrollment_leads_academic_group
  ON public.enrollment_leads (academic_group_id);

-- Capacity Slots (2 indexes)
CREATE UNIQUE INDEX idx_capacity_grade_group
  ON public.capacity_slots (grade, academic_group_id);
CREATE INDEX idx_capacity_used_slots
  ON public.capacity_slots (used_slots DESC);

-- Audit Log (3 indexes)
CREATE INDEX idx_audit_table_created
  ON public.audit_log (table_name, created_at DESC);
CREATE INDEX idx_audit_user_id
  ON public.audit_log (user_id);
CREATE INDEX idx_audit_operation
  ON public.audit_log (operation);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. ROW-LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debit_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacity_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 1: office_desk_admin — Full CRUD on all tables
-- ────────────────────────────────────────────────────────────────────────────

-- Students: full access
CREATE POLICY oda_students_all
  ON public.students FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- Parents: full access
CREATE POLICY oda_parents_all
  ON public.parents FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- Payments: full access
CREATE POLICY oda_payments_all
  ON public.payments FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- Debit Orders: full access
CREATE POLICY oda_debit_orders_all
  ON public.debit_orders FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- Invoices: full access
CREATE POLICY oda_invoices_all
  ON public.invoices FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- Leads: SELECT only
CREATE POLICY oda_enrollment_leads_select
  ON public.enrollment_leads FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- Capacity Slots: SELECT + UPDATE
CREATE POLICY oda_capacity_select
  ON public.capacity_slots FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

CREATE POLICY oda_capacity_update
  ON public.capacity_slots FOR UPDATE TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- Audit Log: SELECT only
CREATE POLICY oda_audit_select
  ON public.audit_log FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 2: school_desk_admin — Read-only on students, payments, invoices,
--                              debit_orders; DENY on others
-- ────────────────────────────────────────────────────────────────────────────

-- Students: SELECT only
CREATE POLICY sda_students_select
  ON public.students FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

-- Payments: SELECT only
CREATE POLICY sda_payments_select
  ON public.payments FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

-- Invoices: SELECT only
CREATE POLICY sda_invoices_select
  ON public.invoices FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

-- Debit Orders: SELECT only
CREATE POLICY sda_debit_orders_select
  ON public.debit_orders FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 3: student — Own records only (WHERE id = auth.uid())
-- ────────────────────────────────────────────────────────────────────────────

-- Students: own record
CREATE POLICY student_select_own
  ON public.students FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  );

-- Payments: own student_id
CREATE POLICY student_payments_select
  ON public.payments FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  );

-- Invoices: own student_id
CREATE POLICY student_invoices_select
  ON public.invoices FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 4: parent — Children's records via student_id in parents table
-- ────────────────────────────────────────────────────────────────────────────

-- Parents: own record (SELECT + UPDATE)
CREATE POLICY parent_select_own
  ON public.parents FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  );

CREATE POLICY parent_update_own
  ON public.parents FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  )
  WITH CHECK (
    id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  );

-- Students: children via parent linkage
CREATE POLICY parent_students_select
  ON public.students FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.student_id = students.id
        AND p.id = auth.uid()
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  );

-- Payments: children's payments
CREATE POLICY parent_payments_select
  ON public.payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.student_id = payments.student_id
        AND p.id = auth.uid()
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  );

-- Invoices: children's invoices
CREATE POLICY parent_invoices_select
  ON public.invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.student_id = invoices.student_id
        AND p.id = auth.uid()
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. TRIGGER FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 5.1 on_student_activate — Log when student becomes active
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_student_activate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.enrollment_status = 'active'
     AND OLD.enrollment_status IS DISTINCT FROM 'active' THEN
    INSERT INTO public.audit_log (table_name, operation, old_values, new_values, user_id)
    VALUES (
      'students',
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_student_activate
  AFTER UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_student_activate();

-- ────────────────────────────────────────────────────────────────────────────
-- 5.2 on_payment_completed — Activate student + audit on payment completion
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_payment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed'
     AND OLD.status IS DISTINCT FROM 'completed' THEN
    -- Activate the student
    UPDATE public.students
    SET enrollment_status = 'active',
        enrollment_date = COALESCE(enrollment_date, now()),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = NEW.student_id;

    -- Audit the payment
    INSERT INTO public.audit_log (table_name, operation, old_values, new_values, user_id)
    VALUES (
      'payments',
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_payment_completed
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_payment_completed();

-- ────────────────────────────────────────────────────────────────────────────
-- 5.3 on_parent_update — Audit + Realtime publish
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_parent_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Audit the parent update
  INSERT INTO public.audit_log (table_name, operation, old_values, new_values, user_id)
  VALUES (
    'parents',
    'UPDATE',
    to_jsonb(OLD),
    to_jsonb(NEW),
    auth.uid()
  );

  -- Publish to realtime channel for live sync
  PERFORM pg_notify(
    'parent_updates',
    json_build_object(
      'operation', 'UPDATE',
      'parent_id', NEW.id,
      'student_id', NEW.student_id,
      'timestamp', now()
    )::text
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_parent_update
  AFTER UPDATE ON public.parents
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_parent_update();

-- ────────────────────────────────────────────────────────────────────────────
-- 5.4 audit_trigger — Log all DML on financial tables
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_audit_financial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
    VALUES (TG_TABLE_NAME, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, operation, old_values, new_values, user_id)
    VALUES (TG_TABLE_NAME, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, operation, old_values, user_id)
    VALUES (TG_TABLE_NAME, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_financial();

CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.debit_orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_financial();

CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_financial();

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. REALTIME PUBLICATION
-- ══════════════════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parents;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. GRANTS
-- ══════════════════════════════════════════════════════════════════════════════

GRANT ALL ON public.students TO authenticated;
GRANT ALL ON public.parents TO authenticated;
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.debit_orders TO authenticated;
GRANT ALL ON public.invoices TO authenticated;
GRANT SELECT ON public.enrollment_leads TO authenticated;
GRANT SELECT, UPDATE ON public.capacity_slots TO authenticated;
GRANT SELECT ON public.audit_log TO authenticated;

GRANT ALL ON public.students TO service_role;
GRANT ALL ON public.parents TO service_role;
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.debit_orders TO service_role;
GRANT ALL ON public.invoices TO service_role;
GRANT ALL ON public.enrollment_leads TO service_role;
GRANT ALL ON public.capacity_slots TO service_role;
GRANT ALL ON public.audit_log TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. VALIDATION NOTES
-- ══════════════════════════════════════════════════════════════════════════════
--
-- RLS POLICY SCOPING:
-- ───────────────────
-- • office_desk_admin: Full CRUD on all 8 tables (except leads=SELECT, 
--   capacity_slots=SELECT+UPDATE, audit_log=SELECT only)
-- • school_desk_admin: Read-only on students, payments, invoices, debit_orders
-- • student: SELECT own record only via WHERE id = auth.uid()
-- • parent: SELECT+UPDATE own record; SELECT children via JOIN on parents table
--
-- TRIGGER AUDIT TRAIL:
-- ────────────────────
-- • fn_audit_financial: Fires on INSERT/UPDATE/DELETE on payments, debit_orders,
--   invoices → inserts into audit_log with old_values, new_values, user_id
-- • fn_student_activate: Fires on UPDATE students when enrollment_status='active'
--   → inserts into audit_log
-- • fn_payment_completed: Fires on UPDATE payments when status='completed'
--   → activates student + inserts into audit_log
-- • fn_parent_update: Fires on UPDATE parents → inserts into audit_log +
--   pg_notify('parent_updates', ...) for realtime subscriptions
--
-- INVOICE AUTO-INCREMENT:
-- ──────────────────────
-- • Sequence: invoice_number_seq START WITH 1001 INCREMENT BY 1
-- • Application must call nextval('public.invoice_number_seq') before INSERT
-- • Format: INV-1001, INV-1002, INV-1003, etc.
-- • UNIQUE constraint on invoice_number prevents duplicates
--
-- CAPACITY SLOT TRACKING:
-- ──────────────────────
-- • total_slots: Maximum capacity for this grade in this academic group
-- • reserved_slots: Held for pending enrollments (increment on INSERT into students
--   where enrollment_status='pending')
-- • used_slots: Confirmed active enrollments (increment on activation)
-- • CHECK constraints: reserved_slots <= total_slots AND used_slots <= total_slots
-- • UNIQUE constraint on (grade, academic_group_id) prevents duplicate entries
-- • Index on used_slots DESC for fast capacity lookups
--
-- ══════════════════════════════════════════════════════════════════════════════

COMMIT;
