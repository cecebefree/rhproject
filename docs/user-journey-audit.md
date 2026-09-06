# User Journey Audit — rhproject-new
**Date:** 2026-09-05
**Platforms:** Website (redhouse.lovable.app), Service Desk (web admin), Mobile (Expo)

---

## 1. PLATFORM MAP

### Website (Public)
| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Landing page | LIVE |
| `/register` | Registration form | LIVE |
| `/register/success` | Post-payment confirmation | LIVE |
| `/register/cancel` | Payment cancelled | LIVE |
| `/parent-portal` | Parent dashboard (read-only) | LIVE |
| `/service-desk` | Service desk login | LIVE |
| `/service/*` | All admin desks | LIVE |
| `/info/*`, `/core/*`, `/sup/*`, `/social/*` | Marketing pages | LIVE (Lovable) |

### Mobile (Expo)
| Tab | Purpose | Status |
|-----|---------|--------|
| Home | Schedule, devotional, news | LIVE |
| Class | Enrolled classes, schedule | LIVE |
| Profile | Role-conditional profile | LIVE |
| Login | Email/password auth | LIVE |
| (hidden) | front-desk, office-desk, social, hub, teacher, family, etc. | HIDDEN/SEED |

### Service Desk (Web Admin)
| Desk | Purpose | Status |
|------|---------|--------|
| Front Desk | Lead intake, callbacks, emails | LIVE |
| Office Desk | Registrations, invoices, payments, contracts | LIVE |
| School Desk | Students, attendance, report cards, chat, broadcasts | LIVE |
| Teacher Dashboard | My curriculums, students, attendance, gradebook | LIVE |
| CRM | Family/adult/student/staff profiles | LIVE |

---

## 2. USER JOURNEYS

### A. FAMILY / PARENT JOURNEY

**Expected flow:**
1. Visit website → browse programs → Register
2. Complete registration form → pay
3. Receive confirmation email
4. Download mobile app → login
5. See child's schedule, grades, attendance
6. View invoices, make payments

**What exists:**
| Step | Platform | Component | Status |
|------|----------|-----------|--------|
| Browse programs | Website | IndexPage (Lovable) | LIVE |
| Register | Website | `/register` → RegistrationForm | LIVE |
| Pay | Website | Stripe/PayPal redirect | LIVE |
| Confirmation | Website | `/register/success` (polls for 60s) | LIVE |
| Mobile login | Mobile | `login.tsx` (email/password) | LIVE |
| View child | Mobile | `family.tsx` | SEED ONLY |
| View schedule | Mobile | Home tab | LIVE (filtered) |
| View grades | Mobile | Report card tab | LIVE |
| View invoices | Mobile | Profile tab → PaymentHistoryList | LIVE |
| View attendance | Mobile | N/A | MISSING |

**GAPS — FAMILY:**
1. **`family.tsx` is SEED DATA** — hardcoded `SEED_USER`, not wired to real DB
2. **No parent→child linking** — no `parent_student_link` query in mobile
3. **No attendance view in mobile** — exists in parent-portal web but not mobile
4. **No invoice detail view** — only list, no detail/payment action
5. **No notification push** — no push notification setup for parents
6. **Parent portal role check** — checks `role='parent'` but our roles are `family`/`student`/`teacher`

### B. STUDENT JOURNEY

**Expected flow:**
1. Parent registers → student gets account
2. Student downloads app → login
3. See enrolled classes
4. View schedule
5. Join live classes
6. View grades, attendance
7. Access devotional content

**What exists:**
| Step | Platform | Component | Status |
|------|----------|-----------|--------|
| Login | Mobile | `login.tsx` | LIVE |
| Home schedule | Mobile | Home tab (useHomeFilter) | LIVE |
| Enrolled classes | Mobile | Class tab | LIVE |
| Class detail | Mobile | `class-detail.tsx` | LIVE |
| Profile | Mobile | Profile tab | LIVE |
| Report card | Mobile | `report-card.tsx` | LIVE |
| Devotional | Mobile | `devotional.tsx` | LIVE |
| Attendance | Mobile | N/A | MISSING |
| Grades (detail) | Mobile | N/A | MISSING |
| Join live class | Mobile | N/A | MISSING (no video integration) |
| Certificates | Mobile | `certificates.tsx` | HIDDEN |

**GAPS — STUDENT:**
1. **No attendance view in mobile** — only in service desk
2. **No grade detail view** — only report card summary
3. **No "join class" button** — no video call integration
4. **Certificates hidden** — `href: null` in tab layout
5. **No assignment view** — AssignmentForm exists but not in mobile
6. **No chat/messaging** — ConversationList/ChatView exist but not in mobile

### C. TEACHER JOURNEY

**Expected flow:**
1. Teacher receives invite → creates account
2. Logs into service desk
3. Sees assigned curriculums
4. Manages attendance
5. Enters grades
6. Broadcasts to students
7. Uses mobile app for quick actions

**What exists:**
| Step | Platform | Component | Status |
|------|----------|-----------|--------|
| Service desk login | Web | `/service-desk` | LIVE |
| Teacher dashboard | Web | TeacherDashboardPage | LIVE |
| My curriculums | Web | TeacherDashboardPage (courses) | LIVE |
| Student list | Web | TeacherDashboardPage (students) | LIVE |
| Attendance | Web | SchoolDeskAttendancePage | LIVE |
| Gradebook | Web | GradebookList, GradebookForm | LIVE |
| Broadcasts | Web | BroadcastForm, BroadcastList | LIVE |
| Chat | Web | SchoolDeskChatPage | LIVE |
| Mobile: teacher tab | Mobile | `teacher.tsx` | LIVE |
| Mobile: classes | Mobile | Class tab | LIVE |

