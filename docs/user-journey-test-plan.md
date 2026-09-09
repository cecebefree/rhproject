# User Journey Test Plan — End-to-End Profile Flow

## Overview
Test the complete flow from website registration → Office Desk management → Mobile app profile viewing for each user type.

**Note:** Full auth user creation requires Supabase Auth. This plan focuses on verifiable filtering logic and manual testing steps.

---

## Test Data Already Deployed

### News Articles (7 articles)
| Title | Stage | Category |
|-------|-------|----------|
| Welcome Back to Term 2 | general | general |
| School Holiday Notice | general | school_desk |
| Junior School Sports Day | junior | student_body |
| Junior School Art Exhibition | junior | general |
| Senior School Exam Schedule | senior | school_desk |
| Senior School Career Fair | senior | hub |
| Schoolboard Meeting Minutes | general | schoolboard |

### Stage Mapping (Verified)
| profiles.stage | content_group |
|----------------|---------------|
| Mid School | junior |
| Senior School | senior |
| Pre School | junior |

---

## Journey 1: New Family Registration (Student + Parent)

### Step 1: Website Registration
**URL:** `/register`
**Action:** Fill out registration form

| Field | Test Value |
|-------|------------|
| Parent Name | John Smith |
| Email | john.smith@test.com |
| Phone | +27 82 123 4567 |
| Student Name | Emma Smith |
| Student Age | 12 |
| Grade | 8 |
| Curriculum | Cambridge |
| Stage | Mid School |

**Expected:** Form submits → Confirmation page → Email sent

### Step 2: Office Desk Review
**URL:** `/service/office-desk`
**Action:** Navigate to Registrations tab

**Expected:**
- New registration appears in list
- Status: `pending_review`
- Click to view details
- Click "Approve" button

**Verify:**
- Status changes to `approved`
- Family account created in `office_desk.family_accounts`
- Student profile created in `public.profiles` with `role = 'student'`
- Parent profile created in `public.profiles` with `role = 'family'`

### Step 3: Mobile App Login (Student)
**Action:** Open mobile app → Login with student credentials

**Expected:**
- Login successful
- Home screen shows student name in greeting
- "Coming Up" section shows enrolled classes
- "School News" shows news for `junior` stage + `general`

**Verify News Filtering:**
- ✅ "Welcome Back to Term 2" (general) — VISIBLE
- ✅ "School Holiday Notice" (general) — VISIBLE
- ✅ "Junior School Sports Day" (junior) — VISIBLE
- ✅ "Junior School Art Exhibition" (junior) — VISIBLE
- ❌ "Senior School Exam Schedule" (senior) — HIDDEN
- ❌ "Senior School Career Fair" (senior) — HIDDEN
- ✅ "Schoolboard Meeting Minutes" (general) — VISIBLE

### Step 4: Mobile App Login (Parent)
**Action:** Open mobile app → Login with parent credentials

**Expected:**
- Login successful
- Home screen shows parent name
- Can view children's profiles
- Can view billing/invoices

**Verify Profile:**
- Tap Profile tab
- Shows: Parent name, Contact info
- Shows: Linked children
- Can switch between children's profiles

---

## Journey 2: Existing Student (Teacher-Created)

### Step 1: Office Desk Creates Student
**URL:** `/service/office-desk` → Family Accounts

**Action:**
1. Click "Add Family"
2. Enter parent details
3. Add student to family
4. Set student stage: `Senior School`
5. Save

**Expected:**
- Family account created
- Parent profile created (role: `family`)
- Student profile created (role: `student`, stage: `Senior School`)

### Step 2: Mobile App Login (Student)
**Action:** Login with student credentials

**Expected:**
- Sees `senior` stage news + `general` news
- Does NOT see `junior` news
- Profile shows correct stage

**Verify News Filtering:**
- ✅ "Welcome Back to Term 2" (general) — VISIBLE
- ✅ "School Holiday Notice" (general) — VISIBLE
- ❌ "Junior School Sports Day" (junior) — HIDDEN
- ❌ "Junior School Art Exhibition" (junior) — HIDDEN
- ✅ "Senior School Exam Schedule" (senior) — VISIBLE
- ✅ "Senior School Career Fair" (senior) — VISIBLE
- ✅ "Schoolboard Meeting Minutes" (general) — VISIBLE

