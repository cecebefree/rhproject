# Leadership Review Package — Phase 1 Mobile Wiring

**Date:** 2026-08-27 (Updated)
**Status:** MIGRATIONS APPLIED + DEV SERVER RUNNING
**Design Source:** Google Stitch — replaces v0
**Website:** https://redhouse.lovable.app (live, Cloudflare)

---

## 1. Executive Summary

This document presents the complete field register, migration plan, screen plan, and review tasks for Phase 1 of the Redhouse mobile app wiring. All screens are sourced from Google Stitch designs and cross-referenced against the live website.

**Phase 1 Scope:** Core Curriculum only (Cambridge, IB, Homeschool). Enrichment, Clubs, and Social are Phase 2.

**What we are building:**
- Mobile: 3 tabs only (Home, Classes, Profile) — Cece-approved override of locked 5-section architecture
- Frontend screens: 3 profile variations (Student, Adult, Teacher)
- Database: 7 migrations (194-200) applied and verified

**What is deferred (Phase 2):**
- Hub, Social/Chat screens
- Enrichment courses, Clubs
- History tables, Documents, Medical, Contracts
- Staff profile screen (not designed yet)

---

## 2. Design Source

| Surface | Source | URL/Location |
|---|---|---|
| Mobile | Google Stitch | Screens provided by Cece |
| Front Desk | Google Stitch | Screens provided by Cece |
| Office Desk | Google Stitch | Screens provided by Cece |
| Website | Lovable (live) | https://redhouse.lovable.app |
| Website Registration | Lovable (live) | https://redhouse.lovable.app/registration |
| Website Pricing | Lovable (live) | https://redhouse.lovable.app/info/pricing |
| Website Cambridge | Lovable (live) | https://redhouse.lovable.app/core/cambridge |
| Website Zones | Lovable (live) | https://redhouse.lovable.app/info/zones-calendar |

---

## 3. Corrected Architecture (Cece-Approved)

| Item | Correction |
|------|-----------|
| **Stage Enum** | `Homeschool`, `Junior`, `Senior` — No Mid School for MVP |
| **Mobile Tabs** | 3 only: Home, Classes, Profile — NOT 4 or 5 |
| **Service Desks** | Admin-only, never mobile-facing |
| **User Model** | 4 types: Student, Adult, Teacher, Staff — each with own profile |
| **Family Account ≠ Adult User** | Family Account = billing entity (admin-managed). Adult User = person who logs in. |
| **Zone Storage** | Zone (INT 1-7) + Nation (TEXT) + City (TEXT) — no UTC offset for Phase 1 |
| **Profile Variations** | Student, Adult, Teacher (3 separate screens) |
| **"Family Profile"** | REMOVED — Adult Profile shows children + family data |

### User Model Architecture

```
Family Account (Household)
├─ Adult User 1: mom@example.com → Mobile Profile: [Children, Invoices, Payments, Groups]
├─ Adult User 2: dad@example.com → Mobile Profile: [Children, Invoices, Payments, Groups]
├─ Student User 1 (Child 1) → Mobile Profile: [Classes, Grades, Attendance]
├─ Student User 2 (Child 2) → Mobile Profile: [Classes, Grades, Attendance]
└─ [Billing info, contracts, bank details] → Admin-managed via Office Desk
```

---

## 4. Frontend Screen Plan (3 Tabs)

### Tab 1: Home (All Users)

| Section | Field | Display | DB Column | Status |
|---|---|---|---|---|
| Greeting | Time-based | Good morning/afternoon/evening | Computed from timestamp | ✅ Works |
| | Name | LIAM | profiles.name | ✅ Fixed |
| | Academic tag | Cambridge . Senior . Group A | profiles.curriculum + profiles.stage + profiles.intake | ✅ |
| Calendar Widget | Day number | 24 | Client-side new Date() | ✅ |
| | Day name | SATURDAY | Client-side new Date() | ✅ |
| | Tap to Calendar | Opens Calendar screen | Navigation | ✅ |
| Daily Devotional | Reference | John 10:10 TPT | get_today_devotional RPC | ✅ |
| | Verse text | Full verse | get_today_devotional RPC | ✅ |
| | READ MORE | Expand verse | Client-side toggle | ✅ |
| Coming Up | Subject | Mathematics | courses.title via schedule_slot | ✅ |
| | Teacher | Mr. Olivier | get_teacher_name RPC | ✅ |
| | Time/status | LIVE / 8:00 | schedule_slot.start_time | ✅ |
| School News | Headline | Virtual Science Fair | get_announcements RPC | ✅ |
| | Recency | 2h ago | Computed from announcements.publish_at | ✅ |
| | Filter | By stage + groups | profiles.stage + profiles.content_group | ✅ |
| Hamburger Menu | Tap to Settings | Opens Settings screen | Navigation | ✅ |

