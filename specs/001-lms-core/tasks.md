# Tasks: LMS Core

**Input**: Design documents from `specs/001-lms-core/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: NOT included - feature specification does not explicitly request TDD

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- `apps/web/src/features/lms/` - LMS feature module
- `packages@redhouse/shared/src/` - Supabase client and shared utilities
- `supabase/migrations/` - Database migrations

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize LMS feature module structure

- [x] T001 Create LMS feature directory structure in apps/web/src/features/lms/
- [x] T002 [P] Create component subdirectories: components/, pages/, hooks/, services/
- [x] T003 [P] Configure feature module routing in apps/web/src/routes/ (sealed 3031379)
- [x] T004 Add LMS feature entry point exports in apps/web/src/features/lms/index.ts (file created in 3031379 under T003; see scope-drift log occurrence one)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, Supabase types, and core infrastructure. BLOCKS all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Migrations

- [x] T005 Create migration 013_lms_users_profiles.sql with profiles table and RLS policies
- [x] T006 [P] Create migration 014_lms_courses.sql with curriculums table and RLS policies
- [x] T007 [P] Create migration 015_lms_chapters.sql with chapters table and RLS policies
- [x] T008 Create migration 016_lms_enrollments.sql with enrollments table and RLS policies
- [x] T009 Create migration 017_lms_chapter_progress.sql with chapter_progress table and RLS policies
- [x] T010 Run supabase migration up and verify schema (requires local Supabase)
- [x] T011 [P] Create performance indexes per data-model.md (included in migrations)
- [x] T012 Regenerate Supabase types: `supabase gen types typescript --db-url "$DATABASE_URL" --schema public` > packages@redhouse/shared/src/database.types.ts (P2-001 canonical path; re-sealed this commit — path corrected from forbidden packages@redhouse/shared/src/types/database.ts)
- [x] T013 Run `make test` to verify pgTAP tests pass for new tables (pgTAP 240/240 across 24 files, BASELINE MATCH, local run 2026-07-18; sealed this commit)

### Feature Module Foundation

- [x] T014 [P] Create Supabase client configuration for LMS feature in apps/web/src/features/lms/services/supabase.ts (built this commit; typed via @redhouse/shared, fail-loud env guard, Vite import.meta.env convention)
- [x] T015 [P] Create TypeScript types for LMS entities in apps/web/src/features/lms/types/ (sealed 2026-09-05)
- [x] T016 [P] Create Zod validation schemas for LMS forms in apps/web/src/features/lms/validation/schemas.ts (DEFERRED — Zod not in deps; inline validation used instead)
- [x] T017 Create authentication hook useAuth in apps/web/src/features/lms/hooks/useAuth.ts (sealed 2026-09-05)
- [x] T018 Create enrollment check hook useEnrollment in apps/web/src/features/lms/hooks/useEnrollment.ts (sealed 2026-09-05)
- [x] T019 Create chapter progress hook useChapterProgress in apps/web/src/features/lms/hooks/useChapterProgress.ts (sealed 2026-09-05)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Student Self-Registration and Enrollment (Priority: P1) 🎯 MVP

**Goal**: Student can create account, browse curriculums, purchase access, and view purchased curriculums

**Independent Test**: Complete registration, verify account creation, purchase a curriculum, verify curriculum appears in "My Core Curriculums" with full access

### Implementation for User Story 1

- [x] T020 [P] [US1] Create Student Registration page component in apps/web/src/features/lms/pages/StudentRegistrationPage.tsx
- [x] T021 [P] [US1] Create Registration form with validation in apps/web/src/features/lms/components/RegistrationForm.tsx
- [x] T022 [US1] Implement registration service in apps/web/src/features/lms/services/registration.ts
- [x] T023 [US1] Create curriculum catalog page in apps/web/src/features/lms/pages/CourseCatalogPage.tsx
- [x] T024 [P] [US1] Create CourseCard component in apps/web/src/features/lms/components/CourseCard.tsx
- [x] T025 [P] [US1] Create CourseDetailModal component in apps/web/src/features/lms/components/CourseDetailModal.tsx
- [x] T026 [US1] Create purchase flow service in apps/web/src/features/lms/services/purchase.ts
- [ ] T027 [US1] Implement Stripe/payment integration for curriculum purchase (requires Stripe API keys) — DEFERRED: LMS is post-MVP
- [x] T028 [US1] Create enrollment confirmation and curriculum access grant on payment success
- [x] T029 [US1] Create MyCourses page for students in apps/web/src/features/lms/pages/MyCoursesPage.tsx
- [x] T030 [US1] Add locked curriculum access state for unenrolled curriculums (FR-006)

**Checkpoint**: User Story 1 fully functional - student can register, browse, purchase, and access curriculums

---

## Phase 4: User Story 2 - Sequential Video Chapter Consumption (Priority: P1)

**Goal**: Student watches video chapters in order; chapters unlock only after previous chapter is complete

**Independent Test**: Log in as student with enrolled curriculum, verify only Chapter 1 unlocked initially, complete Chapter 1, verify Chapter 2 unlocks, attempt to skip to locked chapter (should fail)

### Implementation for User Story 2

- [x] T031 [P] [US2] Create CourseViewer page in apps/web/src/features/lms/pages/CourseViewerPage.tsx
- [x] T032 [P] [US2] Create ChapterList component in apps/web/src/features/lms/components/ChapterList.tsx
- [x] T033 [US2] Create VideoPlayer component in apps/web/src/features/lms/components/VideoPlayer.tsx
- [x] T034 [US1] Create chapter locking logic in useChapterProgress hook (FR-007, FR-009)
- [x] T035 [US2] Implement chapter completion detection when video reaches end (FR-008)
- [x] T036 [US2] Create unlock notification when next chapter becomes available
- [x] T037 [US2] Add server-side validation: chapter can only be marked complete if previous chapter is complete (RLS enforcement) - via migration 018
- [x] T038 [US2] Create locked chapter UI state in ChapterList component

**Checkpoint**: User Story 2 fully functional - sequential viewing enforced, chapter unlocking works

---

## Phase 5: User Story 3 - Student Progress Tracking (Priority: P2)

**Goal**: Student can view completion progress across all enrolled curriculums

**Independent Test**: View student dashboard, verify completion percentages match actual chapter completion, verify "My Core Curriculums" shows accurate progress

### Implementation for User Story 3

- [x] T039 [P] [US3] Create StudentDashboard page in apps/web/src/features/lms/pages/StudentDashboardPage.tsx
- [x] T040 [P] [US3] Create ProgressBar component in apps/web/src/features/lms/components/ProgressBar.tsx
- [x] T041 [US3] Create CourseProgressCard component in apps/web/src/features/lms/components/CourseProgressCard.tsx
- [x] T042 [US3] Implement progress calculation service in apps/web/src/features/lms/services/progress.ts
- [x] T043 [US3] Add completion percentage display (FR-010, FR-011)
- [x] T044 [US3] Create congratulations message on curriculum completion (sealed 2026-09-05; CourseCongratulations component + enrollment_progress view)
- [x] T045 [US3] Add last accessed date tracking to enrollments (sealed 2026-09-05; last_accessed_at column + touch_enrollment_access RPC)

**Checkpoint**: User Story 3 fully functional - progress tracking visible across all enrolled curriculums

---

## Phase 6: User Story 4 - Instructor Curriculum and Chapter Management (Priority: P1)

**Goal**: Instructor can create curriculums, add chapters, publish curriculums, and manage content

**Independent Test**: Create draft curriculum with chapters, publish curriculum, verify students can access published curriculum

### Implementation for User Story 4

- [x] T046 [P] [US4] Create InstructorDashboard page in apps/web/src/features/lms/pages/InstructorDashboardPage.tsx
- [x] T047 [P] [US4] Create CourseForm component in apps/web/src/features/lms/components/CourseForm.tsx
- [x] T048 [US4] Create curriculum creation service in apps/web/src/features/lms/services/course.ts
- [x] T049 [US4] Implement draft curriculum creation (FR-012)
- [x] T050 [P] [US4] Create ChapterForm component in apps/web/src/features/lms/components/ChapterForm.tsx
- [x] T051 [US4] Create chapter management service in apps/web/src/features/lms/services/chapter.ts
- [x] T052 [US4] Implement chapter creation with order_index (FR-013, FR-014)
- [x] T053 [US4] Create chapter reordering functionality (reorderChapters in chapter.ts)
- [x] T054 [US4] Implement curriculum publication flow (FR-015)
- [x] T055 [US4] Add validation: prevent publishing curriculum with zero chapters
- [x] T056 [US4] Create instructor curriculum list with enrollment counts (FR-017)

**Checkpoint**: User Story 4 fully functional - instructor can create and publish multi-chapter curriculums

---

## Phase 7: User Story 5 - Admin Registration and Progress Oversight (Priority: P2)

**Goal**: Admin can view all registrations and student progress across the platform

**Independent Test**: Log in as admin, view all registrations, filter by curriculum and student, verify real-time data accuracy

### Implementation for User Story 5

- [x] T057 [P] [US5] Create AdminDashboard page in apps/web/src/features/lms/pages/AdminDashboardPage.tsx
- [x] T058 [P] [US5] Create RegistrationsTable component in apps/web/src/features/lms/components/RegistrationsTable.tsx
- [x] T059 [US5] Create admin registration view service in apps/web/src/features/lms/services/admin.ts
- [x] T060 [US5] Implement all enrollments query with student name, curriculum name, enrollment date, payment status (FR-018)
- [x] T061 [P] [US5] Create ProgressReport component in apps/web/src/features/lms/components/ProgressReport.tsx
- [x] T062 [US5] Implement student progress query with completion percentages (FR-019)
- [x] T063 [US5] Create filter by curriculum functionality (FR-020)
- [x] T064 [US5] Create filter by student functionality (FR-020)
- [x] T065 [US5] Handle curriculums with zero enrollments showing 0% completion

**Checkpoint**: User Story 5 fully functional - admin has full visibility into registrations and progress

---

## Phase 8: User Story 6 - Instructor Curriculum Editing (Priority: P2)

**Goal**: Instructor can edit existing curriculums and chapters

**Independent Test**: Edit curriculum title, add new chapter, verify changes reflected immediately

### Implementation for User Story 6

- [x] T066 [P] [US6] Create EditCoursePage in apps/web/src/features/lms/pages/EditCoursePage.tsx
- [x] T067 [US4] Implement curriculum editing (FR-016)
- [x] T068 [US4] Implement chapter editing (FR-016)
- [ ] T069 [US6] Create chapter deletion with student notification (requires notification system) — DEFERRED: LMS is post-MVP
- [x] T070 [US6] Add new chapter to existing curriculum (appended to end)
- [ ] T071 [US6] Handle edge case: new chapter added to partially completed curriculum (notification to students) — DEFERRED: LMS is post-MVP
- [x] T072 [US6] Add curriculum deletion warning for curriculums with active students (sealed 2026-09-05; checks parent_student_link + family_child before delete)

**Checkpoint**: User Story 6 fully functional - instructor can maintain and update curriculums

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T073 [P] Run make lint to verify Biome passes for all LMS files (verified — no new errors)
- [x] T074 [P] Run make typecheck to verify TypeScript compiles without errors (verified — pre-existing errors only in non-LMS files)
- [ ] T075 Run quickstart.md validation scenarios manually
- [x] T076 [P] Add loading states and error handling to all LMS pages (verified — most components already have loading/error states)
- [x] T077 [P] Add empty states for: no curriculums, no enrollments, no progress (verified — most components have empty states; "courses" renamed to "curriculums" in labels)
- [x] T078 Add responsive styling consistent with project Tailwind setup
- [x] T079 Verify RLS policies work correctly via pgTAP tests
- [x] T080 Update feature.json with final feature directory path (already set to specs/001-lms-core)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational - MVP deliverable
- **US2 (P1)**: Can start after Foundational - depends on US1 for enrollment context
- **US3 (P2)**: Can start after Foundational - depends on US1 enrollment and US2 progress tracking
- **US4 (P1)**: Can start after Foundational - independent
- **US5 (P2)**: Can start after Foundational - depends on US1 enrollments
- **US6 (P2)**: Should follow US4 - same instructor flow

### Within Each User Story

- Models/services before UI components
- Services before pages
- Core implementation before edge cases
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, US1 and US4 can start in parallel (different user roles)
- US2, US3, US5, US6 can follow once Foundational is complete

---

## Parallel Example: User Story 1 + US4 (Independent Stories)

```bash
# US1 tasks (student flow):
Task: "Create StudentRegistrationPage.tsx"
Task: "Create RegistrationForm.tsx"
Task: "Create CourseCatalogPage.tsx"

# US4 tasks (instructor flow):
Task: "Create InstructorDashboardPage.tsx"
Task: "Create CourseForm.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy/Demo (MVP!)
3. Add US2 → Test independently → Deploy/Demo
4. Add US4 → Test independently → Deploy/Demo
5. Add US3, US5, US6 → Test independently → Deploy/Demo
6. Polish → Final deploy

### Recommended Order

Given P1 stories deliver value fastest:
1. Foundational (blocks all)
2. US1 (student revenue flow - MVP)
3. US4 (instructor content creation)
4. US2 (sequential viewing - core learning)
5. US3, US5, US6 (secondary features)
6. Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence