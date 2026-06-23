import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'

const footerLinks = {
  about: [
    { label: 'Our Story', href: '/about' },
    { label: 'Leadership & Team', href: '/about#team' },
    { label: 'Governance', href: '/about' },
    { label: 'Policies', href: '/about' },
    { label: 'Careers', href: '/careers' },
  ],
  admissions: [
    { label: 'Register Your Child', href: '/registration' },
    { label: 'Schedule a Visit', href: '/schedule-meeting' },
    { label: 'Fees & Information', href: '/pricing' },
    { label: 'FAQ', href: '/faq' },
    { label: 'International Families', href: '/homeschool' },
  ],
  community: [
    { label: 'Families', href: '/social/families' },
    { label: 'Students', href: '/social/students' },
    { label: 'Alumni', href: '/social/alumni' },
    { label: 'Events', href: '/social/life-events' },
    { label: 'Travel & Outings', href: '/social/travel-outings' },
  ],
  contact: [
    { label: 'General Enquiries', href: '/main-contact' },
    { label: 'Admissions Office', href: '/main-contact' },
    { label: 'Find Us', href: '/main-contact' },
    { label: 'Zones & Calendar', href: '/zones-calendar' },
  ],
}

const socialLinks = [
  {
    href: '#',
    label: 'Facebook',
    svg: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    href: '#',
    label: 'Instagram',
    svg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" strokeWidth="2" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" strokeWidth="2" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" strokeWidth="2" />
      </svg>
    ),
  },
  {
    href: '#',
    label: 'Twitter',
    svg: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-6.732 9.525h-3.024l-3.051-9.525h3.594l2.35 3.357 3.095-9.525zM21.752 4.877l-2.18 3.106-4.128-5.753-4.392 6.229 1.344 4.179H14.39l3.952 5.507H10.247l3.505-4.877-3.884-5.384h7.863l-2.764 3.828 1.665 2.314h3.676l-5.808-8.136z" />
      </svg>
    ),
  },
  {
    href: '#',
    label: 'YouTube',
    svg: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
]

export function Footer() {
  return (
    <footer className="bg-navy text-ivory pt-20 pb-10">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-16">
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-6" aria-label="Red House School Home">
              <img
                src="https://media.base44.com/images/public/69f23a2b0bbaf081e75813b0/7f4474889_logo.png"
                alt=""
                className="h-12 w-auto"
              />
            </Link>
            <p className="text-body text-ivory/70 max-w-xs mb-6">
              A world-class Cambridge education, globally connected.
              Where academic excellence meets genuine community.
            </p>
            <div className="flex gap-4">
              {socialLinks.map(({ svg, href, label }) => (
                <a
                  key={label}
                  href={href}
                  className="w-10 h-10 rounded-full bg-navy-light/50 flex items-center justify-center text-ivory/70 hover:text-champagne-light hover:bg-navy-light transition-all"
                  aria-label={label}
                >
                  {svg}
                </a>
              ))}
            </div>
          </div>

          <nav aria-label="About">
            <h3 className="font-serif text-heading-sm font-medium mb-4">About</h3>
            <ul className="space-y-3">
              {footerLinks.about.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-body-sm text-ivory/70 hover:text-champagne-light transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Admissions">
            <h3 className="font-serif text-heading-sm font-medium mb-4">Admissions</h3>
            <ul className="space-y-3">
              {footerLinks.admissions.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-body-sm text-ivory/70 hover:text-champagne-light transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Community">
            <h3 className="font-serif text-heading-sm font-medium mb-4">Community</h3>
            <ul className="space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-body-sm text-ivory/70 hover:text-champagne-light transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <address className="not-italic" aria-label="Contact">
            <h3 className="font-serif text-heading-sm font-medium mb-4">Contact</h3>
            <ul className="space-y-3 text-ivory/70">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 flex-shrink-0 text-champagne" />
                <span className="text-body-sm">Red House Campus, Cape Town, South Africa</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 flex-shrink-0 text-champagne" />
                <a href="tel:+27210000000" className="text-body-sm hover:text-champagne-light transition-colors">
                  +27 21 000 0000
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 flex-shrink-0 text-champagne" />
                <a href="mailto:admissions@redhouse.school" className="text-body-sm hover:text-champagne-light transition-colors">
                  admissions@redhouse.school
                </a>
              </li>
            </ul>
          </address>
        </div>

        <div className="pt-8 border-t border-navy-light">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-body-sm text-ivory/50">
              © {new Date().getFullYear()} Red House School. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-body-sm text-ivory/50">
              <Link to="/about" className="hover:text-champagne-light transition-colors">Privacy Policy</Link>
              <Link to="/about" className="hover:text-champagne-light transition-colors">Terms of Use</Link>
              <Link to="/about" className="hover:text-champagne-light transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}