**Known Gap:** Home schedule currently shows ALL slots, not filtered by enrolled classes (30 min fix needed).

### Tab 2: Classes (Students, Teachers)

| Section | Field | Display | DB Column | Status |
|---|---|---|---|---|
| Header | Title | Classes | Static | ✅ |
| Header | Calendar icon | Tap to Calendar screen | Navigation | ✅ |
| Go to Class | Button | Go to Class (red/burgundy) | Navigation action | ✅ |
| Coming Up in Classes | Subject name | Mathematics | courses.title | ✅ |
| | Teacher name | Mr. Olivier | get_teacher_name RPC | ✅ |
| | Class group | Class A | courses.section | ✅ (Migration 196) |
| | Time/status | LIVE / 8:00 | schedule_slot.start_time/end_time | ✅ |
| | Badge | LIVE (red) | Computed (current time vs slot) | ✅ |
| Bottom Nav | Home, Classes, Profile | Tab layout | Static | ✅ |

### Tab 3: Profile (3 Variations)

#### Student Profile (Liam van den Berg)

| Section | Field | Display | DB Column | Status |
|---|---|---|---|---|
| Avatar | Initials | LB | Computed from profiles.name | ✅ |
| Name | Full name | Liam van den Berg | profiles.name + profiles.surname | ✅ (Migration 194) |
| Subtitle | Role + curriculum + status | Student . Cambridge . Enrolled | profiles.role + profiles.curriculum + profiles.registration_status | ✅ |
| PERSONAL | Curriculum | Cambridge | profiles.curriculum | ✅ |
| | Grade | Grade 8 | profiles.grade | ✅ |
| | Zone | Zone 4 | profiles.zone | ✅ (Migration 194) |
| | Nation | South Africa | profiles.nation | ✅ (Migration 194) |
| | City | Cape Town | profiles.city | ✅ (Migration 194) |
| | Intake | Group A | profiles.intake | ✅ |
| CORE CLASSES | Subject | Mathematics | courses.title | ✅ |
| | Teacher | Mr. Olivier | get_teacher_name RPC | ✅ |
| | Schedule | Mon . 8:00-9:00 | schedule_slot | ✅ |
| | Section | Class A | courses.section | ✅ (Migration 196) |
| GRADES | Grade level | Grade 8 | school_desk.gradebook | ✅ |
| | Performance | Overall Performance | Computed from gradebook | ✅ |
| ATTENDANCE | General Analytics | General Analytics | school_desk.attendance | ✅ |
| PAYMENTS | Ledger | Ledger | office_desk.invoices + office_desk.payments | ✅ |

#### Adult Profile (Parent/Guardian)

| Section | Field | Display | DB Column | Status |
|---|---|---|---|---|
| Avatar | Initials | MV | Computed from profiles.name | ✅ |
| Name | Full name | Maria van den Berg | profiles.name + profiles.surname | ✅ |
| Subtitle | Role + status | Adult . Active | profiles.role + profiles.registration_status | ✅ |
| CHILDREN | Child names | List of children | office_desk.students → office_desk.users | ✅ |
| | Grades | Grade 8, Grade 10 | office_desk.students.grade | ✅ |
| GROUPS | Group names | Senior School, LM Parents | public.family_groups | ✅ (Migration 197) |
| INVOICES | Family ID | Account identifier | office_desk.family_accounts.id | ✅ |
| | Invoice list | Amount, date, status | office_desk.invoices | ✅ |
| PAYMENTS | Ledger | Ledger | office_desk.payments | ✅ |
| | Bank Details | Bank info | office_desk.family_accounts.bank_* | ✅ (Migration 198) |

#### Teacher Profile

