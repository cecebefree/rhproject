# Field Register — Redhouse Mobile

Status: PROVISIONAL — names may change until final lock pass.
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

## Tenant Mobile Config (provisional -- toggle decision 2026-07-10)
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
