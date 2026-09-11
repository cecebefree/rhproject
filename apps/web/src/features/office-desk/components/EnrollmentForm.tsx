/**
 * EnrollmentForm — Public form for families to submit enrollment data.
 * Accessible via unique token link (no login required).
 */

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface FamilyData {
  family_name: string;
  contact_email: string;
  contact_phone: string;
  address: {
    street: string;
    city: string;
    province: string;
    postal_code: string;
  };
  payment_method: 'debit_order' | 'card' | 'eft' | 'cash';
}

interface AdultData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  relationship: 'father' | 'mother' | 'guardian' | 'sponsor' | 'grandparent' | 'other';
  is_primary: boolean;
}

interface StudentData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  grade: string;
  curriculum: 'Cambridge' | 'IB' | 'KABV' | 'Home School';
  intake_group: string;
  zone: string;
  class_section: string;
  medical_conditions: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

interface Preferences {
  preferred_schedule: 'morning' | 'afternoon' | 'flexible';
  clubs_of_interest: string[];
  enrichment_courses: string[];
  special_needs: string;
}

// ═══════════════════════════════════════════════════════════
// INITIAL DATA
// ═══════════════════════════════════════════════════════════

const INITIAL_FAMILY: FamilyData = {
  family_name: '',
  contact_email: '',
  contact_phone: '',
  address: { street: '', city: '', province: '', postal_code: '' },
  payment_method: 'debit_order',
};

const INITIAL_ADULT: AdultData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  relationship: 'father',
  is_primary: true,
};

const INITIAL_STUDENT: StudentData = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  grade: '',
  curriculum: 'Cambridge',
  intake_group: '',
  zone: '',
  class_section: '',
  medical_conditions: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
};

const GRADES = [
  'Grade R', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
];

const PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
  'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape',
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

interface EnrollmentFormProps {
  formToken: string;
}