| Section | Field | Display | DB Column | Status |
|---|---|---|---|---|
| Avatar | Initials | MO | Computed from profiles.name | ✅ |
| Name | Full name | Mr. Olivier | profiles.name + profiles.surname | ✅ |
| Subtitle | Role + status | Teacher . Active | profiles.role + profiles.registration_status | ✅ |
| CLASSES TAUGHT | Subject | Mathematics | courses.title | ✅ |
| | Class | Class A | courses.section | ✅ (Migration 196) |
| | Students | 15 enrolled | student_class count | ✅ |
| | Schedule | Mon . 8:00-9:00 | schedule_slot | ✅ |
| GRADEBOOK | Per class | Grades | school_desk.gradebook | ✅ |
| ATTENDANCE | Per class | Attendance | school_desk.attendance | ✅ |

---

## 5. Database Schema — Migrations Applied

### Migration Status

| Migration | Target | Changes | Status |
|-----------|--------|---------|--------|
| 194 | `public.profiles` | +surname, +email, +phone, +zone (INT 1-7), +nation, +city, +devotional_group + trigger | ✅ Applied |
| 195 | `office_desk.students` | +curriculum, +zone, +nation, +city, +intake_group, +current_stage | ✅ Applied |
| 196 | `school_desk.courses` | +section (Class A/B) + CHECK constraint | ✅ Applied |
| 197 | `public.family_groups` + `user_group_members` | New tables with RLS | ✅ Applied |
| 198 | `office_desk.family_accounts` | +bank_name, +bank_account_number, +bank_branch, +bank_sort_code | ✅ Applied |
| 199 | `public.notification_types` | Enable RLS | ✅ Applied |
| 200 | `office_desk.*` | GRANTs for service_role and authenticated | ✅ Applied (NEW) |

### GRANTs Fixed (Migration 200)

**Issue:** office_desk tables had no GRANTs for PostgREST roles, causing `permission denied for table students` error.

**Resolution:** Added SELECT/INSERT/UPDATE/DELETE for `service_role` and `authenticated` on:
- `office_desk.students`
- `office_desk.family_accounts`
- `office_desk.users`
- `office_desk.invoices`
- `office_desk.payments`

### Verified Columns

**public.profiles (22 columns):**
- Existing: id, name, role, tenant_id, registration_status, consent_given, has_core, access_starts_at, access_ends_at, curriculum, grade, stage, intake, handle, content_group, created_at, updated_at
- New (Migration 194): surname, email, phone, zone, nation, city, devotional_group

**office_desk.students (18 columns):**
- Existing: id, tenant_id, family_account_id, user_id, grade, pack_choice, year_selection, enrollment_date, status, access_expiry, created_at, updated_at
- New (Migration 195): curriculum, zone, nation, city, intake_group, current_stage

**office_desk.family_accounts (12 columns):**
- Existing: id, tenant_id, account_number, family_name, created_at, updated_at
- New (Migration 198): bank_name, bank_account_number, bank_branch, bank_sort_code

---

## 6. Field Register (Cece Image Reference)

### Student Profile Fields (from Cece image)

| Field | Phase 1 Status | Notes |
|-------|---------------|-------|
| Student type | ✅ profiles.role | Already exists |
| Name, Surname | ✅ profiles.name, profiles.surname | Migration 194 |
| Date of birth | ⏳ Phase 2 | Not in Phase 1 |
| Registration year | ⏳ Phase 2 | Not in Phase 1 |
| Year of Registration | ⏳ Phase 2 | Not in Phase 1 |
| Date of Enrolment | ✅ office_desk.students.enrollment_date | Already exists |
| Grade of Enrolment | ⏳ Phase 2 | Not in Phase 1 |
| Years enrolled | ⏳ Phase 2 | Computed field |
| Main Zone | ✅ profiles.zone | Migration 194 |
| Secondary Zone | ⏳ Phase 2 | Not in Phase 1 |
| Intake Group | ✅ profiles.intake | Already exists |
| Current School Stage | ✅ profiles.stage | Already exists |
| Current Grade | ✅ profiles.grade | Already exists |
| Core Curriculum | ✅ profiles.curriculum | Already exists |
| Core Curriculum Package | ⏳ Phase 2 | Not in Phase 1 |
| Current Subjects | ✅ courses.title via student_class | Already exists |
| Current Subject Teacher | ✅ get_teacher_name RPC | Already exists |
| Subject History | ⏳ Phase 2 | Not in Phase 1 |
| Current Report Card | ⏳ Phase 2 | Not in Phase 1 |
| Report Card History | ⏳ Phase 2 | Not in Phase 1 |
| Current Clubs | ⏳ Phase 2 | Not in Phase 1 |
| Current Club Head | ⏳ Phase 2 | Not in Phase 1 |
| Clubs History | ⏳ Phase 2 | Not in Phase 1 |
| Current Enrichment | ⏳ Phase 2 | Not in Phase 1 |
| Groups | ⏳ Phase 2 | Not in Phase 1 |
| Booklist | ⏳ Phase 2 | Not in Phase 1 |
| Status | ✅ profiles.registration_status | Already exists |
| Access Expiry | ✅ office_desk.students.access_expiry | Already exists |
| Family Account | ✅ office_desk.students.family_account_id | Already exists |
| Siblings in school | ⏳ Phase 2 | Computed from family_account |
| Access Status | ✅ profiles.registration_status | Already exists |
| Adults | ⏳ Phase 2 | Via family_account |
| Analytics | ⏳ Phase 2 | Computed from gradebook + attendance |

