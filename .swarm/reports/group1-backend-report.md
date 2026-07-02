# Group 1 Report — Backend Lead

**Date:** 2026-07-02
**Task:** Frontend UI vs Backend Gap Analysis

## SECTION 1: WHAT STILL NEEDS TO BE DONE

1. Announcements/News Feed Table - MISSING - HOME/SOCIAL - BLOCKING: YES
2. Groups Table - MISSING - SOCIAL - BLOCKING: YES
3. Club Memberships Table - MISSING - CLASS/PROFILE - BLOCKING: YES
4. Messaging/Chat Table - MISSING - SOCIAL - BLOCKING: YES
5. Contacts/Friends Table - MISSING - SOCIAL - BLOCKING: YES
6. Certificates Table - MISSING - PROFILE - BLOCKING: YES
7. Booklist Table - MISSING - PROFILE - BLOCKING: YES
8. Live Events Table - MISSING - HUB - BLOCKING: YES
9. Channels Table - MISSING - HUB - BLOCKING: YES
10. Enrichment Enrollments Table - MISSING - PROFILE - BLOCKING: YES
11. Course-Teacher Relationships Table - MISSING - PROFILE - BLOCKING: YES
12. Student Schedule API - MISSING - CLASS - BLOCKING: YES
13. Hub Learning API - MISSING - HUB - BLOCKING: YES
14. Social Feeds API - MISSING - SOCIAL - BLOCKING: YES
15. Student Profile API - MISSING - PROFILE - BLOCKING: YES
16. Daily Devotional API - MISSING - HOME - BLOCKING: YES
17-24. RLS Policies for all new tables - MISSING
25-30. Tenant LMS, Progress, Payment, Video, HubSpot, Turnstile APIs - ALL MISSING

## SECTION 2: ANALYSIS FROM BACKEND/DB SEAT

Schema is course-centric but UI needs social learning platform (clubs, groups, messaging, profiles). Missing tenant_lms schedule tables, enrichment tables, student-teacher tracking, real-time features.
APIs lack social features, dashboard aggregation, club management, certificates, booklist, live events.
RLS lacks feed-level, group-based, club membership, connection, certificate/booklist, live event access controls.

## SECTION 3: PHASE 2 TODO LIST

1-11. Create missing tables (Announcements, Groups, Club Memberships, Messaging, Contacts, Certificates, Booklist, Live Events, Channels, Enrichment Enrollments, Course-Teacher) - Backend/Database Team - M each
12-22. Implement missing APIs (Schedule, Hub, Social, Profile, Devotional, Tenant LMS, Progress, Payment, Video, HubSpot, Turnstile) - Backend Team - L each
23-30. Implement RLS policies for all new tables - Database Team - S each

## BONUS: FULL PLAN

Phase 1: Core Data Model (Weeks 1-4)
Phase 2: Social & Communication (Weeks 5-8)
Phase 3: Student Experience (Weeks 9-12)
Phase 4: Integration & Security (Weeks 13-16)
Phase 5: Frontend APIs (Weeks 17-20)
Phase 6: Testing & Deployment (Weeks 21-24)
Total: 24 weeks
