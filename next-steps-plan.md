# COO FINAL SYNTHESIS PANEL REPORT — PART 2 BUILD PLAN

## EXECUTIVE SUMMARY

Based on comprehensive analysis of all 5 leadership council groups, the Redhouse education platform requires immediate foundation work before any user-facing features can be delivered. The critical path prioritizes type safety, authentication with legal compliance, and infrastructure setup to unblock all downstream development.

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
| P2-006 | Implement auth flow | Login, signup, email verification, password reset | Frontend Lead | P2-001 | Generate shared TypeScript types | Create @redhouse/shared/types/database.ts from migrations 013-025 | Frontend Lead | Running Supabase instance | 2 days | HIGH | ALL | DONE |
| P2-007 | Add auth hardening | Rate limiting, account lockout, MFA setup | Security Lead | P2-005 | Establish Supabase project | Create Supabase instance with proper configuration | DevOps Lead | Environment config | 1 day | HIGH | ALL | DONE |
| P2-008 | Seed admin/teacher/test users | Create test data for all roles across 3 tenants | Data Lead | P2-006 | 2 days | MEDIUM | ADMIN, CLASS | PLANNED NOT BUILT |
| P2-009 | Implement COPPA/FERPA compliance | Age verification, parental consent, data retention | Product Manager | P2-006, Legal review | 5 days | HIGH | ALL | PLANNED NOT BUILT |
| P2-010 | Implement audit logging | Log all auth events and data access changes | Backend Lead | P2-002 | Sync migrations 013-025 from rhproject-new | Copy missing migration files to current project | Backend Lead | Access to source files | 1 day | CRITICAL | ALL | DONE |

### CORE FEATURES PHASE (Weeks 3-5) — STUDENT EXPERIENCE

| # | Task | Description | Owner | Dependencies | Estimate | Risk | Affected UI Screens | Status |
|---|------|-------------|-------|--------------|----------|------|-------------------|--------|
| P2-011 | Student-class assignment | Link students to classes, teachers, schedules | Data Lead | P2-008 | 4 days | MEDIUM | CLASS | PLANNED NOT BUILT |
| P2-012 | Schedule/timetable system | terms + schedule_slot, EXCLUDE overlap guard (btree_gist/intarray/tsrange), admin-write RLS (D22), 12 pgTAP tests. BUILT/TESTED — migration 037, 96/96 PASS | Backend Lead | — | — | — | — | — | — | — | — | BUILT/TESTED |
| P2-013 | Payment processing | Stripe integration, course purchases, payment references | Backend Lead | P2-006, P2-001 | Generate shared TypeScript types | Create @redhouse/shared/types/database.ts from migrations 013-025 | Frontend Lead | Running Supabase instance | 2 days | HIGH | ALL | DONE |
| P2-014 | Video hosting integration | Muvi service setup, course content delivery | DevOps Lead | P2-005 | Establish Supabase project | Create Supabase instance with proper configuration | DevOps Lead | Environment config | 1 day | HIGH | ALL | DONE |
| P2-015 | Social data structures | Posts, likes, comments, groups, contacts, chat | Backend Lead | P2-002, P2-001 | Generate shared TypeScript types | Create @redhouse/shared/types/database.ts from migrations 013-025 | Frontend Lead | Running Supabase instance | 2 days | HIGH | ALL | DONE |

### REAL-TIME & NOTIFICATIONS PHASE (Weeks 5-6) — ENGAGEMENT

| # | Task | Description | Owner | Dependencies | Estimate | Risk | Affected UI Screens | Status |
|---|------|-------------|-------|--------------|----------|------|-------------------|--------|
| P2-016 | Real-time subscriptions | Supabase Realtime for live updates | Backend Lead | P2-015, P2-012 | 3 days | MEDIUM | ALL | PLANNED NOT BUILT |
| P2-017 | Notification system | Push, in-app, email notifications | Backend Lead | P2-016, P2-013 | 4 days | MEDIUM | ALL | PLANNED NOT BUILT |
| P2-018 | Enrichment/clubs management | Clubs, extracurricular activities, memberships | Backend Lead | P2-011, P2-006 | 4 days | MEDIUM | CLASS, HUB, PROFILE | BUILT/TESTED |
| P2-019 | Admin UI | Admin dashboard for platform management | Frontend Lead | P2-006, P2-001 | Generate shared TypeScript types | Create @redhouse/shared/types/database.ts from migrations 013-025 | Frontend Lead | Running Supabase instance | 2 days | HIGH | ALL | DONE |
| P2-020 | Certificate issuance | Automated course completion certificates | Backend Lead | P2-005 | Establish Supabase project | Create Supabase instance with proper configuration | DevOps Lead | Environment config | 1 day | HIGH | ALL | DONE |

### POLISH & INTEGRATION PHASE (Weeks 7-8) — COMPLETION

| # | Task | Description | Owner | Dependencies | Estimate | Risk | Affected UI Screens | Status |
|---|------|-------------|-------|--------------|----------|------|-------------------|--------|
| P2-021 | File upload system | Social features, certificate uploads, storage | DevOps Lead | P2-005 | Establish Supabase project | Create Supabase instance with proper configuration | DevOps Lead | Environment config | 1 day | HIGH | ALL | DONE |
| P2-022 | Booklist management | Course materials, reading lists, resources | Backend Lead | P2-011 | 2 days | LOW | PROFILE | PLANNED NOT BUILT |
| P2-023 | Platform access control | Role-based permissions, tenant isolation | Backend Lead | P2-006, P2-013 | 3 days | MEDIUM | PROFILE | PLANNED NOT BUILT |
| P2-024 | i18n support | Multi-language support for all screens | Frontend Lead | P2-001 | Generate shared TypeScript types | Create @redhouse/shared/types/database.ts from migrations 013-025 | Frontend Lead | Running Supabase instance | 2 days | HIGH | ALL | DONE |
| P2-025 | Announcements CRUD | School news, class announcements, posts | Backend Lead | P2-008 | 2 days | LOW | HOME, SOCIAL | PLANNED NOT BUILT |

### INFRASTRUCTURE MAINTENANCE (Ongoing) — QUALITY

| # | Task | Description | Owner | Dependencies | Estimate | Risk | Affected UI Screens | Status |
|---|------|-------------|-------|--------------|----------|------|-------------------|--------|
| P2-026 | Fix React Native version mismatch | Update mobile app dependencies | Mobile Lead | deferred.md D1 | 1 day | MEDIUM | MOBILE | PLANNED NOT BUILT |
| P2-027 | Fix lint errors (2 Biome format errors in packages/shared) — DONE 2026-07-03 commit 8a91ece. Was marked DONE prematurely with 2 residual errors; now truly clean. Same work item as D11 — do not double-count. | Code quality cleanup | Frontend Lead | P2-001 | Generate shared TypeScript types | Create @redhouse/shared/types/database.ts from migrations 013-025 | Frontend Lead | Running Supabase instance | 2 days | HIGH | ALL | DONE |
| P2-028 | Add monitoring and alerting | Sentry, logging, performance monitoring | DevOps Lead | P2-003 | 2 days | LOW | DEPLOYMENT | PLANNED NOT BUILT |
| P2-029 | Implement backup strategy | Data protection, recovery procedures | DevOps Lead | P2-005 | Establish Supabase project | Create Supabase instance with proper configuration | DevOps Lead | Environment config | 1 day | HIGH | ALL | DONE |
| P2-030 | Verify mobile-backend integration | Cross-platform testing and validation | Mobile Lead | P2-001 | Generate shared TypeScript types | Create @redhouse/shared/types/database.ts from migrations 013-025 | Frontend Lead | Running Supabase instance | 2 days | HIGH | ALL | DONE |
| P2-031 | Pin @types/react-dom ~18.2 to match React 18 runtime — DONE 2026-07-03 commit 3c8e885. Origin: ad-hoc operational fix during Phase 0 blitz. Related to D1 / P2-026 (same version-pinning domain). | Version alignment | DevOps Lead | P2-026 | 1 day | LOW | NONE | DONE |

## EXECUTION ORDER & DEPENDENCIES

### Phase 1: Foundation (Weeks 1-2) — BLOCKS EVERYTHING
**Critical Path:** P2-002 → P2-005 → P2-001 → P2-006 → P2-008 → P2-009

**Why Phase 1 First:**
- Without shared types (P2-001), frontend compilation fails
- Without migrations (P2-002), database schema is incomplete
- Without Supabase project (P2-005), no auth or database access
- Without auth (P2-006), no users can access any screens
- Without test users (P2-008), testing impossible
- Without COPPA/FERPA (P2-009), platform cannot legally operate

### Phase 2: Core Features (Weeks 3-5) — HIGHEST IMPACT
**Critical Path:** P2-011 → P2-012 → P2-013 → P2-014 → P2-015

**Why Phase 2 Second:**
- Schedule system (P2-012) enables HOME and CLASS screens
- Social features (P2-015) enable SOCIAL screen functionality
- Payments (P2-013) enable course monetization
- Video hosting (P2-014) enables content delivery
- Student-class assignment (P2-011) enables CLASS screen data

### Phase 3: Integration (Weeks 5-6) — CONNECTIVITY
**Critical Path:** P2-016 → P2-017 → P2-018 → P2-019 → P2-020

**Why Phase 3 Third:**
- Real-time (P2-016) enables live updates across all screens
- Notifications (P2-017) enable user engagement
- Enrichment/clubs (P2-018) enhance CLASS and HUB screens
- Admin UI (P2-019) enables platform management
- Certificates (P2-020) complete PROFILE screen functionality

### Phase 4: Quality (Weeks 7-8) — POLISH & LAUNCH
**Critical Path:** P2-021 → P2-022 → P2-023 → P2-024 → P2-025

**Why Phase 4 Fourth:**
- File upload (P2-021) enables social and certificate features
- Booklist (P2-022) completes PROFILE screen
- Access control (P2-023) ensures security
- i18n (P2-024) enables global accessibility
- Announcements (P2-025) completes HOME/SOCIAL functionality

## DECISIONS FOR CEECE APPROVAL

### CRITICAL APPROVALS REQUIRED BEFORE WORK STARTS:

1. **Legal Framework Approval**
   - COPPA/FERPA compliance framework must be approved by legal counsel
   - Parental consent mechanism design needs legal review
   - Data retention and deletion policies require legal sign-off

2. **Infrastructure Investment Decisions**
   - Video hosting service selection (Muvi vs alternatives)
   - Payment processor selection (Stripe vs alternatives)
   - Monitoring/alerting stack selection (Sentry vs alternatives)

3. **Technical Architecture Decisions**
   - Monorepo structure finalization (apps/web, apps/mobile, packages/shared)
   - CI/CD pipeline configuration (GitHub Actions vs alternatives)
   - Testing strategy (pgTAP vs unit tests vs integration tests)

4. **Resource Allocation Decisions**
   - Team composition for Phase 1 (Frontend, Backend, DevOps, Security)
   - Budget approval for video hosting and payment processing
   - Timeline acceptance for 40-50 person-days in Phase 2

5. **Compliance Timeline**
   - Legal review deadline for COPPA/FERPA framework
   - Production readiness date for compliance implementation
   - Emergency rollback plan if compliance not met

## TOP RISKS & MITIGATION PLANS

### CRITICAL RISKS (Catastrophic Impact):

**R1: Empty Shared Types (COMPILATION FAILURE)**
- **Risk:** Every frontend file importing from @redhouse/shared fails to compile
- **Impact:** Complete development blockade
- **Mitigation:** P2-001 as first task, backup manual type definitions
- **Confidence:** HIGH - This is the single biggest blocker identified by all groups

**R2: No Auth System (PLATFORM INACCESSIBILITY)**
- **Risk:** All 5 student screens inaccessible without authentication
- **Impact:** Zero user adoption, MVP impossible
- **Mitigation:** P2-006 with security hardening (P2-007), fallback demo mode
- **Confidence:** HIGH - Identified by all 5 groups as blocking

**R3: No COPPA/FERPA Compliance (LEGAL NON-COMPLIANCE)**
- **Risk:** Platform cannot legally operate for minor students
- **Impact:** Up to $43,280 per violation per child, shutdown risk
- **Mitigation:** P2-009 with legal framework, phased rollout for adult users first
- **Confidence:** HIGH - Legal requirement, non-negotiable per SME and Governance

**R4: No Payment Processing (REVENUE BLOCKED)**
- **Risk:** Course monetization impossible, business model broken
- **Impact:** Revenue loss, platform sustainability issues
- **Mitigation:** P2-013 with trial billing, alternative payment methods
- **Confidence:** MEDIUM - Business critical but can be delayed

**R5: No CI/CD Pipeline (DEPLOYMENT BLOCKADE)**
- **Risk:** Cannot ship to production, development stagnation
- **Impact:** Timeline extension, quality degradation
- **Mitigation:** P2-003 with manual deployment fallback, automated testing
- **Confidence:** MEDIUM - Infrastructure critical but can be worked around

### HIGH RISKS (Severe Impact):

**R6: Schedule System Complexity**
- **Risk:** Complex recurrence patterns, timezone handling, teacher assignments
- **Impact:** HOME and CLASS screens non-functional
- **Mitigation:** Research-based implementation (P2-012), MVP with basic scheduling
- **Confidence:** MEDIUM - Technical complexity high

**R7: Social Features Moderation**
- **Risk:** Content moderation, reporting, blocking functionality needed
- **Impact:** Social screen unusable for education platform
- **Mitigation:** Basic social features first, moderation tools later
- **Confidence:** MEDIUM - Feature creep risk

**R8: React Native Version Mismatch**
- **Risk:** Mobile build failures, app store rejection
- **Impact:** Mobile platform unusable
- **Mitigation:** P2-026 immediate fix, version pinning strategy
- **Confidence:** HIGH - Confirmed broken by Critic report

### MEDIUM RISKS (Moderate Impact):

**R9: 103 Pre-existing Lint Errors**
- **Risk:** Code quality degradation, technical debt accumulation
- **Impact:** Maintenance burden, developer productivity
- **Mitigation:** P2-027 cleanup, linting in CI pipeline
- **Confidence:** HIGH - Confirmed broken

**R10: Mobile-Backend Integration**
- **Risk:** Cross-platform compatibility issues
- **Impact:** Mobile app functionality gaps
- **Mitigation:** P2-030 comprehensive testing, feature flags
- **Confidence:** MEDIUM - Integration complexity

---

## SESSION LOG — 2026-07-03

Typecheck cleared to ZERO. Real count was 7, not 66/103 (stale). Installed @types/react-dom, removed 6 unused React imports. Commit b48378c.

Directory trap cleared: renamed redhouse-real-web to redhouse-real-web.DELETE. Anchored to rhproject-new, tree clean.

QA OVERRIDE: QA proposed enabling P2-003 with TS errors present. Overridden by Cece — no red-baseline launch.

DEVOTIONAL: standalone white-label, independent of mobile/LMS. Wrong outline corrected.

React confirmed 19.2.7.

STATUS: 4 commits ahead of origin/main. P2-003 ready to enable. Migration 019 NULL tenant_id fix pending.

## Blocker Log

| Blocker | Status | Date | Notes |
|---------|--------|------|-------|
| Blocker 1 — Service role key exposure | CLOSED | 2026-07-04 | Local-only; demo keys only; .env git-ignored, never committed; .env.example placeholders only |
| Blocker 2 — Tenant Isolation phase-1 | CLOSED | 2026-07-04 | pgTAP tests added (supabase/tests/): 6 suites, 33/33 PASS. RLS/JWT/admin_all verified. D10 closed. 023 reserved for next phase.

## Open Decisions

### D-REG-01: Registration Flow & Data Ownership = HYBRID
- **Date:** 2026-07-06
- **Status:** DECIDED

#### What Hybrid means here
The system splits ownership at the REGISTRATION GATE:
- BEFORE the gate: HubSpot owns leads/prospects (Public Desk).
- AT the gate: payment + signed contract + children's-data consent tick = the verdict.
- AFTER the gate: Supabase owns the registered identity. One-way — data crosses once and CRM becomes READ-ONLY for identity. CRM is only a view layer after this.

#### The three desks
- **Public Desk:** public/prospects, pre-gate, first registration (in HubSpot).
- **School (front) Desk:** registered users, post-gate service.
- **Office Desk:** business/finance/registration CHANGES/ops — staffed by Admin users. ("Admin" = user type, NOT the desk name.)

#### What Supabase holds (source of truth)
- Identity (student, RH-YYYY-NNNN + display name).
- Access-state: active, 1-year expiry.
- Entitlements: subjects/clubs/enrichment (pending/active).
- Verdicts only: payment ✓, contract ✓, consent ✓ + timestamps.
Money and paperwork STAY at the Office Desk. Only verdicts cross to Supabase.

#### Yearly lifecycle
- Booklist and access are PER-YEAR, built from choices PAID + SELECTED.
- Clean roll-over (no change) = automated.
- Any change (add/drop subject, club, roll-over adjustment) = Office Desk, via the registration form, on paid + signed. Never the Public Desk.

#### Mobile profile page
- It is the student's yearly OVERSIGHT: everything enrolled in + access for the year (course, subjects, stage, clubs, enrichment, booklist, schedule, certificates).
- It DISPLAYS only — it never changes anything. Changes come from registration at the Office Desk.
- Booklist derives from entitlements; Bookshelf auto-populates.

#### Children's-data consent
- The consent tick lives ON the registration form (point of collection).
- Parent/family ticks it (child never self-consents). REQUIRED to proceed.
- Covers education records + sub-processor interaction data + retention.
- Satisfies UK Children's Code + UK GDPR. Owned by Office Desk (contract/registration). Supabase holds only the consent verdict + timestamp.

#### Why Hybrid (rejected options)
- Rejected X (HubSpot owns, handoff on payment): doesn't cleanly cover post-gate CHANGES.
- Rejected Y (Supabase owns everything incl. leads): contradicts CRM = read-only view.
- Hybrid chosen because it matches the one-way gate, Office Desk = verdicts, and Supabase = identity/access/entitlement truth.

#### Downstream (leave as TODO — do NOT build now)
- [ ] T-REG-02: Map registration-form field names to HubSpot properties (identity, family anchor, choices, consent tick, metadata/UTMs). Sits at write-path step 4 (HubSpot + Make.com webhook).
- [ ] Confirm Make.com as the single sync conduit (verdicts only).
- [ ] Confirm payment provider.
- [ ] Confirm alumni transition (post-gate role change).
- [ ] Confirm family-pays-once → all-children-provisioned mechanism.

### P2-009 Compliance — Final Two Points

**Retention (P2-009):**
Student/alumni records are paid and contractual and are retained long-term under the
alumni-lifecycle justification — NOT deleted. Retention is disclosed to users.
On alumni transition, records are retained; only contract terms change (new adult
T&Cs require explicit consent). This is first-party education-record retention, not
time-boxed deletion.
Note: Gap 7 still applies — soft-delete/erasure of the erasable layer is logged in
access_log; backups time-boxed ~30 days; the contractual spine is not deletable.

**COPPA scope:**
Out of scope for MVP. Redhouse operates under UK Children's Code + UK GDPR only.
(Change to "in scope" only if US under-13 users are onboarded.)

Status: P2-009 CLEARED.

## PENDING CORRECTIONS — AWAITING LEADERSHIP APPROVAL (added 2026-07-08)

NOTE: The PART 2 TASK LIST tables above contain (a) corrupted rows with injected boilerplate and (b) stale statuses. These are NOT yet fixed. Work from this note as the source of truth until Backend, DevOps, and QA leads approve, then reconcile the tables.

### Status corrections pending (evidence-backed)
- P2-011 (student-class enrolment): table says PLANNED NOT BUILT -> ACTUAL: DONE [migration 027]
- P2-016 (real-time subscriptions): table says PLANNED NOT BUILT -> ACTUAL: DONE [migration 029]
- P2-028 (monitoring/alerting): table says PLANNED NOT BUILT -> ACTUAL: PARTIAL [6-check monitor.sh live; payments dropped (not mobile); PENDING: gate-bypass, brute-force, backup-status]
- P2-012 (schedule/timetable): table said DONE (premature) -> ACTUAL: BUILT/TESTED [migration 037, 12 pgTAP tests, 96/96 PASS]
- P2-029-trim (realtime publication): new task, not on original grid -> BUILT/TESTED [migration 038, 5 pgTAP membership assertions, 101/101 PASS]
- P2-018 (enrichment/clubs): table says PLANNED NOT BUILT -> ACTUAL: BUILT/TESTED [migration 039, 17 pgTAP assertions, 118/118 PASS]

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
