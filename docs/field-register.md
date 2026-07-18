# Field Register — Redhouse Mobile

Status: FINAL -- sealed 2026-07-14. Schema from live migrations 013-053.
Scope: Mobile app (single-page SPA, 5 views).
Note: `group_type` here is a MOBILE DISPLAY field, not the dropped DB enum.

## Home

| Field Name | What It Shows |
|------------|---------------|
| greeting | "Good morning" |
| first_name | "Liam" |
| academic_tag | "Cambridge · Mid School · Group A" |
| date_day | "24" |
| date_month | "May" |
| date_weekday | "Saturday" |
| devotional_reference | "John 10:10 TPT" |
| devotional_verse | Full verse text |
| devotional_read_more | Action link |
| quick_link_label | "Music" / "Bible" / "Vlog" |
| coming_up_subject | "Mathematics" |
| coming_up_teacher | "Mr. Olivier" |
| coming_up_status_time | "LIVE" / "11:00" |
| coming_up_location | "Chef Tanaka · Tokyo" |
| news_headline | "Virtual Science Fair — Friday 2 May" |
| news_recency | "2h ago" |

## Class

| Field Name | What It Shows |
|------------|---------------|
| class_subject | "Mathematics" |
| class_teacher | "Mr. Olivier · Class A" |
| class_status_time | "LIVE" / "11:00" |
| class_location | "Chef Tanaka · Tokyo" |
| class_filter_label | "SUP Classes" / "Enrichment" / "Clubs" |

## Hub

| Field Name | What It Shows |
|------------|---------------|
| hub_title | "Finance 101 — Module 3" |
| hub_type_meta | "Enrichment · 42 min remaining" |
| hub_status_time | "LIVE" / "15:30" / "Fri" |
| hub_location | "Tokyo, Japan" |
| hub_stage | "Mid School" |
| quick_access_label | "Channels" / "Live Events" |

## Social

| Field Name | What It Shows |
|------------|---------------|
| feed_tab_label | "School Feed" / "Social Feed" |
| group_name | "Culinary Club" |
| group_last_message | "Chef Tanaka: See you at 15:30" |
| group_unread_count | "3" |
| chat_sender_name | "Chef Tanaka" |
| chat_message | "Welcome! Today we make Ramen" |
| chat_timestamp | "14:55" |
| link_my_groups | "My Groups" |
| link_my_contacts | "My Contacts" |
| link_manage_connections | "Manage your connections" |

### Social → My Groups (interactive list — seeded x3)

| Field Name | What It Shows |
|------------|---------------|
| group_name | "Culinary Club" |
| group_type | "Club" |
| group_name | "Grade 8A Class" |
| group_type | "Core" |
| group_name | "Entrepreneurs Club" |
| group_type | "Club" |

### Social → My Contacts (interactive list — seeded x3, Social only)

| Field Name | What It Shows |
|------------|---------------|
| contact_name | "Zoe Mitchell" |
| contact_last_message | "So excited! Miso paste is ready." |
| contact_name | "Thomas Chen" |
| contact_last_message | "Can I use chicken instead?" |
| contact_name | "Chef Tanaka" |
| contact_last_message | "Chicken works beautifully" |

## Profile

| Field Name | What It Shows |
|------------|---------------|
| full_name | "Liam van der Berg" |
| role_curriculum_year | "Student · Cambridge · 2026" |
| profile_curriculum | "Core curriculum: Cambridge" |
| profile_grade | "Grade: 8" |
| profile_stage | "School stage: Mid School" |
| profile_intake | "Intake: Group A · Jan" |
| core_class_subject | "Mathematics" |
| core_class_schedule | "Mon/Wed/Fri · 10:00" |
| core_class_teacher | "Mr. Olivier" |
| enrichment_title | "Finance 101" |
| enrichment_pace | "Self-paced" |
| enrichment_progress | "Module 3 of 7" |
| enrichment_note | "Starting Term 2" |
| club_name | "Culinary Club" |
| club_schedule | "Wed · 15:30" |
| club_teacher | "Chef Tanaka" |
| link_access | "Access" |
| link_certificates | "My Certificates" |
| booklist_label | "Booklist 2026" |
| booklist_action | "View booklist" |
| platform_status | "Platform: Active" |
| platform_expiry | "Expiry: Dec 2026" |
| menu_contact_school | "Contact school" |
| menu_log_out | "Log out" |
| external_website | "Go to website" |
| external_redestore | "Go to RedEstore" |

