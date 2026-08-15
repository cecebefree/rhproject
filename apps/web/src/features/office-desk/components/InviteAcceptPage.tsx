// InviteAcceptPage — Page for accepting desk invitations

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInviteByToken, acceptInvite } from '../services/inviteService';
import { supabase } from '../services/supabase';
import type { DeskInvite } from '../services/inviteService';

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<DeskInvite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setIsLoading(false);
      return;
    }

    const loadInvite = async () => {
      const { data, error: loadError } = await getInviteByToken(token);
      if (loadError || !data) {
        setError('Invalid or expired invitation');
      } else {
        setInvite(data as unknown as DeskInvite);
      }
      setIsLoading(false);
    };

    loadInvite();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    setAccepting(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/invite/${token}`);
      setAccepting(false);
      return;
    }

    const { data, error: acceptError } = await acceptInvite(token, user.id);
    if (acceptError) {
      setError(acceptError.message);
    } else if (data) {
      setSuccess(true);
      setTimeout(() => {
        navigate(`/desk/${invite?.desk_id || ''}`);
      }, 2000);
    }

    setAccepting(false);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#718096' }}>Loading invitation...</div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#2d3748' }}>Invalid Invitation</h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#718096' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f7fafc' }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        textAlign: 'center',
      }}>
        {success ? (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 20px',
            }}>
              ✓
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#2d3748' }}>Welcome to the Team!</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#718096' }}>Redirecting to your desk...</p>
          </>
        ) : (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#ebf8ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 20px',
            }}>
              📧
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#2d3748' }}>You're Invited!</h2>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#718096' }}>
              You've been invited to join <strong>{invite?.desk_id || 'a desk'}</strong> as a <strong>{invite?.role?.name || 'member'}</strong>.
            </p>

            {error && (
              <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '14px', marginBottom: '16px', textAlign: 'left' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={accepting}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3182ce',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: accepting ? 'not-allowed' : 'pointer',
                opacity: accepting ? 0.7 : 1,
              }}
            >
              {accepting ? 'Joining...' : 'Accept Invitation'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
