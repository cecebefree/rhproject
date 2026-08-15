# Row 73: Attendance Tracking in School Front Desk — Implementation Plan

## Current State Analysis

### Existing Tables
- **school_desk.courses** — `id, title, teacher_id, status, price, tenant_id` (migration 014, moved to school_desk)
- **student_class** — `id, student_id, class_id, tenant_id, enrolled_at` (migration 027, in public schema)
- **school_desk.courses** has `teacher_id` → FK to profiles
- **student_class.class_id** → FK to courses

### Key Relationships
```
courses (school_desk)
  └── student_class (public) — student_id → auth.users, class_id → courses
  └── teacher_id → profiles (auth.uid() for teacher)
```

### Design Decision: Grain
- **One row per student per class session** (not one row per class session)
- `class_date` = the calendar date of the session
- Uniqueness: `(course_id, student_id, class_date)` — one record per student per day per course

---

## Implementation Plan

### Phase 1: Database Schema (Migration 123)

```sql
-- school_desk.attendance table
CREATE TABLE school_desk.attendance (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id),
  course_id         uuid NOT NULL REFERENCES school_desk.courses(id),
  student_id        uuid NOT NULL REFERENCES auth.users(id),
  class_date        date NOT NULL,
  status            text NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'excused')),
  marked_by         uuid NOT NULL REFERENCES auth.users(id),
  marked_at         timestamptz NOT NULL DEFAULT now(),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Uniqueness constraint
ALTER TABLE school_desk.attendance
  ADD CONSTRAINT uq_attendance_course_student_date
  UNIQUE (course_id, student_id, class_date);
```

**Indexes:**
- `(tenant_id, course_id, class_date)` — primary query path
- `(course_id, class_date)` — class roster lookup
- `(student_id)` — student attendance history

**RLS Policies:**
1. `att_admin_all` — admin full access
2. `att_teacher_select` — teachers read attendance for courses they teach
3. `att_teacher_insert` — teachers mark attendance for students in their courses
4. `att_teacher_update` — teachers update their own marks (same day only)

### Phase 2: Edge Function — Bulk Mark Attendance

**Location:** `supabase/functions/mark-attendance/index.ts`

```typescript
// POST body: { course_id, class_date, marks: [{ student_id, status, notes? }] }
// Bulk upsert — replaces existing marks for that course+date
// Uses: service_role client (bypasses RLS for bulk ops)
```

**Key details:**
- Uses `INSERT ... ON CONFLICT (course_id, student_id, class_date) DO UPDATE`
- Validates teacher owns the course before marking
- Returns updated attendance records

### Phase 3: Frontend Components

#### AttendanceForm.tsx
```typescript
interface AttendanceFormProps {
  tenantId: string;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Fields:
// - Course dropdown (teacher's courses)
// - Date picker (defaults to today)
// - Student list with status toggles (present/absent/excused)
// - Notes field per student (optional)
// - "Mark All Present" quick button
// - Submit → calls mark-attendance EF (bulk upsert)
```

#### AttendanceList.tsx
```typescript
interface AttendanceListProps {
  tenantId: string;
  userId: string;
  onSelect: (courseId: string, date: string) => void;
}

// Filters: course dropdown, date range picker
// Table columns: Course, Date, Present count, Absent count, Excused count
// Real-time subscriptions for live updates
```

#### AttendanceDetail.tsx
```typescript
interface AttendanceDetailProps {
  courseId: string;
  classDate: string;
  onBack: () => void;
}

// Full class roster for a specific session
// Student name, status badge, notes, marked_at
// "Edit" button → inline status toggles
// Summary: X present, Y absent, Z excused
```

### Phase 4: Integration

#### supabase.ts Updates
```typescript
// Types
type AttendanceStatus = 'present' | 'absent' | 'excused';
interface Attendance { id, tenant_id, course_id, student_id, class_date, status, marked_by, marked_at, notes, created_at }
interface AttendanceWithRelations extends Attendance {
  profiles?: { id: string; name: string } | null;
  courses?: { id: string; title: string } | null;
}

// Queries
selectAttendance(tenantId, options?: { courseId?, classDate? })
insertAttendance(record)
updateAttendance(attendanceId, { status, notes })
bulkMarkAttendance(marks: Array<{ student_id, status, notes? }>, courseId, classDate)
getAttendanceByCourseAndDate(courseId, classDate)
subscribeToAttendance(callback)
```

#### SchoolDeskPage.tsx
Add "Attendance" tab with views:
- `attendance` → AttendanceList
- `attendance-detail` → AttendanceDetail
- `attendance-mark` → AttendanceForm

---

## File Structure

```
supabase/
├── migrations/
│   └── 123_school_desk_attendance_table.sql
└── functions/
    └── mark-attendance/
        └── index.ts

apps/web/src/features/lms/
├── components/
│   ├── AttendanceForm.tsx
│   ├── AttendanceList.tsx
│   └── AttendanceDetail.tsx
├── pages/
│   └── SchoolDeskPage.tsx (update)
└── services/
    └── supabase.ts (update)
```

---

## Estimated Time

| Task | Hours |
|------|-------|
| Migration 123 (schema + RLS + indexes) | 0.5 |
| Edge Function (bulk mark attendance) | 1.0 |
| AttendanceForm.tsx | 1.5 |
| AttendanceList.tsx | 1.0 |
| AttendanceDetail.tsx | 1.0 |
| supabase.ts updates | 0.5 |
| SchoolDeskPage integration | 0.5 |
| Testing (pgTAP + TypeScript) | 1.0 |
| **Total** | **7.0 hours** |

---

## Dependencies

1. **Existing tables** — courses, student_class (already in place)
2. **Teacher course lookup** — teacher_id on courses table
3. **Student roster** — student_class.class_id = courses.id

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| student_class in public schema (not school_desk) | Use direct FK references, no schema migration needed |
| Race condition on bulk mark | Use ON CONFLICT DO UPDATE (idempotent) |
| Teacher marks another teacher's course | RLS + EF both validate teacher_id = auth.uid() |
| Large class roster performance | Bulk insert via single EF call, not N individual inserts |

---

## Acceptance Criteria

- [ ] Migration 123 creates table with correct schema and RLS
- [ ] Teachers can mark attendance for their own courses only
- [ ] Bulk mark attendance works for full class sessions
- [ ] AttendanceList shows summary per course/date
- [ ] AttendanceDetail shows full roster with status badges
- [ ] Real-time updates when attendance is marked
- [ ] TypeScript clean, 464+ pgTAP tests pass
- [ ] RLS test: teacher cannot mark attendance for another teacher's course
