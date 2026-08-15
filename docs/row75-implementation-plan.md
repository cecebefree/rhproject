# Row 75: Parent/Family Portal — Implementation Plan

## Overview
Read-only portal for parents to view their children's academic progress. Consent-based access via `parent_student_link` table.

---

## Database Schema

### Table: public.parent_student_link

```sql
CREATE TABLE public.parent_student_link (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id     uuid NOT NULL REFERENCES auth.users(id),
  student_id    uuid NOT NULL REFERENCES public.profiles(id),
  relationship  text NOT NULL CHECK (relationship IN ('mother', 'father', 'guardian', 'other')),
  verified      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Uniqueness: one link per parent-student pair
ALTER TABLE public.parent_student_link
  ADD CONSTRAINT uq_parent_student UNIQUE (parent_id, student_id);
```

**RLS Policies:**
1. `psl_parent_read` — parents read their own links
2. `psl_admin_all` — admins full access
3. `psl_student_read` — students see who linked them

**Indexes:**
- `(parent_id)` — primary query path
- `(student_id)` — reverse lookup

---

## Components

### ParentDashboard.tsx
```typescript
interface ParentDashboardProps {
  parentId: string;
  onSelectChild: (studentId: string, studentName: string) => void;
}

// Displays:
// - List of linked children (name, relationship, verified status)
// - Child selector card
// - Quick stats per child (courses, attendance %, GPA)
```

### ChildProgressView.tsx
```typescript
interface ChildProgressViewProps {
  studentId: string;
  studentName: string;
  onBack: () => void;
  onSelectCourse: (courseId: string) => void;
}

// Displays:
// - Child name, grade level
// - Enrolled courses grid
// - Attendance summary (present/absent/excused counts)
// - Grade summary per course (weighted average, letter grade)
// - Overall GPA
```

### CourseDetailView.tsx
```typescript
interface CourseDetailViewProps {
  courseId: string;
  studentId: string;
  courseTitle: string;
  onBack: () => void;
}

// Displays:
// - Course name, teacher name
// - Assignments list with grades
// - Class average for comparison
// - Student percentile rank
// - Progress bar
```

### AttendanceView.tsx
```typescript
interface AttendanceViewProps {
  studentId: string;
  courseId?: string; // optional course filter
  onBack: () => void;
}

// Displays:
// - Attendance calendar view
// - Summary counts (present/absent/excused)
// - Attendance percentage
// - Date-by-date record
```

### TranscriptView.tsx
```typescript
interface TranscriptViewProps {
  studentId: string;
  studentName: string;
  onBack: () => void;
}

// Displays:
// - All courses with final grades
// - Weighted average per course
// - Letter grades
// - Overall GPA
// - Credit summary
```

### ParentPortalPage.tsx
```typescript
// Top-level page with auth check
// Route: /parent-portal
// Auth: role='parent' only
// State: selectedChild, viewMode
```

---

## supabase.ts Updates

```typescript
// Types
interface ParentStudentLink {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: string;
  verified: boolean;
  created_at: string;
}

// Queries
selectLinkedChildren(parentId: string) // get all verified children
getChildProgress(studentId: string) // courses + grades + attendance
getChildAttendance(studentId: string, options?: { courseId? }) // attendance records
getChildTranscript(studentId: string) // all courses with final grades
```

---

## File Structure

```
supabase/migrations/
  125_parent_student_link_table.sql

apps/web/src/features/parent-portal/
  pages/
    ParentPortalPage.tsx
  components/
    ParentDashboard.tsx
    ChildProgressView.tsx
    CourseDetailView.tsx
    AttendanceView.tsx
    TranscriptView.tsx

apps/web/src/features/lms/services/
  supabase.ts (update with parent queries)
```

---

## RLS Strategy

### parent_student_link policies
```sql
-- Parents read their own links
CREATE POLICY psl_parent_read ON public.parent_student_link
  FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

-- Students see who linked them
CREATE POLICY psl_student_read ON public.parent_student_link
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Admins full access
CREATE POLICY psl_admin_all ON public.parent_student_link
  FOR ALL TO authenticated
  USING (role = 'admin');
```

### Gradebook/Attendance read-through policies
```sql
-- Parents read grades for linked students
CREATE POLICY grade_parent_read ON school_desk.gradebook
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_link psl
      WHERE psl.parent_id = auth.uid()
        AND psl.student_id = gradebook.student_id
        AND psl.verified = true
    )
  );

-- Parents read attendance for linked students
CREATE POLICY attendance_parent_read ON school_desk.attendance
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_link psl
      WHERE psl.parent_id = auth.uid()
        AND psl.student_id = attendance.student_id
        AND psl.verified = true
    )
  );
```

---

## Auth Gate

```typescript
// In ParentPortalPage.tsx
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();

if (profile?.role !== 'parent') {
  return <AccessDenied />;
}
```

---

## Estimated Time

| Task | Hours |
|------|-------|
| Migration 125 (table + RLS) | 0.5 |
| supabase.ts parent queries | 0.5 |
| ParentDashboard.tsx | 1.0 |
| ChildProgressView.tsx | 1.5 |
| CourseDetailView.tsx | 1.5 |
| AttendanceView.tsx | 1.0 |
| TranscriptView.tsx | 1.0 |
| ParentPortalPage.tsx | 0.5 |
| Router update | 0.25 |
| Testing | 1.0 |
| **Total** | **8.75** |

---

## Dependencies

- `school_desk.gradebook` (Row 74)
- `school_desk.attendance` (Row 73)
- `school_desk.assignments` (Row 74)
- `school_desk.courses` (existing)
- `student_class` (existing)
- `public.profiles` (existing)

---

## Acceptance Criteria

- [ ] Migration 125 creates `parent_student_link` with correct schema
- [ ] Parents can only see linked children (verified=true)
- [ ] ChildProgressView shows courses, attendance, grades
- [ ] CourseDetailView shows assignments with grades
- [ ] AttendanceView shows attendance records
- [ ] TranscriptView shows all courses with GPA
- [ ] Non-parent users see access denied
- [ ] TypeScript clean, 464+ pgTAP tests pass
