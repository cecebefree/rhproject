// Announcer.tsx — Screen reader announcements for dynamic content
import { useEffect, useRef } from 'react';

interface AnnouncerProps {
  message: string;
  assertive?: boolean;
  clearAfter?: number;
}

/**
 * Announces messages to screen readers via aria-live regions.
 * Use for: loading states, error messages, success confirmations,
 * real-time updates, navigation changes.
 */
export function Announcer({ message, assertive = false, clearAfter }: AnnouncerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && ref.current) {
      // Force re-announcement by clearing then setting
      ref.current.textContent = '';
      requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.textContent = message;
        }
      });

      // Auto-clear after delay
      if (clearAfter) {
        const timer = setTimeout(() => {
          if (ref.current) {
            ref.current.textContent = '';
          }
        }, clearAfter);
        return () => clearTimeout(timer);
      }
    }
  }, [message, clearAfter]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="sr-only"
    />
  );
}

/**
 * Live region for real-time updates (e.g., new notifications, sync status)
 */
export function LiveRegion({ children }: { children: React.ReactNode }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {children}
    </div>
  );
}

/**
 * Assertive live region for urgent announcements (errors, warnings)
 */
export function AssertiveRegion({ children }: { children: React.ReactNode }) {
  return (
    <div aria-live="assertive" aria-atomic="true" className="sr-only">
      {children}
    </div>
  );
}
