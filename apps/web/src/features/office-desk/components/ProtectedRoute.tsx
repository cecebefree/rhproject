// ProtectedRoute — Wrapper component that checks permissions before rendering children

import type { PermissionCode } from '../services/rbac';
import { useRbac } from '../../../hooks/useRbac';
import { PermissionDenied } from './PermissionDenied';

interface ProtectedRouteProps {
  userId: string | null;
  deskId: string;
  permission?: PermissionCode;
  permissions?: PermissionCode[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function ProtectedRoute({
  userId,
  deskId,
  permission,
  permissions,
  requireAll = false,
  fallback,
  children,
}: ProtectedRouteProps) {
  const { role, isLoading, error, hasPermission, hasAnyPermission, hasAllPermissions } = useRbac({
    userId,
    deskId,
  });

  if (isLoading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>Loading permissions...</div>;
  }

  if (error) {
    return <PermissionDenied message="Unable to verify permissions." />;
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return fallback || <PermissionDenied permission={permission} />;
  }

  // Check multiple permissions
  if (permissions) {
    const hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasAccess) {
      return fallback || <PermissionDenied permission={permissions.join(', ')} />;
    }
  }

  return <>{children}</>;
}
