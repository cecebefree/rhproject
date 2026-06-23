import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="min-h-screen py-20 md:py-32 bg-ivory">
      <div className="container-custom">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-body font-medium text-charcoal-muted hover:text-burgundy mb-10 animate-fade-up"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-serif text-display-md md:text-display-lg font-semibold text-navy mb-6 animate-fade-up">
            {title}
          </h1>
          {description && (
            <p className="font-sans text-body-lg text-charcoal-muted mb-10 animate-fade-up stagger-1">
              {description}
            </p>
          )}
          <p className="font-sans text-body text-charcoal-muted mb-8 animate-fade-up stagger-2">
            This page is under construction. Content coming soon.
          </p>
          <Link to="/" className="btn btn-primary animate-fade-up stagger-3">
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}