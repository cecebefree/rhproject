'use client';

import { useState, useCallback } from 'react';
import Turnstile from 'react-turnstile';

interface ReserveACallFormProps {
  className?: string;
}

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

interface FormData {
  name: string;
  email: string;
  phone: string;
  preferredTime: string;
  timezone: string;
  curriculumInterest: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  preferredTime?: string;
  turnstile?: string;
}

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'GMT / London' },
  { value: 'Europe/Paris', label: 'CET / Paris' },
  { value: 'Africa/Johannesburg', label: 'SAST / Johannesburg' },
  { value: 'Asia/Dubai', label: 'GST / Dubai' },
  { value: 'Asia/Singapore', label: 'SGT / Singapore' },
  { value: 'Australia/Sydney', label: 'AEST / Sydney' },
];

const CURRICULUM_OPTIONS = [
  'Cambridge',
  'IB (International Baccalaureate)',
  'Senior School',
  'Junior School',
  'Home School',
  'Not sure yet',
];

export function ReserveACallForm({ className = '' }: ReserveACallFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    preferredTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    curriculumInterest: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<FormStatus>('idle');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [turnstileWidgetKey, setTurnstileWidgetKey] = useState(0);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    return /^[\+]?[\d\s\-\(\)]{7,20}$/.test(phone);
  };

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.preferredTime) {
      newErrors.preferredTime = 'Please select a preferred call time';
    }

    if (!turnstileToken) {
      newErrors.turnstile = 'Please complete the CAPTCHA verification';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, turnstileToken]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (errors[name as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    },
    [errors]
  );

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setErrors((prev) => ({ ...prev, turnstile: undefined }));
  }, []);

  const handleTurnstileError = useCallback((error?: string) => {
    console.error('Turnstile error:', error);
    setTurnstileToken(null);
    setErrors((prev) => ({
      ...prev,
      turnstile: 'CAPTCHA verification failed. Please try again.',
    }));
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
    setErrors((prev) => ({
      ...prev,
      turnstile: 'CAPTCHA expired. Please verify again.',
    }));
  }, []);

  const resetTurnstile = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileWidgetKey((prev) => prev + 1);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setStatus('loading');
      setErrorMessage('');

      try {
        const response = await fetch('/api/reserve-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            preferred_time: formData.preferredTime,
            timezone: formData.timezone,
            curriculum_interest: formData.curriculumInterest || null,
            message: formData.message.trim() || null,
            turnstile_token: turnstileToken,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to submit request');
        }

        setStatus('success');
        setFormData({
          name: '', email: '', phone: '', preferredTime: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
          curriculumInterest: '', message: '',
        });
        resetTurnstile();
      } catch (error) {
        console.error('Form submission error:', error);
        setStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'Something went wrong. Please try again.'
        );
        resetTurnstile();
      }
    },
    [formData, turnstileToken, validateForm, resetTurnstile]
  );

  if (status === 'success') {
    return (
      <div className={`rounded-lg bg-green-50 p-6 text-center ${className}`}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-green-900">Call Reserved!</h3>
        <p className="mt-2 text-sm text-green-700">
          We&apos;ll reach out shortly to confirm your call time. Check your email for details.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 text-sm font-medium text-green-600 hover:text-green-500"
        >
          Reserve another call
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`rounded-lg bg-white p-6 shadow-lg ${className}`}>
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="rc-name" className="block text-sm font-medium text-gray-700">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="rc-name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Your full name"
            disabled={status === 'loading'}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="rc-email" className="block text-sm font-medium text-gray-700">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="rc-email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="you@example.com"
            disabled={status === 'loading'}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="rc-phone" className="block text-sm font-medium text-gray-700">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="rc-phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              errors.phone ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="+1 (555) 123-4567"
            disabled={status === 'loading'}
          />
          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
        </div>

        {/* Preferred Call Time */}
        <div>
          <label htmlFor="rc-preferredTime" className="block text-sm font-medium text-gray-700">
            Preferred Call Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            id="rc-preferredTime"
            name="preferredTime"
            value={formData.preferredTime}
            onChange={handleInputChange}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              errors.preferredTime ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={status === 'loading'}
          />
          {errors.preferredTime && <p className="mt-1 text-sm text-red-600">{errors.preferredTime}</p>}
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="rc-timezone" className="block text-sm font-medium text-gray-700">
            Your Timezone
          </label>
          <select
            id="rc-timezone"
            name="timezone"
            value={formData.timezone}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={status === 'loading'}
          >
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>

        {/* Curriculum Interest */}
        <div>
          <label htmlFor="rc-curriculumInterest" className="block text-sm font-medium text-gray-700">
            Curriculum Interest
          </label>
          <select
            id="rc-curriculumInterest"
            name="curriculumInterest"
            value={formData.curriculumInterest}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={status === 'loading'}
          >
            <option value="">Select a curriculum...</option>
            {CURRICULUM_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="rc-message" className="block text-sm font-medium text-gray-700">
            Additional Notes (optional)
          </label>
          <textarea
            id="rc-message"
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Anything you'd like us to know before the call..."
            disabled={status === 'loading'}
          />
        </div>

        {/* Turnstile */}
        <div>
          {siteKey ? (
            <Turnstile
              key={turnstileWidgetKey}
              sitekey={siteKey}
              onVerify={handleTurnstileVerify}
              onError={handleTurnstileError}
              onExpire={handleTurnstileExpire}
              action="reserve_call"
              theme="light"
              appearance="interaction-only"
            />
          ) : (
            <div className="rounded-md bg-yellow-50 p-4">
              <p className="text-sm text-yellow-700">
                CAPTCHA not configured. Set NEXT_PUBLIC_TURNSTILE_SITE_KEY.
              </p>
            </div>
          )}
          {errors.turnstile && <p className="mt-1 text-sm text-red-600">{errors.turnstile}</p>}
        </div>

        {/* Error */}
        {status === 'error' && errorMessage && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={status === 'loading' || !turnstileToken}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center">
              <svg className="mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Reserving...
            </span>
          ) : (
            'Reserve a Call'
          )}
        </button>
      </div>
    </form>
  );
}
