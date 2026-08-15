// TeamMembersList — Display and manage team members on a desk

import { useState } from 'react';
import { useTeamMembers } from '../../../hooks/useRbac';
import { RoleSelector } from './RoleSelector';
import { InviteMemberDialog } from './InviteMemberDialog';
import { ROLE_LABELS } from '../services/rbac';

interface TeamMembersListProps {
  deskId: string;
  currentUserId: string;
}

export function TeamMembersList({ deskId, currentUserId }: TeamMembersListProps) {
  const { members, roles, isLoading, error, removeMember, changeRole, refresh } = useTeamMembers({ deskId });
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, roleId: string) => {
    await changeRole(userId, roleId);
    setEditingUserId(null);
  };

  const handleRemove = async (userId: string, userName: string) => {
    if (!confirm(`Remove ${userName} from this desk?`)) return;
    await removeMember(userId);
  };

  if (isLoading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>Loading team members...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>Team Members</h3>
        <button
          onClick={() => setShowInviteDialog(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3182ce',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          + Invite Member
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '14px' }}>
          {error.message}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {members.map((member) => {
          const isCurrentUser = member.user_id === currentUserId;
          const userName = member.user?.full_name || member.user?.email || 'Unknown';
          const userEmail = member.user?.email || '';

          return (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: 'white',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#edf2f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600',
                color: '#4a5568',
                flexShrink: 0,
              }}>
                {userName.slice(0, 2).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#2d3748' }}>
                  {userName}
                  {isCurrentUser && <span style={{ color: '#a0aec0', fontWeight: '400' }}> (you)</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#718096' }}>{userEmail}</div>
              </div>

              {/* Role */}
              {editingUserId === member.user_id ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <RoleSelector
                    roles={roles}
                    selectedRoleId={member.role_id}
                    onChange={(roleId) => handleRoleChange(member.user_id, roleId)}
                  />
                  <button
                    onClick={() => setEditingUserId(null)}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: member.role?.name === 'admin' ? '#fed7d7' :
                                     member.role?.name === 'manager' ? '#fef3c7' :
                                     member.role?.name === 'agent' ? '#d1fae5' : '#e2e8f0',
                    color: member.role?.name === 'admin' ? '#991b1b' :
                           member.role?.name === 'manager' ? '#92400e' :
                           member.role?.name === 'agent' ? '#065f46' : '#4a5568',
                  }}>
                    {ROLE_LABELS[member.role?.name || ''] || member.role?.name || 'Unknown'}
                  </span>
                  {!isCurrentUser && (
                    <>
                      <button
                        onClick={() => setEditingUserId(member.user_id)}
                        style={{
                          padding: '4px 8px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#3182ce',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemove(member.user_id, userName)}
                        style={{
                          padding: '4px 8px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#e53e3e',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#718096', fontSize: '14px' }}>
            No team members yet. Invite someone to get started.
          </div>
        )}
      </div>

      {showInviteDialog && (
        <InviteMemberDialog
          deskId={deskId}
          roles={roles}
          onClose={() => setShowInviteDialog(false)}
          onInvited={() => {
            setShowInviteDialog(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
