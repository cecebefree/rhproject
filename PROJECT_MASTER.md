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
| Blocker 2 — Tenant Isolation | 🔴 OPEN | — | Pending |
