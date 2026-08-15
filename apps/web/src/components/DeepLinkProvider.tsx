import { type ReactNode, createContext, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';

interface DeepLinkContextValue {
  /** Get the full shareable URL for the current page */
  shareUrl: () => string;
  /** Copy the current page URL to clipboard */
  copyToClipboard: () => Promise<boolean>;
  /** Get the current pathname */
  currentPath: string;
  /** Get the current search params */
  currentSearch: string;
}

const DeepLinkContext = createContext<DeepLinkContextValue | null>(null);

export function useDeepLink() {
  const ctx = useContext(DeepLinkContext);
  if (!ctx) {
    throw new Error('useDeepLink must be used within DeepLinkProvider');
  }
  return ctx;
}

interface DeepLinkProviderProps {
  children: ReactNode;
}

export function DeepLinkProvider({ children }: DeepLinkProviderProps) {
  const location = useLocation();

  const shareUrl = useCallback(() => {
    const base = window.location.origin;
    const path = location.pathname;
    const search = location.search;
    return `${base}${path}${search}`;
  }, [location.pathname, location.search]);

  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        return true;
      } catch {
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }, [shareUrl]);

  const value: DeepLinkContextValue = {
    shareUrl,
    copyToClipboard,
    currentPath: location.pathname,
    currentSearch: location.search,
  };

  return <DeepLinkContext.Provider value={value}>{children}</DeepLinkContext.Provider>;
}
