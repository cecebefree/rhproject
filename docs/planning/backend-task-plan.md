# Redhouse Mobile V0 — Backend Task Plan

**Source documents:** Backend Build Document, Screen→Backend Traceability Map
**SME validated:** Supabase patterns, RLS architecture, provisioning pipeline, tenant isolation
**Scope:** Standalone backend layer. V0 screens stay disconnected (static/mock data). Verified via curl/Postman + pgTAP, never through a screen.

---

## Critical Path

```
S1 Environment → S2 Schema → S3 Auth/RLS → S4 Server Rules → S5 Provisioning → S6 APIs → S7 Verification
```

**Blocking chain:** Nothing can be built until the schema exists. RLS gates every API. Provisioning must complete before endpoints can serve real data. Verification is final.

---

## Golden Test Student: Created vs. Needed

| When | What |
|------|------|
| **Section 2 (2.19)** | **Created** — seeded as part of 4-persona seed set under `set local role service_role` |
| **Section 3 (3.5)** | **Verified present** — fail-fast check before isolation tests run |
| **Section 5** | **Used** — full provisioning pipeline tested against it |
| **Section 6** | **Used** — every endpoint validated against it via curl/Postman (NOT through screens) |
| **Section 7** | **Used** — final proof that every field is populated, nothing blank |

---

## Scope Correction

The V0 screens will NOT call these endpoints at runtime. The backend is built and verified as a **standalone layer**. V0 screens stay disconnected (their own static/mock data). The Traceability Map is the **SPEC** for which endpoints and fields to build and what each returns — it is NOT a wiring instruction. There is NO front-end integration task in this plan.

---

## Section 1 — Environment & Project

**1.1** Create Supabase project (local via `supabase start` + remote staging)
**1.2** Configure all env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_GA4_ID`, `HUBSPOT_PORTAL_ID`, `HUBSPOT_FORM_ID`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT`
**1.3** Set up Make.com workspace + HubSpot connection + Supabase connection
**1.4** Verify no plaintext keys in repo (secretscan)

**Acceptance:** Project boots; all secrets resolve; no plaintext keys in repo.

**Task count: 4**

---

## Section 2 — Schema (tables the backend serves)

**2.1** Create `tenant` table (id, code, name) + insert Redhouse tenant
**2.2** Create `user` table (id, name, avatar_url, timezone, opt_out, role TEXT CHECK ('student' | 'teacher' | 'admin'), tenant_id) — FK to auth.users. **Role-ready schema: CHECK constraint in place, no admin seed, no admin RLS yet.**
**2.3** Create `enrollment` table (id, user_id, core_curriculum, school_stage, intake_group, hubspot_id UNIQUE, tenant_id)
**2.4** Create `school` table (id, website_url, store_url, contact, tenant_id)
**2.5** Create `subject` table (id, user_id, teacher_id, tenant_id)
**2.6** Create `teacher` table (id, name, contact JSONB, tenant_id)
**2.7** Create `schedule_item` table (id, title, start, end, audience, join_url, user_id, tenant_id)
**2.8** Create `enrichment` table (id, user_id, completed, total, deep_link, tenant_id)
**2.9** Create `bible_plan` + `translation` tables
**2.10** Create `gospel_chart`, `chart_entry`, `gospel_video` tables
**2.11** Create `vlog` table (date, video_ref, title)
**2.12** Create `news` table (id, title, body, audience, event_url, is_live, published_at, tenant_id)
**2.13** Create `failed_enrollments` table (id, payload JSONB, error TEXT, created_at, retry_count, last_retry_at, status)
**2.14** Create `booklist` table (id, user_id, year INT, view_url TEXT, tenant_id) — CRM-sourced; yearly roll-over
**2.15** Create `access` table (id, user_id UNIQUE, platform_status TEXT CHECK ('Active' | 'Not Active'), expiry DATE, tenant_id) — **single row per student; TWO separate CRM fields; UNIQUE on user_id**
**2.16** Create `certificate` table (id, user_id, title TEXT, file_url TEXT, issued_at TIMESTAMPTZ, tenant_id) — school-stamped PDFs only
**2.17** Create `club` table (id, name TEXT, tenant_id) + `club_enrollment` table (id, user_id, club_id, tenant_id)
**2.18** Add constraints: PKs, FKs, UNIQUE, NOT NULL, CHECK constraints, DEFAULT values — **all constraints BEFORE seed**
**2.19** Seed 4 personas under `set local role service_role`:
  - **Student A (golden)** — fully provisioned: user, enrollment, school, subject, teacher link, schedule, enrichment, bible_plan, gospel, vlog, news, booklist 2026 (view_url set), access (platform_status='Active', expiry=2026-12-31), certificate (≥1, file_url set), ≥1 club_enrollment
  - **Student B** — isolation target (minimal: user + enrollment + schedule)
  - **Teacher T1** — owns Student A's class/subject
  - **Teacher T2** — owns a different class