---

## Journey 3: Teacher Profile

### Step 1: Office Desk Creates Teacher
**URL:** `/service/office-desk` → Staff

**Action:**
1. Click "Add Staff"
2. Enter teacher details
3. Assign subjects: Mathematics, Physics
4. Assign stage: `Senior School`
5. Save

**Expected:**
- Teacher profile created (role: `teacher`)
- Subjects linked
- Stage assigned

### Step 2: Mobile App Login (Teacher)
**Action:** Login with teacher credentials

**Expected:**
- Home screen shows teacher name
- "My Classes" section shows assigned classes
- Can view student list for each class
- Can take attendance
- Sees ALL news (no stage filter)

**Verify News Filtering:**
- ✅ ALL 7 articles — VISIBLE (no filter)

---

## Journey 4: Admin/Management Profile

### Step 1: Office Desk Creates Admin
**URL:** `/service/office-desk` → Staff

**Action:**
1. Click "Add Staff"
2. Enter admin details
3. Set role: `admin`
4. Save

**Expected:**
- Admin profile created (role: `admin`)
- Full access to all desks

### Step 2: Mobile App Login (Admin)
**Action:** Login with admin credentials

**Expected:**
- Sees ALL news (no stage filter)
- Can access all features
- Profile shows admin role

---

## Test Verification Checklist

### For Each Profile Type, Verify:

#### Student (Junior Stage)
- [ ] Can login to mobile app
- [ ] Home shows correct greeting
- [ ] News shows: `general` + `junior` articles only
- [ ] Profile shows: Name, Grade, Curriculum, Stage, Intake
- [ ] Can view enrolled classes
- [ ] Can view schedule

#### Student (Senior Stage)
- [ ] Can login to mobile app
- [ ] News shows: `general` + `senior` articles only
- [ ] Profile shows correct stage
- [ ] Does NOT see `junior` news

#### Parent/Family
- [ ] Can login to mobile app
- [ ] Can view all linked children
- [ ] Can switch between children's profiles
- [ ] Can view billing/invoices
- [ ] Can view schedules for all children
- [ ] News shows: `general` + stage of their children

#### Teacher
- [ ] Can login to mobile app
- [ ] Sees ALL news (no stage filter)
- [ ] Can view assigned classes
- [ ] Can view student lists
- [ ] Can take attendance
- [ ] Profile shows: Name, Subjects, Stage

#### Admin
- [ ] Can login to mobile app
- [ ] Sees ALL news (no stage filter)
- [ ] Full access to all features
- [ ] Profile shows admin role

---

## Office Desk Verification

For each profile created, verify in Office Desk:

### Family Accounts
- [ ] Family account exists
- [ ] Linked to correct parent profile
- [ ] Linked to correct student profile(s)
- [ ] Billing information correct

### Registrations
- [ ] Registration record exists
- [ ] Status is `approved`
- [ ] Linked to family account

### Staff
- [ ] Teacher/Admin profile exists
- [ ] Subjects assigned correctly
- [ ] Stage assigned correctly

---

## Database Verification

Run these queries to verify data:

```sql
-- Check family accounts
SELECT * FROM office_desk.family_accounts 
WHERE tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001';

-- Check student profiles
SELECT id, role, stage, curriculum, grade 
FROM public.profiles 
WHERE role = 'student' 
AND tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001';

-- Check parent profiles
SELECT id, role 
FROM public.profiles 
WHERE role = 'family' 
AND tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001';

-- Check teacher profiles
SELECT id, role 
FROM public.profiles 
WHERE role = 'teacher' 
AND tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001';

-- Check news articles
SELECT title, content_group, category 
FROM school_desk.news 
WHERE tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001';

-- Check registrations
SELECT * FROM office_desk.registrations 
WHERE tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001';
```

---

## Expected Test Results Summary

| Profile | Login | News Filter | Profile Data | Classes |
|---------|-------|-------------|--------------|---------|
| Student (Junior) | ✅ | general + junior | ✅ | ✅ |
| Student (Senior) | ✅ | general + senior | ✅ | ✅ |
| Parent | ✅ | general + children's stage | ✅ | ✅ (children's) |
| Teacher | ✅ | ALL news | ✅ | ✅ (assigned) |
| Admin | ✅ | ALL news | ✅ | N/A |

