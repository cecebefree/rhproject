import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react'
import { MegaMenu } from './MegaMenu'

const navItems = [
  {
    label: 'Core',
    key: 'core',
    children: [
      { label: 'Cambridge Curriculum', href: '/cambridge-curriculum' },
      { label: 'IB', href: '/ib-curriculum' },
      { label: 'Home School', href: '/homeschool' },
    ],
  },
  {
    label: 'Sup',
    key: 'sup',
    children: [
      { label: 'Devotional', href: '/sup/devotional' },
      { label: 'Enrichment Courses', href: '/sup/enrichment' },
      { label: 'Clubs', href: '/sup/clubs' },
      { label: 'Music & Art', href: '/sup/music-art' },
    ],
  },
  {
    label: 'Social',
    key: 'social',
    children: [
      { label: 'Life Events', href: '/social/life-events' },
      { label: 'Student Council', href: '/social/student-council' },
      { label: 'Students', href: '/social/students' },
      { label: 'Families', href: '/social/families' },
      { label: 'Alumni', href: '/social/alumni' },
      { label: 'Travel & Outings', href: '/social/travel-outings' },
    ],
  },
  {
    label: 'Services',
    key: 'services',
    children: [
      { label: 'Experts', href: '/services/experts' },
      { label: 'University Guidance', href: '/services/university' },
    ],
  },
  {
    label: 'Info',
    key: 'info',
    children: [
      { label: 'About Us', href: '/about' },
      { label: 'Registration', href: '/registration' },
      { label: 'Pricing & Fees', href: '/pricing' },
      { label: 'Zones & Calendar', href: '/zones-calendar' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Knowledge Base', href: '/knowledge-base' },
      { label: 'Blog & News', href: '/blog' },
      { label: 'Careers & Teachers', href: '/careers' },
    ],
  },
  {
    label: 'Contact',
    key: 'contact',
    children: [
      { label: 'Main Contact', href: '/main-contact' },
      { label: 'Enrolment Meetings', href: '/schedule-meeting' },
    ],
  },
]

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null)
  const headerRef = useRef<HTMLElement>(null)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
    setActiveMegaMenu(null)
  }, [location.pathname])

  const handleMouseEnter = (key: string) => {
    if (window.innerWidth >= 1024) {
      setActiveMegaMenu(key)
    }
  }

  const handleMouseLeave = () => {
    if (window.innerWidth >= 1024) {
      setActiveMegaMenu(null)
    }
  }

  const isActive = (key: string) => activeMegaMenu === key

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-ivory/95 backdrop-blur-md shadow-card border-b border-ivory-parchment'
          : 'bg-transparent'
      }`}
    >
      <nav className="container-custom" aria-label="Main navigation">
        <div className="flex items-center justify-between h-20 md:h-24">
          <Link to="/" className="flex items-center gap-2" aria-label="Red House School Home">
            <img
              src="https://media.base44.com/images/public/69f23a2b0bbaf081e75813b0/7f4474889_logo.png"
              alt=""
              className="h-10 md:h-12 w-auto"
            />
            <span className="font-serif text-heading-md font-medium text-navy hidden sm:block">
              Red House School
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <div
                key={item.key}
                className="relative"
                onMouseEnter={() => handleMouseEnter(item.key)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  className={`flex items-center gap-1.5 px-3 py-2 text-body font-medium transition-colors ${
                    isActive(item.key)
                      ? 'text-burgundy'
                      : 'text-navy hover:text-burgundy'
                  }`}
                  aria-expanded={isActive(item.key)}
                  aria-haspopup="true"
                >
                  {item.label}
                  <ChevronDown className="w-4 h-4 transition-transform" />
                </button>
                {isActive(item.key) && (
                  <MegaMenu
                    items={item.children}
                    onLeave={handleMouseLeave}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/schedule-meeting"
              className="btn btn-secondary text-sm px-4 py-2"
            >
              Book a Visit
            </Link>
            <Link
              to="/registration"
              className="btn btn-primary text-sm px-4 py-2"
            >
              Register
            </Link>
          </div>

          <button
            className="md:hidden p-2 text-navy"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden py-4 border-t border-ivory-parchment animate-fade-up">
            <div className="space-y-2">
              {navItems.map((item) => (
                <MobileMenuSection
                  key={item.key}
                  item={item}
                  activeKey={activeMegaMenu}
                  onToggle={setActiveMegaMenu}
                />
              ))}
              <div className="pt-4 border-t border-ivory-parchment flex flex-col gap-3">
                <Link
                  to="/schedule-meeting"
                  className="btn btn-secondary w-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Book a Visit
                </Link>
                <Link
                  to="/registration"
                  className="btn btn-primary w-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {activeMegaMenu && window.innerWidth >= 1024 && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onMouseLeave={handleMouseLeave}
          aria-hidden="true"
        />
      )}
    </header>
  )
}

function MobileMenuSection({
  item,
  activeKey,
  onToggle,
}: {
  item: typeof navItems[0]
  activeKey: string | null
  onToggle: (key: string | null) => void
}) {
  const isOpen = activeKey === item.key

  return (
    <div className="relative">
      <button
        onClick={() => onToggle(isOpen ? null : item.key)}
        className="w-full flex items-center justify-between px-3 py-3 text-left text-body font-medium text-navy hover:text-burgundy"
        aria-expanded={isOpen}
      >
        <span>{item.label}</span>
        <ChevronRight
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="pl-6 mt-2 space-y-2 animate-fade-up">
          {item.children.map((child) => (
            <Link
              key={child.href}
              to={child.href}
              className="block px-3 py-2 text-body-sm font-medium text-charcoal-muted hover:text-burgundy rounded-lg hover:bg-ivory-parchment transition-colors"
              onClick={() => onToggle(null)}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}