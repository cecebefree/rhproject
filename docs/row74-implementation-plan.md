# Row 74: Gradebook in School Front Desk — Implementation Plan

## Current State Analysis

### Existing Tables
- **school_desk.courses** — `id, title, teacher_id, status, price, tenant_id`
- **student_class** — `id, student_id, class_id, tenant_id` (public schema)
- **school_desk.report_cards** — `id, student_id, term, subject, grade, status, created_by` (Row 71)

### Key Relationships
```
courses (school_desk)
  └── student_class (public) — student_id → auth.users, class_id → courses
  └── teacher_id → profiles (auth.uid() for teacher)
```

### Design Decisions

1. **Assignments table** — Separate from gradebook to allow reuse
2. **Gradebook grain** — One row per student per assignment per course
3. **Weighted average** — `final_grade = SUM(score * weight) / SUM(weight)`
4. **Edge Function** — `calculate-final-grade` computes GPA server-side

---

## Implementation Plan

### Phase 1: Database Schema (Migration 124)

```sql
-- school_desk.assignments table
CREATE TABLE school_desk.assignments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id),
  course_id         uuid NOT NULL REFERENCES school_desk.courses(id),
  title             text NOT NULL,
  description       text,
  max_score         numeric(6,2) NOT NULL DEFAULT 100,
  weight            numeric(4,2) NOT NULL DEFAULT 1.00,
  due_date          timestamptz,
  created_by        uuid NOT NULL REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

-- school_desk.gradebook table
CREATE TABLE school_desk.gradebook (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id),
  course_id         uuid NOT NULL REFERENCES school_desk.courses(id),
  assignment_id     uuid NOT NULL REFERENCES school_desk.assignments(id),
  student_id        uuid NOT NULL REFERENCES public.profiles(id),
  score             numeric(6,2),
  max_score         numeric(6,2) NOT NULL,
  weight            numeric(4,2) NOT NULL DEFAULT 1.00,
  graded_by         uuid NOT NULL REFERENCES auth.users(id),
  graded_at         timestamptz NOT NULL DEFAULT now(),
  feedback          text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
```

**Constraints:**
- `UNIQUE (assignment_id, student_id)` — one grade per student per assignment
- `CHECK (score >= 0 AND score <= max_score)` — valid score range
- `CHECK (weight > 0)` — positive weight

**Indexes:**
- `(tenant_id, course_id)` — primary query path
- `(course_id, assignment_id)` — assignment view
- `(student_id)` — student transcript
- `(tenant_id, course_id, student_id)` — weighted average calculation

**RLS Policies:**
1. `grade_admin_all` — admin full access
2. `grade_teacher_select` — teachers read grades for courses they teach
3. `grade_teacher_insert` — teachers insert grades for students in their courses
4. `grade_teacher_update` — teachers update grades they've assigned

### Phase 2: Edge Function — Calculate Final Grade

**Location:** `supabase/functions/calculate-final-grade/index.ts`

```typescript
// POST body: { course_id, student_id }
// Returns: { weighted_average, total_weight, grade_count }
// Formula: SUM(score * weight) / SUM(weight)
```

**Key details:**
- Uses service_role client for performance
- Returns `null` if no grades exist
- Supports letter grade mapping (optional)

### Phase 3: Frontend Components

#### GradebookForm.tsx
```typescript
interface GradebookFormProps {
  tenantId: string;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Fields:
// - Course dropdown (teacher's courses)
// - Assignment dropdown (course assignments)
// - Bulk score entry grid (student name, score, feedback)
// - "Save All" button → bulk upsert
```

#### GradebookList.tsx
```typescript
interface GradebookListProps {
  tenantId: string;
  userId: string;
  onSelect: (courseId: string) => void;
}

// View: Course summary
// Columns: Course, Assignments, Students, Class Average
// Filter: date range
// Real-time subscriptions
```

#### GradebookDetail.tsx
```typescript
interface GradebookDetailProps {
  courseId: string;
  onBack: () => void;
}

// Full course gradebook:
// - Assignment columns (scrollable)
// - Student rows with scores
// - Class average per assignment
// - Weighted average per student
// - Export button (CSV)
```

#### StudentTranscript.tsx (bonus)
```typescript
interface StudentTranscriptProps {
  studentId: string;
  onBack: () => void;
}

// Student view: all courses, all assignments, weighted GPA
// Used for parent/student portal
```

### Phase 4: Integration

#### supabase.ts Updates
```typescript
// Types
interface Assignment { id, tenant_id, course_id, title, description, max_score, weight, due_date, created_by, created_at }
interface Gradebook { id, tenant_id, course_id, assignment_id, student_id, score, max_score, weight, graded_by, graded_at, feedback }

// Queries
selectAssignments(tenantId, options?: { courseId? })
selectGradebook(tenantId, options?: { courseId?, assignmentId?, studentId? })
insertAssignment(assignment)
updateAssignment(assignmentId, updates)
insertScore(score)
updateScore(scoreId, updates)
calculateGrade(courseId, studentId) // via Edge Function
subscribeToGradebook(callback)
```

#### SchoolDeskPage.tsx
Add "Gradebook" tab with views:
- `gradebook` → GradebookList
- `gradebook-detail` → GradebookDetail
- `gradebook-enter` → GradebookForm

---

## File Structure

```
supabase/
├── migrations/
│   └── 124_school_desk_gradebook_table.sql
└── functions/
    └── calculate-final-grade/
        └── index.ts

apps/web/src/features/lms/
├── components/
│   ├── GradebookForm.tsx
│   ├── GradebookList.tsx
│   ├── GradebookDetail.tsx
│   └── StudentTranscript.tsx
├── pages/
│   └── SchoolDeskPage.tsx (update)
└── services/
    └── supabase.ts (update)
```

---

## Estimated Time

| Task | Hours |
|------|-------|
| Migration 124 (schema + RLS + indexes) | 0.5 |
| Edge Function (calculate-final-grade) | 1.0 |
| GradebookForm.tsx | 1.5 |
| GradebookList.tsx | 1.0 |
| GradebookDetail.tsx | 1.5 |
| StudentTranscript.tsx | 1.0 |
| supabase.ts updates | 0.5 |
| SchoolDeskPage integration | 0.5 |
| Testing (pgTAP + TypeScript) | 1.0 |
| **Total** | **8.5 hours** |

---

## Dependencies

1. **Existing tables** — courses, student_class, profiles
2. **Teacher course lookup** — teacher_id on courses table
3. **Student roster** — student_class.class_id = courses.id

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Large class roster performance | Bulk upsert via single EF call |
| Grade weight validation | CHECK constraint + EF validation |
| Student看不到 other students' grades | RLS scoped to own courses only |
| Race condition on bulk insert | ON CONFLICT DO UPDATE (idempotent) |

---

## Acceptance Criteria

- [ ] Migration 124 creates tables with correct schema and RLS
- [ ] Teachers can create assignments for their courses
- [ ] Teachers can enter grades for students in their courses
- [ ] GradebookDetail shows class averages and weighted averages
- [ ] StudentTranscript shows all courses with weighted GPA
- [ ] calculate-final-grade Edge Function computes correct GPA
- [ ] Real-time updates when grades are entered
- [ ] TypeScript clean, 464+ pgTAP tests pass
- [ ] RLS test: teacher cannot grade students in another teacher's course
