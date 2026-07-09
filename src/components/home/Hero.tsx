import { ArrowRight, Globe, GraduationCap, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      aria-labelledby="hero-title"
    >
      <div className="absolute inset-0 z-0">
        <img
          src="https://media.base44.com/images/public/69f23a2b0bbaf081e75813b0/7f4474889_logo.png/v1/fill/w_1920,h_1080/7f4474889_logo.png"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/70 via-navy/50 to-navy/80" />
      </div>

      <div className="container-custom relative z-10 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-display text-champagne text-heading-sm mb-6 animate-fade-up">
            A Family of Schools for the Modern World
          </p>
          <h1
            id="hero-title"
            className="font-serif text-display-xl md:text-display-lg font-semibold text-ivory mb-8 animate-fade-up stagger-1"
          >
            Cambridge A-Levels by Grade 12.
            <br />
            <span className="text-champagne-light">Global University Recognition.</span>
            <br />
            Genuine Social Community.
          </h1>
          <p className="font-sans text-body-lg text-ivory/80 mb-12 animate-fade-up stagger-2 max-w-2xl mx-auto">
            Premium online Cambridge education with live teachers, real peer connections, and
            university pathways that open doors worldwide.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up stagger-3">
            <Link to="/registration" className="btn btn-primary group w-full sm:w-auto">
              Register Your Child
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/schedule-meeting"
              className="btn btn-secondary w-full sm:w-auto border-ivory text-ivory hover:bg-ivory hover:text-navy"
            >
              Schedule a Visit
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8 animate-fade-up stagger-4 text-center">
            <StatCard icon={GraduationCap} value="100%" label="Cambridge Pass Rate" />
            <StatCard icon={Globe} value="30+" label="Nationalities" />
            <StatCard icon={Users} value="15:1" label="Student:Teacher Ratio" />
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
        aria-hidden="true"
      >
        <svg
          className="w-6 h-6 text-ivory/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: { icon: React.ComponentType<{ className?: string }>; value: string; label: string }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Icon className="w-6 h-6 text-champagne" />
      </div>
      <p className="font-serif text-display-sm font-semibold text-ivory">{value}</p>
      <p className="font-sans text-body-sm text-ivory/70">{label}</p>
    </div>
  );
}
