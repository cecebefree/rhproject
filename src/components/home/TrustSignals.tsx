import { GraduationCap, Star } from 'lucide-react';

const accreditations = [
  {
    name: 'Cambridge International',
    logo: 'CAIE',
    description: 'Registered Cambridge International School',
  },
  { name: 'IB World School', logo: 'IB', description: 'Authorised IB Continuum School' },
  { name: 'CIS Accredited', logo: 'CIS', description: 'Council of International Schools' },
  { name: 'ISA Member', logo: 'ISA', description: 'Independent Schools Association' },
];

const universityDestinations = [
  { name: 'University of Cambridge', country: 'UK', tier: 'Top 5' },
  { name: 'University of Oxford', country: 'UK', tier: 'Top 5' },
  { name: 'Harvard University', country: 'USA', tier: 'Ivy League' },
  { name: 'Stanford University', country: 'USA', tier: 'Top 3' },
  { name: 'University of Cape Town', country: 'SA', tier: 'Top Africa' },
  { name: 'University of Toronto', country: 'Canada', tier: 'Top 20' },
  { name: 'University of Melbourne', country: 'Australia', tier: 'Top 30' },
  { name: 'Stellenbosch University', country: 'SA', tier: 'Top Africa' },
];

const testimonials = [
  {
    quote:
      "Red House gave our children the academic rigour of a top British school with the warmth of a family. They're thriving at university now.",
    author: 'Dr. & Mrs. van der Merwe',
    role: 'Parents of 2 Graduates (Class of 2022, 2024)',
    location: 'Cape Town, South Africa',
    stars: 5,
  },
  {
    quote:
      "As expats moving between Dubai and London, Red House provided continuity. The teachers know each child personally — it's remarkable.",
    author: 'The Al-Rashid Family',
    role: 'Current Parents (Years 7 & 10)',
    location: 'Dubai / London',
    stars: 5,
  },
  {
    quote:
      'The IB programme here is exceptional. My daughter developed critical thinking skills that set her apart in her Oxford interview.',
    author: 'Prof. James Mitchell',
    role: 'Parent of IB Graduate (Class of 2023)',
    location: 'Oxford, UK',
    stars: 5,
  },
];

export function TrustSignals() {
  return (
    <section className="py-20 md:py-32 bg-white" aria-labelledby="trust-title">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="font-display text-champagne text-heading-sm mb-4 animate-fade-up">
            Trusted by Families Worldwide
          </p>
          <h2
            id="trust-title"
            className="font-serif text-display-md font-semibold text-navy animate-fade-up stagger-1"
          >
            Accredited. Recognised. Chosen.
          </h2>
          <div className="section-divider animate-fade-up stagger-2" />
        </div>

        <div className="mb-20">
          <h3 className="font-serif text-heading-lg font-semibold text-navy text-center mb-10 animate-fade-up">
            Accreditations & Memberships
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {accreditations.map((acc, index) => (
              <div
                key={acc.name}
                className="flex flex-col items-center gap-2 p-4 md:p-6 rounded-xl bg-ivory transition-all hover:bg-ivory-parchment animate-fade-up"
                style={{ animationDelay: `${(index + 1) * 0.1}s` }}
              >
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-navy/5 flex items-center justify-center font-serif text-heading-md font-semibold text-navy">
                  {acc.logo}
                </div>
                <p className="font-medium text-navy text-center">{acc.name}</p>
                <p className="text-body-sm text-charcoal-muted text-center max-w-xs">
                  {acc.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-20">
          <h3 className="font-serif text-heading-lg font-semibold text-navy text-center mb-10 animate-fade-up">
            University Destinations (Recent Graduates)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {universityDestinations.map((uni, index) => (
              <div
                key={uni.name}
                className="card p-4 md:p-6 text-center group animate-fade-up"
                style={{ animationDelay: `${(index + 1) * 0.05}s` }}
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <GraduationCap className="w-5 h-5 text-champagne" />
                  <span className="font-display text-champagne text-body-sm">{uni.tier}</span>
                </div>
                <p className="font-serif text-heading-sm font-medium text-navy">{uni.name}</p>
                <p className="text-body-sm text-charcoal-muted">{uni.country}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-20">
          <h3 className="font-serif text-heading-lg font-semibold text-navy text-center mb-10 animate-fade-up">
            What Parents Say
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <article
                key={testimonial.author}
                className="card p-6 md:p-8 relative animate-fade-up"
                style={{ animationDelay: `${(index + 1) * 0.1}s` }}
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.stars }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-champagne text-champagne" />
                  ))}
                </div>
                <blockquote className="text-body-lg text-charcoal mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <footer>
                  <p className="font-medium text-navy">{testimonial.author}</p>
                  <p className="text-body-sm text-charcoal-muted">{testimonial.role}</p>
                  <p className="text-body-sm text-charcoal-muted">{testimonial.location}</p>
                </footer>
                <div className="absolute top-4 right-4 text-ivory-parchment/50">
                  <Star className="w-12 h-12 fill-current" />
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="text-center animate-fade-up">
          <p className="font-sans text-body text-charcoal-muted mb-6">
            Ready to join a community where excellence?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/registration" className="btn btn-primary group">
              Start Registration
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
            <a href="/schedule-meeting" className="btn btn-secondary">
              Book a Consultation
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
