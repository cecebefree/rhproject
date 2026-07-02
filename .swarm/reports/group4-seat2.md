# Group 4 Seat 2: Explorer

**Session:** Leadership Council Group 4 | **Leader:** Explorer
**Date:** 2026-07-02 | **Status:** REPORT COMPLETE

---

## Section 1: What Still Needs To Be Done

1. Fix shared package structure - Status: VERIFIED MISSING - packages/shared/src/types/database.ts is empty - Blocking: YES
2. Integrate root frontend with LMS - Status: PARTIAL - root src/ exists but not connected to apps/web - Blocking: YES
3. Complete mobile LMS implementation - Status: PARTIAL - apps/mobile has screens but needs verification - Blocking: YES
4. Implement missing backend features (auth, payments, video hosting) - Status: PLANNED NOT BUILT - Affects: All screens - Blocking: YES
5. Add CI/CD pipeline - Status: VERIFIED MISSING - Affects: Deployment - Blocking: YES
6. Implement pgTAP testing - Status: VERIFIED MISSING - Affects: Security verification - Blocking: YES
7. Complete Edge Functions - Status: VERIFIED MISSING - Affects: Business logic - Blocking: YES
8. Verify mobile-backend integration - Status: UNKNOWN - Affects: Cross-platform - Blocking: YES
9. Fix monorepo structure - Status: PARTIAL - apps exist but no shared package - Blocking: YES
10. Implement missing social features - Status: VERIFIED MISSING - Affects: SOCIAL screen - Blocking: YES

---

## Section 2: Analysis from Explorer Perspective

### Discovery: Actual Codebase State

**TRUE CLAIMS (VERIFIED):**
- 12 migrations (013-025) exist in supabase/migrations/
- seed.sql exists with 3 tenant records
- apps/web contains LMS feature implementation
- apps/mobile contains screens
- packages/shared exists but is mostly empty
- Web app has comprehensive LMS pages (StudentRegistrationPage, CourseCatalogPage, MyCoursesPage, CourseViewerPage, StudentDashboardPage, InstructorDashboardPage, EditCoursePage, AdminDashboardPage)
- Web app has auth, enrollment, chapter progress, course, chapter, admin services
- Web app uses React with TypeScript and Supabase integration

**FALSE CLAIMS (VERIFIED MISSING):**
- monorepo: Not properly configured - separate apps with no shared package
- shared package: Empty - types/database.ts is empty
- Edge Functions: Not present
- CI/CD: Not present
- pgTAP: Not present
- payments: Not implemented
- video hosting: Not implemented
- HubSpot sync: Not implemented
- Turnstile: Not implemented
- i18n: Not present

### Verification: apps/web used or root src/?

**apps/web** is the LMS implementation with:
- Student registration, course catalog, my courses, course viewer
- Student dashboard, instructor dashboard, admin dashboard
- Full CRUD for courses and chapters
- Authentication and enrollment management

**root src/** is a separate website frontend with:
- Home page with Hero, ThreePillars, CorePreview, CommunityLife, TrustSignals, FinalCTA
- This appears to be the main Redhouse website, not the LMS

### Validation: Migrations correct?

**Migrations 013-018** are correctly implemented with proper RLS policies and constraints.

**Migrations 019-025** have issues:
- Migration 019_tenants.sql: Correctly creates 3 tenant tables
- Migration 020_devotional.sql: Correctly creates devotional_config and devotional_item tables
- Migration 021_profiles_tenant_id_fk.sql: Correctly adds tenant_id FK to profiles
- Migration 024_backfill_and_rls.sql: Correctly backfills profiles.tenant_id and enables RLS
- Migration 025_handle_new_user_tenant_id.sql: Correctly sets tenant_id on new user signup

**seed.sql**: Correctly creates Redhouse tenant records across all 3 registries.

### Codebase Map: What exists vs what's claimed?

**EXISTS:**
- Supabase migrations (013-025)
- Seed data
- Web LMS app with full functionality
- Mobile app with LMS screens
- React/TypeScript frontend
- Supabase integration
- Basic auth (in web app only)

**MISSING:**
- Proper monorepo structure
- Shared package with types
- CI/CD pipeline
- Edge Functions
- pgTAP testing
- Complete auth system
- Payments system
- Video hosting
- HubSpot sync
- Turnstile
- i18n
- Complete mobile-backend integration

### Priority

**VERIFICATION BEFORE PART 2 CODE:**
1. Fix shared package (highest priority - blocks type safety)
2. Verify mobile-backend integration
3. Complete missing features
4. Set up CI/CD
5. Add testing

---

## Section 3: Phase 2 TODO List

| # | Task | Owner | Dependencies | Estimate | Risk |
|---|------|-------|--------------|----------|------|
| 1 | Implement shared package types | Frontend Lead | None | 2 days | HIGH |
| 2 | Fix monorepo structure | DevOps Lead | Shared package | 1 day | MEDIUM |
| 3 | Verify mobile-backend integration | SME | Shared package | 2 days | HIGH |
| 4 | Implement missing backend features | Backend Lead | Backend APIs | 5 days | HIGH |
| 5 | Set up CI/CD pipeline | DevOps Lead | Repository structure | 2 days | MEDIUM |
| 6 | Add pgTAP testing | QA Lead | Database | 3 days | MEDIUM |
| 7 | Implement Edge Functions | Backend Lead | Supabase setup | 3 days | MEDIUM |
| 8 | Complete auth system | Frontend Lead | Supabase Auth | 5 days | HIGH |

---

## Bonus: Full Plan

### Critical Issues Identified
1. Shared package is empty but imported by web app
2. No proper monorepo setup
3. Missing CI/CD and testing
4. Incomplete feature implementation

### Recommended Approach
1. First, fix the shared package to provide the types the web app needs
2. Then integrate the root frontend with the LMS
3. Finally, add missing features and infrastructure

### Phase 1: Foundation (Weeks 1-4)
- Fix shared package structure
- Implement shared types from database schema
- Verify mobile-backend integration
- Set up CI/CD pipeline

### Phase 2: Core Features (Weeks 5-8)
- Complete auth system
- Implement missing backend features
- Add pgTAP testing
- Implement Edge Functions

### Phase 3: Integration (Weeks 9-12)
- Integrate root frontend with LMS
- Complete mobile-backend integration
- Add comprehensive testing

### Phase 4: Polish (Weeks 13-16)
- Security audit
- Performance optimization
- Documentation completion

---

*Report generated: 2026-07-02*
*Awaiting: OK-to-build from Cece*
