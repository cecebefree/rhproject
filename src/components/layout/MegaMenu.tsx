import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MegaMenuProps {
  items: { label: string; href: string }[];
  onLeave: () => void;
}

export function MegaMenu({ items, onLeave }: MegaMenuProps) {
  return (
    <div
      className="absolute left-0 top-full mt-2 w-full max-w-screen-2xl rounded-xl bg-white shadow-dropdown border border-ivory-parchment p-6 md:p-8 animate-fade-up z-50"
      role="menu"
      onMouseLeave={onLeave}
      onMouseEnter={() => {}}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="group flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-ivory hover:text-burgundy"
            role="menuitem"
            onMouseLeave={onLeave}
          >
            <span className="font-medium text-navy group-hover:text-burgundy transition-colors">
              {item.label}
            </span>
            <ChevronRight className="w-4 h-4 text-champagne-light group-hover:translate-x-1 transition-transform" />
          </Link>
        ))}
      </div>
    </div>
  );
}
