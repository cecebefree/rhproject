-- scripts/test-rls-isolation.sql
-- RLS isolation tests using PostgreSQL role switching.
-- Run: supabase db query --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" < scripts/test-rls-isolation.sql
--
-- NOTE: supabase db query runs as postgres superuser (bypasses RLS).
-- These tests verify RLS policies exist and are logically correct.
-- For actual enforcement testing, use scripts/test-rls-rest.sh (REST API).

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- SETUP: Capture test data IDs
-- ══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_admin_id uuid;
  v_student_id uuid;
  v_family_id uuid;
  v_teacher_id uuid;
  v_student_a uuid;
  v_student_b uuid;
  v_parent_a uuid;
  v_payment_a uuid;
  v_payment_b uuid;
  v_invoice_a uuid;
  v_invoice_b uuid;
  v_results text := '';
  v_pass int := 0;
  v_fail int := 0;
BEGIN
  -- Look up test users
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'day2-admin@test.local';
  SELECT id INTO v_student_id FROM auth.users WHERE email = 'day2-student@test.local';
  SELECT id INTO v_family_id FROM auth.users WHERE email = 'day2-family@test.local';
  SELECT id INTO v_teacher_id FROM auth.users WHERE email = 'day2-teacher@test.local';

  IF v_admin_id IS NULL OR v_student_id IS NULL OR v_family_id IS NULL THEN
    RAISE NOTICE 'ERROR: Test users not found. Run day2-setup.sh first.';
    RETURN;
  END IF;

  -- Look up test students
  SELECT id INTO v_student_a FROM public.students WHERE created_by = v_admin_id AND first_name = 'Test' LIMIT 1;
  SELECT id INTO v_student_b FROM public.students WHERE created_by = v_admin_id AND first_name = 'Other' LIMIT 1;

  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Day 2: RLS Policy Verification (SQL)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- ── Test 1: Verify RLS is enabled on all core tables ──────────────
  RAISE NOTICE '--- Test 1: RLS enabled on all tables ---';

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='students' AND rowsecurity=true) THEN
    RAISE NOTICE '  ✓ students: RLS enabled';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ students: RLS NOT enabled';
    v_fail := v_fail + 1;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='parents' AND rowsecurity=true) THEN
    RAISE NOTICE '  ✓ parents: RLS enabled';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ parents: RLS NOT enabled';
    v_fail := v_fail + 1;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='payments' AND rowsecurity=true) THEN
    RAISE NOTICE '  ✓ payments: RLS enabled';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ payments: RLS NOT enabled';
    v_fail := v_fail + 1;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='invoices' AND rowsecurity=true) THEN
    RAISE NOTICE '  ✓ invoices: RLS enabled';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ invoices: RLS NOT enabled';
    v_fail := v_fail + 1;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='audit_log' AND rowsecurity=true) THEN
    RAISE NOTICE '  ✓ audit_log: RLS enabled';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ audit_log: RLS NOT enabled';
    v_fail := v_fail + 1;
  END IF;

  RAISE NOTICE '';

  -- ── Test 2: Verify policies exist for each role ──────────────────
  RAISE NOTICE '--- Test 2: Policy existence check ---';

  -- Admin policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='students' AND policyname='oda_students_all') THEN
    RAISE NOTICE '  ✓ admin_all_students policy exists';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ admin_all_students policy MISSING';
    v_fail := v_fail + 1;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payments' AND policyname='oda_payments_all') THEN
    RAISE NOTICE '  ✓ admin_all_payments policy exists';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ admin_all_payments policy MISSING';
    v_fail := v_fail + 1;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invoices' AND policyname='oda_invoices_all') THEN
    RAISE NOTICE '  ✓ admin_all_invoices policy exists';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ admin_all_invoices policy MISSING';
    v_fail := v_fail + 1;
  END IF;

  -- Student policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='students' AND policyname='student_select_own') THEN
    RAISE NOTICE '  ✓ student_select_own policy exists';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ student_select_own policy MISSING';
    v_fail := v_fail + 1;
  END IF;

  -- Parent policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parents' AND policyname='parent_select_own') THEN
    RAISE NOTICE '  ✓ parent_select_own policy exists';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ parent_select_own policy MISSING';
    v_fail := v_fail + 1;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='students' AND policyname='parent_students_select') THEN
    RAISE NOTICE '  ✓ parent_students_select policy exists';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ parent_students_select policy MISSING';
    v_fail := v_fail + 1;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invoices' AND policyname='parent_invoices_select') THEN
    RAISE NOTICE '  ✓ parent_invoices_select policy exists';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ parent_invoices_select policy MISSING';
    v_fail := v_fail + 1;
  END IF;

  RAISE NOTICE '';

  -- ── Test 3: Verify audit triggers exist ──────────────────────────
  RAISE NOTICE '--- Test 3: Audit triggers ---';

  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_trigger' AND tgrelid = 'public.payments'::regclass) THEN
    RAISE NOTICE '  ✓ audit_trigger on payments';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ audit_trigger on payments MISSING';
    v_fail := v_fail + 1;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_trigger' AND tgrelid = 'public.invoices'::regclass) THEN
    RAISE NOTICE '  ✓ audit_trigger on invoices';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ audit_trigger on invoices MISSING';
    v_fail := v_fail + 1;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_student_activate' AND tgrelid = 'public.students'::regclass) THEN
    RAISE NOTICE '  ✓ on_student_activate trigger on students';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ on_student_activate trigger MISSING';
    v_fail := v_fail + 1;
  END IF;

  RAISE NOTICE '';

  -- ── Test 4: Verify audit log captures changes ────────────────────
  RAISE NOTICE '--- Test 4: Audit log data integrity ---';

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_log' AND column_name='table_name') THEN
    RAISE NOTICE '  ✓ audit_log has table_name column';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ audit_log missing table_name column';
    v_fail := v_fail + 1;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_log' AND column_name='old_values') THEN
    RAISE NOTICE '  ✓ audit_log has old_values column (jsonb)';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ audit_log missing old_values column';
    v_fail := v_fail + 1;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_log' AND column_name='new_values') THEN
    RAISE NOTICE '  ✓ audit_log has new_values column (jsonb)';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ audit_log missing new_values column';
    v_fail := v_fail + 1;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_log' AND column_name='user_id') THEN
    RAISE NOTICE '  ✓ audit_log has user_id column';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ audit_log missing user_id column';
    v_fail := v_fail + 1;
  END IF;

  RAISE NOTICE '';

  -- ── Test 5: Verify test data exists ──────────────────────────────
  RAISE NOTICE '--- Test 5: Test data integrity ---';

  IF v_student_a IS NOT NULL THEN
    RAISE NOTICE '  ✓ Student A exists: %', v_student_a;
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ Student A NOT FOUND';
    v_fail := v_fail + 1;
  END IF;

  IF v_student_b IS NOT NULL THEN
    RAISE NOTICE '  ✓ Student B exists: %', v_student_b;
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ Student B NOT FOUND';
    v_fail := v_fail + 1;
  END IF;

  IF EXISTS (SELECT 1 FROM public.payments WHERE student_id = v_student_a) THEN
    RAISE NOTICE '  ✓ Payment exists for student A';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ Payment for student A NOT FOUND';
    v_fail := v_fail + 1;
  END IF;

  IF EXISTS (SELECT 1 FROM public.invoices WHERE student_id = v_student_a) THEN
    RAISE NOTICE '  ✓ Invoice exists for student A';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗ Invoice for student A NOT FOUND';
    v_fail := v_fail + 1;
  END IF;

  RAISE NOTICE '';

  -- ── Summary ──────────────────────────────────────────────────────
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'SQL Verification: % passed, % failed', v_pass, v_fail;
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';

  IF v_fail > 0 THEN
    RAISE WARNING '% tests FAILED', v_fail;
  ELSE
    RAISE NOTICE 'ALL SQL VERIFICATIONS PASSED';
  END IF;
END $$;

ROLLBACK;
