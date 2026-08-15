// PermissionDenied — Displayed when user lacks required permission

interface PermissionDeniedProps {
  permission?: string;
  message?: string;
}

export function PermissionDenied({ permission, message }: PermissionDeniedProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        backgroundColor: '#fee2e2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        marginBottom: '16px',
      }}>
        🔒
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '600', color: '#2d3748' }}>
        Access Denied
      </h2>
      <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#718096', maxWidth: '400px' }}>
        {message || `You don't have permission to access this area.${permission ? ` Required: ${permission}` : ''}`}
      </p>
      <p style={{ margin: 0, fontSize: '13px', color: '#a0aec0' }}>
        Contact your desk administrator to request access.
      </p>
    </div>
  );
}
