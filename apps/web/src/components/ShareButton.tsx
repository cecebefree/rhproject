import { useState } from 'react';
import { useDeepLink } from './DeepLinkProvider';

interface ShareButtonProps {
  /** Entity type for display */
  entityType: 'lead' | 'invoice' | 'desk';
  /** Entity name for display */
  entityName: string;
  /** Optional custom URL to share (defaults to current page) */
  url?: string;
}

export function ShareButton({ entityType, entityName, url }: ShareButtonProps) {
  const { shareUrl, copyToClipboard } = useDeepLink();
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareEmail = () => {
    const shareableUrl = url || shareUrl();
    const subject = encodeURIComponent(`Check out ${entityName}`);
    const body = encodeURIComponent(
      `Here's a link to ${entityType} "${entityName}":\n\n${shareableUrl}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <>
      <button type="button" onClick={() => setShowModal(true)} style={styles.button}>
        Share
      </button>

      {showModal && (
        <div
          style={styles.overlay}
          onClick={() => setShowModal(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowModal(false)}
        >
          <div
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h3 style={styles.title}>Share {entityType}</h3>
            <p style={styles.entityName}>{entityName}</p>

            <div style={styles.actions}>
              <button type="button" onClick={handleCopy} style={styles.actionButton}>
                {copied ? 'Copied!' : 'Copy Link'}
              </button>

              <button type="button" onClick={handleShareEmail} style={styles.actionButton}>
                Share via Email
              </button>
            </div>

            <button type="button" onClick={() => setShowModal(false)} style={styles.closeButton}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    padding: '4px 12px',
    background: '#edf2f7',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#4a5568',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '360px',
    width: '100%',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
  },
  entityName: {
    margin: '0 0 24px 0',
    color: '#718096',
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  actionButton: {
    padding: '10px 16px',
    background: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'center',
  },
  closeButton: {
    width: '100%',
    padding: '10px 16px',
    background: '#edf2f7',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#4a5568',
  },
};
