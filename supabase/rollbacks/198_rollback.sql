-- ROLLBACK: Migration 198 — family_accounts bank details
-- Reverts: bank_name, bank_account_number, bank_branch, bank_sort_code columns

BEGIN;

ALTER TABLE office_desk.family_accounts DROP COLUMN IF EXISTS bank_name;
ALTER TABLE office_desk.family_accounts DROP COLUMN IF EXISTS bank_account_number;
ALTER TABLE office_desk.family_accounts DROP COLUMN IF EXISTS bank_branch;
ALTER TABLE office_desk.family_accounts DROP COLUMN IF EXISTS bank_sort_code;

COMMIT;
