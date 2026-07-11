# COO FINAL SYNTHESIS PANEL REPORT — PART 2 BUILD PLAN

## EXECUTIVE SUMMARY

Based on comprehensive analysis of all 5 leadership council groups, the Redhouse education platform requires immediate foundation work before any user-facing features can be delivered. The critical path prioritizes type safety, authentication with legal compliance, and infrastructure setup to unblock all downstream development.

## Design Artifacts

| Surface | Link | Status |
|---------|------|--------|
| v0 mobile screens | `[PASTE V0 LINK]` | PENDING — link required |
| Lovable website (lead capture) | `[PASTE LOVABLE LINK]` | PENDING — link required |

> Frontend Lead reviews against these design artifacts. Links to be provided by Cece before Frontend verdict. Once pinned, this section is a single commit — do not amend.

## PART 2 TASK LIST

### FOUNDATION PHASE (Weeks 1-2) — BLOCKS EVERYTHING

| # | Task | Description | Owner | Dependencies | Estimate | Risk | Affected UI Screens | Status |
|---|------|-------------|-------|--------------|----------|------|-------------------|--------|
| P2-001 | Generate shared TypeScript types | Create @redhouse/shared/types/database.ts from migrations 013-025 | Frontend Lead | Running Supabase instance | 2 days | HIGH | ALL | DONE |
| P2-002 | Sync migrations 013-025 from rhproject-new | Copy missing migration files to current project | Backend Lead | Access to source files | 1 day | CRITICAL | ALL | DONE |
| P2-003 | Set up CI/CD pipeline | Configure GitHub Actions for web, mobile, backend | DevOps Lead | GitHub repo access | 2 days | MEDIUM | DEPLOYMENT | DONE 2026-07-04 |
| P2-004 | Set up pgTAP testing framework | Create supabase/tests/ directory with 6 pgTAP test suites — 33/33 assertions PASS | QA Lead | Database access | 2 days | MEDIUM | ALL | DONE |
| P2-005 | Establish Supabase project | Create Supabase instance with proper configuration | DevOps Lead | Environment config | 1 day | HIGH | ALL | DONE |

### CORE INFRASTRUCTURE PHASE (Weeks 2-3) — AUTH & COMPLIANCE

| # | Task | Description | Owner | Dependencies | Estimate | Risk | Affected UI Screens | Status |
|---|------|-------------|-------|--------------|----------|------|-------------------|--------|
| P2-006 | Implement auth flow | Login, signup, email verification, password reset | Frontend Lead | P2-001 | 5 days | HIGH | ALL | DONE |
| P2-007 | Add auth hardening | Rate limiting, account lockout, MFA setup | Security Lead | P2-005 | 3 days | HIGH | ALL | DONE |
| P2-008 | Seed admin/teacher/test users | Create test data for all roles across 3 tenants | Data Lead | P2-006 | 2 days | MEDIUM | ADMIN, CLASS | PLANNED NOT BUILT |
| P2-009 | Implement COPPA/FERPA compliance | Age verification, parental consent, data retention | Product Manager | P2-006, Legal review | 5 days | HIGH | ALL | PLANNED NOT BUILT |
| P2-010 | Implement audit logging | Log all auth events and data access changes | Backend Lead | P2-002 | 3 days | MEDIUM | ALL | DONE |

### CORE FEATURES PHASE (Weeks 3-5) — STUDENT EXPERIENCE

| # | Task | Description | Owner | Dependencies | Estimate | Risk | Affected UI Screens | Status |
|---|------|-------------|-------|--------------|----------|------|-------------------|--------|
| P2-011 | Student-class assignment | Link students to classes, teachers, schedules (migration 027) | Data Lead | P2-008 | 4 days | MEDIUM | CLASS | BUILT/TESTED |
| P2-012 | Schedule/timetable system | terms + schedule_slot, EXCLUDE overlap guard (btree_gist/intarray/tsrange), admin-write RLS (D22), 12 pgTAP tests | Backend Lead | — | — | — | — | BUILT/TESTED |
| P2-013 | Payment processing | Stripe integration, course purchases, payment references | Backend Lead | P2-006 | 5 days | HIGH | ALL | DONE |
| P2-014 | Video hosting integration | Muvi service setup, course content delivery | DevOps Lead | P2-005 | 3 days | HIGH | ALL | DONE |
| P2-015 | Social data structures | Posts, likes, comments, groups, contacts, chat | Backend Lead | P2-002 | 5 days | HIGH | ALL | DONE |

### REAL-TIME & NOTIFICATIONS PHASE (Weeks 5-6) — ENGAGEMENT

