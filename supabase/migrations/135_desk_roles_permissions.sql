-- Migration 135: Desk Roles & Permissions (RBAC)
-- Row 9: Role-based access control, team management, invite workflow

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- DESK ROLES — predefined roles per desk
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.desk_roles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desk_id           uuid NOT NULL REFERENCES office_desk.office_desk(id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
  name              text NOT NULL,
  description       text,
  is_system         boolean DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(desk_id, name)
);

CREATE INDEX IF NOT EXISTS idx_desk_roles_desk_id ON office_desk.desk_roles(desk_id);
CREATE INDEX IF NOT EXISTS idx_desk_roles_tenant_id ON office_desk.desk_roles(tenant_id);

-- ═══════════════════════════════════════════════════════════
-- PERMISSIONS — available permissions in the system
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.permissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE,
  name              text NOT NULL,
  description       text,
  category          text NOT NULL DEFAULT 'general',
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- ROLE PERMISSIONS — many-to-many: role ↔ permission
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.role_permissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id           uuid NOT NULL REFERENCES office_desk.desk_roles(id) ON DELETE CASCADE,
  permission_id     uuid NOT NULL REFERENCES office_desk.permissions(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON office_desk.role_permissions(role_id);

-- ═══════════════════════════════════════════════════════════
-- USER DESK ROLES — assigns a role to a user on a desk
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.user_desk_roles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  desk_id           uuid NOT NULL REFERENCES office_desk.office_desk(id) ON DELETE CASCADE,
  role_id           uuid NOT NULL REFERENCES office_desk.desk_roles(id) ON DELETE CASCADE,
  assigned_by       uuid REFERENCES auth.users(id),
  assigned_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, desk_id)
);

CREATE INDEX IF NOT EXISTS idx_user_desk_roles_user_id ON office_desk.user_desk_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_desk_roles_desk_id ON office_desk.user_desk_roles(desk_id);
CREATE INDEX IF NOT EXISTS idx_user_desk_roles_role_id ON office_desk.user_desk_roles(role_id);

