/**
 * useRbac — Hook for role-based access control.
 * Provides current user's role, permissions, and helper functions.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getUserPermissions,
  getUserDeskRole,
  hasPermission,
  selectTeamMembers,
  selectDeskRoles,
  assignUserRole,
  removeUserRole,
  type PermissionCode,
  type DeskRole,
  type UserDeskRole,
} from '../features/office-desk/services/rbac';

interface UseRbacOptions {
  userId: string | null;
  deskId: string;
  enabled?: boolean;
}

interface UseRbacResult {
  role: DeskRole | null;
  permissions: PermissionCode[];
  isLoading: boolean;
  error: Error | null;
  hasPermission: (permission: PermissionCode) => boolean;
  hasAnyPermission: (permissions: PermissionCode[]) => boolean;
  hasAllPermissions: (permissions: PermissionCode[]) => boolean;
  refresh: () => Promise<void>;
}

export function useRbac({ userId, deskId, enabled = true }: UseRbacOptions): UseRbacResult {
  const [role, setRole] = useState<DeskRole | null>(null);
  const [permissions, setPermissions] = useState<PermissionCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!userId || !deskId) {
      setRole(null);
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      const [roleResult, permsResult] = await Promise.all([
        getUserDeskRole(userId, deskId),
        getUserPermissions(userId, deskId),
      ]);

      if (roleResult.data) {
        setRole(roleResult.data.role);
      }
      setPermissions(permsResult);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch permissions'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, deskId]);

  useEffect(() => {
    if (!enabled) return;
    fetchPermissions();
  }, [enabled, fetchPermissions]);

  const checkPermission = useCallback((permission: PermissionCode): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  const checkAnyPermission = useCallback((perms: PermissionCode[]): boolean => {
    return perms.some((p) => permissions.includes(p));
  }, [permissions]);

  const checkAllPermissions = useCallback((perms: PermissionCode[]): boolean => {
    return perms.every((p) => permissions.includes(p));
  }, [permissions]);

  return {
    role,
    permissions,
    isLoading,
    error,
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    refresh: fetchPermissions,
  };
}

// ═══════════════════════════════════════════════════════════
// useTeamMembers — Hook for managing team members
// ═══════════════════════════════════════════════════════════

interface UseTeamMembersOptions {
  deskId: string;
  enabled?: boolean;
}

interface UseTeamMembersResult {
  members: UserDeskRole[];
  roles: DeskRole[];
  isLoading: boolean;
  error: Error | null;
  addMember: (userId: string, roleId: string) => Promise<{ error: Error | null }>;
  removeMember: (userId: string) => Promise<{ error: Error | null }>;
  changeRole: (userId: string, roleId: string) => Promise<{ error: Error | null }>;
  refresh: () => Promise<void>;
}

export function useTeamMembers({ deskId, enabled = true }: UseTeamMembersOptions): UseTeamMembersResult {
  const [members, setMembers] = useState<UserDeskRole[]>([]);
  const [roles, setRoles] = useState<DeskRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!deskId) return;

    try {
      const [membersResult, rolesResult] = await Promise.all([
        selectTeamMembers(deskId),
        selectDeskRoles(deskId),
      ]);

      if (membersResult.data) {
        setMembers(membersResult.data as UserDeskRole[]);
      }
      if (rolesResult.data) {
        setRoles(rolesResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team members'));
    } finally {
      setIsLoading(false);
    }
  }, [deskId]);

  useEffect(() => {
    if (!enabled) return;
    fetchMembers();
  }, [enabled, fetchMembers]);

  const addMember = useCallback(async (userId: string, roleId: string) => {
    const { error: assignError } = await assignUserRole(userId, deskId, roleId);
    if (assignError) {
      return { error: new Error(assignError.message) };
    }
    await fetchMembers();
    return { error: null };
  }, [deskId, fetchMembers]);

  const removeMember = useCallback(async (userId: string) => {
    const { error: removeError } = await removeUserRole(userId, deskId);
    if (removeError) {
      return { error: new Error(removeError.message) };
    }
    await fetchMembers();
    return { error: null };
  }, [deskId, fetchMembers]);

  const changeRole = useCallback(async (userId: string, roleId: string) => {
    const { error: updateError } = await assignUserRole(userId, deskId, roleId);
    if (updateError) {
      return { error: new Error(updateError.message) };
    }
    await fetchMembers();
    return { error: null };
  }, [deskId, fetchMembers]);

  return {
    members,
    roles,
    isLoading,
    error,
    addMember,
    removeMember,
    changeRole,
    refresh: fetchMembers,
  };
}
