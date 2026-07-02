# Group 5 Seat 3: Critic

**Session:** Leadership Council Group 5 | **Leader:** Critic
**Date:** 2026-07-02 | **Status:** REPORT COMPLETE

---

## Section 1: What Still Needs To Be Done

| # | Item | Screen(s) | Status | Blocking |
|---|------|-----------|--------|----------|
| 1 | Auth system (sign-up, login, email verification, password reset, MFA, rate limiting, account lockout) | ALL | PLANNED NOT BUILT | YES |
| 2 | Auth.users integration — no auth.users table mapping confirmed | ALL | VERIFIED MISSING | YES |
| 3 | Admin/teacher users in seed data — seed.sql only creates 3 tenant records | ADMIN, CLASS | VERIFIED MISSING | YES |
| 4 | Payment processing (Stripe integration, payment tables, purchase flow) | HUB, CLASS | PLANNED NOT BUILT | YES |
| 5 | Video hosting integration (Muvi or equivalent service) | HUB, CLASS | PLANNED NOT BUILT | YES |
| 6 | Shared TypeScript types — packages/shared/src/types/database.ts is empty | ALL | VERIFIED MISSING | YES |
| 7 | CI/CD pipeline — no build, test, or deploy automation | DEPLOYMENT | VERIFIED MISSING | YES |
| 8 | pgTAP tests — supabase/tests/ does not exist | DATABASE | VERIFIED MISSING | YES |
| 9 | Social data structures (posts, likes, comments, groups, contacts, chat) | SOCIAL | VERIFIED MISSING | YES |
| 10 | Schedule/timetable system (classes, times, rooms, teachers) | HOME, CLASS | VERIFIED MISSING | YES |
| 11 | School news/announcements system | HOME, SOCIAL | VERIFIED MISSING | YES |
| 12 | Enrichment/clubs management | CLASS, HUB, PROFILE | VERIFIED MISSING | YES |
| 13 | Certificate issuance system | PROFILE | VERIFIED MISSING | YES |
| 14 | Booklist management | PROFILE | VERIFIED MISSING | YES |
| 15 | Platform access control | PROFILE | VERIFIED MISSING | YES |
| 16 | Notification system (push, in-app, email) | ALL | PLANNED NOT BUILT | YES |
| 17 | Real-time subscriptions (Supabase Realtime) | ALL | PLANNED NOT BUILT | YES |
| 18 | File upload system | SOCIAL, PROFILE | PLANNED NOT BUILT | YES |
| 19 | COPPA/FERPA compliance | ALL | VERIFIED MISSING | YES |
| 20 | Student-class assignment logic | CLASS | VERIFIED MISSING | YES |
| 21 | Edge Functions | ALL | VERIFIED MISSING | NO |
| 22 | HubSpot CRM sync | SOCIAL, PROFILE | PLANNED NOT BUILT | NO |
| 23 | i18n/localization | ALL | PLANNED NOT BUILT | NO |
| 24 | Turnstile Captcha | AUTH | PLANNED NOT BUILT | NO |
| 25 | Monorepo structure | BUILD | PARTIAL | YES |
| 26 | Admin UI | ADMIN | PLANNED NOT BUILT | YES |
| 27 | Mobile-backend integration verification | MOBILE | UNKNOWN | YES |
| 28 | Migrations 013-025 | DATABASE | INDETERMINATE | YES |
| 29 | Lint debt — 103 pre-existing lint errors | ALL | CONFIRMED BROKEN | NO |
| 30 | React Native version mismatch | MOBILE | CONFIRMED BROKEN | YES |

---

## Section 2: Risk Analysis

### Risk Matrix

| Risk | Severity | Likelihood | Impact | Risk Score |
|------|----------|------------|--------|------------|
| A1: No auth system | CRITICAL | CERTAIN | Complete platform inaccessibility | CATASTROPHIC |
| A2: No payments | CRITICAL | CERTAIN | No monetization for courses | CATASTROPHIC |
| A3: No video hosting | CRITICAL | CERTAIN | Learning content cannot be delivered | CATASTROPHIC |
| A4: Empty shared types | CRITICAL | CERTAIN | Compilation fails, entire frontend blocked | CATASTROPHIC |
| A5: No compliance (COPPA/FERPA) | CRITICAL | CERTAIN | Platform cannot legally operate for minors | CATASTROPHIC |
| B1: No CI/CD | HIGH | CERTAIN | Cannot ship to production | SEVERE |
| B2: No pgTAP tests | HIGH | CERTAIN | RLS policies unverifiable | SEVERE |
| B3: No social data | HIGH | CERTAIN | Social feature inoperable | SEVERE |
| B4: No schedule/timetable | HIGH | CERTAIN | Core dashboard features non-functional | SEVERE |
| B5: No student-class assignment | HIGH | CERTAIN | Timetable has no data source | SEVERE |
| C1: React Native version mismatch | MEDIUM | HIGH | Mobile build failure | MODERATE |
| C2: 103 pre-existing lint errors | MEDIUM | CERTAIN | Code quality degradation | MODERATE |
| C3: No monitoring/alerting | MEDIUM | CERTAIN | Blind to production issues | MODERATE |
| C4: No backup strategy | MEDIUM | HIGH | Data loss scenario | MODERATE |