### Adult Profile Fields (from Cece image)

| Field | Phase 1 Status | Notes |
|-------|---------------|-------|
| Family type | ⏳ Phase 2 | Not in Phase 1 |
| Name, Surname | ✅ profiles.name, profiles.surname | Migration 194 |
| ID | ⏳ Phase 2 | Not in Phase 1 |
| Main Zone | ✅ profiles.zone | Migration 194 |
| Secondary Zone | ⏳ Phase 2 | Not in Phase 1 |
| Current School Stage | ✅ profiles.stage | Already exists |
| Current Grade(s) | ✅ office_desk.students.grade | Already exists |
| Core Curriculum(s) | ✅ office_desk.students.curriculum | Migration 195 |
| Current Subject Staff | ✅ get_teacher_name RPC | Already exists |
| Current Clubs | ⏳ Phase 2 | Not in Phase 1 |
| Groups | ✅ public.family_groups | Migration 197 |
| Status | ✅ profiles.registration_status | Already exists |
| Access Status | ✅ profiles.registration_status | Already exists |
| Other Adults | ⏳ Phase 2 | Via family_account |
| Account Ledger | ✅ office_desk.invoices + payments | Already exists |
| Account Contracts | ⏳ Phase 2 | Not in Phase 1 |
| Account ID's | ⏳ Phase 2 | Not in Phase 1 |
| Account Statements | ⏳ Phase 2 | Not in Phase 1 |
| Payment Status | ✅ office_desk.invoices.status | Already exists |
| Bank Details | ✅ office_desk.family_accounts.bank_* | Migration 198 |
| Next of Kin | ⏳ Phase 2 | Not in Phase 1 |
| General Documents | ⏳ Phase 2 | Not in Phase 1 |

### Teacher Profile Fields (from Cece image)

| Field | Phase 1 Status | Notes |
|-------|---------------|-------|
| Staff type | ✅ profiles.role | Already exists |
| Name, Surname | ✅ profiles.name, profiles.surname | Migration 194 |
| ID | ⏳ Phase 2 | Not in Phase 1 |
| Main Zone | ✅ profiles.zone | Migration 194 |
| Current Subjects | ✅ courses.title via teacher_id | Already exists |
| Current Subject Students | ✅ student_class count | Already exists |
| Report Card of Subject Students | ⏳ Phase 2 | Not in Phase 1 |
| Current Clubs | ⏳ Phase 2 | Not in Phase 1 |
| Group Heads | ⏳ Phase 2 | Not in Phase 1 |
| Status | ✅ profiles.registration_status | Already exists |
| Access Status | ✅ profiles.registration_status | Already exists |
| Departments | ⏳ Phase 2 | Not in Phase 1 |
| Staff Ledger | ⏳ Phase 2 | Not in Phase 1 |
| Staff Contracts | ⏳ Phase 2 | Not in Phase 1 |
| Staff Documents | ⏳ Phase 2 | Not in Phase 1 |
| Analytics | ⏳ Phase 2 | Computed from gradebook + attendance |

---

## 7. Zone Configuration (7 Zones)

| Zone | Anchor UTC | Regions | Local Window |
|------|-----------|---------|--------------|
| 1 | UTC-7 | USA Pacific + Canada | 08:00–16:00 local |
| 2 | UTC-4 | USA Eastern + Brazil | 08:00–16:00 local |
| 3 | UTC+0 | UK + West Africa | 08:00–16:00 local |
| 4 | UTC+2 | South Africa + EU | 08:00–16:00 local |
| 5 | UTC+5:30 | India + Central Asia | 08:00–16:00 local |
| 6 | UTC+8 | Singapore + HK + China | 08:00–16:00 local |
| 7 | UTC+10 | Australia Eastern + NZ | 08:00–16:00 local |