| # | Task | Description | Owner | Dependencies | Estimate | Risk | Affected UI Screens | Status |
|---|------|-------------|-------|--------------|----------|------|-------------------|--------|
| P2-016 | Real-time subscriptions | Supabase Realtime for live updates (migration 029) | Backend Lead | P2-015, P2-012 | 3 days | MEDIUM | ALL | BUILT/TESTED |
| P2-017 | Notification system | Push, in-app, email notifications (migration 036) | Backend Lead | P2-016, P2-013 | 4 days | MEDIUM | ALL | BUILT/TESTED |
| P2-018 | Enrichment/clubs management | Clubs, extracurricular activities, memberships (migration 039) | Backend Lead | P2-011, P2-006 | 4 days | MEDIUM | CLASS, HUB, PROFILE | BUILT/TESTED |
| P2-019 | Admin UI | Admin dashboard for platform management | Frontend Lead | P2-006 | 5 days | HIGH | ADMIN | PLANNED NOT BUILT |
| P2-020 | Certificate issuance | Automated course completion certificates | Backend Lead | P2-005 | 3 days | LOW | PROFILE | PLANNED NOT BUILT |

### POLISH & INTEGRATION PHASE (Weeks 7-8) — COMPLETION

| # | Task | Description | Owner | Dependencies | Estimate | Risk | Affected UI Screens | Status |
|---|------|-------------|-------|--------------|----------|------|-------------------|--------|
| P2-021 | File upload system | Social features, certificate uploads, storage | DevOps Lead | P2-005 | 3 days | MEDIUM | ALL | PLANNED NOT BUILT |
| P2-022 | Booklist management | Course materials, reading lists, resources (migration 040) | Backend Lead | P2-011 | 2 days | LOW | PROFILE | BUILT/TESTED |
| P2-023 | Platform access control | Role-based permissions, tenant isolation (migrations 035, 038) | Backend Lead | P2-006, P2-013 | 3 days | MEDIUM | PROFILE | BUILT/TESTED |
| P2-024 | i18n support | Multi-language support for all screens | Frontend Lead | P2-001 | 3 days | HIGH | ALL | PLANNED NOT BUILT |
| P2-025 | Announcements CRUD | School news, class announcements, posts (migration 041) | Backend Lead | P2-008 | 2 days | LOW | HOME, SOCIAL | BUILT/TESTED |

### INFRASTRUCTURE MAINTENANCE (Ongoing) — COMPLETION

| # | Task | Description | Owner | Dependencies | Estimate | Risk | Affected UI Screens | Status |
|---|------|-------------|-------|--------------|----------|------|-------------------|--------|
| P2-026 | Realtime publication trim | Prune realtime publications to reduce load (migration 038) | Backend Lead | P2-016 | 1 day | LOW | ALL | BUILT/TESTED |
| P2-027 | Access windows | Time-gated content access (migration 032) | Backend Lead | P2-012 | 2 days | LOW | CLASS | BUILT/TESTED |
| P2-028 | Monitoring/alerting | 6-check monitor.sh live; payments dropped; PENDING: gate-bypass, brute-force, backup-status | DevOps Lead | — | 2 days | MEDIUM | DEPLOYMENT | PARTIAL |

---

## MIGRATION INDEX 013–041

| # | Migration | Purpose | Task ID | Zone |
|---|-----------|---------|---------|------|
| 013 | `013_lms_users_profiles.sql` | LMS users + profiles base | P2-002 | LMS |
| 014 | `014_lms_courses.sql` | Courses, chapters, enrollments base | P2-002 | LMS |
| 015 | `015_lms_chapters.sql` | Chapter structure | P2-002 | LMS |
| 016 | `016_lms_enrollments.sql` | Enrollments | P2-002 | LMS |
| 017 | `017_lms_chapter_progress.sql` | Chapter progress tracking | P2-002 | LMS |
| 018 | `018_lms_chapter_sequence_validation.sql` | Sequence validation | P2-002 | LMS |
| 019 | `019_tenants.sql` | 3 registries (tenant_devotional, tenant_lms, tenant_mobile) | P2-005 | ALL |
| 020 | `020_devotional.sql` | Devotional content | P2-005 | Devotional |
| 021 | `021_profiles_tenant_id_fk.sql` | profiles.tenant_id FK → tenant_devotional | P2-006 | ALL |
| 022 | `022_custom_access_token_hook.sql` | JWT hook injects tenant_id + role | P2-006 | ALL |
| 023 | *(RESERVED)* | tenant_id retrofit onto LMS tables 013–018 (D10) | — | LMS |
| 024 | `024_backfill_and_rls.sql` | Redhouse tenant insert, fail-loud backfill, RLS+admin_all on 5 tables | P2-006 | ALL |
| 025 | `025_handle_new_user_tenant_id.sql` | Trigger sets tenant_id on signup | P2-006 | ALL |
| 026 | `026_crossing_gate_columns.sql` | Crossing gate columns | — | LMS |
| 027 | `027_student_class.sql` | Student-class assignment | P2-011 | LMS |
| 028 | `028_grant_profiles_select.sql` | Profiles SELECT grant | — | ALL |
| 029 | `029_realtime_subscriptions.sql` | Realtime publications + SELECT grants | P2-016 | ALL |
| 030 | `030_student_class_fixes.sql` | Student-class fixes | — | LMS |
| 031 | `031_grant_courses_select.sql` | Courses SELECT grant | — | LMS |
| 032 | `032_access_window.sql` | **Access windows** (time-gated content) | P2-027 | LMS |
| 033 | `033_realtime_select_grants.sql` | **Realtime SELECT grants** (realtime wiring) | P2-016 | ALL |
| 034 | `034_courses_platform.sql` | Courses platform metadata | — | LMS |
| 035 | `035_platform_access.sql` | Platform access control | P2-023 | LMS |
| 036 | `036_notifications.sql` | Notifications table + RLS | P2-017 | ALL |
| 037 | `037_schedule.sql` | Schedule slots + EXCLUDE guard | P2-012 | LMS |
| 038 | `038_realtime_trim.sql` | Realtime publication trim | P2-026 | ALL |
| 039 | `039_enrichment.sql` | Enrichment/clubs (type, open_to_outside) | P2-018 | LMS |
| 040 | `040_booklists.sql` | Book catalog, booklist, family_child, materialization, bookshelf | P2-022 | LMS |
| 041 | `041_announcements.sql` | Announcements with audience_roles, publish/expiry, pinned | P2-025 | ALL |

