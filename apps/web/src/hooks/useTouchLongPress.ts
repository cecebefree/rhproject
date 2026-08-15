// TouchLongPress — Hook for long-press context menus (Row 6)

import { useRef, useCallback, useEffect } from 'react';

interface LongPressOptions {
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void;
  delay?: number;
  shouldPreventDefault?: boolean;
}

interface LongPressResult {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  isLongPressing: boolean;
}

export function useLongPress({
  onLongPress,
  delay = 500,
  shouldPreventDefault = true,
}: LongPressOptions): LongPressResult {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressing = useRef(false);
  const targetRef = useRef<EventTarget | null>(null);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      // Only trigger on left mouse button for mouse events
      if ('button' in e && e.button !== 0) return;

      targetRef.current = e.target;
      isLongPressing.current = false;

      timerRef.current = setTimeout(() => {
        isLongPressing.current = true;
        onLongPress(e);

        // Vibrate on mobile if supported
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, delay);
    },
    [onLongPress, delay]
  );

  const stop = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    []
  );

  const move = useCallback(
    (e: React.TouchEvent) => {
      if (timerRef.current) {
        // Cancel long press if finger moves too much
        const touch = e.touches[0];
        const target = targetRef.current as HTMLElement | null;
        if (target) {
          const rect = target.getBoundingClientRect();
          if (
            touch.clientX < rect.left - 10 ||
            touch.clientX > rect.right + 10 ||
            touch.clientY < rect.top - 10 ||
            touch.clientY > rect.bottom + 10
          ) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchMove: move,
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    isLongPressing: isLongPressing.current,
  };
}

// Hook for context menu with long press
interface ContextMenuOptions {
  onContextMenu: (items: ContextMenuItem[], position: { x: number; y: number }) => void;
  items: ContextMenuItem[];
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  disabled?: boolean;
  onClick: () => void;
}

export function useContextMenu({ onContextMenu, items }: ContextMenuOptions) {
  const longPress = useLongPress({
    onLongPress: (e) => {
      const position = {
        x: 'touches' in e ? e.touches[0].clientX : e.clientX,
        y: 'touches' in e ? e.touches[0].clientY : e.clientY,
      };
      onContextMenu(items, position);
    },
    delay: 500,
  });

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const position = { x: e.clientX, y: e.clientY };
      onContextMenu(items, position);
    },
    [items, onContextMenu]
  );

  return {
    ...longPress,
    onContextMenu: handleContextMenu,
  };
}
