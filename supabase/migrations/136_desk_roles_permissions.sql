-- Migration 136: Desk roles and permissions

BEGIN;

CREATE TABLE IF NOT EXISTS office_desk.permissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE,
  description       text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS office_desk.desk_roles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id   uuid NOT NULL REFERENCES office_desk.registrations(id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  name              text NOT NULL,
  description       text,
  is_system         boolean DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(registration_id, name)
);

CREATE TABLE IF NOT EXISTS office_desk.role_permissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id           uuid NOT NULL REFERENCES office_desk.desk_roles(id) ON DELETE CASCADE,
  permission_id     uuid NOT NULL REFERENCES office_desk.permissions(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS office_desk.user_desk_roles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id           uuid NOT NULL REFERENCES office_desk.desk_roles(id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_desk_roles_user ON office_desk.user_desk_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_desk_roles_role ON office_desk.user_desk_roles (role_id);

-- Add RLS
ALTER TABLE office_desk.desk_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY desk_roles_admin_all
  ON office_desk.desk_roles FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

CREATE POLICY desk_roles_tenant_select
  ON office_desk.desk_roles FOR SELECT TO authenticated
  USING (tenant_id = jwt_tenant_id());

COMMIT;
