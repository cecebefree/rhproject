import { Heart, Music, Palette, Plane, Trophy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const communityStats = [
  { icon: Users, value: '30+', label: 'Nationalities Represented' },
  { icon: Heart, value: '15:1', label: 'Student : Teacher Ratio' },
  { icon: Trophy, value: '100%', label: 'University Acceptance Rate' },
  { icon: Plane, value: '15+', label: 'Countries for Travel Programs' },
];

const communityHighlights = [
  {
    icon: Users,
    title: 'House System & Family Life',
    description:
      'Every student joins a house — their home base for mentorship, friendship, and healthy competition.',
    link: '/social/families',
  },
  {
    icon: Music,
    title: 'Arts, Music & Creative Expression',
    description:
      'Orchestra, theatre, visual arts, and digital media. Annual productions showcase student talent.',
    link: '/sup/music-art',
  },
  {
    icon: Trophy,
    title: 'Sports & Physical Development',
    description:
      'Rowing, tennis, swimming, football, athletics. Elite coaching alongside participation for all.',
    link: '/sup/clubs',
  },
  {
    icon: Plane,
    title: 'Global Travel & Cultural Exchange',
    description:
      'Annual trips to Europe, Africa, Asia. Service learning, cultural immersion, and adventure.',
    link: '/social/travel-outings',
  },
  {
    icon: Palette,
    title: 'Student Leadership & Voice',
    description:
      'Student Council, prefects, eco-council, peer mentors. Real responsibility, real impact.',
    link: '/social/student-council',
  },
  {
    icon: Heart,
    title: 'Service & Community Outreach',
    description:
      'Local partnerships, fundraising, environmental projects. Education that gives back.',
    link: '/sup/enrichment',
  },
];

export function CommunityLife() {
  return (
    <section className="py-20 md:py-32 bg-ivory-parchment" aria-labelledby="community-title">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="font-display text-champagne text-heading-sm mb-4 animate-fade-up">
            Life at Red House
          </p>
          <h2
            id="community-title"
            className="font-serif text-display-md font-semibold text-navy animate-fade-up stagger-1"
          >
            A Global Community That Feels Like Family
          </h2>
          <div className="section-divider animate-fade-up stagger-2" />
          <p className="font-sans text-body-lg text-charcoal-muted mt-6 animate-fade-up stagger-3">
            Learning happens everywhere — in the dining hall, on the sports field, in the music
            room, and on trips across continents.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {communityStats.map((stat, index) => (
            <div
              key={stat.label}
              className="card p-6 text-center animate-fade-up"
              style={{ animationDelay: `${(index + 1) * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-xl bg-burgundy/10 flex items-center justify-center mx-auto mb-4">
                <stat.icon className="w-7 h-7 text-burgundy" />
              </div>
              <p className="font-serif text-display-sm font-semibold text-navy">{stat.value}</p>
              <p className="text-body-sm text-charcoal-muted">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {communityHighlights.map((highlight, index) => (
            <article
              key={highlight.title}
              className="card p-6 md:p-8 group animate-fade-up"
              style={{ animationDelay: `${(index + 1) * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-lg bg-burgundy/10 flex items-center justify-center mb-4 group-hover:bg-burgundy group-hover:text-ivory transition-colors">
                <highlight.icon className="w-6 h-6 text-burgundy group-hover:text-ivory transition-colors" />
              </div>
              <h3 className="font-serif text-heading-md font-semibold text-navy mb-2">
                {highlight.title}
              </h3>
              <p className="text-body text-charcoal-muted mb-6">{highlight.description}</p>
              <Link
                to={highlight.link}
                className="inline-flex items-center gap-1.5 text-body font-medium text-burgundy hover:text-burgundy-bright transition-colors"
              >
                Explore
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