### Top 5 Blockers (Ranked by Blast Radius)

1. **Empty shared types** — Every file importing from @redhouse/shared is broken. Type system is the foundation. Fix: ~2 days.
2. **No auth system** — All 5 screens inaccessible. RLS policies are dead code without JWT. Fix: ~5 days.
3. **No COPPA/FERPA compliance** — Legal risk up to $43,280 per violation per child. Fix: ~3-5 days legal + 5-7 days implementation.
4. **No payment processing** — Core revenue model blocked. Fix: ~6 days.
5. **No CI/CD pipeline** — Cannot ship to production. Fix: ~2 days.

### Fragile Assumptions

1. **"Migrations 013-025 exist"** — Migration directory in this project is empty. Files are in rhproject-new. Risk: Schema foundation absent.
2. **"The spec covers everything"** — Spec only covers migrations 019-022. Auth, payments, video, social, compliance not in spec. Risk: Inconsistent implementation.
3. **"Locked UI screens are source of truth"** — Design prototypes, not production code. Risk: Backend integration mismatches.
4. **"Supabase handles auth out of the box"** — Custom JWT claims, password reset, rate limiting, lockout require custom implementation. Risk: Security hardening omitted.
5. **"Shared types can be generated in one pass"** — Chicken-and-egg: need running Supabase to generate types, need types to build frontend. Risk: Bootstrap dependency.

### Spec-to-Reality Gaps

| Spec Requirement | Reality | Gap Severity |
|------------------|---------|--------------|
| Migration 019: Tenant registries | Scripts reference tenant tables but actual migration files absent | CRITICAL |
| Migration 022: Schedule schema | schedule_category, targeting_root, targeting_node, schedule_item — none exist | CRITICAL |
| Environment setup (.env, Makefile) | Not present | HIGH |
| 8 roles (student, teacher, admin, etc.) | Only basic roles referenced; no seed data with role assignments | HIGH |
| RLS: default-deny, claim-based | RLS scripts referenced but absent here | CRITICAL |
| Golden student fully provisioned | seed.sql creates tenants but no student profile record | CRITICAL |
| pgTAP tests pass 100% | supabase/tests/ does not exist | CRITICAL |

### Priority — ONE Risk That Must Be Mitigated First

**Generate shared types from database schema.** This one task, done first, unblocks every other task by providing the type foundation. Without it, every line of code written is a guess.

---

## Section 3: Phase 2 TODO List

### Tier 0 — FOUNDATION (Week 1)

| # | Task | Owner | Dependencies | Estimate | Risk |
|---|------|-------|--------------|----------|------|
| P2-1 | Generate shared TypeScript types | Frontend Lead | Running Supabase instance | 2 days | HIGH |
| P2-2 | Sync migrations 013-025 from rhproject-new | Backend Lead | Access to source files | 1 day | CRITICAL |
| P2-3 | Set up CI/CD pipeline | DevOps Lead | GitHub repo access | 2 days | MEDIUM |
| P2-4 | Set up pgTAP testing framework | QA Lead | Database access | 2 days | MEDIUM |
| P2-5 | Establish Supabase project | DevOps Lead | Environment config | 1 day | HIGH |

### Tier 1 — AUTHENTICATION & COMPLIANCE (Week 2)

| # | Task | Owner | Dependencies | Estimate | Risk |
|---|------|-------|--------------|----------|------|
| P2-6 | Implement auth flow | Frontend Lead | P2-1, P2-5 | 5 days | HIGH |
| P2-7 | Add auth hardening | Security Lead | P2-5 | 3 days | HIGH |
| P2-8 | Seed admin/teacher/test users | Data Lead | P2-6 | 2 days | MEDIUM |
| P2-9 | Implement COPPA/FERPA compliance | Product Manager | P2-6, Legal review | 5 days | HIGH |
| P2-10 | Implement audit logging | Backend Lead | P2-2 | 3 days | MEDIUM |

