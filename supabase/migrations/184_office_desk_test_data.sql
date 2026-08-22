-- Migration 184: Office Desk Test Data
-- WARNING: Test data only. Remove before production.

BEGIN;

-- Family Account
INSERT INTO office_desk.family_accounts (id, tenant_id, family_code, registration_reference, status)
VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'FAM-TEST-001', 'REG-TEST-001', 'active');

-- Adult Users (Mother + Father)
INSERT INTO office_desk.users (id, tenant_id, family_account_id, user_type, role, first_name, last_name, email, phone, status)
VALUES
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'adult', 'mother', 'Jane', 'Smith', 'jane.smith@test.com', '+27123456789', 'active'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'adult', 'father', 'John', 'Smith', 'john.smith@test.com', '+27987654321', 'active');

-- Student Users
INSERT INTO office_desk.users (id, tenant_id, family_account_id, user_type, first_name, last_name, email, date_of_birth, status)
VALUES
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'student', 'Emma', 'Smith', 'emma.smith@test.com', '2015-03-15', 'active'),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'student', 'Liam', 'Smith', 'liam.smith@test.com', '2017-07-22', 'active');

-- Package
INSERT INTO office_desk.packages (id, tenant_id, package_name, grade, base_amount, currency, billing_cycle, status)
VALUES ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000001', 'Senior Standard', '8', 4500.00, 'ZAR', 'monthly', 'active');

-- Student Profiles
INSERT INTO office_desk.students (id, tenant_id, family_account_id, user_id, grade, pack_choice, year_selection, enrollment_date, status)
VALUES
  ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '8', 'senior_standard', 'annual', '2026-01-15', 'active'),
  ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '6', 'junior_standard', 'annual', '2026-01-15', 'active');

COMMIT;
