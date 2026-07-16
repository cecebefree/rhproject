# Ruling R20 — D15 Tenant Assignment

**Status:** RATIFIED  
**Date:** 2026-07-16  
**Author:** cecebefree  
**Related:** Migration 056 (hook fail-loud), ITEM-001, ITEM-009

---

## Ruling

**a) profiles.tenant_id is written ONLY by an Edge Function named `assign_tenant`.**  
No client writes. No signup trigger auto-assignment. The `handle_new_user()` trigger (migration 025) MUST BE REMOVED / altered to NOT set tenant_id. New users get `tenant_id = NULL` (pending state).

**b) NULL tenant_id is a legitimate PENDING state.**  
Hook behavior stays exactly as proven in 7ef7bdb:  
- Profile exists but `tenant_id IS NULL` → hook logs `WARNING` and mints claims with `tenant_id: null`  
- Deny-by-default RLS means pending users read nothing  
- Do NOT touch the hook

**c) Once tenant_id is set non-null, it is IMMUTABLE except via a master-admin flow.**  
Enforced by a database trigger on `profiles.tenant_id`:
- `NULL` → `uuid` : ALLOWED exactly once (tenant assignment)
- `uuid` → `uuid` (different) : BLOCKED, fail-loud (RAISE EXCEPTION)
- `uuid` → `NULL` : BLOCKED, fail-loud (RAISE EXCEPTION)
- Only callable by master-admin (SECURITY DEFINER function invoked by Edge Function)

---

## Master-Admin Definition

A **master-admin** is a user who:
- Has `role = 'admin'` in `profiles`
- Has `tenant_id = <target_tenant_id>` (i.e., is an admin OF that tenant)
- The Edge Function `assign_tenant` validates the caller is a master-admin of the **target tenant** before writing

---

## Implementation Plan

1. **Remove auto-assignment from `handle_new_user()`** — alter trigger to insert `tenant_id = NULL`
2. **Create immutability trigger** on `profiles.tenant_id` (BEFORE UPDATE)
3. **Create SECURITY DEFINER function** `assign_tenant_to_profile(profile_id uuid, tenant_id uuid)` callable only by master-admin
4. **Create Edge Function `assign_tenant`** that:
   - Verifies caller is master-admin of target tenant
   - Calls `assign_tenant_to_profile()`
5. **pgTAP tests** for trigger behavior
6. **Single commit chain**, pushed to origin/main

---

## Conflicts Check

| Existing Artifact | Conflict | Resolution |
|-------------------|----------|------------|
| Migration 025 (`handle_new_user_tenant_id.sql`) | Sets default tenant_id on signup | **Must be reverted/altered** — new users get NULL |
| Migration 021 (`profiles_tenant_id_fk.sql`) | FK to tenant_devotional, nullable | **No conflict** — NULL allowed, FK enforced on non-null |
| Hook (Migration 056) | WARN on null tenant_id | **No conflict** — ruling explicitly preserves this |

---

## Audit Trail

- 7ef7bdb: pgTAP tests prove hook WARN + null claim behavior for NULL tenant_id
- This ruling formalizes that NULL = pending, and makes assignment immutable + master-admin gated
