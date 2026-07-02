# Group 2 Seat 3: QA Lead

**Session:** Leadership Council Group 2 | **Leader:** QA Lead
**Date:** 2026-06-26 | **Status:** REPORT COMPLETE

---

## Section 1: What Still Needs Doing

### UI Review (Locked)
The locked UI at https://v0-redhouse-dashboard-ui.vercel.app shows:
- 5-tab student interface (HOME, CLASS, HUB, SOCIAL, PROFILE)
- Student persona: Liam van der Berg, Grade 8, Cambridge curriculum
- No visible error states, loading states, or empty states
- No visible auth flow (login/signup)
- No visible form validation
- No visible accessibility features

### Testing Gaps
- No test files found in apps/web or apps/mobile
- No e2e test framework confirmed
- No unit test framework confirmed
- No integration test suite
- No visual regression testing
- No performance testing
- No security testing

### Migration Verification (013-025)
Verified on disk:
- 12 migration files exist and are readable
- All use RLS (Row Level Security) - correct
- All use auth.uid() for user identification - correct
- All have proper indexes and foreign keys - correct
- Tenant isolation via tenant_id filter - correct

### Seed Data Verification
- 3 tenants seeded: devotional, lms, mobile
- Student record: Liam van der Berg linked to all 3 tenants
- BUT: No test users beyond Liam, no teacher users, no admin users

---

## Section 2: Analysis from QA Lead Perspective

### Current Test Coverage
| Layer | Status | Risk |
|-------|--------|------|
| Unit tests | NONE | HIGH |
| Integration tests | NONE | HIGH |
| E2E tests | NONE | CRITICAL |
| Visual regression | NONE | MEDIUM |
| Performance | NONE | MEDIUM |
| Security | NONE | HIGH |
| Accessibility | NONE | MEDIUM |

### RLS Policy Testing
CRITICAL: RLS policies exist in migrations but:
- No test coverage for RLS enforcement
- No test that tenant A cannot read tenant B data
- No test that student cannot access teacher endpoints
- No test that unauthenticated users are blocked

### What Must Be Tested (Phase 2)
1. RLS policies - verify isolation between tenants
2. Auth flow - verify login, signup, password reset
3. API endpoints - verify CRUD operations
4. Real-time - verify subscriptions work
5. Mobile offline - verify caching behavior
6. Cross-browser - Chrome, Safari, Firefox
7. Cross-device - iOS + Android

---

## Section 3: Phase 2 TODO List

| # | Task | Priority | Owner | Dependencies |
|---|------|----------|-------|--------------|
| 1 | Set up test framework (Vitest web, Jest mobile) | CRITICAL | QA | CI/CD |
| 2 | Write RLS policy tests (10 tables) | CRITICAL | QA | Migrations |
| 3 | Write auth flow tests | CRITICAL | QA | Auth implementation |
| 4 | Write API integration tests | HIGH | QA | API endpoints |
| 5 | Set up E2E testing (Playwright web, Detox mobile) | HIGH | QA | CI/CD |
| 6 | Write E2E student journey tests | HIGH | QA | E2E framework |
| 7 | Add visual regression testing | MEDIUM | QA | Percy/Chromatic |
| 8 | Performance testing (Lighthouse CI) | MEDIUM | QA | CI/CD |
| 9 | Security testing (OWASP ZAP scan) | MEDIUM | QA | Staging env |
| 10 | Accessibility testing (axe-core) | MEDIUM | QA | - |

---

## Bonus: Full Plan

### Testing Strategy
- Unit tests: 80% coverage target for new code
- Integration tests: All API endpoints + RLS policies
- E2E tests: Happy path for each user role
- Visual regression: Lockscreen UI must match exactly
- Performance: Lighthouse score > 90 for web
- Security: No HIGH/CRITICAL findings from OWASP ZAP
- Accessibility: WCAG 2.1 AA compliance

### Test Data Requirements
- 3 tenant environments (devotional, lms, mobile)
- 10+ test students per tenant
- 5+ test teachers per tenant
- 2+ test admins per tenant
- Pre-seeded course content for each tenant

### Quality Gates (Must pass before merge)
1. All unit tests pass
2. All integration tests pass
3. All E2E tests pass
4. Lighthouse score > 90
5. No HIGH/CRITICAL security findings
6. Code coverage > 80% for new code
7. Visual regression passes
8. Accessibility audit passes

---

*Report generated: 2026-06-26*
*Awaiting: OK-to-build from Cece*
