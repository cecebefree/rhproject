# ITEM-013 — Lovable ↔ Supabase Front Desk Integration

| Field | Value |
|-------|-------|
| **Status** | LOCKED — Cece decision 2026-08-11 |
| **Ruled by** | Cece |
| **Date** | 2026-08-11 |
| **Affects** | Row 86 (MASTER-TODO-V2.md) |

## Summary

Lovable can connect to the existing single Supabase project and query the `front_desk` schema for Front Desk features. School Desk and Office Desk are managed directly within Supabase and do not require Lovable integration.

## Verified Capabilities

| Capability | Status |
|------------|--------|
| Connect to existing Supabase project (not just Lovable Cloud) | Confirmed |
| Schema-qualified queries (`supabase.schema('front_desk').from('leads')`) | Confirmed |
| Deploy Edge Functions to connected project | Confirmed |
| RLS policies on any schema | Confirmed |
| Auth (JWT) with custom_access_token_hook claims | Confirmed |
| Secrets (Turnstile etc.) stored in Supabase | Confirmed |
| Migrations saved to `supabase/migrations/` in code | Confirmed |

## Manual Prerequisite (One-Time, Before First Use)

Before Lovable can query `front_desk` schema, two steps must be completed manually in the Supabase dashboard:

### 1. Expose Schema in API Settings

Supabase Dashboard → Project Settings → API → Exposed Schemas → add `front_desk`.

This tells PostgREST (which powers the Supabase REST API) to serve tables from the `front_desk` schema. Without this, `supabase.from('leads')` returns empty even if the table exists.

### 2. Grant Privileges

```sql
-- Schema usage
GRANT USAGE ON SCHEMA front_desk TO anon, authenticated, service_role;

-- Table CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA front_desk TO anon, authenticated, service_role;

-- Sequence access (for INSERT/UPDATE with generated IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA front_desk TO anon, authenticated, service_role;

-- Future tables (ALTER DEFAULT PRIVILEGES)
ALTER DEFAULT PRIVILEGES IN SCHEMA front_desk GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA front_desk GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
```

### Why This Is Manual

Lovable connects via `SUPABASE_URL` + `SUPABASE_ANON_KEY` (or service role key). It does not manage PostgREST schema exposure or database grants — those are Supabase infrastructure settings, not application-level configuration Lovable can automate.

## Scope

- **Front Desk only** — Lovable connects to `front_desk` schema
- **School Desk** — managed directly in Supabase (no Lovable)
- **Office Desk** — managed directly in Supabase (no Lovable)
- **`public` schema** — shared (profiles, tenants, auth), not modified from Lovable

## Governance Note

This ruling resolves the final open item in Phase F.7. All three desks now have clear integration paths. Row 86 status updated from OPEN to CONFIRMED.