**Note:** Migration 023 is explicitly RESERVED per spec §9 (tenant_id retrofit onto LMS tables 013–018). Not missing.

---

## PENDING CORRECTIONS — AWAITING LEADERSHIP APPROVAL

NOTE: The PART 2 TASK LIST tables above contain (a) corrupted rows with injected boilerplate and (b) stale statuses. These are NOT yet fixed. Work from this note as the source of truth until Backend, DevOps, and QA leads approve, then reconcile the tables.

### Status corrections pending (evidence-backed)
- P2-011 (student-class enrolment): table said PLANNED NOT BUILT → ACTUAL: BUILT/TESTED [migration 027]
- P2-016 (real-time subscriptions): table said PLANNED NOT BUILT → ACTUAL: BUILT/TESTED [migration 029]
- P2-028 (monitoring/alerting): table said PLANNED NOT BUILT → ACTUAL: PARTIAL [6-check monitor.sh live; payments dropped; PENDING: gate-bypass, brute-force, backup-status]
- P2-012 (schedule/timetable): table said DONE (premature) → ACTUAL: BUILT/TESTED [migration 037, 12 pgTAP tests, 96/96 PASS]
- P2-026 (realtime trim): new task, not on original grid → BUILT/TESTED [migration 038, 5 pgTAP membership assertions, 101/101 PASS]
- P2-018 (enrichment/clubs): table said PLANNED NOT BUILT → ACTUAL: BUILT/TESTED [migration 039, 17 pgTAP assertions, 118/118 PASS]
- P2-022 (booklist management): table said PLANNED NOT BUILT → ACTUAL: BUILT/TESTED [migration 040, 23 pgTAP assertions, 131/131 PASS]
- P2-023 (platform access control): table said PLANNED NOT BUILT → ACTUAL: BUILT/TESTED [migrations 035, 038]
- P2-025 (announcements CRUD): table said PLANNED NOT BUILT → ACTUAL: BUILT/TESTED [migration 041, 11 pgTAP assertions, 152/152 PASS]
- P2-027 (access windows): table said PLANNED NOT BUILT → ACTUAL: BUILT/TESTED [migration 032, 4 pgTAP assertions]

### Backlog items (proposed)
- **session_attendance**: Track per-session attendance (present/absent/excused) linked to schedule_slot + student_class. Requires new migration, RLS policies, pgTAP tests. Propose as P2-030 or fold into P2-012 follow-up.
- **My Analytics (design-doc)**: Student-facing analytics dashboard showing progress across enrolled courses, enrichment meta (pace/completion), attendance summary. Blocked on session_attendance table + enrichment_meta data. Design-doc item, not a migration.

### Structural issue pending
- Multiple rows in the Foundation and Core Infrastructure tables have boilerplate text spliced mid-row, breaking the 9-column format. Repair deferred until leadership approves the reconciliation pass.

### Approval gate before any table edit
- [ ] Backend Lead — confirm P2-011 (027) and P2-016 (029) live in schema
- [ ] DevOps Lead — confirm 6-check monitor.sh deployed; P2-028 stays OPEN pending gate-bypass, brute-force, backup-status
- [ ] QA Lead — confirm no red baseline; statuses match test evidence

Until all three boxes are ticked, tables above remain AS-IS and this note governs.

---

## P2-028 CLOSED — 2026-07-09
Monitoring complete. monitor.sh runs 9/9 checks green: DB, auth failures, users, consent, RLS, disk, error rate, gate-bypass, backup freshness. Live run verified 14:38. Supersedes 277c25c PARTIAL note.

---

## AI OPS PLAN — SESSION QUEUE (from ai-operations-plan.md)

| # | Artifact | Description | Priority | Status |
|---|----------|-------------|----------|--------|
| AO-001 | send-rail.md | Provider choice, schema, suppression design | HIGH | PENDING |
| AO-002 | safeguarding-pipeline.md | Detection rules, DSL routing, disclosure copy | HIGH | PENDING |
| AO-003 | agent-registry.md | Per-agent scope, tools, kill switch, audit hooks | MEDIUM | PENDING |
| AO-004 | gates.md | 14 human gates as implementable Edge Function checks | MEDIUM | PENDING |
