# R18 Walkthrough — Live Write→Release Cycle

**Prerequisites:** Local Supabase running, seed.sql applied, migration 065 applied.
**Users involved:** teacher1, admin/office, student1 (stud1), guardian

---

## Step 1: Teacher drafts a report card

```sql
-- Authenticate as teacher1
SELECT tests.set_jwt(
    'cc000000-0000-0000-0000-0000000000c3',
    'teacher',
    '00000000-0000-0000-0000-000000000001'
);
SET ROLE authenticated;

-- Create draft
SELECT public.create_draft_report_card(
    'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',  -- student1
    '2026 Term 2',
    'Science',
    'B'
);
```

**Expected:** Returns a row with `status = 'draft'`, `created_by` = teacher1 uid.

---

## Step 2: Verify learner CANNOT see the draft

```sql
-- Authenticate as student1 (learner)
SELECT tests.set_jwt(
    'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
    'student',
    '00000000-0000-0000-0000-000000000001'
);

-- Try to see own draft
SELECT count(*) FROM public.report_cards
WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
  AND status = 'draft';
```

**Expected:** `count = 0` (RLS blocks draft visibility for learner role).

---

## Step 3: Office desk releases the draft → visible

```sql
-- Find the draft card ID
SELECT id FROM public.report_cards
WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
  AND term = '2026 Term 2'
  AND status = 'draft';

-- Authenticate as office (created in test setup)
SELECT tests.set_jwt(
    '00000000-0000-0000-0000-0000000000ff',
    'office',
    '00000000-0000-0000-0000-000000000001'
);

-- Release (one transaction, two-step lifecycle, stamps released_at)
SELECT public.release_report_card('<draft-card-id>');
```

**Expected:** Returns the updated row with `status = 'visible'`, `released_at` set, `released_by` = office uid.

---

## Step 4: Verify learner CAN see the released card

```sql
-- Authenticate as student1
SELECT tests.set_jwt(
    'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
    'student',
    '00000000-0000-0000-0000-000000000001'
);

-- Check visible cards
SELECT id, subject, grade, status, released_at
FROM public.report_cards
WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
  AND status = 'visible';
```

**Expected:** Returns 2 rows — the seeded Mathematics card AND the newly released Science card.

---

## Step 5: Verify non-office caller is rejected

```sql
-- Try release as teacher1
SELECT tests.set_jwt(
    'cc000000-0000-0000-0000-0000000000c3',
    'teacher',
    '00000000-0000-0000-0000-000000000001'
);

SELECT public.release_report_card('<draft-or-visible-card-id>');
```

**Expected:** Raises `EXCEPTION: Only Office Desk can release report cards`.

---

## Completing the demo

The full Mid-August demo flow requires:

1. Teacher logs into mobile or web → drafts report card (Step 1)
2. Learner logs in → sees no draft card in records (Step 2)
3. Office Desk logs into console → releases the card (Step 3)
4. Learner refreshes → released card now visible (Step 4)
5. (Optional) Teacher tries release → blocked (Step 5)
