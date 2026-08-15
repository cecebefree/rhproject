// RoleManagementPage — Manage desk roles and their permissions

import { useState, useEffect } from 'react';
import {
  selectDeskRoles,
  selectAllPermissions,
  selectRolePermissions,
  setRolePermissions,
  createDeskRole,
  deleteDeskRole,
  type DeskRole,
  type Permission,
} from '../services/rbac';

interface RoleManagementPageProps {
  deskId: string;
  tenantId: string;
}

export function RoleManagementPage({ deskId, tenantId }: RoleManagementPageProps) {
  const [roles, setRoles] = useState<DeskRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<DeskRole | null>(null);
  const [rolePermissions, setRolePermissionsState] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [showNewRole, setShowNewRole] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [rolesResult, permsResult] = await Promise.all([
        selectDeskRoles(deskId),
        selectAllPermissions(),
      ]);
      if (rolesResult.data) setRoles(rolesResult.data);
      if (permsResult.data) setPermissions(permsResult.data);
      setIsLoading(false);
    };
    loadData();
  }, [deskId]);

  useEffect(() => {
    if (!selectedRole) {
      setRolePermissionsState([]);
      return;
    }
    const loadRolePerms = async () => {
      const { data } = await selectRolePermissions(selectedRole.id);
      if (data) {
        // Now returns { permission_id, permission: { id, code, ... } }
        setRolePermissionsState(data.map((rp: { permission_id: string }) => rp.permission_id));
      }
    };
    loadRolePerms();
  }, [selectedRole]);

  const handleTogglePermission = (permissionId: string) => {
    setRolePermissionsState((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    setError(null);
    const { error: saveError } = await setRolePermissions(selectedRole.id, rolePermissions);
    if (saveError) {
      setError(saveError.message);
    }
    setSaving(false);
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    const { data, error: createError } = await createDeskRole(deskId, tenantId, newRoleName.trim());
    if (createError) {
      setError(createError.message);
    } else if (data) {
      setRoles((prev) => [...prev, data]);
      setNewRoleName('');
      setShowNewRole(false);
    }
  };

  const handleDeleteRole = async (role: DeskRole) => {
    if (role.is_system) {
      setError('Cannot delete system roles');
      return;
    }
    if (!confirm(`Delete role "${role.name}"?`)) return;
    const { error: deleteError } = await deleteDeskRole(role.id);
    if (deleteError) {
      setError(deleteError.message);
    } else {
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      if (selectedRole?.id === role.id) setSelectedRole(null);
    }
  };

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (isLoading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>Loading roles...</div>;
  }

  return (
    <div style={{ display: 'flex', gap: '24px', maxWidth: '1000px' }}>
      {/* Roles List */}
      <div style={{ width: '280px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>Roles</h3>
          <button
            onClick={() => setShowNewRole(true)}
            style={{
              padding: '4px 8px',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              backgroundColor: 'white',
              fontSize: '12px',
              color: '#3182ce',
              cursor: 'pointer',
            }}
          >
            + New
          </button>
        </div>

        {showNewRole && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Role name"
              style={{
                flex: 1,
                padding: '6px 10px',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            />
            <button
              onClick={handleCreateRole}
              disabled={!newRoleName.trim()}
              style={{
                padding: '6px 10px',
                backgroundColor: '#3182ce',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: newRoleName.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Add
            </button>
            <button
              onClick={() => { setShowNewRole(false); setNewRoleName(''); }}
              style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: 'white', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {roles.map((role) => (
            <div
              key={role.id}
              onClick={() => setSelectedRole(role)}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: selectedRole?.id === role.id ? '#ebf8ff' : 'white',
                border: `1px solid ${selectedRole?.id === role.id ? '#3182ce' : '#e2e8f0'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#2d3748' }}>{role.name}</div>
                {role.is_system && <div style={{ fontSize: '11px', color: '#a0aec0' }}>System</div>}
              </div>
              {!role.is_system && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}
                  style={{
                    padding: '2px 6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#e53e3e',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Permissions */}
      <div style={{ flex: 1 }}>
        {selectedRole ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
                {selectedRole.name} — Permissions
              </h3>
              <button
                onClick={handleSavePermissions}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3182ce',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>

            {error && (
              <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '14px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            {Object.entries(permissionsByCategory).map(([category, perms]) => (
              <div key={category} style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>
                  {category}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {perms.map((perm) => (
                    <label
                      key={perm.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={rolePermissions.includes(perm.id)}
                        onChange={() => handleTogglePermission(perm.id)}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <div>
                        <div style={{ fontSize: '14px', color: '#2d3748' }}>{perm.name}</div>
                        {perm.description && <div style={{ fontSize: '12px', color: '#718096' }}>{perm.description}</div>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#718096' }}>
            <p style={{ fontSize: '14px', margin: 0 }}>Select a role to manage its permissions</p>
          </div>
        )}
      </div>
    </div>
  );
}