### Profile → My Groups (read-only mirror — seeded x3)

| Field Name | What It Shows |
|------------|---------------|
| group_name | "Culinary Club" |
| group_type | "Club" |
| group_lead | "Chef Tanaka" |
| group_name | "Grade 8A Class" |
| group_type | "Core" |
| group_lead | "Mr. Olivier" |
| group_name | "Entrepreneurs Club" |
| group_type | "Club" |
| group_lead | "Mr. Steyn" |

## Tenant Mobile Config
| Field                | Type    | Notes                                        |
|----------------------|---------|----------------------------------------------|
| devotional_enabled   | boolean | Per-TENANT toggle (not per-user). Gates the  |
|                      |         | devotional surface in mobile index screen.   |
| devotional_tenant_id | text    | Which devotional DB to resolve. Default:     |
|                      |         | 'redhouse'. Tenant #2 supplies their own.    |

Decision note: Devotional mobile surface is reclassified from
Redhouse-unique "line" to config-gated white-label capability.
Devotional BACKEND remains isolated white-label #2 with own database.
No mobile code implements this yet -- scaffold is static placeholders.
Implementation lands with the mobile build-out phase.



---

## Live Schema (from migrations 013-053)

## Table: profiles (migration 013, expanded by 021, 026)

id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
name                text NOT NULL
role                text NOT NULL CHECK (8-value enum: student, outside_student, family, alumni, teacher, expert, guest, admin)
created_at          timestamptz NOT NULL DEFAULT now()
updated_at          timestamptz NOT NULL DEFAULT now()
tenant_id           uuid REFERENCES public.tenant_devotional(id)
registration_status text NOT NULL DEFAULT pending (CHECK: pending, approved, rejected)
consent_given       boolean NOT NULL DEFAULT false
has_core            boolean NOT NULL DEFAULT false
access_starts_at    timestamptz
access_ends_at      timestamptz

RLS: admin_all_profiles (FOR ALL, JWT app_metadata.role=admin), self-select, self-update

---

## Table: tenant_devotional (migration 019)

id              uuid PK DEFAULT gen_random_uuid()
name            text NOT NULL
slug            text NOT NULL UNIQUE
is_active       boolean NOT NULL DEFAULT true
retention_until timestamptz
deleted_at      timestamptz
created_at      timestamptz NOT NULL DEFAULT now()
updated_at      timestamptz NOT NULL DEFAULT now()

RLS: admin_all_tenant_devotional

---

## Table: tenant_lms (migration 019)

id                  uuid PK DEFAULT gen_random_uuid()
name                text NOT NULL
slug                text NOT NULL UNIQUE
schedule_view_mode  text NOT NULL DEFAULT combined (CHECK: combined, separate)
is_active           boolean NOT NULL DEFAULT true
retention_until     timestamptz
deleted_at          timestamptz
created_at          timestamptz NOT NULL DEFAULT now()
updated_at          timestamptz NOT NULL DEFAULT now()

RLS: admin_all_tenant_lms

---

## Table: tenant_mobile (migration 019)

id                    uuid PK DEFAULT gen_random_uuid()
name                  text NOT NULL
slug                  text NOT NULL UNIQUE
devotional_enabled    boolean NOT NULL DEFAULT false
devotional_tenant_id  uuid REFERENCES tenant_devotional(id) ON DELETE SET NULL
is_active             boolean NOT NULL DEFAULT true
retention_until       timestamptz
deleted_at            timestamptz
created_at            timestamptz NOT NULL DEFAULT now()
updated_at            timestamptz NOT NULL DEFAULT now()

RLS: admin_all_tenant_mobile

---

## Table: consent_records (migration 042, expanded by 044, 047)

id              uuid PK DEFAULT gen_random_uuid()
profile_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
consent_type    text NOT NULL (CHECK: data_processing, marketing, communications, research, third_party_sharing)
consent_given   boolean NOT NULL
given_at        timestamptz NOT NULL DEFAULT now()
ip_address      text
tenant_id       uuid NOT NULL
created_at      timestamptz NOT NULL DEFAULT now()
updated_at      timestamptz NOT NULL DEFAULT now()
withdrawn_at    timestamptz
UNIQUE (profile_id, consent_type)

RLS: consent_self_select, consent_self_insert, consent_self_withdraw, consent_admin_all

---

## Table: suppression_records (migration 042, RLS from 044)

