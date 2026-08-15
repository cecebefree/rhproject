// SwipeGestureHandler — Hook for swipe left/right actions (Row 6)

import { useRef, useCallback, useEffect } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  preventScroll?: boolean;
}

interface SwipeGestureResult {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  isSwiping: boolean;
  swipeDirection: 'left' | 'right' | null;
  swipeOffset: number;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  preventScroll = false,
}: SwipeGestureOptions = {}): SwipeGestureResult {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);
  const isSwiping = useRef(false);
  const swipeDirection = useRef<'left' | 'right' | null>(null);
  const swipeOffset = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
    touchEnd.current = null;
    isSwiping.current = false;
    swipeDirection.current = null;
    swipeOffset.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;

    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;

    // Determine if this is a horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwiping.current = true;
      swipeDirection.current = deltaX > 0 ? 'right' : 'left';
      swipeOffset.current = deltaX;

      if (preventScroll) {
        e.preventDefault();
      }
    }
  }, [preventScroll]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;

    // Check if this was a horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) >= threshold) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    // Reset
    touchStart.current = null;
    touchEnd.current = null;
    isSwiping.current = false;
    swipeDirection.current = null;
    swipeOffset.current = 0;
  }, [threshold, onSwipeLeft, onSwipeRight]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    isSwiping: isSwiping.current,
    swipeDirection: swipeDirection.current,
    swipeOffset: swipeOffset.current,
  };
}

// Hook for managing swipe state in a list item
interface SwipeableItemOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: { label: string; color: string; icon?: string };
  rightAction?: { label: string; color: string; icon?: string };
}

export function useSwipeableItem({
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
}: SwipeableItemOptions = {}) {
  const swipeGesture = useSwipeGesture({
    onSwipeLeft,
    onSwipeRight,
    threshold: 80,
  });

  return {
    ...swipeGesture,
    leftAction,
    rightAction,
  };
}
