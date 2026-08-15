// MobileNav — Hamburger menu and bottom tab bar for mobile (Row 6)

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
}

interface MobileNavProps {
  items: NavItem[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showBottomBar?: boolean;
}

export function MobileNav({ items, activeTab, onTabChange, showBottomBar = true }: MobileNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const handleItemClick = (item: NavItem) => {
    navigate(item.path);
    if (onTabChange) {
      onTabChange(item.id);
    }
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Hamburger Button - Fixed top left on mobile */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        style={{
          position: 'fixed',
          top: '12px',
          left: '12px',
          zIndex: 1001,
          width: '44px',
          height: '44px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '5px',
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
        className="md:hidden"
      >
        <span
          style={{
            width: '20px',
            height: '2px',
            backgroundColor: '#333',
            transition: 'transform 0.2s',
            transform: isMenuOpen ? 'rotate(45deg) translateY(7px)' : 'none',
          }}
        />
        <span
          style={{
            width: '20px',
            height: '2px',
            backgroundColor: '#333',
            transition: 'opacity 0.2s',
            opacity: isMenuOpen ? 0 : 1,
          }}
        />
        <span
          style={{
            width: '20px',
            height: '2px',
            backgroundColor: '#333',
            transition: 'transform 0.2s',
            transform: isMenuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none',
          }}
        />
      </button>

      {/* Slide-in Menu Overlay */}
      {isMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Slide-in Menu */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          backgroundColor: 'white',
          zIndex: 1000,
          transform: isMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          boxShadow: isMenuOpen ? '2px 0 8px rgba(0, 0, 0, 0.15)' : 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Menu Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f7fafc',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#2d3748' }}>
            Menu
          </h2>
        </div>

        {/* Menu Items */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {items.map((item) => {
            const isActive = activeTab === item.id || location.pathname.includes(item.path);
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '14px 20px',
                  border: 'none',
                  backgroundColor: isActive ? '#ebf8ff' : 'transparent',
                  color: isActive ? '#3182ce' : '#4a5568',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: isActive ? '600' : '400',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Menu Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f7fafc',
            fontSize: '13px',
            color: '#718096',
          }}
        >
          Redhouse Office Desk
        </div>
      </div>

      {/* Bottom Tab Bar - Only on mobile */}
      {showBottomBar && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60px',
            backgroundColor: 'white',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            zIndex: 998,
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          className="md:hidden"
        >
          {items.slice(0, 5).map((item) => {
            const isActive = activeTab === item.id || location.pathname.includes(item.path);
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: isActive ? '#3182ce' : '#718096',
                  cursor: 'pointer',
                  fontSize: '10px',
                  minWidth: '60px',
                }}
              >
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <span style={{ fontWeight: isActive ? '600' : '400' }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

// Hook for responsive detection
export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsDesktop(width >= 1024);
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isMobile, isTablet, isDesktop };
}