---

## 8. Pricing Structure

| Curriculum | Grade Range | Annual Fee (GBP) |
|---|---|---|
| Homeschool | Grade R-2 | 4,800 |
| Cambridge | Grade 3-12 | 11,400 |
| IB | Grade 3-12 | 12,600 |

**Packages (Cambridge):**

| Package | Monthly (GBP) | A-Levels | IGCSE |
|---|---|---|---|
| Advanced | 440 | 4 subjects | 8 subjects |
| Performer | 355 | 3 subjects | 6 subjects |
| Flex | 355 | 2 subjects | 4 subjects |

---

## 9. Registration vs Enrollment Flow

| Step | Process | Desk | Table | What Happens |
|------|---------|------|-------|-------------|
| 1 | Registration | Front Desk | `office_desk.registrations` | Form + payment submitted |
| 2 | Enrollment | Office Desk | `office_desk.students` | Office Desk receives registration payment, starts enrollment |
| 3 | Profile Creation | System | `public.profiles` | Profile created after enrollment |
| 4 | Access Activation | System | Auth | User can now log in |

**Note:** `office_desk.registrations` ≠ `office_desk.students`. They are different tables for different processes.

---

## 10. Execution Status

**Date:** 2026-08-27
**Status:** MIGRATIONS APPLIED + DEV SERVER RUNNING

### Completed Work

| Item | Status | Notes |
|------|--------|-------|
| Migrations 194-200 | ✅ Applied | All 7 migrations applied via `supabase db reset` |
| GRANTs fixed | ✅ Done | Migration 200 added permissions for office_desk tables |
| TypeScript check | ✅ Passed | 0 errors |
| Tab restructure | ✅ Done | 10 tabs → 3 tabs (Home, Classes, Profile) |
| Profile screens | ✅ Built | 3 variations (Student, Adult, Teacher) |
| Code bugs fixed | ✅ Done | full_name→name, gradebook→school_desk.gradebook, attendance→school_desk.attendance |
| RLS policies | ✅ Verified | family_groups, user_group_members have family_id scoping |
| Dev server | ✅ Running | http://localhost:8081 |

### Cece Approvals Granted

| Decision | Approval |
|----------|----------|
| Phase 1 MVP = 3 tabs | ✅ Approved (overrides locked 5-section architecture) |
| Stage enum: Homeschool, Junior, Senior | ✅ Approved |
| Zone storage: Zone (1-7) + Nation + City | ✅ Approved |
| User model: Student, Adult, Teacher, Staff | ✅ Approved |
| Family Account ≠ Adult User | ✅ Approved |

### QA Lead Findings (Noted)

| Finding | Risk | Action |
|---------|------|--------|
| RLS testing needs pgTAP unit tests | HIGH | Add in Phase 1.1 |
| More negative test cases needed | HIGH | Add in Phase 1.1 |
| Admin role test matrix missing | MEDIUM | Add in Phase 1.1 |
| Banking PII encryption strategy | MEDIUM | Confirm Supabase default is sufficient |

---

## 11. Next Steps

1. **Test on device:** Open Expo Go, scan QR code, test 3 logins (Student, Adult, Teacher)
2. **Fix Home schedule filter:** Show only enrolled class slots, not all slots
3. **Ship to Cece:** Get leadership approval on corrected architecture
4. **Phase 1.1:** Add pgTAP tests, more negative test cases

---

## 12. Out of Scope (Deferred to Phase 2)

| Item | Reason |
|---|---|
| Enrichment courses | Phase 2 |
| Clubs | Phase 2 |
| Social features (Chat, Groups, Events) | Phase 2 |
| Hub screen | Replaced by Calendar in Google Stitch |
| Staff profile screen | Not designed yet |
| History tables (audit trails) | Phase 2 |
| Documents (ID, proof of address, contracts) | Phase 2 |
| Medical information | Phase 2 |
| Booklist management | Phase 2 |
| Departments management | Phase 2 |
| RedeStore integration | Phase 2 |
| Marketing campaigns | Phase 2 |
| Careers and applications | Phase 2 |

---

**Document prepared by:** Architect (opencode)
**Date:** 2026-08-27
**Status:** MIGRATIONS APPLIED + DEV SERVER RUNNING
**Next Action:** Test on device → Fix Home schedule filter → Ship to Cece
