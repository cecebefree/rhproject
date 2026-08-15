// RoleSelector — Dropdown to select a role for a team member

import type { DeskRole } from '../services/rbac';

interface RoleSelectorProps {
  roles: DeskRole[];
  selectedRoleId: string;
  onChange: (roleId: string) => void;
  disabled?: boolean;
}

export function RoleSelector({ roles, selectedRoleId, onChange, disabled = false }: RoleSelectorProps) {
  return (
    <select
      value={selectedRoleId}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        fontSize: '13px',
        backgroundColor: 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        minWidth: '120px',
      }}
    >
      {roles.map((role) => (
        <option key={role.id} value={role.id}>
          {role.name}
        </option>
      ))}
    </select>
  );
}
