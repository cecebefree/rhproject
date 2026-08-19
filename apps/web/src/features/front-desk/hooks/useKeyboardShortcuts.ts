import { useEffect } from 'react';

interface ActionShortcuts {
  onTake?: () => void;
  onSchedule?: () => void;
  onEmail?: () => void;
  onEscalate?: () => void;
  onRefresh?: () => void;
}

export function useKeyboardShortcuts(shortcuts: ActionShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;

      if (e.key === 't') { e.preventDefault(); shortcuts.onTake?.(); }
      if (e.key === 's') { e.preventDefault(); shortcuts.onSchedule?.(); }
      if (e.key === 'e') { e.preventDefault(); shortcuts.onEmail?.(); }
      if (e.key === 'x') { e.preventDefault(); shortcuts.onEscalate?.(); }
      if (e.key === 'r') { e.preventDefault(); shortcuts.onRefresh?.(); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
