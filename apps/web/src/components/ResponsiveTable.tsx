// ResponsiveTable — Table that converts to card layout on mobile (Row 6)

import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  mobileHidden?: boolean;
  mobileLabel?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  cardRender?: (item: T) => ReactNode;
}

export function ResponsiveTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
  cardRender,
}: ResponsiveTableProps<T>) {
  const visibleColumns = columns.filter((col) => !col.mobileHidden);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
        Loading...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
        {emptyMessage}
      </div>
    );
  }

  // Desktop Table View
  const DesktopTable = () => (
    <div style={{ overflowX: 'auto' }} className="hidden md:block">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '12px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#4a5568',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              style={{
                borderBottom: '1px solid #e2e8f0',
                cursor: onRowClick ? 'pointer' : 'default',
                backgroundColor: 'white',
              }}
              onMouseEnter={(e) => {
                if (onRowClick) e.currentTarget.style.backgroundColor = '#f7fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: '#2d3748',
                  }}
                >
                  {col.render ? col.render(item) : String(item[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Mobile Card View
  const MobileCards = () => (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 16px' }}
      className="md:hidden"
    >
      {data.map((item) => {
        if (cardRender) {
          return (
            <div
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {cardRender(item)}
            </div>
          );
        }

        return (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            style={{
              padding: '16px',
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: onRowClick ? 'pointer' : 'default',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            {visibleColumns.map((col, index) => (
              <div
                key={col.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: index < visibleColumns.length - 1 ? '1px solid #f7fafc' : 'none',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    color: '#718096',
                    fontWeight: '500',
                  }}
                >
                  {col.mobileLabel || col.label}
                </span>
                <span
                  style={{
                    fontSize: '14px',
                    color: '#2d3748',
                    fontWeight: index === 0 ? '600' : '400',
                    textAlign: 'right',
                    maxWidth: '60%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.render ? col.render(item) : String(item[col.key] ?? '-')}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <DesktopTable />
      <MobileCards />
    </div>
  );
}

// Swipeable Card - Card with swipe actions for mobile
interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: { label: string; color: string; icon: string };
  rightAction?: { label: string; color: string; icon: string };
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
}: SwipeableCardProps) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px' }}>
      {/* Background actions */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
        }}
      >
        {rightAction && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingLeft: '20px',
              backgroundColor: rightAction.color,
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            <span style={{ marginRight: '8px' }}>{rightAction.icon}</span>
            {rightAction.label}
          </div>
        )}
        <div style={{ flex: 2 }} />
        {leftAction && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '20px',
              backgroundColor: leftAction.color,
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {leftAction.label}
            <span style={{ marginLeft: '8px' }}>{leftAction.icon}</span>
          </div>
        )}
      </div>

      {/* Card content */}
      <div
        style={{
          position: 'relative',
          backgroundColor: 'white',
          zIndex: 1,
          transition: 'transform 0.2s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}
