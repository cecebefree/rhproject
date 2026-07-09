import { BookOpen, Heart, Sparkles, Users } from 'lucide-react';

const pillars = [
  {
    icon: BookOpen,
    title: 'Academic Excellence',
    subtitle: 'Cambridge & IB Pathways',
    description:
      'Rigorous, internationally recognised curricula delivered by subject-specialist teachers. From Primary through A-Levels and IB Diploma, every student follows a personalised academic roadmap.',
    features: [
      'Cambridge Primary → IGCSE → A-Levels',
      'IB PYP → MYP → Diploma Programme',
      'Specialist teachers for every subject',
      'Regular assessment & progress tracking',
    ],
    image:
      'https://media.base44.com/images/public/69f23a2b0bbaf081e75813b0/7f4474889_logo.png/v1/fill/w_600,h_400/7f4474889_logo.png',
    cta: { label: 'Explore Curriculum', href: '/cambridge-curriculum' },
  },
  {
    icon: Heart,
    title: 'Pastoral Care & Wellbeing',
    subtitle: 'A Family, Not Just a School',
    description:
      'Every student belongs to a house, has a dedicated tutor, and accesses wellbeing support. Our devotional programme, counselling, and peer mentoring create a culture where students thrive emotionally and spiritually.',
    features: [
      'House system with dedicated tutors',
      'Daily devotional & chapel',
      'Wellbeing counselling available',
      'Peer mentoring & buddy programmes',
    ],
    image:
      'https://media.base44.com/images/public/69f23a2b0bbaf081e75813b0/7f4474889_logo.png/v1/fill/w_600,h_400/7f4474889_logo.png',
    cta: { label: 'Discover Pastoral Life', href: '/sup/devotional' },
  },
  {
    icon: Users,
    title: 'Global Community',
    subtitle: '30+ Nationalities, One Family',
    description:
      'Students from across Africa, Europe, the Middle East, Asia, and the Americas learn together in real time. Cultural exchanges, international travel, and collaborative projects prepare them for a borderless world.',
    features: [
      'Live classes across time zones',
      'International student exchanges',
      'Cultural celebration events',
      'Global university guidance',
    ],
    image:
      'https://media.base44.com/images/public/69f23a2b0bbaf081e75813b0/7f4474889_logo.png/v1/fill/w_600,h_400/7f4474889_logo.png',
    cta: { label: 'Meet Our Community', href: '/social/families' },
  },
];

export function ThreePillars() {
  return (
    <section className="py-20 md:py-32 bg-ivory" aria-labelledby="pillars-title">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="font-display text-champagne text-heading-sm mb-4 animate-fade-up">
            Why Red House
          </p>
          <h2
            id="pillars-title"
            className="font-serif text-display-md font-semibold text-navy animate-fade-up stagger-1"
          >
            Three Pillars of a Red House Education
          </h2>
          <div className="section-divider animate-fade-up stagger-2" />
          <p className="font-sans text-body-lg text-charcoal-muted mt-6 animate-fade-up stagger-3">
            Every aspect of our school is built on these foundations — ensuring your child receives
            an education that is academically rigorous, personally nurturing, and globally
            connected.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((pillar, index) => (
            <article
              key={pillar.title}
              className="card overflow-hidden animate-fade-up"
              style={{ animationDelay: `${(index + 1) * 0.1}s` }}
            >
              <div className="relative h-48 md:h-56 overflow-hidden">
                <img
                  src={pillar.image}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="font-display text-champagne-light text-heading-sm">
                    {pillar.subtitle}
                  </p>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-ivory-parchment flex items-center justify-center">
                    <pillar.icon className="w-6 h-6 text-burgundy" />
                  </div>
                  <h3 className="font-serif text-heading-lg font-semibold text-navy">
                    {pillar.title}
                  </h3>
                </div>

                <p className="text-body text-charcoal-muted mb-6">{pillar.description}</p>

                <ul className="space-y-3 mb-6">
                  {pillar.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-body-sm text-charcoal-muted">
                      <Sparkles className="w-4 h-4 text-champagne flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <a href={pillar.cta.href} className="btn btn-tertiary w-full group">
                  {pillar.cta.label}
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
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
