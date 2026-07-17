# PROJECT_MASTER — rhproject-new

## Supabase Environment

CURRENT: Local-only Supabase (127.0.0.1) during Foundation phase.
FUTURE: Will connect to Supabase CLOUD at the deploy/launch phase.
Cloud secret keys (sb_secret_*) already exist on Supabase but are
UNUSED until then. When cloud is wired, the service role key goes into
the deploy secret store (Netlify/GitHub Actions), never a committed file.
Trigger to connect cloud: real users, live deploy, or shared persistent
data — not before.

---

## Blocker Log

| Blocker | Status | Date | Notes |
|---------|--------|------|-------|
| Blocker 1 — Security: exposed service role key | ✅ CLOSED | 2026-07-04 | Local-only; only demo keys in .env; .env git-ignored and never committed; .env.example placeholders only; cloud keys deferred to deploy phase |
| Blocker 2 — Tenant Isolation | ✅ CLOSED | 2026-07-04 | Phase-1 verified: 6 pgTAP test suites (33/33 PASS) assert RLS on 6 tables, profiles no-recursion, student/admin devotional isolation, admin_all bypass on 5 tenant tables, JWT hook injection. D10 closed. Migration 023 reserved for LMS tenant_id retrofit. |
| Blocker 4 — CI Hard Rule Guards | ✅ CLOSED | 2026-07-04 | 3 guards enforced: AI-import (regex, catches static/dynamic/template), cross-tenant import (relative + package refs), type-drift (live supabase gen types diff). P2-003 DONE. Variable-require gap deferred to v2 backlog. All 4 blockers closed. |

**2026-07-11 — DATABASE PHASE STAMPED:** Migration chain 013–041 clean, 152/152 pgTAP assertions green, verified on PG 17.6. Phase closed; schema changes from here require a new migration + tests (042+). Gate G0 database criteria: MET.

## P2-004a COMPLETE — Week 1 Mon (read-only pgTAP scaffold check)
- supabase/tests/: 21 pgTAP test files; canonical runner is `supabase test db` (199 assertions)
- pgtap 1.3.3 available, not installed (install deferred to P2-004b)
- stack healthy on 54321-54323
