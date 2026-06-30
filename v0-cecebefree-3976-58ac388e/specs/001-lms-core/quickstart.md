# Quickstart: LMS Core Validation Guide

## Prerequisites

1. Supabase instance running locally (`supabase start`) or remote
2. Migrations applied (`supabase migration up`)
3. Web app running (`make dev` or `pnpm --filter web dev`)
4. Test user accounts created (student, instructor, admin roles)

## Validation Scenarios

### Scenario 1: Student Registration and Course Purchase

**Purpose**: Verify student can create account and purchase course access

**Setup**:
- No existing account with test email
- At least one published course available

**Steps**:
1. Navigate to registration page
2. Enter name, email, password (8+ chars)
3. Submit registration form
4. Verify confirmation email received (or success message if email disabled in dev)
5. Log in with new credentials
6. Browse available courses
7. Select a course and initiate purchase
8. Complete payment flow (test mode)
9. Verify course appears in "My Courses" with full access

**Expected Outcome**: Student can log in and access purchased course content immediately

**Reference**: FR-001, FR-002, FR-003, FR-004, FR-005

---

### Scenario 2: Sequential Chapter Viewing

**Purpose**: Verify chapters unlock only after previous chapter is completed

**Setup**:
- Logged in as student with enrolled course (10 chapters)
- Course has not been started

**Steps**:
1. Open enrolled course
2. Verify Chapter 1 is unlocked, Chapters 2-10 are locked
3. Watch Chapter 1 video to completion
4. Verify Chapter 1 shows as completed
5. Verify Chapter 2 is now unlocked
6. Attempt to click on a locked chapter (e.g., Chapter 5)
7. Verify access is denied with appropriate message

**Expected Outcome**: Chapters unlock sequentially; locked chapters cannot be accessed

**Reference**: FR-007, FR-008, FR-009

---

### Scenario 3: Progress Tracking

**Purpose**: Verify student sees accurate progress across courses

**Setup**:
- Logged in as student with partially completed course (3/10 chapters)

**Steps**:
1. View course detail page
2. Verify progress indicator shows ~30%
3. View "My Courses" dashboard
4. Verify completion percentage displayed for each enrolled course
5. Complete course (all chapters)
6. Verify course shows 100% complete
7. Verify congratulations message displayed

**Expected Outcome**: Progress percentage reflects actual chapter completion

**Reference**: FR-010, FR-011, SC-003

---

### Scenario 4: Instructor Course Creation

**Purpose**: Verify instructor can create, add chapters to, and publish a course

**Setup**:
- Logged in as instructor

**Steps**:
1. Navigate to "My Courses" instructor view
2. Click "Create New Course"
3. Enter title, description, price
4. Verify course created in draft status
5. Add Chapter 1: title, description, video URL
6. Add Chapter 2 with different content
7. Attempt to publish course with only 2 chapters
8. Verify course is published and visible to students
9. Edit chapter title
10. Verify change reflected

**Expected Outcome**: Instructor can create and publish a multi-chapter course

**Reference**: FR-012, FR-013, FR-014, FR-015, FR-016, SC-005

---

### Scenario 5: Admin Registration Oversight

**Purpose**: Verify admin can view all registrations and student progress

**Setup**:
- Logged in as admin
- Multiple students enrolled in various courses

**Steps**:
1. Navigate to admin registrations view
2. Verify all student enrollments listed with student name, course, date, payment status
3. Navigate to admin progress view
4. Verify each student's completion percentage per course
5. Filter by specific course
6. Verify only students in that course shown
7. Filter by specific student
8. Verify only that student's enrollments shown

**Expected Outcome**: Admin has full visibility into registrations and progress

**Reference**: FR-018, FR-019, FR-020, SC-006

---

### Scenario 6: Unenrolled Access Blocked

**Purpose**: Verify students without enrollment cannot access course content

**Setup**:
- Logged in as student with NO course purchases
- Navigate to course catalog

**Steps**:
1. Browse available courses
2. Click on a course to view details (should show chapters list)
3. Attempt to watch any video
4. Verify purchase prompt shown
5. Verify cannot access video player

**Expected Outcome**: Unenrolled students see purchase prompt, cannot watch content

**Reference**: FR-006

---

## Edge Case Validation

### Test: Duplicate Registration Blocked
1. Attempt to register with existing email
2. Verify error message and prompt to log in

### Test: Empty Course Cannot Publish
1. As instructor, create course with no chapters
2. Attempt to publish
3. Verify error preventing publish

### Test: Chapter Reordering
1. As instructor, view course with multiple chapters
2. Reorder chapters
3. Verify new order persists

### Test: Progress After Chapter Deletion
1. As admin, delete a chapter from a course
2. Verify enrolled students' progress reflects removal
3. Verify completion percentages update accordingly

## Test Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Student | student@test.com | TestPass123 | Create via registration |
| Instructor | instructor@test.com | TestPass123 | Create via admin |
| Admin | admin@test.com | TestPass123 | Create via admin |

## Running Tests

```bash
# Database tests (pgTAP)
make test

# Frontend unit tests
pnpm --filter web test

# E2E tests (Playwright)
pnpm --filter web test:e2e

# Full build verification
make build:all
```