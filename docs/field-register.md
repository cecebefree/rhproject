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
