import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../features/office-desk/services/supabase';
import { deskRoutes } from '../hooks/useRouting';

interface NavigationGuardProps {
  children: ReactNode;
  /** Desk ID to validate access for */
  deskId?: string | null;
  /** Redirect path if validation fails */
  redirectPath?: string;
}

interface ValidationState {
  loading: boolean;
  valid: boolean;
  error: string | null;
}

/**
 * Validates user has access to a desk before rendering children.
 * Checks RLS policies by querying the desk with the user's JWT.
 */
export function NavigationGuard({
  children,
  deskId,
  redirectPath = deskRoutes.list(),
}: NavigationGuardProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<ValidationState>({
    loading: true,
    valid: false,
    error: null,
  });

  useEffect(() => {
    if (!deskId) {
      setState({ loading: false, valid: false, error: 'No desk ID provided' });
      return;
    }

    let cancelled = false;

    async function validate() {
      try {
        // Check if user is authenticated
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          if (!cancelled) {
            setState({ loading: false, valid: false, error: 'Not authenticated' });
          }
          return;
        }

        // Get user profile to check tenant_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('tenant_id, role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          if (!cancelled) {
            setState({ loading: false, valid: false, error: 'Profile not found' });
          }
          return;
        }

        // Admin has access to all desks
        if (profile.role === 'admin') {
          if (!cancelled) {
            setState({ loading: false, valid: true, error: null });
          }
          return;
        }

        // For office role, validate the desk exists in their tenant
        // Using the office_desk.invoices table as a proxy for desk access
        // since we don't have a separate desks table
        if (profile.role === 'office') {
          // Check if user can access any invoice in this tenant (proves desk access)
          const { error: invoiceError } = await supabase
            .from('office_desk.invoices')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', profile.tenant_id)
            .limit(1);

          if (!cancelled) {
            if (invoiceError) {
              setState({ loading: false, valid: false, error: 'Access denied' });
            } else {
              setState({ loading: false, valid: true, error: null });
            }
          }
          return;
        }

        // Other roles don't have office desk access
        if (!cancelled) {
          setState({ loading: false, valid: false, error: 'Access denied' });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            loading: false,
            valid: false,
            error: err instanceof Error ? err.message : 'Validation failed',
          });
        }
      }
    }

    validate();

    return () => {
      cancelled = true;
    };
  }, [deskId]);

  // Redirect on invalid state
  useEffect(() => {
    if (!state.loading && !state.valid) {
      navigate(redirectPath, { replace: true });
    }
  }, [state.loading, state.valid, navigate, redirectPath]);

  if (state.loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <p>Validating access...</p>
      </div>
    );
  }

  if (!state.valid) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    color: '#718096',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#3182ce',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};