id                uuid PK DEFAULT gen_random_uuid()
profile_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
suppressed_by     uuid NOT NULL REFERENCES profiles(id)
reason            text
suppression_type  text NOT NULL DEFAULT full (CHECK: full, communications_only, data_processing_only)
suppressed_at     timestamptz NOT NULL DEFAULT now()
tenant_id         uuid NOT NULL
created_at        timestamptz NOT NULL DEFAULT now()
UNIQUE (profile_id)

RLS: suppression_self_select, suppression_admin_all

---

## Table: report_cards (migration 043, expanded by 044, 050-053)

id              uuid PK DEFAULT gen_random_uuid()
student_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
term            text NOT NULL
subject         text NOT NULL
grade           text
status          text NOT NULL DEFAULT draft (CHECK: draft, released, visible)
created_by      uuid NOT NULL REFERENCES profiles(id)
released_by     uuid REFERENCES profiles(id)
released_at     timestamptz
visible_at      timestamptz
tenant_id       uuid NOT NULL
created_at      timestamptz NOT NULL DEFAULT now()
updated_at      timestamptz NOT NULL DEFAULT now()
UNIQUE (student_id, term, subject)

RLS (7 policies):
  rc_teacher_insert    INSERT  created_by=auth.uid() AND status=draft AND role=teacher
  rc_teacher_select_own SELECT created_by=auth.uid() AND role=teacher
  rc_teacher_update_own UPDATE created_by=auth.uid() AND status=draft AND role=teacher
  rc_office_select     SELECT  role=office AND tenant_id=JWT tenant_id
  rc_office_manage     UPDATE  role=office AND tenant_id=JWT tenant_id
  rc_learner_select_visible SELECT student_id=auth.uid() AND status=visible AND role=learner
  rc_admin_all         ALL     tenant_id=JWT tenant_id AND role=admin

---

## Table: certificates (migration 043, RLS from 044, trigger from 046, 049)

id                uuid PK DEFAULT gen_random_uuid()
user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
cert_class        text NOT NULL (CHECK: club_attendance, enrichment, core_subject, year_completion, graduation)
title             text NOT NULL
description       text
source_ref        uuid
issued_at         timestamptz NOT NULL DEFAULT now()
signatory         text NOT NULL
file_url          text
status            text NOT NULL DEFAULT issued (CHECK: issued, superseded, revoked)
supersede_old_id  uuid REFERENCES certificates(id)
tenant_id         uuid NOT NULL
created_at        timestamptz NOT NULL DEFAULT now()
UNIQUE (user_id, cert_class, source_ref)

RLS: cert_self_select, cert_admin_all
Immutability trigger: trg_cert_immutability (blocks UPDATE/DELETE on issued)

---

## UI Field to Backing Column Map (draft)

UI Field | View | Table | Column(s) | Notes
greeting | Home | (client) | - | Hardcoded
first_name | Home | profiles | name |
academic_tag | Home | profiles | - | Computed
devotional_reference | Home | devotional_config | reference |
devotional_verse | Home | devotional_config | verse_text |
coming_up_subject | Home | schedule_slot | subject | Future JOIN
coming_up_teacher | Home | schedule_slot | teacher_name | Future JOIN
news_headline | Home | announcement | title | Future table
class_subject | Class | courses | subject | Via student_class
class_teacher | Class | courses | teacher_name | Via student_class
class_status_time | Class | schedule_slot | start_time, recurrence |
hub_title | Hub | courses | title | WHERE enrichment
hub_type_meta | Hub | courses | category |
feed_tab_label | Social | (client) | - | Hardcoded
group_name | Social | conversations | category | conversation naming per 059 schema (chat_groups superseded by migration 059)
chat_message | Social | messages | body | messages.body per migration 059
full_name | Profile | profiles | name |
role_curriculum_year | Profile | profiles | role |
profile_grade | Profile | student_class | grade |
enrichment_title | Profile | courses | title | WHERE enrichment
enrichment_progress | Profile | chapter_progress | - | Computed
club_name | Profile | courses | title | WHERE club
booklist_label | Profile | booklist | label | Future table
platform_status | Profile | platform_access | is_active |
platform_expiry | Profile | platform_access | expires_at |
group_name | Profile Groups | conversations | category | conversation naming per 059 schema
group_lead | Profile Groups | (planned) | - | facilitator scope, conversations-side, serves Profile My Groups group_lead; design TBD; PLANNED
| schedule_slot.location | (planned) | schedule_slot | location | text, nullable; serves coming_up_location, class_location, hub_location; PLANNED
| group_lead / facilitator | (planned) | conversations | (conversations-side facilitator scope) | serves Profile My Groups group_lead; design TBD; PLANNED
| devotional_enabled | Config | tenant_mobile | devotional_enabled |
devotional_tenant_id | Config | tenant_mobile | devotional_tenant_id |

