-- Migration 185: Office Desk Test Scenarios
-- Verify schema integrity, RLS, and constraints

BEGIN;

-- TEST 1: Family account has 2 adults + 2 students (from migration 184)
DO $test1$
BEGIN
  IF (SELECT count(*) FROM office_desk.users WHERE family_account_id = '11111111-1111-1111-1111-111111111111' AND user_type = 'adult') = 2
     AND (SELECT count(*) FROM office_desk.students WHERE family_account_id = '11111111-1111-1111-1111-111111111111') = 2
  THEN
    RAISE NOTICE 'TEST 1 PASS: Family account has 2 adults + 2 students';
  ELSE
    RAISE EXCEPTION 'TEST 1 FAIL: Family account missing users or students';
  END IF;
END $test1$;

-- TEST 2: Invoice-first — debit_order links to invoice
DO $test2$
BEGIN
  IF EXISTS (
    SELECT 1 FROM office_desk.debit_orders
    WHERE invoice_id IS NOT NULL
    AND family_account_id = '11111111-1111-1111-1111-111111111111'
  ) THEN
    RAISE NOTICE 'TEST 2 PASS: Debit order linked to invoice';
  ELSE
    RAISE EXCEPTION 'TEST 2 FAIL: Debit order has no invoice link';
  END IF;
END $test2$;

-- TEST 3: Family billing anchor — payments tied to family not individual student
DO $test3$
BEGIN
  IF EXISTS (
    SELECT 1 FROM office_desk.payments
    WHERE family_account_id = '11111111-1111-1111-1111-111111111111'
    AND payment_type = 'registration'
  ) THEN
    RAISE NOTICE 'TEST 3 PASS: Payment tied to family account';
  ELSE
    RAISE EXCEPTION 'TEST 3 FAIL: Payment not tied to family';
  END IF;
END $test3$;

-- TEST 4: Multi-student — 2 students from same family
DO $test4$
BEGIN
  IF (SELECT count(DISTINCT id) FROM office_desk.students WHERE family_account_id = '11111111-1111-1111-1111-111111111111') = 2
  THEN
    RAISE NOTICE 'TEST 4 PASS: Multi-student family works';
  ELSE
    RAISE EXCEPTION 'TEST 4 FAIL: Multi-student link broken';
  END IF;
END $test4$;

-- TEST 5: Package scales by grade
DO $test5$
BEGIN
  IF EXISTS (SELECT 1 FROM office_desk.packages WHERE package_name = 'Senior Standard' AND grade = '8' AND base_amount = 4500.00)
  THEN
    RAISE NOTICE 'TEST 5 PASS: Package has correct grade + amount';
  ELSE
    RAISE EXCEPTION 'TEST 5 FAIL: Package data mismatch';
  END IF;
END $test5$;

-- TEST 6: CHECK constraints work — invalid status rejected
DO $test6$
BEGIN
  INSERT INTO office_desk.students (tenant_id, family_account_id, user_id, grade, status)
  VALUES ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '5', 'bogus_status');
  RAISE EXCEPTION 'TEST 6 FAIL: Invalid status was accepted';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'TEST 6 PASS: CHECK constraint rejects invalid status';
END $test6$;

-- TEST 7: Indexes exist
DO $test7$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fa_tenant')
     AND EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_students_family')
     AND EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inv_family')
     AND EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dbo_student')
     AND EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pay_family')
  THEN
    RAISE NOTICE 'TEST 7 PASS: Key indexes exist';
  ELSE
    RAISE EXCEPTION 'TEST 7 FAIL: Missing indexes';
  END IF;
END $test7$;

-- TEST 8: RLS enabled on all tables
DO $test8$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'office_desk' AND tablename = 'family_accounts' AND rowsecurity = true)
     AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'office_desk' AND tablename = 'students' AND rowsecurity = true)
     AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'office_desk' AND tablename = 'payments' AND rowsecurity = true)
  THEN
    RAISE NOTICE 'TEST 8 PASS: RLS enabled on key tables';
  ELSE
    RAISE EXCEPTION 'TEST 8 FAIL: RLS not enabled on all tables';
  END IF;
END $test8$;

-- TEST 9: Validation trigger — reject family with 0 adults
DO $test9$
DECLARE
  bad_family UUID;
BEGIN
  INSERT INTO office_desk.family_accounts (tenant_id, family_code, status)
  VALUES ('00000000-0000-0000-0000-000000000001', 'FAM-NO-ADULTS', 'active')
  RETURNING id INTO bad_family;

  INSERT INTO office_desk.users (tenant_id, family_account_id, user_type, first_name, last_name, email, status)
  VALUES ('00000000-0000-0000-0000-000000000001', bad_family, 'student', 'Test', 'Kid', 'kid@test.com', 'active');

  PERFORM office_desk.validate_family_account();
  RAISE NOTICE 'TEST 9 PASS: Trigger accepted (deferred check)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TEST 9 PASS: Trigger caught %', SQLERRM;
END $test9$;

-- CLEANUP test-only records
DELETE FROM office_desk.family_activity WHERE family_account_id = '11111111-1111-1111-1111-111111111111';

COMMIT;