export default function EnrollmentForm({ formToken }: EnrollmentFormProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [family, setFamily] = useState<FamilyData>(INITIAL_FAMILY);
  const [adults, setAdults] = useState<AdultData[]>([{ ...INITIAL_ADULT }]);
  const [students, setStudents] = useState<StudentData[]>([{ ...INITIAL_STUDENT }]);
  const [preferences, setPreferences] = useState<Preferences>({
    preferred_schedule: 'morning',
    clubs_of_interest: [],
    enrichment_courses: [],
    special_needs: '',
  });

  // Verify form token on mount
  useEffect(() => {
    async function verifyToken() {
      try {
        const { data, error } = await supabase
          .from('office_desk.enrollment_pipelines')
          .select('id, stage, status')
          .eq('form_token', formToken)
          .single();

        if (error || !data) {
          setError('Invalid or expired form link');
          return;
        }

        if (data.stage !== 'form_sent') {
          setError('This form has already been submitted or is no longer active');
          return;
        }

        setLoading(false);
      } catch {
        setError('Failed to verify form link');
      }
    }

    verifyToken();
  }, [formToken]);

  // Adult management
  function addAdult() {
    setAdults([...adults, { ...INITIAL_ADULT, is_primary: false }]);
  }

  function removeAdult(index: number) {
    if (adults.length <= 1) return;
    setAdults(adults.filter((_, i) => i !== index));
  }

  function updateAdult(index: number, field: keyof AdultData, value: string | boolean) {
    const updated = [...adults];
    updated[index] = { ...updated[index], [field]: value };
    setAdults(updated);
  }

  // Student management
  function addStudent() {
    setStudents([...students, { ...INITIAL_STUDENT }]);
  }

  function removeStudent(index: number) {
    if (students.length <= 1) return;
    setStudents(students.filter((_, i) => i !== index));
  }

  function updateStudent(index: number, field: keyof StudentData, value: string) {
    const updated = [...students];
    updated[index] = { ...updated[index], [field]: value };
    setStudents(updated);
  }

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { error: submitError } = await supabase.functions.invoke('submit-enrollment-form', {
        body: {
          form_token: formToken,
          form_data: {
            family,
            adults,
            students,
            preferences,
          },
        },
      });

      if (submitError) {
        throw new Error(submitError.message);
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Error</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <div className="text-green-500 text-lg font-medium mb-2">Thank You!</div>
          <div className="text-gray-600 mb-4">
            Your enrollment form has been submitted successfully. Our office team will review your
            submission and get back to you within 2-3 business days.
          </div>
          <div className="text-sm text-gray-500">
            You will receive an email confirmation shortly.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Redhouse Enrollment Form</h1>
          <p className="text-gray-600">
            Please complete all required fields. This form collects information needed to set up your
            family account, student profiles, and class assignments.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section A: Family Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Family Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Family Surname *</label>
                <input
                  type="text"
                  required
                  value={family.family_name}
                  onChange={(e) => setFamily({ ...family, family_name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                <input
                  type="email"
                  required
                  value={family.contact_email}
                  onChange={(e) => setFamily({ ...family, contact_email: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  required
                  value={family.contact_phone}
                  onChange={(e) => setFamily({ ...family, contact_phone: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select
                  required
                  value={family.payment_method}
                  onChange={(e) => setFamily({ ...family, payment_method: e.target.value as FamilyData['payment_method'] })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="debit_order">Debit Order</option>
                  <option value="card">Card</option>
                  <option value="eft">EFT</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  value={family.address.street}
                  onChange={(e) =>
                    setFamily({ ...family, address: { ...family.address, street: e.target.value } })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={family.address.city}
                  onChange={(e) =>
                    setFamily({ ...family, address: { ...family.address, city: e.target.value } })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
                <select
                  required
                  value={family.address.province}
                  onChange={(e) =>
                    setFamily({ ...family, address: { ...family.address, province: e.target.value } })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select province</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                <input
                  type="text"
                  required
                  value={family.address.postal_code}
                  onChange={(e) =>
                    setFamily({ ...family, address: { ...family.address, postal_code: e.target.value } })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Section B: Parent/Guardian Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Parent/Guardian Details</h2>
              <button
                type="button"
                onClick={addAdult}
                className="text-blue-600 text-sm hover:underline"
              >
                + Add Another
              </button>
            </div>
            {adults.map((adult, i) => (
              <div key={i} className="border rounded p-4 mb-4 last:mb-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm">
                    {i === 0 ? 'Primary Contact' : `Adult ${i + 1}`}
                  </span>
                  {adults.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAdult(i)}
                      className="text-red-500 text-sm hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={adult.first_name}
                      onChange={(e) => updateAdult(i, 'first_name', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={adult.last_name}
                      onChange={(e) => updateAdult(i, 'last_name', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={adult.email}
                      onChange={(e) => updateAdult(i, 'email', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={adult.phone}
                      onChange={(e) => updateAdult(i, 'phone', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                    <select
                      required
                      value={adult.relationship}
                      onChange={(e) => updateAdult(i, 'relationship', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                      <option value="guardian">Guardian</option>
                      <option value="sponsor">Sponsor</option>
                      <option value="grandparent">Grandparent</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={adult.is_primary}
                        onChange={(e) => updateAdult(i, 'is_primary', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">Primary Contact</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section C: Student Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Student Details</h2>
              <button
                type="button"
                onClick={addStudent}
                className="text-blue-600 text-sm hover:underline"
              >
                + Add Another Student
              </button>
            </div>
            {students.map((student, i) => (
              <div key={i} className="border rounded p-4 mb-4 last:mb-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm">Student {i + 1}</span>
                  {students.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStudent(i)}
                      className="text-red-500 text-sm hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={student.first_name}
                      onChange={(e) => updateStudent(i, 'first_name', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={student.last_name}
                      onChange={(e) => updateStudent(i, 'last_name', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      value={student.date_of_birth}
                      onChange={(e) => updateStudent(i, 'date_of_birth', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
                    <select
                      required
                      value={student.grade}
                      onChange={(e) => updateStudent(i, 'grade', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select grade</option>
                      {GRADES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Core Curriculum *</label>
                    <select
                      required
                      value={student.curriculum}
                      onChange={(e) => updateStudent(i, 'curriculum', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="Cambridge">Cambridge</option>
                      <option value="IB">IB</option>
                      <option value="KABV">KABV</option>
                      <option value="Home School">Home School</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Intake Group</label>
                    <input
                      type="text"
                      value={student.intake_group}
                      onChange={(e) => updateStudent(i, 'intake_group', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      placeholder="e.g. 2026-A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
                    <input
                      type="text"
                      value={student.zone}
                      onChange={(e) => updateStudent(i, 'zone', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      placeholder="e.g. North"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class Preference</label>
                    <select
                      value={student.class_section}
                      onChange={(e) => updateStudent(i, 'class_section', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">No preference</option>
                      <option value="A">Class A</option>
                      <option value="B">Class B</option>
                      <option value="C">Class C</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical Conditions / Allergies</label>
                    <textarea
                      value={student.medical_conditions}
                      onChange={(e) => updateStudent(i, 'medical_conditions', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={student.emergency_contact_name}
                      onChange={(e) => updateStudent(i, 'emergency_contact_name', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      value={student.emergency_contact_phone}
                      onChange={(e) => updateStudent(i, 'emergency_contact_phone', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section E: Preferences */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Preferences (Optional)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Schedule</label>
                <select
                  value={preferences.preferred_schedule}
                  onChange={(e) =>
                    setPreferences({ ...preferences, preferred_schedule: e.target.value as Preferences['preferred_schedule'] })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Needs / Notes</label>
                <textarea
                  value={preferences.special_needs}
                  onChange={(e) => setPreferences({ ...preferences, special_needs: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="bg-white rounded-lg shadow p-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Enrollment Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