**Acceptance:** All tables + constraints exist; 4 personas inserted; golden student fully provisioned across all tables.

**Task count: 19**

---

## Section 3 — Auth & Row-Level Security

**3.1** Create `auth.user_role()` function (reads JWT `userrole` claim, defaults to `'student'`)
**3.2** Create `handle_new_user()` trigger — stamps public.user from auth.users on signup (name, role, tenant_id from raw_app_meta_data)
**3.3** Enable RLS on ALL tables (including booklist, access, certificate, club, club_enrollment)
**3.4** Write RLS policies: `user_id = auth.uid()` on all child tables; `tenant_id` check on tenant-scoped tables
**3.5** Verify Student B fixture loaded (seeded in 2.19) before isolation tests run — fail fast if absent
**3.6** Write pgTAP test suite using `authenticate_as` (Basejump supabase_test_helpers) — **isolation matrix:**
  - Student A cannot read Student B (including club_enrollment)
  - Student cannot read any Teacher's classroom
  - Teacher T1 reads ONLY T1's classroom (not T2's)
  - Teacher T2 reads ONLY T2's classroom (not T1's)
  - Tenant isolation holds across all of the above
**3.7** Run pgTAP tests, verify full isolation matrix passes

**Acceptance:** Student B fixture confirmed present. pgTAP proves all 5 isolation rules hold. Student A cannot read Student B. Students cannot read teacher data. Teachers are isolated from each other. Tenant isolation holds.

**Task count: 7**

---

## Section 4 — Server Rules

**4.1** Create `fn_derive_placement(enrollment)` STABLE SQL function — derives placement from school_stage + intake_group
**4.2** Create `enrollment_placement_log` table for audit trail
**4.3** Implement status flow: new record = `pending_init`; `active` set only after clean full write
**4.4** Define enrichment progress ownership (client-side writes to completed/total)

**Acceptance:** A new student record auto-derives placement and starts as `pending_init`.

**Task count: 4**

---

## Section 5 — Provisioning Pipeline (HubSpot → Make.com → Supabase)

**5.1** Build Edge Function `hubspot-webhook` — receives HubSpot enrolment webhook, writes to Supabase via upsert on `hubspot_id`
**5.2** Implement idempotency: `INSERT ... ON CONFLICT (hubspot_id) DO UPDATE`
**5.3** Implement dead-letter: failed writes → `failed_enrollments` table + alert (Edge Function or Make.com error handler)
**5.4** Implement status flip: record starts `pending_init`, only becomes `active` after Edge Function confirms clean write
**5.5** Set up `nightly-reconciliation` Edge Function + pg_cron schedule (2 AM UTC)
**5.6** Reconciliation logic: compare HubSpot enrolments vs Supabase records, flag missing
**5.7** Test: send test enrolment → verify full record (Proof 1)
**5.8** Test: send same enrolment twice → verify ONE student (Proof 2)
**5.9** Test: send bad payload → verify failed_enrollments + alert (Proof 3)
**5.10** Test: verify pending_init → active transition (Proof 4)
**5.11** Test: pg_cron flags missing student (Proof 5)

