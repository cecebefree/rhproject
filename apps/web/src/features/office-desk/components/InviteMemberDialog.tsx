// InviteMemberDialog — Dialog to invite a new team member

import { useState } from 'react';
import { createInvite, sendInviteEmail } from '../services/inviteService';
import { supabase } from '../services/supabase';
import type { DeskRole } from '../services/rbac';

interface InviteMemberDialogProps {
  deskId: string;
  roles: DeskRole[];
  onClose: () => void;
  onInvited: () => void;
}

export function InviteMemberDialog({ deskId, roles, onClose, onInvited }: InviteMemberDialogProps) {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(roles[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !roleId) return;

    setLoading(true);
    setError(null);

    // Get current user and tenant
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) {
      setError('No tenant context');
      setLoading(false);
      return;
    }

    const { data: invite, error: inviteError } = await createInvite({
      desk_id: deskId,
      tenant_id: tenantId,
      email: email.trim(),
      role_id: roleId,
      invited_by: user.id,
    });

    if (inviteError) {
      setError(inviteError.message);
      setLoading(false);
      return;
    }

    if (invite) {
      // Send invite email (placeholder)
      await sendInviteEmail(invite, 'Desk');
      setSuccess(true);
      setTimeout(() => {
        onInvited();
      }, 1500);
    }

    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
      }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              margin: '0 auto 16px',
            }}>
              ✓
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '600', color: '#2d3748' }}>
              Invitation Sent!
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#718096' }}>
              {email} will receive an invitation to join this desk.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#2d3748' }}>
                Invite Team Member
              </h3>
              <button
                onClick={onClose}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#718096',
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            {error && (
              <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '14px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#2d3748' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#2d3748' }}>
                  Role
                </label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '10px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    fontSize: '14px',
                    color: '#4a5568',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !email.trim() || !roleId}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#3182ce',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: loading || !email.trim() || !roleId ? 'not-allowed' : 'pointer',
                    opacity: loading || !email.trim() || !roleId ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
