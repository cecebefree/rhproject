// src/types/subtypes.ts
// Subtype taxonomy for Student and Adult profiles
// Defines the role-specific subtypes used across the mobile app

// ═══════════════════════════════════════════════════════════
// STUDENT SUBTYPES
// ═══════════════════════════════════════════════════════════

/** Curriculum track a student follows */
export type CurriculumType =
  | 'cambridge'
  | 'ib'
  | 'kabv'
  | 'home_school';

/** Student registration status */
export type StudentRegistrationStatus =
  | 'pending_init'
  | 'pending_review'
  | 'pending_payment'
  | 'approved'
  | 'active'
  | 'withdrawn'
  | 'rejected';

/** Student enrollment status per class */
export type StudentEnrollmentStatus =
  | 'enrolled'
  | 'available'
  | 'waitlisted';

/** Student profile subtypes by registration context */
export interface InternalStudent {
  kind: 'internal';
  curriculum: CurriculumType | null;
  current_stage: string | null;
  intake_group: string | null;
}

export interface ExternalStudent {
  kind: 'external';
  curriculum: CurriculumType | null;
  current_stage: string | null;
}

export interface AlumniStudent {
  kind: 'alumni';
  curriculum: CurriculumType | null;
  graduated_at: string | null;
}

/** Discriminated union of all student subtypes */
export type StudentSubtype =
  | InternalStudent
  | ExternalStudent
  | AlumniStudent;

// ═══════════════════════════════════════════════════════════
// ADULT SUBTYPES
// ═══════════════════════════════════════════════════════════

/** Relationship of an adult to a student */
export type AdultRelationship =
  | 'father'
  | 'mother'
  | 'guardian'
  | 'sponsor'
  | 'grandparent'
  | 'other';

/** Family account status */
export type FamilyAccountStatus =
  | 'active'
  | 'suspended'
  | 'closed';

/** Adult profile subtypes by relationship context */
export interface ParentAdult {
  kind: 'parent';
  relationship: 'father' | 'mother';
  family_account_id: string | null;
  family_account_status: FamilyAccountStatus | null;
}

export interface GuardianAdult {
  kind: 'guardian';
  relationship: 'guardian' | 'sponsor' | 'grandparent' | 'other';
  family_account_id: string | null;
  family_account_status: FamilyAccountStatus | null;
}

/** Discriminated union of all adult subtypes */
export type AdultSubtype =
  | ParentAdult
  | GuardianAdult;

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

export const CURRICULUM_LABELS: Record<CurriculumType, string> = {
  cambridge: 'Cambridge',
  ib: 'International Baccalaureate',
  kabv: 'KABV',
  home_school: 'Home School',
};

export const STUDENT_REGISTRATION_LABELS: Record<StudentRegistrationStatus, string> = {
  pending_init: 'Not Started',
  pending_review: 'Under Review',
  pending_payment: 'Awaiting Payment',
  approved: 'Approved',
  active: 'Active',
  withdrawn: 'Withdrawn',
  rejected: 'Rejected',
};

export const ADULT_RELATIONSHIP_LABELS: Record<AdultRelationship, string> = {
  father: 'Father',
  mother: 'Mother',
  guardian: 'Guardian',
  sponsor: 'Sponsor',
  grandparent: 'Grandparent',
  other: 'Other',
};
