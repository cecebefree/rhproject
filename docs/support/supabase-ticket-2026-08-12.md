# Supabase Support Ticket — 2026-08-12 — Project ebptjjsmeltykqqvcvqo

---

**PostgREST schema cache stuck on public schema despite correct config — custom schemas not loading**

---

**Project:** `ebptjjsmeltykqqvcvqo` (eu-west-1)
**Related:** [github.com/supabase/supabase/issues/45904](https://github.com/supabase/supabase/issues/45904)

**Problem:** PostgREST exposes only `public` schema (47 paths, title "standard public schema"). Three custom schemas (`school_desk`, `front_desk`, `office_desk`) exist in the database with tables and data, but PostgREST does not load them. The Management API config correctly shows `db_schema: "public,graphql_public,school_desk,front_desk,office_desk"`.

**Evidence — all attempted in order:**
1. `supabase config push` via CLI — config stored correctly
2. Management API PATCH `/v1/projects/.../postgrest` — confirmed correct `db_schema` value
3. `ALTER ROLE authenticator SET pgrst.db_schemas = '...'` — applied in database, verified in `pg_db_role_setting`
4. Created `postgrest.pre_config()` function with `set_config('pgrst.db_schemas', ...)` — created with correct permissions
5. Pause/restore cycle — completed 5 full cycles
6. Dashboard SQL Editor: `NOTIFY pgrst, 'reload schema';` — executed directly, "Success. No rows returned"

**Verification (2026-08-12 06:45 UTC):**
```
curl -s "https://ebptjjsmeltykqqvcvqo.supabase.co/rest/v1/" \
  -H "apikey: [REDACTED]" | grep -o "school_desk\|front_desk\|office_desk"
```
Output: (empty — no matches)

**Current state:** PostgREST REST API returns 47 paths, all public schema only. Zero paths for `school_desk`, `front_desk`, or `office_desk`. `content-profile: public` confirmed in response headers.

**Ask:** Please trigger a server-side PostgREST process restart or schema cache reload for project `ebptjjsmeltykqqvcvqo`. All standard client-side reload mechanisms have been exhausted without effect. This appears to be the same platform-level issue documented in [#45904](https://github.com/supabase/supabase/issues/45904).
