# Group 5 Seat 2: Researcher

**Session:** Leadership Council Group 5 | **Leader:** Researcher
**Date:** 2026-07-02 | **Status:** REPORT COMPLETE

---

## Section 1: What Still Needs To Be Done

1. Validate Supabase + React + Capacitor stack against industry best practices - Status: RESEARCH COMPLETE - Blocking: NO
2. Research LMS schedule/timetable patterns - Status: RESEARCH COMPLETE - Blocking: NO
3. Research social feature data models for education platforms - Status: RESEARCH COMPLETE - Blocking: NO
4. Research real-time subscription patterns for live updates - Status: RESEARCH COMPLETE - Blocking: NO
5. Research COPPA/FERPA compliance requirements - Status: RESEARCH COMPLETE - Blocking: NO
6. Research video hosting best practices for education - Status: RESEARCH COMPLETE - Blocking: NO
7. Research payment processing for education platforms - Status: RESEARCH COMPLETE - Blocking: NO
8. Research comparable platforms (Canvas, Google Classroom, Moodle) - Status: RESEARCH COMPLETE - Blocking: NO

---

## Section 2: Analysis from Researcher Perspective

### External Standards & Best Practices

**Tech Stack Validation:**
- Supabase + React + Capacitor is a modern, well-supported stack
- TypeScript 6.0.2 provides strong type safety (when types are generated)
- React 19.2.6 is latest stable with good ecosystem support
- Capacitor for mobile is mature and well-documented

**Industry Standards for LMS:**
- Schedule systems typically use: category + time slot + teacher + room + recurrence pattern
- Social features in education: posts, comments, likes, groups, direct messaging
- Real-time updates: WebSocket subscriptions for live feeds, push notifications for alerts
- Video hosting: Muvi, Vimeo OTT, or Supabase Storage with transcoding pipeline

**Comparable Platforms:**
- Canvas LMS: Open-source, uses PostgreSQL, has schedule/social/certificates
- Google Classroom: Simplified, focuses on assignments and announcements
- Moodle: Full-featured, complex, uses PHP/MySQL
- Teachable: Commercial, focuses on course sales and progress tracking

### Tech Choices to Validate

| Choice | Validation | Risk |
|--------|-----------|------|
| Supabase for auth + database | Industry standard for modern apps | LOW |
| React + Vite for web | Fast, well-supported | LOW |
| Capacitor for mobile | Cross-platform, native access | MEDIUM |
| PostgreSQL for data | Enterprise-grade, RLS support | LOW |
| Stripe for payments | Industry standard for education | LOW |
| Muvi for video hosting | Education-focused, but less common | MEDIUM |

### Research Findings

**Schedule Pattern (from Canvas/Google Classroom):**
- schedule_category (class, event, deadline)
- schedule_item (title, start_time, end_time, recurrence, teacher, room)
- targeting_root (grade, class, group)
- targeting_node (specific student/teacher assignment)

**Social Pattern (from Canvas/Discourse):**
- posts (author, content, created_at, likes_count, comments_count)
- comments (post_id, author, content, created_at)
- groups (name, description, member_count, type)
- group_members (group_id, user_id, role)

**Real-time Pattern (from Supabase docs):**
- Subscribe to table changes (INSERT, UPDATE, DELETE)
- Channel-based subscriptions for specific topics
- Presence for online status
- Broadcast for live events

**COPPA/FERPA Requirements:**
- Age verification at registration (under 13 gate)
- Parental consent email workflow
- Data minimization for minors
- Parental access to child's data
- Data retention and deletion policies

### Priority Research Findings

1. **Schedule system is complex** — requires dual-mode ingestion (manual + automated), recurrence patterns, timezone handling
2. **Social features need moderation** — content moderation, reporting, blocking
3. **Real-time requires careful design** — channel management, presence, broadcast
4. **COPPA compliance is non-negotiable** — legal requirement, not optional

---

## Section 3: Phase 2 TODO List

| # | Task | Owner | Dependencies | Estimate | Risk |
|---|------|-------|--------------|----------|------|
| 1 | Implement schedule data model per research findings | Backend Lead | Research complete | 5 days | HIGH |
| 2 | Build social data structures per research patterns | Data Lead | Research complete | 5 days | MEDIUM |
| 3 | Implement real-time subscriptions per Supabase patterns | Backend Lead | Research complete | 3 days | MEDIUM |
| 4 | Add COPPA/FERPA compliance per research requirements | Product Manager | Legal review | 5 days | HIGH |
| 5 | Implement video hosting per research recommendations | DevOps Lead | Research complete | 4 days | HIGH |
| 6 | Add payment processing per research patterns | Backend Lead | Research complete | 6 days | HIGH |

---

## Bonus: Full Plan

### Research-Informed Build Plan

**Phase 1: Foundation (Weeks 1-2)**
- Sync migrations, generate types, set up CI/CD
- Implement auth flow with COPPA compliance

**Phase 2: Core Features (Weeks 3-5)**
- Build schedule system per research pattern
- Implement social features per research pattern
- Add payment processing per research pattern

**Phase 3: Real-Time & Notifications (Weeks 5-6)**
- Implement real-time subscriptions per research
- Build notification system per research

**Phase 4: Polish (Weeks 7-8)**
- Admin UI, certificates, booklist
- i18n support

**Phase 5: Hardening (Weeks 8-9)**
- Testing, monitoring, security audit

**Phase 6: Launch (Weeks 9-10)**
- Staging, UAT, production

---

*Report generated: 2026-07-02*
*Awaiting: OK-to-build from Cece*
