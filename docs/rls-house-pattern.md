# RLS House Pattern — Standard for Future Tables

**Status:** LOCKED (house convention, not negotiable per table)  
**Source:** Migrations 019, 024, 032, 033, 035, 036, 037, 038, 039, 040, 041 — all follow this pattern

---

## 1. Tenant Scoping Column
- Every tenant-scoped table has a **plain `uuid` column `tenant_id`** — **NO foreign key** to any `tenants` table.
- The three registries (`tenant_devotional`, `tenant_lms`, `tenant_mobile`) are the source of truth; no central `tenants` table exists.
- `tenant_id` is set at insert time (trigger or application) and never changed.

## 2. Column-Level Tenant Scoping in Every Policy
- All RLS policies reference `tenant_id` by comparing to the JWT claim:
  ```sql
  tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  ```
- This check appears in **every** policy (`using` and `with check` clauses) — no exceptions.
- Role checks (e.g., `p.role = 'admin'`) are done via a subquery on `public.profiles`:
  ```sql
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ```

## 3. Grants + RLS Gating (Two-Layer Defense)
- **Grants** enable the delivery path: `grant select, insert, update, delete on <table> to authenticated;`
- **RLS policies** gate actual access: default-deny, explicit allow per role/tenant.
- Never rely on grants alone; never skip the `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid` check in policies.

## 4. Admin Bypass Pattern
- One `for all` policy per table for admin:
  ```sql
  create policy <table>_admin_all on public.<table>
    for all to authenticated
    using (
      tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
    with check (
      tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    );
  ```
- Admin sees **all rows in their tenant** including future-dated, expired, soft-deleted, or audience-restricted rows.

## 5. Read-Model Functions
- SQL functions (e.g., `get_bookshelf()`, `get_announcements()`) implement the same tenant/role/time/audience logic.
- Functions are `language sql stable` and run with the caller's permissions (SECURITY INVOKER default).
- Admin bypass inside function:
  ```sql
  and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or ( <time/audience filters for non-admin> )
  )
  ```

## 6. Shared `updated_at` Trigger
- All tables with `updated_at` use the shared trigger function from migration 019:
  ```sql
  create trigger trg_<table>_updated_at
    before update on public.<table>
    for each row execute function public.set_updated_at();
  ```
- `set_updated_at()` sets `NEW.updated_at = now()`.

## 7. Indexing Convention
- Always index `tenant_id` first in composite indexes for tenant-scoped tables:
  ```sql
  create index idx_<table>_tenant on public.<table> (tenant_id);
  create index idx_<table>_tenant_feed on public.<table> (tenant_id, <ordering_cols>);
  ```

## 8. No `for update` / `for delete` Without `for select`
- Write policies (`for all` or explicit `for insert/update/delete`) always pair with a matching `for select` policy or the admin `for all`.
- Non-admin roles **never** get write policies — only `for select`.

## 9. Realtime Publications
- Tables published to realtime use `replica identity full`:
  ```sql
  alter table public.<table> replica identity full;
  ```
- SELECT grants on the table enable realtime subscriptions; RLS filters the stream.

---

## Quick Checklist for New Tables

| Item | Required? |
|------|-----------|
| `tenant_id uuid not null` (no FK) | ✅ |
| `created_at`, `updated_at` + `set_updated_at()` trigger | ✅ |
| `tenant_id` index (single + composite for feed queries) | ✅ |
| RLS enabled | ✅ |
| Non-admin `for select` policy with `tenant_id` + role check | ✅ |
| Admin `for all` policy with `tenant_id` + JWT role claim | ✅ |
| Grants: `select, insert, update, delete` to `authenticated` | ✅ |
| Read-model function mirrors policy logic + admin bypass | ✅ |
| `replica identity full` if published to realtime | ✅ (if applicable) |

---

*This pattern is the house standard. Deviations require Architecture Council approval and a migration that backfills the pattern.*