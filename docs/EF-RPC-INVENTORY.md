# EF/RPC Inventory & Realtime Usage Audit

**Date:** 2026-07-22
**Source ruling:** DF-32 PARTIAL RULING at c4f76f2
**Scope:** Read-only audit under board row 30. No files modified.

---

## Edge Functions (`supabase/functions/`)

| Name | Location | Lines | Status | Gate |
|------|----------|-------|--------|------|
| `assign_tenant` | `supabase/functions/assign_tenant/index.ts` | 126 | Deployed — full implementation (real Deno handler, Supabase client, CORS, tenant assignment logic) | Exempt per DF-32 §4 |
| `verify-turnstile` | `supabase/functions/verify-turnstile/index.ts` | 25 | Stub — returns `{status:"scaffold", message:"Not yet implemented"}` | Row 23, gated by DF-32 |
| `class-start-ping` | `supabase/functions/class-start-ping/index.ts` | 25 | Stub — identical scaffold pattern | Row 29, gated by DF-32 |
| `validate-toggle` | `supabase/functions/validate-toggle/index.ts` | 25 | Stub — identical scaffold pattern | Row 29, gated by DF-32 |
| `ai-tutor-proxy` | `supabase/functions/ai-tutor-proxy/index.ts` | 25 | Stub — identical scaffold pattern | Row 29, gated by DF-32 |

## Database Functions (RPCs) — defined in migrations, all deployed via SQL

| Name | Migration | Signature | Status |
|------|-----------|-----------|--------|
| `custom_access_token_hook` | 056 | `(event jsonb) → jsonb` | Deployed — fail-loud JWT enrichment |
| `has_core_access` | 032 | `() → boolean` | Deployed — access window check |
| `has_item_access` | 032 | `(p_course_id uuid) → boolean` | Deployed — per-course access check |
| `has_platform_access` | 035 | `(p_platform platform_key) → boolean` | Deployed — per-platform gating |
| `make_timerange` | 037 | `(p_start time, p_end time) → tsrange` | Deployed — schedule slot helper |
| `check_isbn_format` | 040 | Trigger function | Deployed — ISBN validation trigger |
| `materialize_booklist` | 040 | `(p_child_id uuid, p_school_year text, p_tenant_id uuid) → setof booklist_item` | Deployed — booklist materialization |
| `get_bookshelf` | 040 | `(p_child_id uuid) → table(...)` | Deployed — per-child bookshelf read model |
| `get_announcements` | 041 | `() → table(...)` | Deployed — role-filtered announcement reader |

## Realtime Publication Members

| Table | Added By | Current Status | Notes |
|-------|----------|---------------|-------|
| `public.student_class` | 029 (P2-016) | Active | REPLICA IDENTITY FULL; SELECT granted to authenticated (033) |
| `public.chapter_progress` | 029 (P2-016) | Removed per 038 (trimmed — no UX subscribes) | Dropped from publication by 038 |
| `public.schedule_slot` | 038 (P2-029-trim) | Active | Replaced chapter_progress; admin edits → live student/teacher view |
| `public.notifications` | 036 | Active | REPLICA IDENTITY FULL; SELECT granted to authenticated (036) |

## Recorded Gaps

1. **No client-side Realtime subscriptions exist.** Zero `.channel()`, `.subscribe()`, or `supabase_channel` calls in any `.ts` or `.tsx` file. Client-side subscription wiring is deferred to Phase E (rows 34–39) and remains gated behind DF-32, SB-11, CF-12.

2. **No `[functions]` registration exists in `supabase/config.toml`.** Edge Functions are not wired into the Supabase local/cloud deployment config. Deployment wiring is deferred to the implementation of rows 23, 28, and 29, all gated by DF-32.
