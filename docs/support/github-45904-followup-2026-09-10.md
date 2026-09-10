# GitHub #45904 Follow-Up — 2026-09-10 — Project ebptjjsmeltykqqvcvqo

---

**Follow-up** on [github.com/supabase/supabase/issues/45904](https://github.com/supabase/supabase/issues/45904) — original comment 2026-08-12.

**Project:** `ebptjjsmeltykqqvcvqo` (eu-west-1, Free plan)
**Organization:** `cecebefree`

---

**Status update:** This issue persists ~1 month after initial report. PostgREST still stuck on `public` schema only.

**What's new since 2026-08-12:**
- Continued development with schema-qualified queries (all EFs now use `school_desk.*`, `front_desk.*`, `office_desk.*`)
- Migration 20260910010000 applied successfully (FK cascade fix)
- 26 Edge Functions deployed and active
- All client-side reload mechanisms reattempted multiple times — no change

**Current verification (2026-09-10):**
```
curl -s "https://ebptjjsmeltykqqvcvqo.supabase.co/rest/v1/" \
  -H "apikey: <anon_key>" | grep -o "school_desk\|front_desk\|office_desk"
# Output: (empty — no matches)
```

**Impact:** All server-side operations (EFs, RPCs) work correctly with schema-qualified queries via service_role. Client-side PostgREST queries from the browser/app are limited to `public` schema only. This blocks direct client reads from `school_desk`, `front_desk`, and `office_desk` tables.

**Ask:** A server-side PostgREST restart or cache invalidation for project `ebptjjsmeltykqqvcvqo`. All standard client-side mechanisms have been exhausted.

Happy to provide any additional diagnostic information.