**GAPS — TEACHER:**
1. **Mobile teacher tab hidden** — `href: null` in tab layout
2. **No assignment creation in mobile** — only in service desk
3. **No report card entry in mobile** — only in service desk
4. **Teacher cannot see own schedule** — only student schedule in mobile

### D. OFFICE / ADMIN JOURNEY

**Expected flow:**
1. Admin logs into service desk
2. Sees dashboard overview
3. Manages leads (Front Desk)
4. Processes registrations (Office Desk)
5. Manages billing, invoices, payments
6. Views reports, analytics

**What exists:**
| Step | Platform | Component | Status |
|------|----------|-----------|--------|
| Login | Web | `/service-desk` (password: redhouse2026) | LIVE |
| Dashboard | Web | ServiceDeskPage (stats) | MOCK DATA |
| Front Desk | Web | LeadList, LeadDetail, LeadIntakeForm | LIVE |
| Office Desk | Web | Registrations, Invoices, Payments, Contracts | LIVE |
| School Desk | Web | Students, Attendance, Report Cards, Chat | LIVE |
| CRM | Web | FamilyProfilePage, AdultProfilePage, etc. | MOCK DATA |
| Analytics | Web | AnalyticsPage | LIVE |
| Settings | Web | OfficeDeskSettingsPage | LIVE |

**GAPS — ADMIN:**
1. **Service Desk stats are MOCK DATA** — hardcoded numbers
2. **CRM profiles are MOCK DATA** — hardcoded family/student data
3. **No real dashboard aggregation** — stats don't pull from DB
4. **No role-based desk access control** — password only, no RBAC
5. **No activity log viewer** — activity_log table exists but no UI
6. **No notification center** — notifications table exists but no UI

---

## 3. CRITICAL CROSS-PLATFORM GAPS

### A. Registration → Mobile App Disconnect
**Problem:** After registration on website, there's no clear path to mobile app access.
- Registration creates a `lead` in `front_desk.leads`
- Payment webhook creates registration in `office_desk.registrations`
- But NO user account is created in `auth.users`
- Mobile app requires email/password login
- **No onboarding flow** tells parent how to access mobile app

**Missing:**
- Auto-create auth user after registration approval
- Send welcome email with mobile app download link + temp password
- Mobile app "first login" experience

### B. Role Routing Confusion
**Problem:** Role names are inconsistent across platforms:
- Website parent portal checks `role='parent'` but DB has `role='family'`
- Mobile has tabs for `family`, `teacher`, `student`, `front-desk`, `office-desk`
- Service desk uses password-based access, not role-based

**Missing:**
- Unified role system across all platforms
- Role-based routing in mobile (show/hide tabs based on role)

### C. Data Flow Gaps
**Problem:** Data doesn't flow seamlessly between platforms:
- Registration on website → no automatic student enrollment in classes
- Teacher enters attendance → not visible to parent in mobile
- Parent pays invoice → status update not reflected in real-time

**Missing:**
- Auto-enrollment after registration approval
- Real-time status sync across platforms
- Push notifications for status changes

---

## 4. PRIORITY FIXES

### P0 — BLOCKING LAUNCH
1. **Fix parent role check** — `parent-portal` checks `role='parent'` but should check `role='family'`
2. **Wire `family.tsx` in mobile** — currently SEED data, needs real DB queries
3. **Create auth user after registration** — registration flow must create Supabase auth user
4. **Welcome email with mobile app link** — after registration approval

### P1 — HIGH PRIORITY
5. **Add attendance view to mobile** — parents/students need to see attendance
6. **Wire CRM to real data** — FamilyProfilePage uses MOCK_FAMILY
7. **Wire service desk stats to real data** — ServiceDeskPage uses MOCK data
8. **Enable teacher mobile tab** — currently hidden

### P2 — MEDIUM PRIORITY
9. **Add invoice detail view** — mobile only has list
10. **Add notification center** — service desk has notifications table but no UI
11. **Add activity log viewer** — service desk has activity_log but no UI
12. **Enable certificates tab** — currently hidden in mobile

### P3 — LOW PRIORITY
13. **Add push notifications** — for schedule reminders, grade updates
14. **Add video call integration** — for live classes
15. **Add assignment view in mobile** — only in service desk
16. **Add chat in mobile** — ConversationList/ChatView exist but not in mobile

---

## 5. FILES TO FIX

### P0 Fixes
| File | Issue | Fix |
|------|-------|-----|
| `apps/web/src/features/parent-portal/pages/ParentPortalPage.tsx` | `role !== 'parent'` | Change to `role !== 'family'` |
| `apps/mobile/app/(tabs)/family.tsx` | SEED data | Wire to real DB |
| `supabase/functions/website-lead-to-registration/index.ts` | No auth user creation | Add `supabase.auth.admin.createUser()` |
| `apps/web/src/features/registration/RegistrationSuccess.tsx` | No mobile app link | Add "Download App" CTA |

### P1 Fixes
| File | Issue | Fix |
|------|-------|-----|
| `apps/mobile/app/(tabs)/profile.tsx` | No attendance section | Add AttendanceSection component |
| `apps/web/src/pages/FamilyProfilePage.tsx` | MOCK data | Wire to real DB |
| `apps/web/src/pages/ServiceDeskPage.tsx` | MOCK stats | Wire to real DB |
| `apps/mobile/app/(tabs)/_layout.tsx` | Teacher tab hidden | Remove `href: null` |
