# Feature Specification: LMS Core

**Feature Branch**: `001-lms-core`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Build a learning management system for Redhouse where students sign up, pay for curriculum access, watch video chapters in order, and track their completion progress; instructors create and manage curriculums and chapters; admins view all registrations and student progress. Focus on what students, instructors, and admins can do, not on any technology."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Student Self-Registration and Curriculum Purchase (Priority: P1)

A prospective student discovers Redhouse, creates an account, and purchases access to a curriculum to begin learning.

**Why this priority**: This is the primary revenue-generating flow. Without it, no students can use the platform. It validates the entire enrollment and payment process.

**Independent Test**: Can be fully tested by completing the registration form, verifying account creation, and completing a purchase transaction for curriculum access. Delivers a registered student with paid curriculum access.

**Acceptance Scenarios**:

1. **Given** a prospective student with a valid email, **When** they complete the registration form with name, email, and password, **Then** their account is created and they receive a confirmation email.

2. **Given** a registered student with no purchased curriculums, **When** they select a curriculum and complete the payment, **Then** the curriculum appears in their "My Core Curriculums" section with full access.

3. **Given** a student who has purchased a curriculum, **When** they attempt to access curriculum content, **Then** they can view all chapters and watch videos without additional payment prompts.

4. **Given** a student who has NOT purchased a curriculum, **When** they attempt to access curriculum content, **Then** they are shown a purchase prompt and cannot view video content.

---

### User Story 2 - Sequential Video Chapter Consumption (Priority: P1)

A student with curriculum access watches video chapters in order, completing each chapter before advancing to the next.

**Why this priority**: Core learning experience. Sequential viewing ensures proper pedagogy and content coverage. Without this, the value proposition of the curriculum is diminished.

**Independent Test**: Can be fully tested by logging in as a student with curriculum access, navigating to the curriculum, and verifying that chapters unlock only after the previous chapter is completed. Delivers measurable learning progress.

**Acceptance Scenarios**:

1. **Given** a student with curriculum access who has not started the curriculum, **When** they open the curriculum, **Then** only Chapter 1 is unlocked and available to watch; all subsequent chapters are locked.

2. **Given** a student watching Chapter 1, **When** they complete the video (reaches the end), **Then** Chapter 1 is marked complete and Chapter 2 becomes unlocked.

3. **Given** a student who has completed Chapters 1-3, **When** they return to the curriculum, **Then** Chapters 1-3 show as completed, Chapter 4 is unlocked, and Chapters 5+ remain locked.

4. **Given** a student watching a chapter, **When** they attempt to skip ahead to a locked chapter, **Then** the system prevents access and displays a message indicating they must complete prior chapters first.

---

### User Story 3 - Student Progress Tracking (Priority: P2)

A student tracks their learning journey by viewing which curriculums and chapters they have completed.

**Why this priority**: Motivation and retention. Students need visibility into their accomplishments to stay engaged and see their investment of time and money yielding results.

**Independent Test**: Can be fully tested by viewing the student dashboard and verifying completion percentages and chapter statuses match actual viewing history. Delivers actionable progress visibility.

**Acceptance Scenarios**:

1. **Given** a student who has completed 3 of 10 chapters in a curriculum, **When** they view the curriculum, **Then** the progress indicator shows 30% complete and lists completed chapters.

2. **Given** a student on the dashboard, **When** they view "My Core Curriculums", **Then** each enrolled curriculum displays its completion percentage and last accessed date.

3. **Given** a student who completes all chapters in a curriculum, **When** they finish the final video, **Then** the curriculum is marked as 100% complete and a congratulations message is displayed.

---

### User Story 4 - Instructor Curriculum and Chapter Management (Priority: P1)

An instructor creates a new curriculum, adds chapters with video content, and manages the curriculum lifecycle.

**Why this priority**: This is how content enters the platform. Without this, the student-facing flows have no content to consume. Core value creation for the platform.

