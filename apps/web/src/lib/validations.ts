/**
 * Zod validation schemas for main forms across the web app.
 *
 * Covers:
 *   - Registration (family registration with payment)
 *   - CRM (family account management)
 *   - Invoice (invoice creation with line items)
 *   - Staff (staff profile management)
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Non-empty trimmed string (used as base for required text fields). */
const requiredString = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`);

/** Optional string that is trimmed; empty strings become undefined. */
const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))
  .optional();

/** Valid email address. */
const emailField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .email(`${label} must be a valid email address`);

/** Phone number — allows +, digits, spaces, and hyphens. */
const phoneField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .regex(
      /^\+?[\d\s-]{7,20}$/,
      `${label} must be a valid phone number`,
    );

// ---------------------------------------------------------------------------
// 1. Registration form (family registration with payment)
// ---------------------------------------------------------------------------

export const registrationSchema = z.object({
  family_email: emailField('Email'),
  child_name: requiredString('Child name'),
  child_dob: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((val) => {
      const dob = new Date(val);
      if (Number.isNaN(dob.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dob < today;
    }, 'Date of birth must be a valid date in the past'),
  amount_cents: z
    .number()
    .int('Amount must be a whole number')
    .positive('Amount must be greater than 0'),
  payment_method: z.enum(['stripe', 'paypal'], {
    message: 'Select a payment method',
  }),
});

export type RegistrationFormValues = z.infer<typeof registrationSchema>;

export const REGISTRATION_DEFAULTS: RegistrationFormValues = {
  family_email: '',
  child_name: '',
  child_dob: '',
  amount_cents: 0,
  payment_method: 'stripe',
};

// ---------------------------------------------------------------------------
// 2. CRM form (family account)
// ---------------------------------------------------------------------------

export const crmFamilyAccountSchema = z.object({
  familyName: requiredString('Family name'),
  email: emailField('Email'),
  phone: phoneField('Phone'),
  address: optionalString,
  city: optionalString,
  state: optionalString,
  country: optionalString,
  notes: optionalString,
});

export type CRMFamilyAccountValues = z.infer<typeof crmFamilyAccountSchema>;

export const CRM_FAMILY_ACCOUNT_DEFAULTS: CRMFamilyAccountValues = {
  familyName: '',
  email: '',
  phone: '',
  address: undefined,
  city: undefined,
  state: undefined,
  country: undefined,
  notes: undefined,
};

// ---------------------------------------------------------------------------
// 3. Invoice form
// ---------------------------------------------------------------------------

const invoiceLineItemSchema = z.object({
  description: requiredString('Item description'),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .positive('Quantity must be at least 1'),
  unit_price: z
    .number()
    .min(0, 'Unit price cannot be negative'),
});

export const invoiceSchema = z.object({
  leadId: requiredString('Client'),
  invoiceNumber: optionalString,
  description: optionalString,
  status: z.enum(['draft', 'sent'], {
    message: 'Select an invoice status',
  }),
  dueDate: z
    .string()
    .min(1, 'Due date is required')
    .refine((val) => {
      const date = new Date(val);
      return !Number.isNaN(date.getTime());
    }, 'Enter a valid date'),
  items: z
    .array(invoiceLineItemSchema)
    .min(1, 'At least one line item is required'),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;

export const INVOICE_DEFAULTS: InvoiceFormValues = {
  leadId: '',
  invoiceNumber: undefined,
  description: undefined,
  status: 'draft',
  dueDate: '',
  items: [{ description: '', quantity: 1, unit_price: 0 }],
};

// ---------------------------------------------------------------------------
// 4. Staff form
// ---------------------------------------------------------------------------

export const staffSchema = z.object({
  firstName: requiredString('First name'),
  lastName: requiredString('Last name'),
  email: emailField('Email'),
  phone: phoneField('Phone'),
  staffType: z.enum(
    ['teacher', 'administrator', 'expert', 'wellness_coach', 'guest', 'coach'],
    { message: 'Select a staff type' },
  ),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((val) => {
      const dob = new Date(val);
      if (Number.isNaN(dob.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dob < today;
    }, 'Date of birth must be a valid date in the past'),
  enrollmentDate: z
    .string()
    .min(1, 'Enrollment date is required')
    .refine((val) => !Number.isNaN(new Date(val).getTime()), 'Enter a valid date'),
  mainZone: requiredString('Main zone'),
  departments: optionalString,
  notes: optionalString,
});

export type StaffFormValues = z.infer<typeof staffSchema>;

export const STAFF_DEFAULTS: StaffFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  staffType: 'teacher',
  dateOfBirth: '',
  enrollmentDate: '',
  mainZone: '',
  departments: undefined,
  notes: undefined,
};

// ---------------------------------------------------------------------------
// Validation helper — safeParse wrapper for form use
// ---------------------------------------------------------------------------

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string> };

/**
 * Validate form values against a Zod schema and return a flat
 * `Record<string, string>` error map suitable for form state.
 *
 * @example
 * ```ts
 * const result = validateForm(registrationSchema, values);
 * if (!result.success) setErrors(result.errors);
 * ```
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  values: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(values);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    // Keep first error per field
    if (path && !errors[path]) {
      errors[path] = issue.message;
    }
  }

  return { success: false, errors };
}

/**
 * Validate a single field value and return its error message (or undefined).
 */
export function validateField<T>(
  schema: z.ZodSchema<T>,
  fieldName: string,
  values: unknown,
): string | undefined {
  const result = schema.safeParse(values);
  if (result.success) return undefined;

  for (const issue of result.error.issues) {
    if (issue.path.join('.') === fieldName) {
      return issue.message;
    }
  }

  return undefined;
}
