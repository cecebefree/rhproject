# Group 4 Seat 3: SME (Subject Matter Expert)

**Session:** Leadership Council Group 4 | **Leader:** SME
**Date:** 2026-07-02 | **Status:** REPORT COMPLETE

---

## Section 1: What Still Needs To Be Done

1. Implement complete auth system - Status: PLANNED NOT BUILT - Affects: All screens - Blocking: YES
2. Build social data structure (posts, likes, comments, groups, contacts, chat) - Status: VERIFIED MISSING - Affects: SOCIAL screen - Blocking: YES
3. Implement schedule/timetable system - Status: VERIFIED MISSING - Affects: HOME, CLASS screens - Blocking: YES
4. Add school news/announcements system - Status: VERIFIED MISSING - Affects: HOME screen - Blocking: YES
5. Implement enrichment/clubs management - Status: VERIFIED MISSING - Affects: CLASS, HUB, PROFILE screens - Blocking: YES
6. Add certificate issuance system - Status: VERIFIED MISSING - Affects: PROFILE screen - Blocking: YES
7. Implement booklist management - Status: VERIFIED MISSING - Affects: PROFILE screen - Blocking: YES
8. Add platform access control - Status: VERIFIED MISSING - Affects: PROFILE screen - Blocking: YES
9. Implement video hosting integration - Status: VERIFIED MISSING - Affects: HUB, course content - Blocking: YES
10. Add payment processing - Status: VERIFIED MISSING - Affects: Course purchases - Blocking: YES
11. Implement notification system - Status: VERIFIED MISSING - Affects: All screens - Blocking: YES
12. Add real-time subscriptions - Status: VERIFIED MISSING - Affects: Live updates - Blocking: YES
13. Implement file upload system - Status: VERIFIED MISSING - Affects: Social, certificates - Blocking: YES
14. Add student-class assignment logic - Status: VERIFIED MISSING - Affects: CLASS screen - Blocking: YES

---

## Section 2: Analysis from SME Perspective

### Domain Expertise: Education Platform

**Critical Domain Rules:**
1. Student data is protected under COPPA/FERPA - requires parental consent for minors
2. Educational records must be maintained for specific periods
3. Student progress must be tracked and verifiable
4. Teacher-student communication must be monitored/approved
5. Course completion must be formally certified

**Data Model Assessment:**

**Existing Schema (VERIFIED):**
- profiles: Student/instructor/admin roles with tenant isolation
- courses/chapters/enrollments: Basic LMS structure
- chapter_progress: Sequential completion tracking
- tenants: 3-table isolation pattern
- devotional: Daily content with branding

**Missing Data Structures:**
- Schedule/timetable system (classes, times, rooms, teachers)
- Social features (posts, comments, likes, groups, contacts, chat)
- Enrichment/clubs management
- Certificate issuance and tracking
- Booklist management
- Platform access control
- School news/announcements
- Notification system

### Best Practices for Education Platforms

**Enrollment Pattern:**
- Self-registration with parental consent for minors
- Course discovery with filtering/search
- Payment processing with multiple options
- Enrollment confirmation and welcome flow

**Progress Tracking:**
- Sequential chapter completion (already implemented in 018)
- Time-based tracking (video watch time, reading time)
- Assessment scores and grades
- Completion certificates with verification

**Certificate System:**
- Automated issuance on course completion
- Digital signatures for verification
- PDF generation for download
- Blockchain verification (optional)

### Compliance Requirements

**COPPA (Children's Online Privacy Protection Act):**
- Age verification for users under 13
- Parental consent before data collection
- Limited data collection for minors
- Parental access to child's data
- Data deletion upon request

**FERPA (Family Educational Rights and Privacy Act):**
- Protection of student education records
- Consent required for disclosure
- Right to inspect educational records
- Right to challenge inaccurate records
- Audit trail for data access

### Priority

**HIGHEST-RISK DOMAIN GAP:**
1. Schedule/timetable system - Without this, HOME and CLASS screens cannot function
2. Social features - Without this, SOCIAL screen has zero backend support
3. Compliance framework - Without COPPA/FERPA, platform cannot legally operate for minors

---

## Section 3: Phase 2 TODO List

| # | Task | Owner | Dependencies | Estimate | Risk |
|---|------|-------|--------------|----------|------|
| 1 | Implement schedule/timetable system | Backend Lead | Database schema | LARGE | HIGH |
| 2 | Build social data structure | Data Lead | Auth system | LARGE | HIGH |
| 3 | Implement COPPA/FERPA compliance | Product Manager | Legal review | LARGE | HIGH |
| 4 | Add enrichment/clubs management | Backend Lead | Database schema | MEDIUM | MEDIUM |
| 5 | Implement certificate issuance | Backend Lead | Completion tracking | MEDIUM | MEDIUM |
| 6 | Add booklist management | Backend Lead | Database schema | SMALL | LOW |
| 7 | Implement platform access control | Security Lead | Auth system | MEDIUM | MEDIUM |
| 8 | Add notification system | DevOps Lead | Push notification setup | MEDIUM | MEDIUM |
| 9 | Implement video hosting | DevOps Lead | External service | LARGE | HIGH |
| 10 | Add payment processing | Backend Lead | Stripe integration | LARGE | HIGH |

---

## Bonus: Full Plan

### Phase 1: Foundation & Compliance (Weeks 1-4)
- Implement schedule/timetable system
- Build social data structure
- Implement COPPA/FERPA compliance
- Add parental consent mechanism
- Generate shared types

### Phase 2: Core Features (Weeks 5-8)
- Complete auth system with security hardening
- Implement video hosting integration
- Add payment processing
- Build notification system
- Implement real-time subscriptions

### Phase 3: Integration (Weeks 9-12)
- Add enrichment/clubs management
- Implement certificate issuance
- Add booklist management
- Implement platform access control
- Complete mobile-backend integration

### Phase 4: Polish & Launch (Weeks 13-16)
- Comprehensive security testing
- Accessibility compliance audit
- Performance optimization
- Documentation completion
- Go-live preparation

---

*Report generated: 2026-07-02*
*Awaiting: OK-to-build from Cece*