**Independent Test**: Can be fully tested by creating a curriculum, adding chapters in sequence, publishing the curriculum, and verifying students can access it. Delivers a published curriculum with structured content.

**Acceptance Scenarios**:

1. **Given** an authenticated instructor, **When** they create a new curriculum with title, description, and pricing, **Then** the curriculum is created in draft status and appears in their "My Core Curriculums" dashboard.

2. **Given** an instructor with a draft curriculum, **When** they add chapters with titles, descriptions, and video content, **Then** chapters are created in the specified order and can be reordered.

3. **Given** an instructor with a draft curriculum containing chapters, **When** they publish the curriculum, **Then** the curriculum status changes to published and becomes available for student purchase.

4. **Given** an instructor with a published curriculum, **When** they update a chapter's title or description, **Then** the changes are reflected immediately for students.

---

### User Story 5 - Admin Registration and Progress Oversight (Priority: P2)

An administrator views all student registrations and monitors learning progress across the platform.

**Why this priority**: Platform health and business insight. Without this, administrators cannot identify trends, troubleshoot issues, or report on key metrics to stakeholders.

**Independent Test**: Can be fully tested by logging in as an admin and verifying that all registrations and progress data are visible. Delivers actionable administrative visibility.

**Acceptance Scenarios**:

1. **Given** an authenticated admin, **When** they access the registrations view, **Then** all student enrollments are listed with student name, curriculum name, enrollment date, and payment status.

2. **Given** an authenticated admin, **When** they access the progress view, **Then** they see each student's completion percentage per curriculum and overall platform engagement metrics.

3. **Given** an admin viewing student progress, **When** they filter by a specific curriculum, **Then** only students enrolled in that curriculum are shown with their individual progress.

---

### User Story 6 - Instructor Curriculum Editing (Priority: P2)

An instructor edits an existing curriculum, modifying chapters or curriculum details.

**Why this priority**: Content maintenance is essential. Instructors need to correct errors, update material, and improve curriculums after initial creation.

**Independent Test**: Can be fully tested by modifying an existing curriculum and verifying changes are reflected. Delivers updated curriculum content.

**Acceptance Scenarios**:

1. **Given** an instructor with a published curriculum, **When** they edit the curriculum title or description, **Then** the changes are saved and reflected immediately.

2. **Given** an instructor with a curriculum containing chapters, **When** they add a new chapter, **Then** the chapter is appended to the end of the chapter list.

3. **Given** an instructor with a curriculum containing chapters, **When** they delete a chapter, **Then** the chapter is removed and students are notified of the content change.

---

### Edge Cases

- **What happens when a student attempts to access curriculum content after a refund?** Their access should be revoked immediately and they should see a purchase prompt.
- **What happens when an instructor tries to delete a curriculum that has active students?** The system should warn the instructor and require confirmation, with options to transfer students or cancel deletion.
- **How does the system handle students who lose internet connectivity while watching a video?** The video should resume from the last watched position when connectivity is restored.
- **What happens when an instructor publishes a curriculum with no chapters?** The system should prevent publication and display an error requiring at least one chapter.
- **How does the system handle duplicate student registrations?** The system should reject duplicate emails and prompt the user to log in instead.
- **What happens when a new chapter is added to a curriculum a student has partially completed?** The student should be notified and the new chapter should appear at the end of their sequence.
- **How does the admin view handle curriculums with zero enrollments?** Curriculums with no students should still appear in reports with 0% completion.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow prospective students to create an account with name, email, and password.
- **FR-002**: System MUST validate email format and require password minimum length of 8 characters.
- **FR-003**: System MUST allow students to browse available curriculums and view curriculum details including title, description, instructor, price, and chapter list.
- **FR-004**: System MUST allow students to purchase curriculum access through a payment process.
- **FR-005**: System MUST grant students immediate access to curriculum content upon successful payment.
- **FR-006**: System MUST display curriculums as locked (no access) for students who have not purchased them.
- **FR-007**: System MUST allow students to watch video chapters in sequential order only.
- **FR-008**: System MUST mark a chapter as complete when a student finishes watching the entire video.
- **FR-009**: System MUST unlock the next chapter only after the previous chapter is marked complete.
- **FR-010**: System MUST allow students to track their completion progress as a percentage per curriculum.
- **FR-011**: System MUST allow students to view their enrolled curriculums with progress indicators on the dashboard.
- **FR-012**: System MUST allow instructors to create new curriculums with title, description, and price.
- **FR-013**: System MUST allow instructors to add chapters to a curriculum with title, description, and video content.
- **FR-014**: System MUST maintain chapter ordering within a curriculum.
- **FR-015**: System MUST allow instructors to publish curriculums, changing status from draft to available.
- **FR-016**: System MUST allow instructors to edit curriculum details and chapter content.
- **FR-017**: System MUST allow instructors to view a list of their created curriculums with enrollment counts.
- **FR-018**: System MUST allow admins to view all student registrations across the platform.
- **FR-019**: System MUST allow admins to view student progress for all curriculums.
- **FR-020**: System MUST allow admins to filter registrations and progress by curriculum or student.

