// features/registration/types.ts
// Shared types for the registration flow (Row 92–95)

export type PaymentMethod = 'stripe' | 'paypal';

export interface RegistrationFormValues {
  family_email: string;
  child_name: string;
  child_dob: string;
  amount_cents: number;
  payment_method: PaymentMethod | '';
}

export interface RegistrationFormErrors {
  family_email?: string;
  child_name?: string;
  child_dob?: string;
  amount_cents?: string;
  payment_method?: string;
}

export interface PaymentSessionRequest {
  family_email: string;
  child_name: string;
  child_dob: string;
  amount_cents: number;
  payment_method: PaymentMethod;
  family_preferred_currency?: string;
  lead_id?: string;
}

export interface PaymentSessionResponse {
  status: 'success';
  redirect_url: string;
  payment_method: PaymentMethod;
}

export const INITIAL_FORM_VALUES: RegistrationFormValues = {
  family_email: '',
  child_name: '',
  child_dob: '',
  amount_cents: 0,
  payment_method: '',
};