---

## Guard-Scope Convention

Every field in this register has one of three backing statuses:

| Status | Meaning | CI Guard Enforces |
|--------|---------|-------------------|
| **BACKED** | Column exists in a live migration. Field can be queried from the database today. | YES -- guard fails if BACKED table is missing |
| **PLANNED** | Column or table is designed but not yet migrated. Field is a placeholder in this register. | No -- documentation only |
| **COMPUTED** | Field is derived at read-time from BACKED columns (concatenation, join, conditional). No dedicated column. | No -- documentation only |

The CI guard (supabase/guard-field-register.sh) validates that every
table listed as BACKED exists in the live schema. It does not validate
column names or types -- that is the domain of migration file review.

When promoting a field from PLANNED to BACKED:
1. Write and apply the migration
2. Verify the table passes the guard
3. Update this register status column
4. Re-run CI to confirm the guard still passes

When demoting a field from BACKED to PLANNED (migration rollback):
1. Remove or disable the migration
2. Update this register status column
3. Re-run CI -- guard will fail if the table is truly gone


## D-CHAPSEQ — Chapter sequence guard repair (status: BACKED)

- **Scope:** migration 060 replaces the chapter sequence guard originally created in migration 018.
- **Behavior fix:** the 018 guard was vacuous (passed if at least one prior chapter was complete). 060 enforces ALL predecessor chapters in the same course must have a chapter_progress row for the student before a later chapter may be marked complete.
- **Trigger rename:** old trigger `check_chapter_sequence` renamed to `trg_chapter_progress_sequence` to match the `trg_` convention.
- **No schema/column changes** — behavior and trigger-name fix only.
- **Status:** BACKED (migration 060, this arc)

## D-060-DEL — Chapter sequence delete-guard (LIFO) (status: BACKED)

- **Scope:** BEFORE DELETE guard on public.chapter_progress enforcing LIFO deletion. A student may delete a chapter_progress row ONLY if no successor chapter in the SAME COURSE has a progress row for that student. Migration 061.
- **Status:** BACKED (migration 061 applied, test green).
- **Accepted risk:** service-role / direct UPDATE re-point of chapter_id or student_id is outside the RLS threat model; no migration action. Recorded, no fix.

## User Types (locked, source: migration 026)

8 roles, TEXT column + CHECK constraint (not a PG enum type),
defined in 026_crossing_gate_columns.sql (superseded 013's
3-role set):

| # | Value             | Notes                                                  |
|---|-------------------|--------------------------------------------------------|
| 1 | student           | Core learner; auto-assigned on signup by trigger        |
| 2 | outside_student   | Non-enrolled learner (short courses, trials)            |
| 3 | family            | First-class role (not a guest variant)                  |
| 4 | alumni            | Graduated; read-only access to own records              |
| 5 | teacher           | Instructor; manages courses + chapters                  |
| 6 | expert            | Guest specialist; time-bounded content access           |
| 7 | guest             | Minimal read access; no enrolment, no calendar          |
| 8 | admin             | Staffs the Office Desk; full bypass via admin_all RLS   |

Build order for calendar/schedule surfaces: student + teacher
first, then family (unique design configuration), then others.

Terminology: instructor is deprecated ghost terminology; use
teacher. family is a first-class role, not a guest variant.

## Calendar & Schedule Architecture (decided 2026-07-10)

Calendar = 3 layers:

L1 SOURCES:
  - class slots (migration 037: terms + schedule_slot)
  - school events
  - hub/OTT live events (3rd-party reference entries for now,
    maybe native later)
  - chat group events
  - devotional

L2 RESOLUTION:
  - Profile in Supabase is source of truth
  - Visibility derives from enrolment (student_class), platform
    flags (platform_access, has_core), access windows (032),
    contract/payment state managed by back office (admin role)

L3 READ MODEL:
  - Per-user unique calendar
  - Mobile index page shows ALL entries
  - Sectional calendars filter by source tag
  - Mobile + LMS are pure READERS, zero client-side resolution

Class vs event resolution differ:
  - Classes appear via enrolment (no user choice)
  - Hub/chat events appear via access + user attendance TOGGLE
    (future event_attendance table: user_id, tenant_id, source,
    event_ref, opted_at)