**Acceptance:** All five proofs pass.

**Task count: 11**

---

## Section 6 — Read APIs (what the backend serves)

**6.1** `GET /v1/me` — user profile (name, avatar, timezone, role)
**6.2** `PATCH /v1/me` — update user profile
**6.3** `DELETE /v1/me` — soft-delete user
**6.4** `POST /v1/me/avatar` — avatar upload (Supabase Storage)
**6.5** `GET /v1/me/enrollment` — curriculum, school_stage, intake_group
**6.6** `GET /v1/school` — school info (website_url, store_url, contact)
**6.7** `POST /v1/auth/logout` — session termination
**6.8** `GET /v1/schedule?user={id}` — full schedule
**6.9** `GET /v1/schedule/upcoming?limit=12` — next 12 items
**6.10** `GET /v1/schedule/past` — past items
**6.11** `GET /v1/me/subjects` — subjects list
**6.12** `GET /v1/teacher/{id}/contact` — teacher contact (JSONB)
**6.13** `GET /v1/me/enrichment` — enrichment courses + progress
**6.14** `GET /v1/bible/plan?day={n}` — daily Bible plan
**6.15** `GET /v1/bible/translations` — available translations
**6.16** `GET /v1/vlog/today` — today's vlog
**6.17** `GET /v1/news?audience={group}` — filtered news
**6.18** `GET /v1/me/clubs` — enrolled clubs (RLS: user_id = auth.uid())
**6.19** `GET /v1/me/booklist` — current-year booklist with view_url (RLS: user_id = auth.uid())
**6.20** `GET /v1/me/access` — returns `{ platform_status, expiry }` from SINGLE access row (RLS: user_id = auth.uid())
**6.21** `GET /v1/me/certificates` — list of downloadable PDFs (RLS: user_id = auth.uid())
**6.22** `GET /v1/music/charts` — two Gospel Top 20s with Vimeo URLs (reads gospel_chart / chart_entry / gospel_video)
**6.23** All endpoints verified under RLS (golden student data returned correctly via curl/Postman)

**Acceptance:** Every endpoint returns the golden student's data correctly under RLS. Verified by direct HTTP calls, not through any screen.

**Task count: 23**

---

## Section 7 — Golden Test Student Verification

**7.1** Ensure golden student is fully provisioned (all tables populated including booklist, access, certificate, club)
**7.2** Run every Section 6 endpoint against golden student via **curl/Postman + pgTAP** (NOT through any screen)
**7.3** Verify every field is populated — non-blank proof for ALL of:
  - Profile: name, avatar_url, timezone, role
  - Enrollment: core_curriculum, school_stage, intake_group
  - Schedule: title, start, end, join_url
  - Subjects: subject list with teacher references
  - Teachers: name, contact (JSONB)
  - Enrichment: completed, total, deep_link
  - Bible plan: ref, text for current day
  - Vlog: video_ref, title for today
  - News: title, body, audience, published_at
  - **Clubs: ≥1 enrolled club name**
  - **Booklist 2026: view_url non-blank**
  - **Access: platform_status="Active", expiry="2026-12-31"**
  - **Certificates: ≥1 row with file_url non-blank**
  - **Music charts: ≥2 chart entries with Vimeo URLs**
**7.4** Test edge cases: empty states, missing optional fields, error responses
**7.5** Document results as evidence

**Acceptance:** Every field the backend spec requires is populated; nothing returns blank. Verification done by direct endpoint calls + pgTAP, not through any screen.

**Task count: 5**

---

## Open Decisions Register