### Key Entities *(include if feature involves data)*

- **Student**: A user who purchases and consumes curriculum content. Attributes: name, email, password (hashed), created_at. Relationships: many enrollments, many curriculum progresses.
- **Instructor**: A user who creates and manages curriculums. Attributes: name, email, password (hashed), created_at. Relationships: many curriculums.
- **Admin**: A user with platform-wide oversight capabilities. Attributes: name, email, password (hashed), created_at. Relationships: all registrations and progress.
- **Course**: A learning product containing ordered chapters. Attributes: title, description, price, status (draft/published), instructor_id, created_at, updated_at. Relationships: many chapters, many enrollments.
- **Chapter**: A video learning unit within a curriculum. Attributes: title, description, video_url, order_index, course_id, created_at. Relationships: belongs to one curriculum, many progress records.
- **Enrollment**: A student's purchased access to a curriculum. Attributes: student_id, course_id, purchased_at, payment_reference. Relationships: belongs to one student, one curriculum.
- **ChapterProgress**: A student's completion record for a chapter. Attributes: student_id, chapter_id, completed_at. Relationships: belongs to one student, one chapter.
- **Registration**: Audit record of all student enrollments for admin visibility. Attributes: student_id, course_id, enrolled_at, payment_status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Students can complete self-registration in under 3 minutes.
- **SC-002**: Students can purchase curriculum access and immediately begin watching content with no more than 2 clicks after payment confirmation.
- **SC-003**: Students can track their progress and see accurate completion percentages reflecting their actual viewing history.
- **SC-004**: Curriculum chapters unlock sequentially with no ability to skip ahead to locked content.
- **SC-005**: Instructors can create a curriculum with 10 chapters and publish it in under 15 minutes.
- **SC-006**: Admins can view all registrations filtered by curriculum or student and see accurate, real-time data.
- **SC-007**: 95% of students who purchase a curriculum complete at least the first chapter within 7 days.
- **SC-008**: Platform supports 1,000 concurrent students without degradation of video playback quality.

## Assumptions

- Users have stable internet connectivity for video streaming (minimum 5 Mbps recommended).
- Video hosting is handled by a third-party service (e.g., Muvi as mentioned in tech-stack.md).
- Payment processing is handled by an integrated payment gateway (Stripe or similar).
- Email notifications are sent for registration confirmation and important updates.
- The system stores video URLs rather than video files directly.
- Student identity is verified through email confirmation after registration.
- Instructor accounts are created by admins (not self-service).
- Admin accounts are created by super admins (not self-service).
- Curriculum pricing is in a single currency (default: USD).
- All times are stored in UTC and displayed in local timezones on the client side.