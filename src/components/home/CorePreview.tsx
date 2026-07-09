import { ArrowRight, BookOpen, GraduationCap, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const pathways = [
  {
    icon: BookOpen,
    title: 'Cambridge Curriculum',
    subtitle: 'Primary → IGCSE → A-Levels',
    description:
      "The world's most popular international curriculum. Rigorous, recognised by every major university, and designed for academic depth.",
    stages: [
      'Primary (Years 1-6)',
      'Lower Secondary (Years 7-9)',
      'IGCSE (Years 10-11)',
      'A-Levels (Years 12-13)',
    ],
    cta: { label: 'View Cambridge Pathway', href: '/cambridge-curriculum' },
    color: 'burgundy',
    bgColor: 'bg-burgundy/5',
  },
  {
    icon: GraduationCap,
    title: 'IB Continuum',
    subtitle: 'PYP → MYP → Diploma',
    description:
      'Inquiry-based, holistic education developing critical thinkers. The IB continuum nurtures intellectual, personal, and social growth.',
    stages: ['PYP (Years 1-6)', 'MYP (Years 7-11)', 'Diploma Programme (Years 12-13)'],
    cta: { label: 'View IB Pathway', href: '/ib-curriculum' },
    color: 'champagne',
    bgColor: 'bg-champagne/5',
  },
  {
    icon: Home,
    title: 'Home School Support',
    subtitle: 'Parent-Led + Teacher-Guided',
    description:
      'Accredited curriculum packs with specialist teacher support. Perfect for families wanting flexibility without compromising on quality.',
    stages: [
      'Curriculum packs by grade',
      'Weekly teacher check-ins',
      'Assessment & reporting',
      'Exam registration support',
    ],
    cta: { label: 'View Homeschool Options', href: '/homeschool' },
    color: 'navy',
    bgColor: 'bg-navy/5',
  },
];

export function CorePreview() {
  return (
    <section className="py-20 md:py-32 bg-white" aria-labelledby="core-title">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="font-display text-champagne text-heading-sm mb-4 animate-fade-up">
            Core Academics
          </p>
          <h2
            id="core-title"
            className="font-serif text-display-md font-semibold text-navy animate-fade-up stagger-1"
          >
            Three Pathways. One Standard of Excellence.
          </h2>
          <div className="section-divider animate-fade-up stagger-2" />
          <p className="font-sans text-body-lg text-charcoal-muted mt-6 animate-fade-up stagger-3">
            Choose the pathway that fits your family — all deliver the same rigour, teacher quality,
            and university recognition.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pathways.map((pathway, index) => (
            <article
              key={pathway.title}
              className={`card relative overflow-hidden animate-fade-up ${pathway.bgColor}`}
              style={{ animationDelay: `${(index + 1) * 0.1}s` }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: `var(--${pathway.color})` }}
              />

              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${pathway.bgColor}`}
                  >
                    <pathway.icon
                      className="w-6 h-6"
                      style={{ color: `var(--${pathway.color})` }}
                    />
                  </div>
                  <div>
                    <p className="font-display text-champagne text-heading-sm">
                      {pathway.subtitle}
                    </p>
                    <h3 className="font-serif text-heading-lg font-semibold text-navy">
                      {pathway.title}
                    </h3>
                  </div>
                </div>

                <p className="text-body text-charcoal-muted mb-6">{pathway.description}</p>

                <ul className="space-y-2 mb-8">
                  {pathway.stages.map((stage, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-body-sm text-charcoal-muted"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: `var(--${pathway.color})` }}
                      />
                      <span>{stage}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={pathway.cta.href}
                  className="btn btn-tertiary w-full group"
                  style={{
                    borderColor: `var(--${pathway.color})`,
                    color: `var(--${pathway.color})`,
                  }}
                >
                  {pathway.cta.label}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="text-center mt-16 animate-fade-up stagger-4">
          <Link to="/core" className="btn btn-secondary group">
            View All Academic Pathways
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
