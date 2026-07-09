import { ArrowRight, Calendar, GraduationCap, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const ctaOptions = [
  {
    icon: Users,
    title: 'Register Your Child',
    description: 'Begin the admissions journey for Cambridge Primary, IGCSE, A-Levels, or IB.',
    href: '/registration',
    primary: true,
  },
  {
    icon: GraduationCap,
    title: 'Apply to Teach',
    description: 'Join our faculty of subject specialists. Competitive packages, global community.',
    href: '/careers',
    primary: false,
  },
  {
    icon: Calendar,
    title: 'Schedule a Visit',
    description: 'Virtual tour or campus visit. Meet the team, see the facilities, ask questions.',
    href: '/schedule-meeting',
    primary: false,
  },
];

export function FinalCTA() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden" aria-labelledby="cta-title">
      <div className="absolute inset-0 z-0">
        <img
          src="https://media.base44.com/images/public/69f23a2b0bbaf081e75813b0/7f4474889_logo.png/v1/fill/w_1920,h_1080/7f4474889_logo.png"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/90 to-navy/95" />
      </div>

      <div className="container-custom relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-display text-champagne-light text-heading-sm mb-6 animate-fade-up">
            Your Journey Starts Here
          </p>
          <h2
            id="cta-title"
            className="font-serif text-display-md md:text-display-lg font-semibold text-ivory mb-6 animate-fade-up stagger-1"
          >
            Join the Red House Family Today
          </h2>
          <p className="font-sans text-body-lg text-ivory/80 mb-12 animate-fade-up stagger-2">
            Three pathways to begin. One world-class education awaits.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-up stagger-3">
            {ctaOptions.map((option, index) => (
              <Link
                key={option.title}
                to={option.href}
                className={`card p-6 md:p-8 text-center group transition-all ${
                  option.primary ? 'bg-burgundy border-burgundy' : 'bg-navy/50 border-navy-light/50'
                }`}
                style={{
                  animationDelay: `${(index + 1) * 0.1}s`,
                  ...(option.primary ? { boxShadow: '0 20px 50px rgba(139, 26, 46, 0.3)' } : {}),
                }}
              >
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 transition-all ${
                    option.primary
                      ? 'bg-ivory/20 text-ivory group-hover:bg-ivory/30'
                      : 'bg-burgundy/10 text-burgundy group-hover:bg-burgundy/20'
                  }`}
                >
                  <option.icon className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-heading-lg font-semibold mb-2">
                  {option.primary ? 'text-ivory' : 'text-navy'}
                </h3>
                <h3
                  className={`font-serif text-heading-lg font-semibold mb-2 ${option.primary ? 'text-ivory' : 'text-navy'}`}
                >
                  {option.title}
                </h3>
                <p
                  className={`text-body text-center mb-6 ${option.primary ? 'text-ivory/80' : 'text-charcoal-muted'}`}
                >
                  {option.description}
                </p>
                <span
                  className={`inline-flex items-center gap-2 font-medium transition-transform ${
                    option.primary ? 'text-ivory' : 'text-burgundy'
                  }`}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            ))}
          </div>

          <p className="mt-12 font-display text-champagne-light text-heading-sm animate-fade-up stagger-4">
            Founding 150 Families — Early Bird Fees Available
          </p>
        </div>
      </div>
    </section>
  );
}
