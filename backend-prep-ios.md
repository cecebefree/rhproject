# iOS Screens — Backend-Prep Mapping (FINAL)

**Date:** 2026-07-02
**Phase:** Backend-PREP (document only, no implementation)
**Architecture:** Mobile = read-mostly LMS companion. All data anchors to LMS.
**Schedule:** Master schedule = aggregator (LMS + Mobile + OTT sources)

---

## Architecture Locks Applied

| Lock | Rule |
|------|------|
| White-Label | Mobile = LMS add-on. FK anchor = tenant_lms. Devotional separate. |
| Master Schedule | Aggregates ALL events (LMS + Mobile + OTT). Home = combined view. Section pages = filtered slices. |

---

## Existing LMS Tables (013-017)

| Table | Current State | 023 Retrofit |
|-------|---------------|--------------|
| profiles | No tenant_id | Will add tenant_id FK -> tenant_lms |
| courses | No tenant_id | Will add tenant_id FK -> tenant_lms |
| chapters | No tenant_id | Will add tenant_id FK -> tenant_lms |
| enrollments | No tenant_id | Will add tenant_id FK -> tenant_lms |
| chapter_progress | No tenant_id | Will add tenant_id FK -> tenant_lms |

---

## Screen-by-Screen Mapping

### 1. Home.tsx (Dashboard - Combined Schedule View)
**Purpose:** THE COMBINED VIEW - every scheduled event for that user
**Data:** enrollments, courses, chapter_progress, schedule_events (NEW - aggregated)

### 2. Class.tsx (Lessons/Schedule - FILTERED: LMS only)
**Purpose:** FILTERED SLICE - ONLY class (LMS) scheduled events
**Data:** courses, profiles, schedule_events WHERE source = lms

### 3. Hub.tsx (Clubs/Extra Learning - FILTERED: OTT only)
**Purpose:** FILTERED SLICE - ONLY OTT / enrichment / club scheduled events
**Data:** clubs (NEW), club_members (NEW), schedule_events WHERE source = ott

### 4. Social.tsx (School Feed - FILTERED: group-chat only)
**Purpose:** FILTERED SLICE - ONLY group-chat scheduled events
**Data:** posts (NEW), schedule_events WHERE source = mobile

### 5. Profile.tsx (Student Profile)
**Purpose:** Student identity, registration, placement, tags
**Data:** profiles (ADD COLUMNS), student_tags (NEW), attendance (NEW)

---

## New LMS Tables Required

| Table | Purpose | Priority |
|-------|---------|----------|
| schedule_events | Master schedule aggregator | HIGH |
| clubs | Extracurricular clubs | MEDIUM |
| club_members | Club membership | MEDIUM |
| posts | School feed/announcements | MEDIUM |
| student_tags | Student tags for grouping | HIGH |
| attendance | Student attendance | HIGH |

## Schedule Filter Logic

| Page | Source Filter | Events Shown |
|------|---------------|--------------|
| Home | ALL sources | LMS + OTT + group-chat |
| Class | source = lms | Classes only |
| Hub | source = ott | Clubs/enrichment only |
| Social | source = mobile | Group-chat events only |

## 023 Retrofit Scope

| Table | Columns to Add | FK Target |
|-------|----------------|-----------|
| profiles | tenant_id, student_id, house, grade_level, placement | tenant_lms |
| courses | tenant_id | tenant_lms |
| chapters | tenant_id | tenant_lms |
| enrollments | tenant_id | tenant_lms |
| chapter_progress | tenant_id | tenant_lms |

## D12 Blocker

**Status:** RLS disabled on tenant_devotional, tenant_lms, tenant_mobile
**Impact:** BLOCK SHIP
**This Session:** Document only
