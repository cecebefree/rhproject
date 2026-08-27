-- ROLLBACK: Migration 195 — office_desk.students enrichment
-- Reverts: curriculum, zone, nation, city, intake_group, current_stage columns

BEGIN;

ALTER TABLE office_desk.students DROP COLUMN IF EXISTS curriculum;
ALTER TABLE office_desk.students DROP COLUMN IF EXISTS zone;
ALTER TABLE office_desk.students DROP COLUMN IF EXISTS nation;
ALTER TABLE office_desk.students DROP COLUMN IF EXISTS city;
ALTER TABLE office_desk.students DROP COLUMN IF EXISTS intake_group;
ALTER TABLE office_desk.students DROP COLUMN IF EXISTS current_stage;

COMMIT;
