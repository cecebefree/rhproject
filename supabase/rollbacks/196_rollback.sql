-- ROLLBACK: Migration 196 — school_desk.courses section
-- Reverts: section column + CHECK constraint

BEGIN;

ALTER TABLE school_desk.courses DROP CONSTRAINT IF EXISTS check_section;
ALTER TABLE school_desk.courses DROP COLUMN IF EXISTS section;

COMMIT;
