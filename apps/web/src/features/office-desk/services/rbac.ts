/**
 * RBAC Service — Role-based access control for office desks.
 * Handles roles, permissions, team members, and audit logging.
 */

import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface DeskRole {
  id: string;
  desk_id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface UserDeskRole {
  id: string;
  user_id: string;
  desk_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  role?: DeskRole;
  user?: { id: string; email: string; full_name: string | null };
}

export interface PermissionAuditLogEntry {
  id: string;
  desk_id: string;
  tenant_id: string;
  actor_id: string;
  action: string;
  target_user_id: string | null;
  target_role_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export type PermissionCode =
  | 'contacts.view' | 'contacts.create' | 'contacts.edit' | 'contacts.delete'
  | 'contacts.view_notes' | 'contacts.create_notes' | 'contacts.edit_notes' | 'contacts.delete_notes'
  | 'leads.view' | 'leads.create' | 'leads.edit' | 'leads.delete' | 'leads.archive' | 'leads.unarchive'
  | 'invoices.view' | 'invoices.create' | 'invoices.edit' | 'invoices.delete' | 'invoices.send' | 'invoices.view_payments'
  | 'team.view' | 'team.invite' | 'team.remove' | 'team.edit_roles'
  | 'settings.view' | 'settings.edit' | 'settings.billing'
  | 'reports.view' | 'reports.export';

export const DEFAULT_ROLES = ['admin', 'manager', 'agent', 'viewer'] as const;

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  agent: 'Agent',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Full access to all features and settings',
  manager: 'Manage team members and most features',
  agent: 'Day-to-day desk operations',
  viewer: 'Read-only access to view data',
};

// ═══════════════════════════════════════════════════════════
// ROLE QUERIES
// ═══════════════════════════════════════════════════════════

export async function selectDeskRoles(deskId: string) {
  return supabase
    .from('office_desk.desk_roles')
    .select('*')
    .eq('desk_id', deskId)
    .order('name');
}

export async function getRoleById(roleId: string) {
  return supabase
    .from('office_desk.desk_roles')
    .select('*')
    .eq('id', roleId)
    .single();
}

export async function createDeskRole(deskId: string, tenantId: string, name: string, description?: string) {
  return supabase
    .from('office_desk.desk_roles')
    .insert({
      desk_id: deskId,
      tenant_id: tenantId,
      name,
      description: description || null,
      is_system: false,
    })
    .select()
    .single();
}

export async function updateDeskRole(roleId: string, updates: { name?: string; description?: string }) {
  return supabase
    .from('office_desk.desk_roles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', roleId)
    .select()
    .single();
}

export async function deleteDeskRole(roleId: string) {
  return supabase
    .from('office_desk.desk_roles')
    .delete()
    .eq('id', roleId)
    .eq('is_system', false);
}

// ═══════════════════════════════════════════════════════════
// PERMISSION QUERIES
// ═══════════════════════════════════════════════════════════

export async function selectAllPermissions() {
  return supabase
    .from('office_desk.permissions')
    .select('*')
    .order('category, code');
}

export async function selectRolePermissions(roleId: string) {
  // Fetch role permissions first
  const { data: rolePerms, error } = await supabase
    .from('office_desk.role_permissions')
    .select('*')
    .eq('role_id', roleId);

  if (error || !rolePerms) return { data: rolePerms, error };

  // Fetch permission details
  const permIds = rolePerms.map((rp) => rp.permission_id);
  const { data: perms } = await supabase
    .from('office_desk.permissions')
    .select('*')
    .in('id', permIds);

  // Merge
  const result = rolePerms.map((rp) => ({
    ...rp,
    permission: perms?.find((p) => p.id === rp.permission_id) || null,
  }));

  return { data: result, error: null };
}

export async function setRolePermissions(roleId: string, permissionIds: string[]) {
  // Delete existing permissions
  await supabase
    .from('office_desk.role_permissions')
    .delete()
    .eq('role_id', roleId);

  // Insert new permissions
  if (permissionIds.length === 0) return { data: null, error: null };

  const rolePermissions = permissionIds.map((permissionId) => ({
    role_id: roleId,
    permission_id: permissionId,
  }));

  return supabase
    .from('office_desk.role_permissions')
    .insert(rolePermissions)
    .select();
}

// ═══════════════════════════════════════════════════════════
// USER DESK ROLE QUERIES
// ═══════════════════════════════════════════════════════════

export async function selectTeamMembers(deskId: string) {
  // Fetch user desk roles
  const { data: userRoles, error } = await supabase
    .from('office_desk.user_desk_roles')
    .select('*')
    .eq('desk_id', deskId)
    .order('assigned_at');

  if (error || !userRoles) return { data: userRoles, error };

  // Fetch role details
  const roleIds = [...new Set(userRoles.map((ur) => ur.role_id))];
  const { data: roles } = await supabase
    .from('office_desk.desk_roles')
    .select('*')
    .in('id', roleIds);

  // Fetch user details from auth.users
  const userIds = userRoles.map((ur) => ur.user_id);
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const users = authUsers?.users?.filter((u) => userIds.includes(u.id)).map((u) => ({
    id: u.id,
    email: u.email || '',
    full_name: u.user_metadata?.full_name || null,
  })) || [];

  // Merge
  const result = userRoles.map((ur) => ({
    ...ur,
    role: roles?.find((r) => r.id === ur.role_id) || null,
    user: users.find((u) => u.id === ur.user_id) || null,
  }));

  return { data: result, error: null };
}

export async function getUserDeskRole(userId: string, deskId: string) {
  // Fetch user desk role
  const { data: userRole, error } = await supabase
    .from('office_desk.user_desk_roles')
    .select('*')
    .eq('user_id', userId)
    .eq('desk_id', deskId)
    .single();

  if (error || !userRole) return { data: userRole, error };

  // Fetch role details
  const { data: role } = await supabase
    .from('office_desk.desk_roles')
    .select('*')
    .eq('id', userRole.role_id)
    .single();

  return { data: { ...userRole, role }, error: null };
}

export async function assignUserRole(userId: string, deskId: string, roleId: string, assignedBy?: string) {
  return supabase
    .from('office_desk.user_desk_roles')
    .upsert({
      user_id: userId,
      desk_id: deskId,
      role_id: roleId,
      assigned_by: assignedBy || null,
    }, { onConflict: 'user_id,desk_id' })
    .select()
    .single();
}

export async function removeUserRole(userId: string, deskId: string) {
  return supabase
    .from('office_desk.user_desk_roles')
    .delete()
    .eq('user_id', userId)
    .eq('desk_id', deskId);
}

// ═══════════════════════════════════════════════════════════
// PERMISSION CHECKING
// ═══════════════════════════════════════════════════════════

export async function getUserPermissions(userId: string, deskId: string): Promise<PermissionCode[]> {
  const { data, error } = await supabase
    .rpc('get_user_desk_permissions', {
      p_user_id: userId,
      p_desk_id: deskId,
    });

  if (error || !data) return [];
  return data.map((row: { permission_code: string }) => row.permission_code as PermissionCode);
}

export async function hasPermission(userId: string, deskId: string, permission: PermissionCode): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('user_has_permission', {
      p_user_id: userId,
      p_desk_id: deskId,
      p_permission_code: permission,
    });

  if (error || data === null) return false;
  return data as boolean;
}

// ═══════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════

export async function selectAuditLog(deskId: string, limit = 50, offset = 0) {
  return supabase
    .from('office_desk.permission_audit_log')
    .select('*')
    .eq('desk_id', deskId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
}

// ═══════════════════════════════════════════════════════════
// REALTIME SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════

export function subscribeToTeamMembers(
  deskId: string,
  callback: (payload: { eventType: string; new: UserDeskRole; old: UserDeskRole | null }) => void
) {
  return supabase
    .channel(`user_desk_roles-${deskId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'office_desk', table: 'user_desk_roles', filter: `desk_id=eq.${deskId}` },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}

export function subscribeToDeskRoles(
  deskId: string,
  callback: (payload: { eventType: string; new: DeskRole; old: DeskRole | null }) => void
) {
  return supabase
    .channel(`desk_roles-${deskId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'office_desk', table: 'desk_roles', filter: `desk_id=eq.${deskId}` },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}