-- ═══════════════════════════════════════════════════════════
-- DESK INVITES — pending invitations to join a desk
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.desk_invites (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desk_id           uuid NOT NULL REFERENCES office_desk.office_desk(id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
  role_id           uuid NOT NULL REFERENCES office_desk.desk_roles(id) ON DELETE CASCADE,
  email             text NOT NULL,
  invited_by        uuid NOT NULL REFERENCES auth.users(id),
  token             text NOT NULL UNIQUE,
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at        timestamptz NOT NULL,
  accepted_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_desk_invites_desk_id ON office_desk.desk_invites(desk_id);
CREATE INDEX IF NOT EXISTS idx_desk_invites_email ON office_desk.desk_invites(email);
CREATE INDEX IF NOT EXISTS idx_desk_invites_token ON office_desk.desk_invites(token);
CREATE INDEX IF NOT EXISTS idx_desk_invites_status ON office_desk.desk_invites(status);

-- ═══════════════════════════════════════════════════════════
-- PERMISSION AUDIT LOG — track permission changes
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.permission_audit_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desk_id           uuid NOT NULL REFERENCES office_desk.office_desk(id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
  actor_id          uuid NOT NULL REFERENCES auth.users(id),
  action            text NOT NULL,
  target_user_id    uuid REFERENCES auth.users(id),
  target_role_id    uuid REFERENCES office_desk.desk_roles(id),
  details           jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_log_desk_id ON office_desk.permission_audit_log(desk_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_created_at ON office_desk.permission_audit_log(created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- SEED PERMISSIONS
-- ═══════════════════════════════════════════════════════════

-- Contacts
INSERT INTO office_desk.permissions (code, name, description, category) VALUES
  ('contacts.view', 'View Contacts', 'View contact details', 'contacts'),
  ('contacts.create', 'Create Contacts', 'Create new contacts', 'contacts'),
  ('contacts.edit', 'Edit Contacts', 'Edit contact information', 'contacts'),
  ('contacts.delete', 'Delete Contacts', 'Delete contacts', 'contacts'),
  ('contacts.view_notes', 'View Notes', 'View contact notes', 'contacts'),
  ('contacts.create_notes', 'Create Notes', 'Create contact notes', 'contacts'),
  ('contacts.edit_notes', 'Edit Notes', 'Edit contact notes', 'contacts'),
  ('contacts.delete_notes', 'Delete Notes', 'Delete contact notes', 'contacts')
ON CONFLICT (code) DO NOTHING;

-- Leads
INSERT INTO office_desk.permissions (code, name, description, category) VALUES
  ('leads.view', 'View Leads', 'View lead details', 'leads'),
  ('leads.create', 'Create Leads', 'Create new leads', 'leads'),
  ('leads.edit', 'Edit Leads', 'Edit lead information', 'leads'),
  ('leads.delete', 'Delete Leads', 'Delete leads', 'leads'),
  ('leads.archive', 'Archive Leads', 'Archive leads', 'leads'),
  ('leads.unarchive', 'Unarchive Leads', 'Unarchive leads', 'leads')
ON CONFLICT (code) DO NOTHING;

-- Invoices
INSERT INTO office_desk.permissions (code, name, description, category) VALUES
  ('invoices.view', 'View Invoices', 'View invoice details', 'invoices'),
  ('invoices.create', 'Create Invoices', 'Create new invoices', 'invoices'),
  ('invoices.edit', 'Edit Invoices', 'Edit invoice information', 'invoices'),
  ('invoices.delete', 'Delete Invoices', 'Delete invoices', 'invoices'),
  ('invoices.send', 'Send Invoices', 'Send invoices to clients', 'invoices'),
  ('invoices.view_payments', 'View Payments', 'View payment records', 'invoices')
ON CONFLICT (code) DO NOTHING;

-- Team
INSERT INTO office_desk.permissions (code, name, description, category) VALUES
  ('team.view', 'View Team', 'View team members', 'team'),
  ('team.invite', 'Invite Members', 'Invite new team members', 'team'),
  ('team.remove', 'Remove Members', 'Remove team members', 'team'),
  ('team.edit_roles', 'Edit Roles', 'Change member roles', 'team')
ON CONFLICT (code) DO NOTHING;

-- Settings
INSERT INTO office_desk.permissions (code, name, description, category) VALUES
  ('settings.view', 'View Settings', 'View desk settings', 'settings'),
  ('settings.edit', 'Edit Settings', 'Edit desk settings', 'settings'),
  ('settings.billing', 'Manage Billing', 'Manage billing and subscriptions', 'settings')
ON CONFLICT (code) DO NOTHING;

-- Reports
INSERT INTO office_desk.permissions (code, name, description, category) VALUES
  ('reports.view', 'View Reports', 'View reports and analytics', 'reports'),
  ('reports.export', 'Export Reports', 'Export report data', 'reports')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- SEED DEFAULT ROLES
-- ═══════════════════════════════════════════════════════════

-- Note: Default roles are created per desk via a trigger/function
-- This function is called when a new desk is created

CREATE OR REPLACE FUNCTION office_desk.create_default_roles(p_desk_id uuid, p_tenant_id uuid)
RETURNS void AS $$
DECLARE
  v_admin_role_id uuid;
  v_manager_role_id uuid;
  v_agent_role_id uuid;
  v_viewer_role_id uuid;
BEGIN
  -- Admin role
  INSERT INTO office_desk.desk_roles (desk_id, tenant_id, name, description, is_system)
  VALUES (p_desk_id, p_tenant_id, 'admin', 'Full access to all features', true)
  RETURNING id INTO v_admin_role_id;

  -- Manager role
  INSERT INTO office_desk.desk_roles (desk_id, tenant_id, name, description, is_system)
  VALUES (p_desk_id, p_tenant_id, 'manager', 'Manage team and most features', true)
  RETURNING id INTO v_manager_role_id;

  -- Agent role
  INSERT INTO office_desk.desk_roles (desk_id, tenant_id, name, description, is_system)
  VALUES (p_desk_id, p_tenant_id, 'agent', 'Day-to-day desk operations', true)
  RETURNING id INTO v_agent_role_id;

  -- Viewer role
  INSERT INTO office_desk.desk_roles (desk_id, tenant_id, name, description, is_system)
  VALUES (p_desk_id, p_tenant_id, 'viewer', 'Read-only access', true)
  RETURNING id INTO v_viewer_role_id;

  -- Assign all permissions to admin
  INSERT INTO office_desk.role_permissions (role_id, permission_id)
  SELECT v_admin_role_id, id FROM office_desk.permissions;

  -- Manager permissions (everything except settings.billing and team.edit_roles)
  INSERT INTO office_desk.role_permissions (role_id, permission_id)
  SELECT v_manager_role_id, id FROM office_desk.permissions
  WHERE code NOT IN ('settings.billing', 'team.edit_roles');

  -- Agent permissions (contacts, leads, invoices, reports)
  INSERT INTO office_desk.role_permissions (role_id, permission_id)
  SELECT v_agent_role_id, id FROM office_desk.permissions
  WHERE category IN ('contacts', 'leads', 'invoices', 'reports')
     OR code IN ('team.view');

  -- Viewer permissions (view only)
  INSERT INTO office_desk.role_permissions (role_id, permission_id)
  SELECT v_viewer_role_id, id FROM office_desk.permissions
  WHERE code LIKE '%.view' OR code = 'team.view';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- HELPER: Get user's role on a desk
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION office_desk.get_user_desk_role(p_user_id uuid, p_desk_id uuid)
RETURNS TABLE(role_name text, role_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT dr.name, dr.id
  FROM office_desk.user_desk_roles udr
  JOIN office_desk.desk_roles dr ON dr.id = udr.role_id
  WHERE udr.user_id = p_user_id AND udr.desk_id = p_desk_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- HELPER: Check if user has permission on a desk
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION office_desk.user_has_permission(p_user_id uuid, p_desk_id uuid, p_permission_code text)
RETURNS boolean AS $$
DECLARE
  v_has_permission boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM office_desk.user_desk_roles udr
    JOIN office_desk.role_permissions rp ON rp.role_id = udr.role_id
    JOIN office_desk.permissions p ON p.id = rp.permission_id
    WHERE udr.user_id = p_user_id
      AND udr.desk_id = p_desk_id
      AND p.code = p_permission_code
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- HELPER: Get user's permissions on a desk
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION office_desk.get_user_desk_permissions(p_user_id uuid, p_desk_id uuid)
RETURNS TABLE(permission_code text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.code
  FROM office_desk.user_desk_roles udr
  JOIN office_desk.role_permissions rp ON rp.role_id = udr.role_id
  JOIN office_desk.permissions p ON p.id = rp.permission_id
  WHERE udr.user_id = p_user_id AND udr.desk_id = p_desk_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE office_desk.desk_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.user_desk_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.desk_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.permission_audit_log ENABLE ROW LEVEL SECURITY;

-- desk_roles: users can see roles on their desks
CREATE POLICY "desk_roles_select" ON office_desk.desk_roles
  FOR SELECT USING (
    desk_id IN (SELECT ud.desk_id FROM office_desk.user_desks ud WHERE ud.user_id = auth.uid())
    AND tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid)
  );

-- desk_roles: only admins/managers can create/update roles
CREATE POLICY "desk_roles_insert" ON office_desk.desk_roles
  FOR INSERT WITH CHECK (
    desk_id IN (
      SELECT udr.desk_id FROM office_desk.user_desk_roles udr
      JOIN office_desk.desk_roles dr ON dr.id = udr.role_id
      WHERE udr.user_id = auth.uid() AND dr.name IN ('admin', 'manager')
    )
    AND tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid)
  );

-- permissions: all authenticated users can read
CREATE POLICY "permissions_select" ON office_desk.permissions
  FOR SELECT USING (true);

-- role_permissions: users can see permissions for roles on their desks
CREATE POLICY "role_permissions_select" ON office_desk.role_permissions
  FOR SELECT USING (
    role_id IN (
      SELECT dr.id FROM office_desk.desk_roles dr
      WHERE dr.desk_id IN (SELECT ud.desk_id FROM office_desk.user_desks ud WHERE ud.user_id = auth.uid())
    )
  );

-- role_permissions: only admins can modify
CREATE POLICY "role_permissions_insert" ON office_desk.role_permissions
  FOR INSERT WITH CHECK (
    role_id IN (
      SELECT udr.desk_id FROM office_desk.user_desk_roles udr
      JOIN office_desk.desk_roles dr ON dr.id = udr.role_id
      WHERE udr.user_id = auth.uid() AND dr.name = 'admin'
    )
  );

CREATE POLICY "role_permissions_delete" ON office_desk.role_permissions
  FOR DELETE USING (
    role_id IN (
      SELECT udr.desk_id FROM office_desk.user_desk_roles udr
      JOIN office_desk.desk_roles dr ON dr.id = udr.role_id
      WHERE udr.user_id = auth.uid() AND dr.name = 'admin'
    )
  );

-- user_desk_roles: users can see members on their desks
CREATE POLICY "user_desk_roles_select" ON office_desk.user_desk_roles
  FOR SELECT USING (
    desk_id IN (SELECT ud.desk_id FROM office_desk.user_desks ud WHERE ud.user_id = auth.uid())
  );

-- user_desk_roles: admins/managers can assign roles
CREATE POLICY "user_desk_roles_insert" ON office_desk.user_desk_roles
  FOR INSERT WITH CHECK (
    desk_id IN (
      SELECT udr.desk_id FROM office_desk.user_desk_roles udr
      JOIN office_desk.desk_roles dr ON dr.id = udr.role_id
      WHERE udr.user_id = auth.uid() AND dr.name IN ('admin', 'manager')
    )
  );

-- user_desk_roles: admins can update roles
CREATE POLICY "user_desk_roles_update" ON office_desk.user_desk_roles
  FOR UPDATE USING (
    desk_id IN (
      SELECT udr.desk_id FROM office_desk.user_desk_roles udr
      JOIN office_desk.desk_roles dr ON dr.id = udr.role_id
      WHERE udr.user_id = auth.uid() AND dr.name = 'admin'
    )
  );

-- user_desk_roles: admins can remove members
CREATE POLICY "user_desk_roles_delete" ON office_desk.user_desk_roles
  FOR DELETE USING (
    desk_id IN (
      SELECT udr.desk_id FROM office_desk.user_desk_roles udr
      JOIN office_desk.desk_roles dr ON dr.id = udr.role_id
      WHERE udr.user_id = auth.uid() AND dr.name = 'admin'
    )
  );

-- desk_invites: users can see invites on their desks
CREATE POLICY "desk_invites_select" ON office_desk.desk_invites
  FOR SELECT USING (
    desk_id IN (SELECT ud.desk_id FROM office_desk.user_desks ud WHERE ud.user_id = auth.uid())
    AND tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid)
  );

-- desk_invites: users with invite permission can create invites
CREATE POLICY "desk_invites_insert" ON office_desk.desk_invites
  FOR INSERT WITH CHECK (
    office_desk.user_has_permission(auth.uid(), desk_id, 'team.invite')
    AND invited_by = auth.uid()
    AND tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid)
  );

-- desk_invites: users can update invites on their desks (for revoke)
CREATE POLICY "desk_invites_update" ON office_desk.desk_invites
  FOR UPDATE USING (
    desk_id IN (SELECT ud.desk_id FROM office_desk.user_desks ud WHERE ud.user_id = auth.uid())
  );

-- permission_audit_log: users can see audit logs on their desks
CREATE POLICY "permission_audit_log_select" ON office_desk.permission_audit_log
  FOR SELECT USING (
    desk_id IN (SELECT ud.desk_id FROM office_desk.user_desks ud WHERE ud.user_id = auth.uid())
    AND tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid)
  );

-- permission_audit_log: system inserts only (via triggers)
CREATE POLICY "permission_audit_log_insert" ON office_desk.permission_audit_log
  FOR INSERT WITH CHECK (
    desk_id IN (SELECT ud.desk_id FROM office_desk.user_desks ud WHERE ud.user_id = auth.uid())
    AND tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid)
    AND actor_id = auth.uid()
  );

-- ═══════════════════════════════════════════════════════════
-- TRIGGER: Auto-create default roles when desk is created
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION office_desk.handle_new_desk_roles()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM office_desk.create_default_roles(NEW.id, NEW.tenant_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_desk_roles ON office_desk.office_desk;
CREATE TRIGGER trg_new_desk_roles
  AFTER INSERT ON office_desk.office_desk
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.handle_new_desk_roles();

-- ═══════════════════════════════════════════════════════════
-- TRIGGER: Log permission changes
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION office_desk.log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO office_desk.permission_audit_log (desk_id, tenant_id, actor_id, action, target_user_id, target_role_id, details)
    VALUES (
      NEW.desk_id,
      (SELECT tenant_id FROM office_desk.office_desk WHERE id = NEW.desk_id),
      COALESCE(NEW.assigned_by, auth.uid()),
      'role_assigned',
      NEW.user_id,
      NEW.role_id,
      jsonb_build_object('assigned_at', NEW.assigned_at)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO office_desk.permission_audit_log (desk_id, tenant_id, actor_id, action, target_user_id, target_role_id, details)
    VALUES (
      OLD.desk_id,
      (SELECT tenant_id FROM office_desk.office_desk WHERE id = OLD.desk_id),
      auth.uid(),
      'role_removed',
      OLD.user_id,
      OLD.role_id,
      jsonb_build_object('removed_at', now())
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.role_id IS DISTINCT FROM NEW.role_id THEN
    INSERT INTO office_desk.permission_audit_log (desk_id, tenant_id, actor_id, action, target_user_id, target_role_id, details)
    VALUES (
      NEW.desk_id,
      (SELECT tenant_id FROM office_desk.office_desk WHERE id = NEW.desk_id),
      COALESCE(NEW.assigned_by, auth.uid()),
      'role_changed',
      NEW.user_id,
      NEW.role_id,
      jsonb_build_object('old_role_id', OLD.role_id, 'new_role_id', NEW.role_id)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_role_change_log ON office_desk.user_desk_roles;
CREATE TRIGGER trg_role_change_log
  AFTER INSERT OR UPDATE OR DELETE ON office_desk.user_desk_roles
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.log_role_change();

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════

GRANT SELECT ON office_desk.permissions TO authenticated;
GRANT SELECT ON office_desk.desk_roles TO authenticated;
GRANT SELECT ON office_desk.role_permissions TO authenticated;
GRANT SELECT ON office_desk.user_desk_roles TO authenticated;
GRANT SELECT ON office_desk.desk_invites TO authenticated;
GRANT SELECT ON office_desk.permission_audit_log TO authenticated;

GRANT INSERT, UPDATE, DELETE ON office_desk.desk_roles TO authenticated;
GRANT INSERT, DELETE ON office_desk.role_permissions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON office_desk.user_desk_roles TO authenticated;
GRANT INSERT, UPDATE ON office_desk.desk_invites TO authenticated;
GRANT INSERT ON office_desk.permission_audit_log TO authenticated;

COMMIT;