### Tier 2 — CORE FEATURES (Weeks 3-4)

| # | Task | Owner | Dependencies | Estimate | Risk |
|---|------|-------|--------------|----------|------|
| P2-11 | Student-class assignment | Data Lead | P2-8 | 4 days | MEDIUM |
| P2-12 | Schedule/timetable system | Backend Lead | P2-2, P2-1 | 5 days | HIGH |
| P2-13 | Payment processing | Backend Lead | P2-6, P2-1 | 6 days | HIGH |
| P2-14 | Video hosting | DevOps Lead | P2-5 | 4 days | HIGH |
| P2-15 | Social data structures | Backend Lead | P2-2, P2-1 | 5 days | MEDIUM |

### Tier 3 — ENHANCEMENT (Weeks 5-6)

| # | Task | Owner | Dependencies | Estimate | Risk |
|---|------|-------|--------------|----------|------|
| P2-16 | Real-time subscriptions | Backend Lead | P2-15, P2-12 | 3 days | MEDIUM |
| P2-17 | Notification system | Backend Lead | P2-16, P2-13 | 4 days | MEDIUM |
| P2-18 | Enrichment/clubs management | Backend Lead | P2-11, P2-6 | 4 days | MEDIUM |
| P2-19 | Admin UI | Frontend Lead | P2-6, P2-1 | 5 days | MEDIUM |
| P2-20 | Certificate issuance | Backend Lead | P2-5, storage | 3 days | MEDIUM |

### Tier 4 — POLISH (Weeks 7-8)

| # | Task | Owner | Dependencies | Estimate | Risk |
|---|------|-------|--------------|----------|------|
| P2-21 | File upload system | DevOps Lead | P2-5 | 2 days | LOW |
| P2-22 | Booklist management | Backend Lead | P2-11 | 2 days | LOW |
| P2-23 | Platform access control | Backend Lead | P2-6, P2-13 | 3 days | MEDIUM |
| P2-24 | i18n support | Frontend Lead | P2-1 | 3 days | LOW |
| P2-25 | Announcements CRUD | Backend Lead | P2-8 | 2 days | LOW |

### Tier 5 — INFRASTRUCTURE (Ongoing)

| # | Task | Owner | Dependencies | Estimate | Risk |
|---|------|-------|--------------|----------|------|
| P2-26 | Fix React Native version mismatch | Mobile Lead | deferred.md D1 | 1 day | MEDIUM |
| P2-27 | Fix 103 pre-existing lint errors | Frontend Lead | P2-1 | 3 days | MEDIUM |
| P2-28 | Add monitoring and alerting | DevOps Lead | P2-3 | 2 days | LOW |
| P2-29 | Implement backup strategy | DevOps Lead | P2-5 | 2 days | MEDIUM |
| P2-30 | Verify mobile-backend integration | Mobile Lead | P2-1 through P2-15 | 3 days | HIGH |

### Critical Path

P2-2 (migrations) → P2-5 (Supabase project) → P2-1 (types) → P2-6 (auth) → P2-8 (seed users) → P2-11 (student-class) = ~15 days

**Total Phase 2 estimate:** ~40-50 person-days across 8 weeks.

---

## Bonus: Full Plan

### Phase 1: Foundation (Weeks 1-2)
- Sync and run all migrations
- Generate shared types
- Set up CI/CD and pgTAP testing
- Fix mobile version pin

### Phase 2: Auth & Compliance (Weeks 2-3)
- Implement auth flow with security hardening
- Seed test users for all roles
- Implement COPPA/FERPA compliance
- Add audit logging

### Phase 3: Core Features (Weeks 3-5)
- Build student-class assignment system
- Implement schedule/timetable system
- Add payment processing
- Implement video hosting
- Build social data structures

### Phase 4: Real-Time & Notifications (Weeks 5-6)
- Implement real-time subscriptions
- Build notification system
- Add enrichment/clubs management
- Implement file upload

### Phase 5: Admin & Polish (Weeks 6-8)
- Create Admin UI
- Implement certificates, booklist, access control
- Add i18n support

### Phase 6: Hardening (Weeks 8-9)
- RLS policy pgTAP tests
- Add monitoring and alerting
- Security audit and performance testing

### Phase 7: Launch (Weeks 9-10)
- Staging deployment
- UAT with stakeholders
- Production deployment
- Post-launch monitoring

---

*Report generated: 2026-07-02*
*Awaiting: OK-to-build from Cece*
