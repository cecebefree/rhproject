import { describe, expect, it } from 'vitest';

import {
  crmFamilyAccountSchema,
  invoiceSchema,
  registrationSchema,
  staffSchema,
  validateField,
  validateForm,
  type CRMFamilyAccountValues,
  type InvoiceFormValues,
  type RegistrationFormValues,
  type StaffFormValues,
} from '../validations';

// ---------------------------------------------------------------------------
// 1. Registration schema
// ---------------------------------------------------------------------------

describe('registrationSchema', () => {
  const validRegistration: RegistrationFormValues = {
    family_email: 'parent@example.com',
    child_name: 'Aisha Okoro',
    child_dob: '2015-06-15',
    amount_cents: 50000,
    payment_method: 'stripe',
  };

  it('accepts valid data', () => {
    const result = registrationSchema.safeParse(validRegistration);
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = registrationSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('family_email');
      expect(paths).toContain('child_name');
      expect(paths).toContain('child_dob');
      expect(paths).toContain('amount_cents');
      expect(paths).toContain('payment_method');
    }
  });

  it('rejects invalid email', () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      family_email: 'not-an-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssue = result.error.issues.find(
        (i) => i.path.join('.') === 'family_email',
      );
      expect(emailIssue?.message).toMatch(/valid email/i);
    }
  });

  it('rejects amount_cents that is not a positive integer', () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      amount_cents: -10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer amount_cents', () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      amount_cents: 10.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid payment_method enum value', () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      payment_method: 'bitcoin',
    });
    expect(result.success).toBe(false);
  });

  it('rejects child_dob in the future', () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      child_dob: '2099-01-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const dobIssue = result.error.issues.find(
        (i) => i.path.join('.') === 'child_dob',
      );
      expect(dobIssue?.message).toMatch(/past/i);
    }
  });

  it('rejects empty child_name', () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      child_name: '',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. CRM family account schema
// ---------------------------------------------------------------------------

describe('crmFamilyAccountSchema', () => {
  const validCRM: CRMFamilyAccountValues = {
    familyName: 'Okoro Family',
    email: 'okoro@example.com',
    phone: '+234 801 234 5678',
    address: '12 Marina Lagos',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    notes: 'VIP family',
  };

  it('accepts valid data', () => {
    const result = crmFamilyAccountSchema.safeParse(validCRM);
    expect(result.success).toBe(true);
  });

  it('accepts valid data with only required fields', () => {
    const result = crmFamilyAccountSchema.safeParse({
      familyName: 'Okoro',
      email: 'okoro@example.com',
      phone: '+2348012345678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = crmFamilyAccountSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('familyName');
      expect(paths).toContain('email');
      expect(paths).toContain('phone');
    }
  });

  it('rejects invalid email', () => {
    const result = crmFamilyAccountSchema.safeParse({
      ...validCRM,
      email: 'bad-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssue = result.error.issues.find(
        (i) => i.path.join('.') === 'email',
      );
      expect(emailIssue?.message).toMatch(/valid email/i);
    }
  });

  it('rejects invalid phone number format', () => {
    const result = crmFamilyAccountSchema.safeParse({
      ...validCRM,
      phone: '123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const phoneIssue = result.error.issues.find(
        (i) => i.path.join('.') === 'phone',
      );
      expect(phoneIssue?.message).toMatch(/valid phone/i);
    }
  });

  it('accepts phone with plus, spaces, and hyphens', () => {
    const result = crmFamilyAccountSchema.safeParse({
      ...validCRM,
      phone: '+234-801-234-5678',
    });
    expect(result.success).toBe(true);
  });

  it('optional fields can be undefined', () => {
    const result = crmFamilyAccountSchema.safeParse({
      familyName: 'Okoro',
      email: 'okoro@example.com',
      phone: '+2348012345678',
      address: undefined,
      city: undefined,
      notes: undefined,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Invoice schema
// ---------------------------------------------------------------------------

describe('invoiceSchema', () => {
  const validInvoice: InvoiceFormValues = {
    leadId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    invoiceNumber: 'INV-001',
    description: 'Term fees',
    status: 'draft',
    dueDate: '2026-10-01',
    items: [{ description: 'Tuition', quantity: 1, unit_price: 50000 }],
  };

  it('accepts valid data', () => {
    const result = invoiceSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
  });

  it('accepts valid data with only required fields', () => {
    const result = invoiceSchema.safeParse({
      leadId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      status: 'sent',
      dueDate: '2026-10-01',
      items: [{ description: 'Book', quantity: 1, unit_price: 100 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = invoiceSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('leadId');
      expect(paths).toContain('status');
      expect(paths).toContain('dueDate');
      expect(paths).toContain('items');
    }
  });

  it('rejects empty items array', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      items: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const itemsIssue = result.error.issues.find(
        (i) => i.path.join('.') === 'items',
      );
      expect(itemsIssue?.message).toMatch(/at least one/i);
    }
  });

  it('rejects negative unit_price in line item', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      items: [{ description: 'Book', quantity: 1, unit_price: -50 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero quantity in line item', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      items: [{ description: 'Book', quantity: 0, unit_price: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer quantity in line item', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      items: [{ description: 'Book', quantity: 1.5, unit_price: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty description in line item', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      items: [{ description: '', quantity: 1, unit_price: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid dueDate', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      dueDate: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('accepts multiple line items', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      items: [
        { description: 'Tuition', quantity: 1, unit_price: 50000 },
        { description: 'Books', quantity: 3, unit_price: 2000 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('allows zero unit_price (free item)', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      items: [{ description: 'Free trial', quantity: 1, unit_price: 0 }],
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Staff schema
// ---------------------------------------------------------------------------

describe('staffSchema', () => {
  const validStaff: StaffFormValues = {
    firstName: 'Chidi',
    lastName: 'Eze',
    email: 'chidi@school.com',
    phone: '+234 803 000 1111',
    staffType: 'teacher',
    dateOfBirth: '1990-03-20',
    enrollmentDate: '2025-09-01',
    mainZone: 'Junior School',
    departments: 'Mathematics',
    notes: 'Experienced',
  };

  it('accepts valid data', () => {
    const result = staffSchema.safeParse(validStaff);
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = staffSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('firstName');
      expect(paths).toContain('lastName');
      expect(paths).toContain('email');
      expect(paths).toContain('phone');
      expect(paths).toContain('staffType');
      expect(paths).toContain('dateOfBirth');
      expect(paths).toContain('enrollmentDate');
      expect(paths).toContain('mainZone');
    }
  });

  it('rejects invalid staffType enum value', () => {
    const result = staffSchema.safeParse({
      ...validStaff,
      staffType: 'janitor',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const staffTypeIssue = result.error.issues.find(
        (i) => i.path.join('.') === 'staffType',
      );
      expect(staffTypeIssue?.message).toMatch(/staff type/i);
    }
  });

  it('accepts all valid staffType values', () => {
    const types = [
      'teacher',
      'administrator',
      'expert',
      'wellness_coach',
      'guest',
      'coach',
    ] as const;

    for (const staffType of types) {
      const result = staffSchema.safeParse({
        ...validStaff,
        staffType,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects empty firstName', () => {
    const result = staffSchema.safeParse({
      ...validStaff,
      firstName: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty lastName', () => {
    const result = staffSchema.safeParse({
      ...validStaff,
      lastName: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = staffSchema.safeParse({
      ...validStaff,
      email: 'not-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects future dateOfBirth', () => {
    const result = staffSchema.safeParse({
      ...validStaff,
      dateOfBirth: '2099-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid enrollmentDate', () => {
    const result = staffSchema.safeParse({
      ...validStaff,
      enrollmentDate: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('optional fields can be undefined', () => {
    const result = staffSchema.safeParse({
      firstName: 'Chidi',
      lastName: 'Eze',
      email: 'chidi@school.com',
      phone: '+2348030001111',
      staffType: 'teacher',
      dateOfBirth: '1990-03-20',
      enrollmentDate: '2025-09-01',
      mainZone: 'Junior School',
      departments: undefined,
      notes: undefined,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. validateForm helper
// ---------------------------------------------------------------------------

describe('validateForm', () => {
  const schema = registrationSchema;

  const validData: RegistrationFormValues = {
    family_email: 'test@example.com',
    child_name: 'Test Child',
    child_dob: '2015-06-15',
    amount_cents: 25000,
    payment_method: 'paypal',
  };

  it('returns success with valid data', () => {
    const result = validateForm(schema, validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.family_email).toBe('test@example.com');
      expect(result.data.child_name).toBe('Test Child');
    }
  });

  it('returns typed errors with invalid data', () => {
    const result = validateForm(schema, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.errors).toBe('object');
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
      expect(typeof result.errors.family_email).toBe('string');
    }
  });

  it('returns first error per field only', () => {
    const result = validateForm(schema, {
      family_email: '',
      child_name: '',
      child_dob: '',
      amount_cents: 0,
      payment_method: 'stripe',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Each errored field should have exactly one error message
      for (const msg of Object.values(result.errors)) {
        expect(typeof msg).toBe('string');
        expect(msg.length).toBeGreaterThan(0);
      }
    }
  });

  it('validates against crmFamilyAccountSchema', () => {
    const result = validateForm(crmFamilyAccountSchema, {
      familyName: '',
      email: '',
      phone: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.familyName).toBeDefined();
      expect(result.errors.email).toBeDefined();
      expect(result.errors.phone).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 6. validateField helper
// ---------------------------------------------------------------------------

describe('validateField', () => {
  it('returns undefined for valid field value', () => {
    const error = validateField(
      registrationSchema,
      'family_email',
      validRegistrationData(),
    );
    expect(error).toBeUndefined();
  });

  it('returns error message string for invalid value', () => {
    const error = validateField(
      registrationSchema,
      'family_email',
      { ...validRegistrationData(), family_email: 'bad' },
    );
    expect(typeof error).toBe('string');
    expect(error!.length).toBeGreaterThan(0);
    expect(error).toMatch(/valid email/i);
  });

  it('returns undefined for non-existent field name', () => {
    const error = validateField(
      registrationSchema,
      'nonexistent_field',
      validRegistrationData(),
    );
    expect(error).toBeUndefined();
  });

  it('validates child_name field', () => {
    const error = validateField(
      registrationSchema,
      'child_name',
      { ...validRegistrationData(), child_name: '' },
    );
    expect(error).toBeDefined();
    expect(error).toMatch(/required/i);
  });

  it('validates amount_cents field', () => {
    const error = validateField(
      registrationSchema,
      'amount_cents',
      { ...validRegistrationData(), amount_cents: -5 },
    );
    expect(error).toBeDefined();
    expect(error).toMatch(/greater than 0/i);
  });

  it('returns undefined when entire form is valid', () => {
    const error = validateField(
      crmFamilyAccountSchema,
      'familyName',
      {
        familyName: 'Okoro',
        email: 'okoro@example.com',
        phone: '+2348012345678',
      },
    );
    expect(error).toBeUndefined();
  });

  it('returns error for invalid CRM phone', () => {
    const error = validateField(
      crmFamilyAccountSchema,
      'phone',
      {
        familyName: 'Okoro',
        email: 'okoro@example.com',
        phone: '12',
      },
    );
    expect(error).toBeDefined();
    expect(error).toMatch(/valid phone/i);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validRegistrationData(): RegistrationFormValues {
  return {
    family_email: 'test@example.com',
    child_name: 'Test Child',
    child_dob: '2015-06-15',
    amount_cents: 25000,
    payment_method: 'stripe',
  };
}
