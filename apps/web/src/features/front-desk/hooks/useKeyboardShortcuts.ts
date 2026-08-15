import { useEffect } from 'react';

type Tab = 'intake' | 'leads' | 'archived';

interface UseKeyboardShortcutsOptions {
  onNavigate: (tab: Tab) => void;
  onSearchFocus: () => void;
}

export function useKeyboardShortcuts({ onNavigate, onSearchFocus }: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;

      if (e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        onNavigate('intake');
      }

      if (e.key === 'k' && !e.shiftKey) {
        e.preventDefault();
        onSearchFocus();
      }

      if (e.key === 'a' && e.shiftKey) {
        e.preventDefault();
        onNavigate('archived');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, onSearchFocus]);
}