| # | Decision | Status | Default if Unresolved |
|---|----------|--------|----------------------|
| 1 | Supabase master vs CRM-sync | OPEN | **Supabase = master.** HubSpot writes once via webhook; Supabase owns the record. pg_cron becomes drift notification only. |
| 2 | Placement rule | OPEN | **Enrollment-based:** `school_stage` + `intake_group` → auto-derived via SQL function. |
| 3 | Progress ownership | OPEN | **Client-side for V0.** `enrichment.completed/total` written by app. Add server-side sync table in V1. |
| 4 | LMS in V0 scope | OPEN | **Out of scope.** "Go to Class" button shows placeholder link. |
| 5 | Teacher contact method | OPEN | **JSONB placeholder:** `contact JSONB DEFAULT '{"type":"email","value":""}'` — structured for future evolution. |
| 6 | Certificate storage | **PARTIALLY RESOLVED** | **V0:** External-link acceptable. `file_url` holds the external PDF link. **V1:** Migrate to Supabase Storage signed URLs. Schema identical either way — low-risk migration. School-stamped PDFs only. Never blockchain. |
| 7 | Music source (Vimeo vs YouTube) | OPEN | **Vimeo.** `gospel_video` stores Vimeo URLs. |
| 8 | Vlog host | OPEN | **Vimeo.** `vlog.video_ref` stores Vimeo URLs. |
| 9 | Bible translation licensing | OPEN | **English text with attribution.** 365-day plan included. Licensing TODO for additional translations. |

---

## Acceptance Gate Proofs

### Section 5 — Five Proofs

| # | Proof | How |
|---|-------|-----|
| 1 | **Full write** | Send test enrolment via Make.com → verify all user + enrollment fields populated in Supabase |
| 2 | **Idempotency** | Send same HubSpot enrolment twice → verify ONE student record (upsert on `hubspot_id`) |
| 3 | **Dead-letter** | Send malformed payload → verify row in `failed_enrollments` + alert fires |
| 4 | **Status flip** | New record = `pending_init`; only becomes `active` after clean full write succeeds |
| 5 | **Reconciliation** | pg_cron run flags a deliberately-missing student (insert in HubSpot, skip Supabase write) |

### Section 3 — RLS Isolation (5-rule matrix)

| # | Rule | How |
|---|------|-----|
| 1 | Student A cannot read Student B | pgTAP: authenticate_as Student A, query all tables, verify zero Student B rows |
| 2 | Student cannot read Teacher classroom | pgTAP: authenticate_as Student A, query subject/schedule as teacher, verify empty |
| 3 | Teacher T1 reads ONLY T1's classroom | pgTAP: authenticate_as T1, query subjects, verify only T1-owned rows |
| 4 | Teacher T2 reads ONLY T2's classroom | pgTAP: authenticate_as T2, query subjects, verify only T2-owned rows |
| 5 | Tenant isolation holds | pgTAP: all above tests run within redhouse tenant; cross-tenant queries return empty |

---

## Task Count Summary

| Section | Tasks |
|---------|-------|
| S1 — Environment | 4 |
| S2 — Schema | 19 |
| S3 — Auth/RLS | 7 |
| S4 — Server Rules | 4 |
| S5 — Provisioning | 11 |
| S6 — APIs | 23 |
| S7 — Verification | 5 |
| **Grand Total** | **73** |

---

## Devotional Section — Sealed Spec (2026-07-30)

| Feature | Behavior | Key rule |
|---|---|---|
| Daily Verse | Date-keyed, rotates 00:00 local | One verse per calendar date |
| Music / Gospel Charts | YouTube in-app playback + Spotify deep-link to school library | Chart entries carry video IDs |
| Bible in 365 Days | Fixed day_n reading plan | Resets yearly, day_n never shifts |
| Daily Vlog | Student-produced, rotates 00:00 local | One vlog per calendar date |

**Schema riders (required before build):**
- `chart.spotify_playlist_url` — text, nullable, deep-link target per chart
- `chart_entry.youtube_video_id` — text, nullable, in-app playback source

**Rollover rule:** all daily content keys on tenant-local midnight, not UTC.

*Note: these are spec additions beyond the original 73-task count; task rows to be enumerated when the Devotional build is scheduled.*