Schedule access is AUTO-DETERMINED at placement/roll-over (same
engine and inputs as yearly booklist): yearly core package +
school stage (junior/senior) + subject selection + per-item
clubs/enrichment. Engine WRITES student_class rows
(materialization); RLS reads enrolment only -- stage/subjects
are placement inputs, NOT read-policy conditions.

Grade 7 / mod school crossover: NO separate stage; placement
engine enrols across junior+senior course sets as needed.

Onboarding flow: front desk (web) registers -> user placed into
profile -> placement engine materializes enrolments -> calendar
composes. School Desk uses this for registered members' full
onboarding; NOT front-desk services.

Booklist depth: booklist maps not only to subjects/courses but
to CURRICULUM SESSIONS -- session sections and homework. Ebooks
in the student library attach at session-section level.

Two session concepts, kept separate:
  - schedule_slot (037) = TIME (when class meets, recurrence)
  - curriculum session = CONTENT (what is taught: sections,
    ebooks, homework) -- future LMS lesson model
  They join only in the read model (occurrence N of slot =
  curriculum session N). schedule_slot stays content-free.

Notifications link: 036 'schedule' type = delivery channel for
class-start pings (pg_cron reads schedule_slot; later slot).

## Chat & Handle scope -- PLANNED (ex-054/055, re-entry per ledger disposition 4fb1b8f)

Every row below carries its own status stamp, per register convention.
Scope traces to docs/governance/wiring-plan-v1.md, whose 054/055 numbering
is superseded. Chat tables promoted via migration 059; handle scope
delivered via migration 062 (arc D-062-HANDLE). All chat tables are tenant-scoped (tenant_id NOT NULL,
RLS per R20 auth-first doctrine). conversations.category is display-only.

### Table: conversations (migration 059)
| Field | Type | Notes | Status |
|-------|------|-------|--------|
| id | uuid PK | Primary key | BACKED |
| tenant_id | uuid NOT NULL | Tenant scoping, RLS per R20 | BACKED |
| category | text | Display-only (existing ruling) | BACKED |
| created_by | uuid | Profile that opened the conversation | BACKED |
| created_at | timestamptz | Default now() | BACKED |
| updated_at | timestamptz | Default now() | BACKED |

### Table: conversation_members (migration 059)
| Field | Type | Notes | Status |
|-------|------|-------|--------|
| conversation_id | uuid NOT NULL | FK conversations.id | BACKED |
| profile_id | uuid NOT NULL | FK profiles.id | BACKED |
| role | text | Member role in conversation | BACKED |
| joined_at | timestamptz | Default now() | BACKED |
| last_read_at | timestamptz | Read cursor for unread state | BACKED |

### Table: messages (migration 059)
| Field | Type | Notes | Status |
|-------|------|-------|--------|
| id | uuid PK | Primary key | BACKED |
| conversation_id | uuid NOT NULL | FK conversations.id | BACKED |
| sender_id | uuid NOT NULL | FK profiles.id | BACKED |
| body | text | Message content | BACKED |
| created_at | timestamptz | Default now() | BACKED |
| edited_at | timestamptz | Nullable | BACKED |
| deleted_at | timestamptz | Nullable soft-delete | BACKED |

### Table: message_reactions (migration 059)
| Field | Type | Notes | Status |
|-------|------|-------|--------|
| message_id | uuid NOT NULL | FK messages.id | BACKED |
| profile_id | uuid NOT NULL | FK profiles.id | BACKED |
| emoji | text | Reaction glyph | BACKED |
| created_at | timestamptz | Default now() | BACKED |

### Table: chat_preferences (migration 059)
| Field | Type | Notes | Status |
|-------|------|-------|--------|
| profile_id | uuid NOT NULL | FK profiles.id | BACKED |
| muted_conversations | uuid[] | Muted conversation ids | BACKED |
| notification_level | text | Per-profile notify setting | BACKED |
| updated_at | timestamptz | Default now() | BACKED |

### Table: profiles (extension) -- handle scope [PLANNED -> registered, arc D-062-HANDLE]
| Field | Type | Notes | Status |
|-------|------|-------|--------|
| handle | text | Display handle. Universal DB CHECK: 3-20 chars, no whitespace. Per-tenant format policy enforced in Edge Function (Redhouse: ^[a-z_][a-z0-9_]{2,19}$). Set only after tenant_id assigned (R20 pending state rejected). Uniqueness: UNIQUE INDEX (tenant_id, lower(handle)) — per-tenant, case-insensitive. | BACKED |

