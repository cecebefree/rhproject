# Security Audit — 2026-09-05

## Summary

- **266 RLS policies** across 129 tables
- **3 tables with NO RLS at all** (CRITICAL)
- **anon has INSERT on 6 school_desk tables** (HIGH)
- **anon has full CRUD via GRANTs on ~50 public schema tables** (MEDIUM — RLS blocks, but GRANTs are overly broad)
- **`.env` NOT committed to git** (CLEAN)
- **27 tables with `public` role policies** — mostly office_desk insert/CRUD (NEEDS REVIEW)
- **RLS disabled on 4 tables** — 3 are functional tables (CRITICAL)

---

## CRITICAL — Tables with NO RLS

| Schema | Table | Risk | Fix |
|--------|-------|------|-----|
| office_desk | contacts | Any user can read/write all contacts | Enable RLS + add desk-scoped policy |
| office_desk | office_desk | Any user can read/write desk config | Enable RLS + add admin-only policy |
| office_desk | user_desks | Any user can assign自己 to any desk | Enable RLS + add admin-only INSERT |
| school_desk | __reload_trigger | Trigger table, likely harmless | Enable RLS (deny-all) |

---

## HIGH — Anon INSERT on School Desk Tables

The `anon` role has INSERT privilege on these tables (PostgREST enforces RLS, but GRANTs should be tightened):

| Table | Anon Can Do | RLS Blocks? | Fix |
|-------|-------------|-------------|-----|
| school_desk.conversations | INSERT | Yes (RLS exists) | Revoke anon INSERT |
| school_desk.conversation_members | INSERT | Yes | Revoke anon INSERT |
| school_desk.messages | INSERT | Yes | Revoke anon INSERT |
| school_desk.enrollments | INSERT | Yes | Revoke anon INSERT |
| school_desk.programs | INSERT | Yes | Revoke anon INSERT |
| school_desk.announcement | INSERT | Yes | Revoke anon INSERT |
| front_desk.inquiries | INSERT | Yes | Revoke anon INSERT |

---

## MEDIUM — Anon Full CRUD on Public Schema

Anon has SELECT/INSERT/UPDATE/DELETE GRANTs on ~50 public schema tables. PostgREST RLS blocks access when policies exist, but:

- **Tables with RLS disabled** (above) are fully exposed
- **Tables with only `public` role policies** may allow unintended access

Key tables with anon GRANTs:
- `public.profiles` — SELECT, INSERT, UPDATE, DELETE
- `public.payments` — SELECT, INSERT, UPDATE, DELETE
- `public.invoices` — SELECT, INSERT, UPDATE, DELETE
- `public.contracts` — SELECT, INSERT, UPDATE, DELETE
- `public.certificates` — SELECT, INSERT, UPDATE, DELETE
- `public.messages` — SELECT, INSERT, UPDATE, DELETE
- `public.conversations` — SELECT, INSERT, UPDATE, DELETE
- `public.students` — SELECT, INSERT, UPDATE, DELETE
- `public.parents` — SELECT, INSERT, UPDATE, DELETE
- `public.chapters` — SELECT, INSERT, UPDATE, DELETE
- `public.chapter_progress` — SELECT, INSERT, UPDATE, DELETE

---

## LOW — Overly Broad `authenticated` ALL Policies

These tables have a single `authenticated` ALL policy — any authenticated user can do anything:

| Table | Current Policy | Risk |
|-------|---------------|------|
| front_desk.callbacks | authenticated ALL | Any staff can modify callbacks |
| front_desk.email_logs | authenticated ALL | Any staff can modify email logs |
| front_desk.escalations | authenticated ALL | Any staff can modify escalations |

These should be scoped to office/admin roles only.

---

## CLEAN — `.env` Handling

- `.gitignore` has `.env*` pattern
- `.env` is NOT tracked by git (verified)
- `SUPABASE_SERVICE_ROLE_KEY` is local dev only (not committed)

---

## CLEAN — ef_call_log

- Has `ef_call_log_admin_select` policy for `authenticated` only
- No INSERT/UPDATE/DELETE policies — service_role only
- Properly scoped

---

## Hardening Applied (2026-09-05)

### Migration: `20260905070000_security_hardening.sql`

**CRITICAL fixed:**
- ✅ RLS enabled on `office_desk.contacts`, `office_desk.office_desk`, `office_desk.user_desks`
- ✅ `school_desk.__reload_trigger` — deny-all policy added

**HIGH fixed:**
- ✅ Anon INSERT revoked on 7 tables: `school_desk.conversations`, `conversation_members`, `messages`, `enrollments`, `programs`, `announcement`, `front_desk.inquiries`
- ✅ `front_desk.callbacks` — scoped to office/admin (was authenticated ALL)
- ✅ `front_desk.email_logs` — scoped to office/admin (was authenticated ALL)
- ✅ `front_desk.escalations` — scoped to office/admin (was authenticated ALL)

**Additional fixes in this session:**
- ✅ `20260905020000_conversations_media_enabled.sql` — fixed table reference (`public.conversations` → `school_desk.conversations`)
- ✅ `20260905060000_rename_courses_to_programs.sql` — fixed duplicate `IF EXISTS`, fixed function drop order

### Remaining (LOW priority, post-launch)
- Revoke anon GRANTs on sensitive public tables (profiles, payments, invoices, etc.) — RLS blocks access, but GRANTs should be tightened
- Add `public` role SELECT policies to remaining tables for consistency
