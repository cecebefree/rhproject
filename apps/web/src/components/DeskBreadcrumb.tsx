import { Link } from 'react-router-dom';
import { deskRoutes } from '../hooks/useRouting';
import { useDeepLink } from './DeepLinkProvider';

export interface BreadcrumbItem {
  label: string;
  path: string;
}

interface DeskBreadcrumbProps {
  /** Desk name to display (optional) */
  deskName?: string;
  /** Current tab label */
  tabLabel?: string;
  /** Entity name (lead/invoice name) */
  entityName?: string;
  /** Entity type for share button */
  entityType?: 'lead' | 'invoice' | 'desk';
}

export function DeskBreadcrumb({
  deskName,
  tabLabel,
  entityName,
  entityType,
}: DeskBreadcrumbProps) {
  const { copyToClipboard, shareUrl } = useDeepLink();

  const items: BreadcrumbItem[] = [{ label: 'Desks', path: deskRoutes.list() }];

  if (deskName) {
    items.push({
      label: deskName,
      path: deskRoutes.list(),
    });
  }

  if (tabLabel) {
    items.push({
      label: tabLabel,
      path: shareUrl(),
    });
  }

  if (entityName) {
    items.push({
      label: entityName,
      path: shareUrl(),
    });
  }

  const handleCopyLink = async () => {
    const success = await copyToClipboard();
    if (success) {
      // Simple toast notification
      const toast = document.createElement('div');
      toast.textContent = 'Link copied to clipboard';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #2d3748;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9999;
        animation: fadeIn 0.2s ease;
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.2s ease';
        setTimeout(() => document.body.removeChild(toast), 200);
      }, 2000);
    }
  };

  return (
    <nav style={styles.breadcrumb} aria-label="Breadcrumb">
      <ol style={styles.list}>
        {items.map((item, index) => (
          <li key={item.path} style={styles.item}>
            {index < items.length - 1 ? (
              <Link to={item.path} style={styles.link}>
                {item.label}
              </Link>
            ) : (
              <span style={styles.current}>{item.label}</span>
            )}
            {index < items.length - 1 && <span style={styles.separator}>/</span>}
          </li>
        ))}
      </ol>

      {entityName && entityType && (
        <button
          type="button"
          onClick={handleCopyLink}
          style={styles.shareButton}
          title="Copy link to clipboard"
        >
          Share
        </button>
      )}
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    fontSize: '14px',
  },
  list: {
    display: 'flex',
    alignItems: 'center',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    gap: '4px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  link: {
    color: '#3182ce',
    textDecoration: 'none',
  },
  current: {
    color: '#4a5568',
    fontWeight: '500',
  },
  separator: {
    color: '#a0aec0',
    margin: '0 4px',
  },
  shareButton: {
    padding: '4px 12px',
    background: '#edf2f7',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#4a5568',
  },
};