**Write path (R-6/R-7):** Edge-Function-only (set_handle). No direct
UPDATE. Per-tenant handle_mode config: admin_set (master-admin assigns)
or user_set (self-assign). Redhouse (tenant 1) = admin_set; may be
switched to user_set later via config, no migration.
**Blocklist (R-4, platform-wide, tenants may extend, never shrink):**
admin, office, redhouse, staff, help, support, system, root, moderator,
mod, api, null, undefined, me, you, everyone, all. Enforced in Edge Function.

### Table: handle_changes -- arc D-062-HANDLE
| Field | Type | Notes | Status |
|-------|------|-------|--------|
| id | uuid PK | gen_random_uuid() | BACKED |
| profile_id | uuid NOT NULL | FK profiles.id (register prevails over wiring-plan user_id, R-1) | BACKED |
| tenant_id | uuid NOT NULL | Denormalized from profiles at write time (R-2) | BACKED |
| old_handle | text | Nullable; NULL = initial assignment (R-3) | BACKED |
| new_handle | text NOT NULL | | BACKED |
| changed_at | timestamptz NOT NULL | DEFAULT now() | BACKED |

**RLS (R-2):** self_select (privacy floor, always on) + master-admin-
per-tenant SELECT. NO admin_all. Optional per-tenant config may widen
in-tenant role visibility only; tenant fence never widens. Audit rows
written by trigger on handle change.
**Status of arc:** BACKED (register locked, rulings R-1..R-7 ratified 2026-07-18; migration 062 + test 062_handle_system.test.sql).

**Supersession note (D-054/055-REVIEW, 2026-07-18):** ex-054/055
reservations are fully closed. 054 scope (chat tables) delivered
under migration 059; 055 scope (handle system) delivered under
migration 062. Deviations from wiring-plan-v1.md 055 literal
text are ratified rulings, not gaps: per-tenant uniqueness
(tenant_id, lower(handle)) supersedes global UNIQUE; no admin_all
(R-2); profile_id supersedes user_id (R-1); old_handle nullable
(R-3); blocklist expanded platform-wide (R-4). Migration numbers
054/055 remain permanent never-created gaps per 4fb1b8f. No
residual PLANNED scope exists from either reservation.


### Ledger note (D-062-HANDLE seal, 2026-07-18)
Canonical test baseline corrected to **240 assertions / 24 files** (runner-verified
via `supabase test db supabase/tests/`). The earlier 181-assertion / 20-file figure
is retired as stale post-059/060/061 additions. D-062-HANDLE is BACKED:
migration 062 (profiles.handle + handle_changes) and test file
062_handle_system.test.sql (24 pgTAP assertions) both committed.

## Read-Model Decision (PLANNED)

Computed fields are served by a mobile read-model layer (views or endpoint composition), NOT denormalized columns. The following registered fields are Computed and therefore owned by this layer:

- academic_tag (Home) — composed from profiles

- profile_curriculum, profile_grade, profile_stage, profile_intake (Profile) — composed from profiles

- hub_stage (Hub) — composed from profiles stage

- enrichment_progress, enrichment_pace (Profile) — composed from courses + chapter_progress

- core_class_schedule (Profile) — composed from student_class

- club_schedule (Profile) — composed from courses

Composition logic ownership: the read-model layer. No dedicated columns are added for these. Status: PLANNED (read-model design not yet ratified).

---

## S-A — Group display/lead/media columns (status: PLANNED)

**Scope (PLANNED — no migration exists as of HEAD 6d1a38a):** three columns required by frozen designs 5/6/7 and chat-adjustments, absent from `supabase/migrations/059_chat_tables.sql`.

### S-A.1 conversations.name
- **Type:** `text` (proposed). **Nullability:** proposed `not null`. **Default:** UNKNOWN — DESIGN DECISION NEEDED (whether groups are seeded with a name at creation, or nullable until set).
- **Actual 059 DDL (verbatim):** `create table public.conversations ( id uuid primary key default gen_random_uuid(), tenant_id uuid not null, category text not null default 'general', created_by uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), updated_at timestamptz not null default now() );` — **NO `name` column present.**
- **RLS policies touched (derived from 059):** `conversations_tenant_read` (select; filters on tenant_id + membership/admin), `conversations_member_write` (all; filters on tenant_id + membership). A `name` column inherits both policies; no new policy required for the column itself.

