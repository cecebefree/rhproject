-- Migration 134: Create missing core tables for office_desk
-- Fixes phantom references blocking migrations 135-139:
--   1. office_desk.office_desk (desks table)
--   2. office_desk.user_desks (user-desk association)

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- OFFICE_DESK.OFFICE_DESK — desks table
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.office_desk (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  name              text NOT NULL,
  description       text,
  is_active         boolean DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_office_desk_tenant ON office_desk.office_desk (tenant_id);

-- ═══════════════════════════════════════════════════════════
-- OFFICE_DESK.USER_DESKS — user-desk association
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.user_desks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  desk_id           uuid NOT NULL REFERENCES office_desk.office_desk(id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, desk_id)
);

CREATE INDEX IF NOT EXISTS idx_user_desks_user ON office_desk.user_desks (user_id);
CREATE INDEX IF NOT EXISTS idx_user_desks_desk ON office_desk.user_desks (desk_id);
CREATE INDEX IF NOT EXISTS idx_user_desks_tenant ON office_desk.user_desks (tenant_id);

COMMIT;
