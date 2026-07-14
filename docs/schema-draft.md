# SCHEMA SECTION Draft for Human Review

Generated: 2026-07-14
Source: Live migrations (013-053)
Status: DRAFT - awaiting human approval before merging into field-register.md

---

## Table: profiles (migration 013, expanded by 021, 026)

id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
name                text NOT NULL
role                text NOT NULL CHECK (8-value enum: student, outside_student, family, alumni, teacher, expert, guest, admin)
created_at          timestamptz NOT NULL DEFAULT now()
updated_at          timestamptz NOT NULL DEFAULT now()
tenant_id           uuid REFERENCES public.tenant_devotional(id)
registration_status text NOT NULL DEFAULT pending (CHECK: pending, approved, rejected)
consent_given       boolean NOT NULL DEFAULT false

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
group_name | Social | (future) | - | Future chat_groups
chat_message | Social | (future) | - | Future chat_messages
full_name | Profile | profiles | name |
role_curriculum_year | Profile | profiles | role |
profile_grade | Profile | student_class | grade |
enrichment_title | Profile | courses | title | WHERE enrichment
enrichment_progress | Profile | chapter_progress | - | Computed
club_name | Profile | courses | title | WHERE club
booklist_label | Profile | booklist | label | Future table
platform_status | Profile | platform_access | is_active |
platform_expiry | Profile | platform_access | expires_at |
group_name | Profile Groups | (future) | - | Future chat_groups
group_lead | Profile Groups | (future) | - | Future facilitator
devotional_enabled | Config | tenant_mobile | devotional_enabled |
devotional_tenant_id | Config | tenant_mobile | devotional_tenant_id |