### S-A.2 conversations.media_enabled
- **Type:** `boolean` (proposed). **Nullability:** proposed `not null`. **Default:** `false` (proposed — "text+emoji only" demo default per chat-adjustments).
- **Actual 059 DDL:** NO `media_enabled` column present in `conversations`.
- **RLS policies touched:** same table-level policies as S-A.1. Write restricted to conversation members; lead-only toggle is APP-level, NOT enforced by RLS (no `is_group_lead` column — see S-A.3). DESIGN DECISION NEEDED: whether media-dial write should be RLS-gated to leads (requires S-A.3 first).

### S-A.3 conversation_members.is_group_lead
- **Type:** `boolean` (proposed). **Nullability:** proposed `not null`. **Default:** `false`.
- **Actual 059 DDL (verbatim):** `create table public.conversation_members ( conversation_id uuid not null references public.conversations(id) on delete cascade, profile_id uuid not null references public.profiles(id) on delete cascade, role text not null default 'member', joined_at timestamptz not null default now(), last_read_at timestamptz, primary key (conversation_id, profile_id) );` — **NO `is_group_lead` column.** Lead state implicit in `role` text (no CHECK enum, default 'member').
- **RLS policies touched:** `conv_members_self_read` (select where profile_id=auth.uid()), `conv_members_self_write` (all where profile_id=auth.uid()). A new `is_group_lead` boolean would be self-readable; writes stay self-gated unless a new policy enforces lead-only mutation. DESIGN DECISION NEEDED: enforce lead flag via new RLS policy or promote `role` to a CHECK-constrained enum ('member','lead').

## S-B — Class/Hub display columns (status: PLANNED)

**Scope (PLANNED — absent from 027/039):** display columns named in expo-port-plan.md §2 (class_subject, class_teacher, class_status_time; hub_title, hub_type_meta, hub_status_time, location, stage) that the 027/039 DDL does not define.

### S-B.1 student_class.class_subject / class_teacher / class_status_time
- **Actual 027 DDL (verbatim):** `create table if not exists student_class ( id uuid primary key default gen_random_uuid(), student_id uuid not null references auth.users(id), class_id uuid not null, tenant_id uuid not null default '00000000-0000-0000-0000-000000000001', enrolled_at timestamptz not null default now(), deleted_at timestamptz, unique (student_id, class_id) );`
- **Finding:** NONE of `class_subject`, `class_teacher`, `class_status_time` exist. The table links `student_id`↔`class_id` only; subject/teacher/time are NOT columns. They are either (a) properties of a `classes`/`courses` table referenced by `class_id` (UNKNOWN — `courses` exists per 014/034 but column mapping UNKNOWN), or (b) PLANNED display columns to be added. DESIGN DECISION NEEDED: define source table/columns for subject/teacher/schedule, or add columns to `student_class`.

### S-B.2 enrichment_meta.title / location / stage
- **Actual 039 DDL (verbatim):** `create table public.enrichment_meta ( id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_class_id uuid not null references public.student_class(id) on delete cascade, pace text not null default 'self-paced' check (pace in ('self-paced','structured')), completed int not null default 0 check (completed >= 0), total int not null default 0 check (total >= 0), note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (completed <= total OR total = 0), unique (student_class_id) );`
- **Finding:** NONE of `title`, `location`, `stage` exist. `enrichment_meta` holds only pace/completed/total/note + FKs. `hub_type_meta` and `hub_status_time` have no backing column here either. DESIGN DECISION NEEDED: add `title`/`location`/`stage` to `enrichment_meta`, or define a parent `enrichment`/`courses` table carrying them (UNKNOWN which).

## S-C — Edge Function scopes (status: PLANNED)

**Scope derived from spec/design docs only (no EF code exists beyond `assign_tenant`).**

### S-C.1 set_handle
- **Source (field-register.md:519, verbatim):** "Write path (R-6/R-7): Edge-Function-only (set_handle). No direct" — and `profiles.handle` column added by 062 (`ALTER TABLE public.profiles ADD COLUMN handle text;`).
- **Scope:** EF `set_handle` sets `profiles.handle` for the calling user, enforcing the universal format CHECK (char_length(handle) BETWEEN 3 AND 20 AND handle !~ '\s') and per-tenant unique index (profiles_tenant_handle_unique). Audit rows written to `handle_changes` (NO INSERT/UPDATE/DELETE RLS — by design, EF-only).
- **Status:** PLANNED. EF does NOT exist in `supabase/functions/` (only `assign_tenant`). DESIGN DECISION NEEDED: none — spec mandates EF-only; implementation pending.

