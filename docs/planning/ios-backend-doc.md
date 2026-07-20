# iOS Backend Doc (Row 20)

**Ratified:** 2026-07-20 session (ae32461 baseline). Owner: Docs. Board: MASTER-TODO-V2.md row 20.
Scope: the backend surface the iOS / Expo client consumes or will consume. Every claim below is
traceable to a real on-disk artifact (migration number, Edge Function path, or policy file).
Nothing here is aspirational — unbuilt items are labeled PLANNED.

## 1. Tenant Context & Auth

- **JWT hook:** custom_access_token_hook (migration 022_custom_access_token_hook.sql) injects
  tenant_id + role into the JWT. This is the root of all tenant scoping.
- **Tenant assignment EF (PRESENT):** supabase/functions/assign_tenant — the ONLY Edge Function
  currently on disk. Assigns tenant to a profile post-signup.
- **RLS scoping doctrine:** tenant_id is read from request.jwt.claims->>'tenant_id' (set by the
  hook above). Policies MUST match this path and MUST compare row.tenant_id to the JWT tenant.
  Canonical sources (do not restate here):
  - AGENTS.md:116 — SELECT policy gates the read-phase of UPDATE (PG17 RLS behavior).
  - AGENTS.md:117 — tenant_id JWT claim path + repair pattern (migration 053).

## 2. Data Surface (migrations present on disk)

| Domain | Migration(s) |
|--------|--------------|
| Users / profiles | 013_lms_users_profiles, 021_profiles_tenant_id_fk |
| Courses / chapters / enrollments | 014, 015, 016, 017 |
| Tenants | 019_tenants, 024_backfill_and_rls |
| Student-class | 027_student_class |
| Realtime | 029_realtime_subscriptions, 033_realtime_select_grants |
| Schedule | 037_schedule |
| Notifications | 036_notifications |
| Enrichment / clubs | 039_enrichment |
| Booklists | 040_booklists |
| Announcements | 041_announcements |
| Access windows | 032_access_window |
| Platform access | 035_platform_access |
| Consent / suppression / report cards / office | 042–053 (incl. 052_select, 053_tenant_scoping) |
| Chat | 059_chat_tables, 062_handle_system |
| Realtime trim | 038_realtime_trim |

All of the above are applied in CI (supabase/migrations/*.sql replayed in the guard job).

## 3. Edge Functions

- **PRESENT:** assign_tenant (supabase/functions/assign_tenant).
- **PLANNED (not on disk):** verify-turnstile (web intake), office mutation EFs (report-card
  lifecycle, consent), and any other agent-owned EFs named in the AO doc series. These are NOT
  callable from iOS yet and are labeled PLANNED pending implementation + a Cece ruling.

## 4. iOS Client Wiring Status

- Per PLAN-STATE.md (F0 snapshot, still current): 17 mobile screens, 0 WIRED. All screens use
  SEED_* static imports; none import supabase/@redhouse/shared. The ONLY wired client in the repo
  is apps/web (T014). Therefore the iOS app is SCAFFOLD today — backend consumption is PLANNED,
  not live. This doc describes the target surface, not a connected client.

## 5. Test Bar

Backend changes are gated by docs/governance/test-bar-policy.md (row 21): 240/24 pgTAP floor,
RLS positive+negative cases per table, 30-min CI budget.

(End of ios-backend-doc.md)
