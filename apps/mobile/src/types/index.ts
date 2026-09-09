// src/types/index.ts
// Barrel export for all mobile app types

export type {
  UserRole,
  BaseProfile,
  StudentProfile,
  EnrolledClass,
  AdultProfile,
  ChildRecord,
  FamilyAccountDetail,
  TeacherProfile,
  TeacherClass,
  TeacherStudent,
  InvoiceRecord,
  PaymentRecord,
  RegistrationRecord,
  DayOfWeek,
} from './profile';

export {
  DAY_LABELS,
  REGISTRATION_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  INVOICE_STATUS_COLORS,
} from './profile';

export type {
  StaffRole,
  StaffDesk,
  StaffProfile,
  StaffCourseAssignment,
} from './staff';

export {
  STAFF_ROLE_LABELS,
  STAFF_DESK_LABELS,
  STAFF_ROLE_COLORS,
} from './staff';

export type {
  CurriculumType,
  StudentRegistrationStatus,
  StudentEnrollmentStatus,
  InternalStudent,
  ExternalStudent,
  AlumniStudent,
  StudentSubtype,
  AdultRelationship,
  FamilyAccountStatus,
  ParentAdult,
  GuardianAdult,
  AdultSubtype,
} from './subtypes';

export {
  CURRICULUM_LABELS,
  STUDENT_REGISTRATION_LABELS,
  ADULT_RELATIONSHIP_LABELS,
} from './subtypes';

export type {
  EnrollmentStatus,
  ClassItem,
  ScheduleSlot,
} from './classes';

export type {
  ClassDetail,
  CurriculumChapter,
  ScheduleSlotDetail,
  MaterialItem,
} from './classDetail';