### S-C.2 report-card release (draft → released → visible)
- **Source (08-report-card-tab.md:56-57, verbatim):** "`draft` → `released` | Office | Edge Function UPDATE | role = admin/office, tenant_id match" and "`released` → `visible` | Office | Edge Function UPDATE (same transaction) | visible_at = now()".
- **Scope:** EF performs the two-step status advance on `report_cards` (status CHECK: draft, released, visible). Office/Admin only; tenant_id match required. `released` is transient (advance in one transaction). `rc_office_manage` RLS permits office UPDATE.
- **Status:** PLANNED. No such EF exists. DESIGN DECISION NEEDED: none — design mandates EF; implementation pending.

### S-C.3 messages client send — RLS verdict (verbatim policy)
- **Verbatim 059 policy:** `create policy messages_member_write on public.messages for insert to authenticated with check ( exists ( select 1 from public.conversations c where c.id = messages.conversation_id and c.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid ) and sender_id = auth.uid() and exists ( select 1 from public.conversation_members cm where cm.conversation_id = messages.conversation_id and cm.profile_id = auth.uid() ) );`
- **Plain statement (quoting policy, no interpretation beyond it):** A client-side INSERT into `messages` IS already permitted by RLS for any `authenticated` user who (1) targets a conversation in their own JWT tenant, (2) sets `sender_id = auth.uid()`, and (3) is a member of that conversation (`conversation_members`). The policy is INSERT/`with check` only — it does NOT require an Edge Function. A client-side send is RLS-permitted TODAY; the missing piece is client wiring (no supabase import in any mobile screen — all 17 SCAFFOLD) and the absence of a send handler, not an RLS block.

## S-F — Front-Desk lead tables (status: PLANNED)

**Scope (PLANNED — no migration exists):** pre-payment lead tables owned by Front Desk, per `docs/spec/front-desk-registration.md` (RULED 2026-07-11). Columns taken ONLY from the ruled spec text; where the spec does not define a column, written UNKNOWN — DESIGN DECISION NEEDED.

### S-F.1 lead table (enquiry → qualified → invoiced)
- **Spec-defined (verbatim §1,§3,§6):** Lead records are "working objects: notes, follow-ups, callback scheduling" → implies columns for `notes`, `follow_ups`/`callback_schedule` — but spec gives NO column names/types. **UNKNOWN — DESIGN DECISION NEEDED** (names, types, nullability, defaults).
- Stage column with values `enquiry → qualified → invoiced` (state machine). **Type:** proposed `text` with CHECK in ('enquiry','qualified','invoiced'). **Nullability/Default:** UNKNOWN — DESIGN DECISION NEEDED (nullable? default 'enquiry'?).
- "Front Desk-OWNED lead tables" + "Lead table schema finalization (Front Desk-owned, tenant-scoped)" (§6 open item) → implies `tenant_id` (not null, repo convention) and a PK. **Exact column names/types:** UNKNOWN — DESIGN DECISION NEEDED.
- "callback queue" with "time-zone rotated queues (USA, UK, SA, Singapore, Australia)" (§4) → implies a callback/queue column, possibly `callback_tz`/assignment — UNKNOWN — DESIGN DECISION NEEDED.
- **No column in the spec is given a concrete name/type beyond the stage VALUES.** Every structural column (id, tenant_id, created_at, notes, follow_up, callback_schedule) is UNKNOWN — DESIGN DECISION NEEDED. Spec lists "Lead table schema finalization" as an OPEN ITEM (§6).
- **RLS implications (spec §2 HARD RULE):** Front Desk FULL read/write on lead tables; Office reads status only; School read-only. Requires dedicated RLS per desk role — UNKNOWN — DESIGN DECISION NEEDED (policies not in spec).
- **Write authority:** ALL core-registration status mutations go through Edge Functions (spec §2); lead-table writes are Front Desk-direct (not EF). Split authority must be encoded in RLS — UNKNOWN — DESIGN DECISION NEEDED.

### S-F.2 core registration status column (post-payment, Office Desk)
- **Spec-defined states (verbatim §1):** `pending_init → pending_review → approved → active` plus terminal `withdrawn`, `rejected`.
- **Status:** Lives in the CORE registration table (not the lead table). Column name/type UNKNOWN — DESIGN DECISION NEEDED. Referenced by ITEM-004 as canonical data model but no migration carries it in 027–062.

