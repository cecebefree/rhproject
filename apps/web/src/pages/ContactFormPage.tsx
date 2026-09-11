import { useState } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface FormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  curriculum: string;
  student_age: string;
}

interface SubmitResult {
  status: string;
  lead_id: string;
  ticket: string;
}

export default function ContactFormPage() {
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    message: '',
    curriculum: 'Cambridge',
    student_age: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-website-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          source_type: 'contact_form',
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          message: form.message || undefined,
          curriculum_interest: form.curriculum || undefined,
          student_age: form.student_age ? Number.parseInt(form.student_age) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || data.error || 'Submission failed');
      } else {
        setResult(data);
        setForm({ name: '', email: '', phone: '', message: '', curriculum: 'Cambridge', student_age: '' });
      }
    } catch (err) {
      setError('Network error — is the Edge Function running?');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(195,199,204,0.5)',
    fontSize: '14px',
    fontFamily: '"Source Sans 3", sans-serif',
    color: '#1A242B',
    backgroundColor: '#ffffff',
    outline: 'none',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#F8F7F4', fontFamily: '"Source Sans 3", sans-serif' }}
    >
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/redhouse-logo.png" alt="Redhouse" className="w-16 h-16 mx-auto mb-4" />
          <h1
            className="text-3xl font-semibold"
            style={{ fontFamily: '"EB Garamond", serif', color: '#1A242B' }}
          >
            Contact Us
          </h1>
          <p className="text-sm mt-2" style={{ color: '#54626C' }}>
            We'd love to hear from you. Fill out the form below.
          </p>
        </div>

        {/* Success */}
        {result && (
          <div
            className="mb-6 p-4 rounded-xl text-center"
            style={{ backgroundColor: '#D1FAE5', border: '1px solid rgba(34,197,94,0.3)' }}
          >
            <span
              className="material-symbols-outlined block mx-auto mb-2"
              style={{ fontSize: '32px', color: '#065F46' }}
            >
              check_circle
            </span>
            <p className="text-sm font-semibold" style={{ color: '#065F46' }}>
              Thank you! Your inquiry has been received.
            </p>
            <p className="text-xs mt-1" style={{ color: '#065F46' }}>
              Ticket: <strong>{result.ticket}</strong>
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="mb-6 p-4 rounded-xl text-center"
            style={{ backgroundColor: '#FEF2F2', border: '1px solid rgba(220,38,38,0.2)' }}
          >
            <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-xl"
          style={{ backgroundColor: '#ffffff', border: '1px solid rgba(195,199,204,0.3)' }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#54626C' }}>
                Full Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
                placeholder="John Smith"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#54626C' }}>
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={inputStyle}
                placeholder="john@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#54626C' }}>
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={inputStyle}
                placeholder="+44 7700 900000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#54626C' }}>
                  Curriculum
                </label>
                <select
                  value={form.curriculum}
                  onChange={(e) => setForm({ ...form, curriculum: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Cambridge">Cambridge</option>
                  <option value="IB">IB</option>
                  <option value="KABV">KABV</option>
                  <option value="Home School">Home School</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#54626C' }}>
                  Student Age
                </label>
                <input
                  type="number"
                  value={form.student_age}
                  onChange={(e) => setForm({ ...form, student_age: e.target.value })}
                  style={inputStyle}
                  placeholder="10"
                  min="3"
                  max="18"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#54626C' }}>
                Message
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                placeholder="Tell us how we can help..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !form.name.trim() || !form.email.trim()}
            className="w-full mt-6 py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            style={{
              backgroundColor: '#273946',
              color: '#ffffff',
              fontSize: '11px',
              letterSpacing: '0.12em',
              fontFamily: '"Source Sans 3", sans-serif',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Inquiry'}
          </button>
        </form>

        {/* Back link */}
        <div className="text-center mt-4">
          <a
            href="/service/front-desk"
            className="text-xs"
            style={{ color: '#54626C' }}
          >
            ← Back to Service Desk
          </a>
        </div>
      </div>
    </div>
  );
}
