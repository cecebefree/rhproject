# Group 5 Seat 1: Orchestrator

**Session:** Leadership Council Group 5 | **Leader:** Orchestrator
**Date:** 2026-07-02 | **Status:** REPORT COMPLETE

---

## Section 1: What Still Needs To Be Done

### Frontend UI Requirements (VERIFIED from live app):
1. Authentication System - Login, signup, email verification - Status: PLANNED NOT BUILT - Blocking: YES
2. Payment Processing - Course purchases, payment references - Status: PLANNED NOT BUILT - Blocking: YES
3. Video Hosting Integration - Course content delivery - Status: PLANNED NOT BUILT - Blocking: YES
4. Real-time Subscriptions - Live updates, notifications - Status: PLANNED NOT BUILT - Blocking: YES
5. File Upload System - Social features, certificates - Status: PLANNED NOT BUILT - Blocking: YES
6. Student-Class Assignment Logic - CLASS screen functionality - Status: PLANNED NOT BUILT - Blocking: YES
7. Notification System - All screens - Status: PLANNED NOT BUILT - Blocking: YES
8. Age Verification System - COPPA compliance - Status: PLANNED NOT BUILT - Blocking: YES
9. Parental Consent Mechanism - Student registration - Status: PLANNED NOT BUILT - Blocking: YES
10. Data Export/Deletion - Privacy compliance - Status: PLANNED NOT BUILT - Blocking: YES

### Backend Infrastructure (VERIFIED from migrations):
11. CI/CD Pipeline - No build, test, or deploy automation - Status: VERIFIED MISSING - Blocking: YES
12. pgTAP Testing - No database testing framework - Status: VERIFIED MISSING - Blocking: YES
13. Shared Types - packages/shared/src/types/database.ts is empty - Status: VERIFIED MISSING - Blocking: YES
14. Edge Functions - No serverless functions - Status: VERIFIED MISSING - Blocking: NO
15. HubSpot CRM Sync - No marketing integration - Status: PLANNED NOT BUILT - Blocking: NO

---

## Section 2: Analysis from Orchestrator Perspective

### Coordination Analysis: 10 Leaders Distribution

| Leader | Responsibility | Phase |
|--------|---------------|-------|
| Frontend Lead | UI screens, components, hooks | Phase 2-3 |
| Backend Lead | Migrations, RLS, tenant isolation | Phase 1-2 |
| DevOps Lead | CI/CD, video hosting, Edge Functions | Phase 1-3 |
| Governance Lead | COPPA/FERPA compliance, audit logging | Phase 1-2 |
| QA Lead | pgTAP testing, comprehensive coverage | Phase 1-4 |
| Product Manager | Auth system, payment processing | Phase 1-2 |
| Security Lead | Secrets management, rate limiting | Phase 1-2 |
| Data Lead | Social data structures, student-class | Phase 2-3 |
| SME | Domain expertise, compliance | Phase 1-4 |
| Explorer | Codebase verification, discovery | Phase 0-1 |

### Critical Dependencies

**MUST HAVE BEFORE PART 2:**
1. Auth System - Foundation for all other features
2. Payment Processing - Required for course enrollment
3. Video Hosting - Core to course delivery
4. Compliance Framework - Legal requirement for student data

**PATH SEQUENCE:**
- Phase 1: Auth + Compliance (blocking for everything)
- Phase 2: Payments + Video Hosting (blocking for course delivery)
- Phase 3: Notifications + Real-time (blocking for engagement)
- Phase 4: Integrations + Polish (blocking for scale)

### Cross-Group Themes

**Alignment Points:**
- All groups agree on tenant isolation design (locked in migration 019)
- All groups agree on RLS-first security model (locked in spec section 6)
- All groups agree on soft-delete pattern (locked in spec section 5)

**Potential Disagreements:**
- Frontend vs Backend: Frontend wants rapid UI development, Backend insists on auth first
- Governance vs Product: Governance demands compliance before user signup, Product wants market entry
- DevOps vs Timeline: DevOps insists on proper CI/CD setup, Product wants shortcuts

### Priority - THE ONE THING THAT MUST RESOLVE FIRST

**ESTABLISH AUTHENTICATION SYSTEM WITH COMPLIANCE FRAMEWORK**

Why this is #1 priority:
1. Blocking Dependency: Every other feature requires authenticated users
2. Legal Compliance: COPPA/FERPA requirements prevent student data collection without auth
3. Security Foundation: JWT-based auth (locked in migration 022) must be implemented before any user-facing features
4. Type Safety: Shared types generation (blocked without auth schema) needed for frontend-backend communication

---

## Section 3: Phase 2 TODO List

| # | Task | Owner | Dependencies | Estimate | Risk |
|---|------|-------|--------------|----------|------|
| 1 | Sync migrations 013-025 from rhproject-new | Backend Lead | Access to source files | 1 day | CRITICAL |
| 2 | Set up Supabase project and run all migrations | DevOps Lead | Migrations synced | 1 day | HIGH |
| 3 | Generate shared TypeScript types | Frontend Lead | Supabase instance running | 2 days | HIGH |
| 4 | Set up CI/CD pipeline | DevOps Lead | GitHub repo access | 2 days | MEDIUM |
| 5 | Set up pgTAP testing framework | QA Lead | Database access | 2 days | MEDIUM |
| 6 | Implement auth flow (login, signup, email verification) | Frontend Lead | Types generated, Supabase project | 5 days | HIGH |
| 7 | Add auth hardening (rate limiting, lockout, MFA) | Security Lead | Supabase auth configured | 3 days | HIGH |
| 8 | Seed admin/teacher/test users | Data Lead | Auth flow working | 2 days | MEDIUM |
| 9 | Implement COPPA/FERPA compliance framework | Product Manager | Legal review, auth flow | 5 days | HIGH |
| 10 | Implement audit logging | Backend Lead | Migrations applied | 3 days | MEDIUM |

---

## Bonus: Full Plan

### Phase 1: Foundation (Weeks 1-2)
- Sync and run all migrations
- Generate shared types
- Set up CI/CD pipeline
- Set up pgTAP testing
- Fix mobile version pin

### Phase 2: Auth & Compliance (Weeks 2-3)
- Implement auth flow with security hardening
- Seed test users for all roles
- Implement COPPA/FERPA compliance
- Add audit logging

### Phase 3: Core Features (Weeks 3-5)
- Build student-class assignment system
- Implement schedule/timetable system
- Add payment processing (Stripe)
- Implement video hosting integration
- Build social data structures

### Phase 4: Real-Time & Notifications (Weeks 5-6)
- Implement real-time subscriptions
- Build notification system
- Add enrichment/clubs management
- Implement file upload system

### Phase 5: Admin & Polish (Weeks 6-8)
- Create Admin UI
- Implement certificate issuance
- Add booklist management
- Implement platform access control
- Add i18n support

### Phase 6: Hardening (Weeks 8-9)
- RLS policy pgTAP tests
- Add monitoring and alerting
- Implement backup strategy
- Security audit and performance testing

### Phase 7: Launch (Weeks 9-10)
- Staging deployment
- UAT with stakeholders
- Production deployment
- Post-launch monitoring

---

*Report generated: 2026-07-02*
*Awaiting: OK-to-build from Cece*
