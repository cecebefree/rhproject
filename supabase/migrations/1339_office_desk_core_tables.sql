-- Migration 1339: Create missing core tables for office_desk
-- Fixes phantom references blocking migrations 134-137:
--   1. office_desk.office_desk (desks table, referenced by 134, 135)
--   2. office_desk.user_desks (user-desk association, referenced by 134 RLS)
-- NOTE: auth.tenants references in 134-139 are fixed separately
--   (changed to public.tenant_lms in those migration files)

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- OFFICE_DESK.OFFICE_DESK — desks table
-- Represents organizational desks/offices within a tenant.
-- Referenced by: contact_notes (134), desk_roles (135),
--   user_desk_roles (135), desk_invites (135),
--   permission_audit_log (135)
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
-- Maps users to desks they have access to.
-- Referenced by: RLS policies in migration 134
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
