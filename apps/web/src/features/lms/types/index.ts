/**
 * LMS Entity Types
 * Covers tables not yet typed in services/supabase.ts (conversations, messages,
 * contracts, debit_orders, enrollments, student_class, etc.)
 */

// ── Shared ──────────────────────────────────────────────
export type UUID = string;
export type Timestamp = string; // ISO 8601

// ── Tenant ──────────────────────────────────────────────
export interface Tenant {
  id: UUID;
  name: string;
  slug: string;
  created_at: Timestamp;
}

// ── Student ─────────────────────────────────────────────
export interface Student {
  id: UUID;
  first_name: string;
  last_name: string;
  email: string | null;
  grade: string | null;
  academic_group_id: UUID | null;
  enrollment_status: string;
  enrollment_date: string | null;
  user_id: UUID | null;
  registration_id: UUID | null;
  tenant_id: UUID;
  created_at: Timestamp;
}

// ── Course ──────────────────────────────────────────────
export interface Course {
  id: UUID;
  title: string;
  description: string | null;
  teacher_id: UUID | null;
  published: boolean;
  tenant_id: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ── Student-Class (enrolment link) ──────────────────────
export interface StudentClass {
  student_id: UUID;
  class_id: UUID;
}

// ── Enrollment (school_desk schema) ─────────────────────
export interface Enrollment {
  id: UUID;
  student_id: UUID;
  course_id: UUID;
  purchased_at: Timestamp | null;
  payment_reference: string | null;
  tenant_id: UUID;
  registration_id: UUID | null;
}

// ── Contract ────────────────────────────────────────────
export type ContractStatus =
  | "draft"
  | "pending_signature"
  | "active"
  | "expired"
  | "terminated";

export interface ContractTerms {
  clauses?: string[];
  special_conditions?: string;
  [key: string]: unknown;
}

export interface Contract {
  id: UUID;
  tenant_id: UUID;
  student_id: UUID;
  enrollment_id: UUID | null;
  registration_id: UUID | null;
  status: ContractStatus;
  title: string;
  terms: ContractTerms;
  start_date: string | null;
  end_date: string | null;
  signed_at: Timestamp | null;
  signed_by: UUID | null;
  created_at: Timestamp;
}

// ── Debit Order ─────────────────────────────────────────
export type DebitOrderStatus =
  | "pending"
  | "active"
  | "completed"
  | "failed"
  | "cancelled";

export type DebitFrequency = "monthly" | "quarterly" | "annually";

export interface DebitOrder {
  id: UUID;
  student_id: UUID;
  amount: number;
  frequency: DebitFrequency;
  status: DebitOrderStatus;
  next_debit_date: string | null;
  start_date: string;
  end_date: string | null;
  last_debit_date: string | null;
  failed_attempts: number;
  max_retries: number;
  retry_day: number | null;
  tenant_id: UUID;
  created_at: Timestamp;
}

// ── Payment (public.payments – ledger) ──────────────────
export type PaymentType = "debit_order" | "manual" | "online" | "refund";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export interface Payment {
  id: UUID;
  student_id: UUID;
  amount: number;
  status: PaymentStatus;
  payment_type: PaymentType;
  stripe_payment_intent_id: string | null;
  debit_order_id: UUID | null;
  tenant_id: UUID;
  created_at: Timestamp;
}

// ── Conversation ────────────────────────────────────────
export type ConversationCategory =
  | "support"
  | "billing"
  | "academic"
  | "general";

export interface Conversation {
  id: UUID;
  tenant_id: UUID;
  category: ConversationCategory;
  created_by: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ── Conversation Member ─────────────────────────────────
export type ConversationRole = "admin" | "parent" | "teacher" | "student";

export interface ConversationMember {
  conversation_id: UUID;
  profile_id: UUID;
  role: ConversationRole;
  joined_at: Timestamp;
  last_read_at: Timestamp | null;
}

// ── Message ─────────────────────────────────────────────
export interface Message {
  id: UUID;
  conversation_id: UUID;
  sender_id: UUID;
  body: string;
  payload: unknown | null;
  event: string | null;
  topic: string | null;
  extension: string | null;
  private: boolean;
  created_at: Timestamp;
  updated_at: Timestamp | null;
  edited_at: Timestamp | null;
  deleted_at: Timestamp | null;
}

// ── Profile ─────────────────────────────────────────────
export type ProfileRole =
  | "student"
  | "parent"
  | "teacher"
  | "admin"
  | "office";

export interface Profile {
  id: UUID;
  user_id: UUID;
  full_name: string;
  role: ProfileRole;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  tenant_id: UUID;
  created_at: Timestamp;
}

// ── Registration (office_desk schema) ───────────────────
export type RegistrationStatus =
  | "pending_init"
  | "pending_review"
  | "approved"
  | "rejected"
  | "enrolled";

export interface Registration {
  id: UUID;
  tenant_id: UUID;
  student_name: string;
  student_email: string;
  student_phone: string | null;
  course_name: string | null;
  status: RegistrationStatus;
  stripe_charge_id: string | null;
  created_at: Timestamp;
}

// ── Invoice (office_desk schema) ────────────────────────
export type InvoiceStatus =
  | "draft"
  | "issued"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled"
  | "void";

export interface Invoice {
  id: UUID;
  tenant_id: UUID;
  lead_id: UUID | null;
  family_account_id: UUID | null;
  registration_id: UUID | null;
  stripe_session_id: string | null;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_processor: string | null;
  created_at: Timestamp;
}

// ── Notification ────────────────────────────────────────
export type NotificationType =
  | "new_registration"
  | "payment_received"
  | "payment_reminder"
  | "contract_created"
  | "debit_order_failed";

export interface Notification {
  id: UUID;
  tenant_id: UUID;
  registration_id: UUID | null;
  notification_type: NotificationType;
  status: "pending" | "sent" | "failed";
  email_to: string;
  sent_at: Timestamp | null;
  created_at: Timestamp;
}
