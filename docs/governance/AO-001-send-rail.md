# AO-001 — Send-Rail Intake Architecture (Row 37)

**Ratified:** 2026-08-04 (draft, for implementation)
**Owner:** Backend Lead (under active council, Session 2026-08-04)
**Board:** PLAN-STATE.md row 37 (formerly MASTER-TODO-V2.md row 43)
**Gates:** G6 — Intake pipeline functional (submit-lead EF + leads table), row-45 acceptance checklist
**Series context:** AO-001–AO-004 are Phase G (agent-operations) Architecture Option documents.
AO-001 covers the Front Desk "send-rail" intake; AO-002 (safeguarding), AO-004 (gates)
follow. Follows same format as AO-005 (docs/governance/AO-005-dpia-disclosures.md).

---

## Purpose

"Send-rail" is the Front Desk intake surface — the registration form rail where
parents/caregivers submit an enquiry that becomes a `leads` row. AO-001 documents
the architecture binding the Lovable-built web intake form to the Supabase Edge
Function + `leads` table, the parent confirmation obligation, and the security
model (Turnstile, origin allowlisting, tenant scoping).

The intake form is **unauthenticated** — it is the ONLY public write path into
the database. All subsequent pipeline mutations (Front Desk lead management,
Office Desk core status transitions) are authenticated and EF-mediated.

> **Reference:** docs/spec/front-desk-registration.md §4 (Intake Channel),
> §2 (Write Authority), §6 (Open Items). Item 23 (ITEM-23-DEP-A/B/C) spans
> migration 078, 079, and the submit-lead EF.

---

## 1. Architecture

### Data flow

```
Parent browser (Lovable web)
    │
    │ POST /functions/v1/submit-lead
    │ Body: { name, email, phone?, message?, tenant, turnstileToken }
    │ Header: Origin = intake page domain
    │
    ▼
submit-lead Edge Function (supabase/functions/submit-lead/index.ts)
    │  1. OPTIONS → 204, non-POST → 405
    │  2. Validate JSON body, reject unknown keys (400)
    │  3. Verify Turnstile token → Cloudflare siteverify (403 on failure)
    │  4. Validate name (1–120 chars), email (regex, 254 max), phone (optional)
    │  5. Resolve tenant slug → tenant_devotional.id (400 if inactive/deleted)
    │  6. Check email_is_registered RPC (079) → existing_profile flag
    │  7. INSERT into public.leads (service_role bypasses RLS/078)
    │  8. Return { status: "received" } (201)
    │
    ▼
public.leads (migration 078, RLS default-deny)
    │  - No SELECT/UPDATE/DELETE policies yet (ships with Front Desk read EF)
    │  - service_role INSERT only (granted in 078)
    │  - existing_profile boolean (079) flags pre-existing auth accounts
    │
    ▼
Front Desk console (v5 row 41) reads leads via future read EF
    → assigns status: enquiry → qualified → invoiced → converted
```

### Components

| Component | File/Location | Status |
|---|---|---|
| `submit-lead` EF | `supabase/functions/submit-lead/index.ts` | **Deployed** — Contract V2, 169 lines |
| `leads` table | `supabase/migrations/078_leads_table.sql` | **Deployed** — UUID PK, tenant FK, RLS default-deny |
| `existing_profile` flag | `supabase/migrations/079_leads_existing_profile_flag.sql` | **Deployed** — `email_is_registered` RPC, service_role-only |
| `error-envelope` shared | `supabase/functions/_shared/error-envelope.ts` | **Deployed** — `failLoud()`, ErrorPayload { error, detail? } |
| CORS self-contained | `submit-lead/index.ts` (lines 27-37) | **Deployed** — origin allowlist, NOT using wildcard `_shared/cors.ts` |
| Turnstile verifier | `submit-lead/index.ts` (lines 48-68) | **Inlined** — `_shared/turnstile.ts` does not exist (probe-verified) |

### Key design decisions

1. **No `_shared/cors.ts` usage (divergence, ruled 2026-07-27):** The wildcard
   origin + blanket method list in `_shared/cors.ts` violates Contract V2.
   `submit-lead` self-contains a strict origin allowlist via
   `SUBMIT_LEAD_ALLOWED_ORIGINS` env var and `POST, OPTIONS` only.

2. **No `_shared/turnstile.ts` (gap, probe-verified 2026-07-27):** Turnstile
   verification is inlined at `submit-lead/index.ts:48-68`. A shared module
   should be extracted when additional public EFs are added.

3. **`email_is_registered` (079):** Security-definer SQL function with
   `search_path = ''`. Grants revoked from PUBLIC/anon/authenticated;
   execute granted to `service_role` only. Returns true for ANY live
   (non-deleted) auth account, not only approved profiles.

4. **`existing_profile` flag never exposed to submitter:** `leads` has no
   SELECT policies (default-deny); only the EF inserts via service_role.
   The flag is internal-only for Front Desk triage.

5. **Tenant resolution is slug-based:** The web form sends a `tenant` slug;
   the EF maps it to `tenant_devotional.id` where `is_active = true` and
   `deleted_at IS NULL`. Invalid slugs → 400 `invalid_tenant`.

6. **Error envelope uniformity:** All responses use `{ error: string, detail?: string }`
   matching `_shared/error-envelope.ts` `ErrorPayload`, despite the CORS divergence.

### HTTP response matrix

| Method | Origin | Body | Token | Result | Code |
|---|---|---|---|---|---|
| OPTIONS | any | — | — | Preflight | 204 |
| GET/PUT/DELETE | any | — | — | — | 405 `method_not_allowed` |
| POST | non-allowlisted | valid | valid | — | 403 `turnstile_verification_failed` |
| POST | allowlisted | invalid JSON | — | — | 400 `invalid_json` |
| POST | allowlisted | unknown key | — | — | 400 `unknown_field` |
| POST | allowlisted | missing token | — | — | 400 `turnstile_token_required` |
| POST | allowlisted | bad name/email/phone | valid | — | 400 `invalid_name`/`invalid_email`/`invalid_phone` |
| POST | allowlisted | valid | valid | bad tenant | 400 `invalid_tenant` |
| POST | allowlisted | valid | valid | valid | **201 `{ status: "received" }`** |
| POST | allowlisted | valid | valid | DB error | 500 `lead_insert_failed` |

---

## 2. Parent Confirmation (OPEN)

### Current state

The `submit-lead` EF returns `{ status: "received" }` (201) but does **not**
send any parent confirmation. The `docs/planning/backend-task-plan.md:124-126`
references a notification subsystem for enrolment flows, but no
confirmation EF exists.

### Acceptance criteria (G6)

- [x] `submit-lead` EF deployed and returns 201 on valid submission
- [x] `lead` row lands in `public.leads` with correct `tenant_id` (slug resolved)
- [x] Turnstile token verified server-side via Cloudflare API
- [ ] **Parent receives confirmation** — email/SMS sent after INSERT succeeds
      (see §4 Open Items)

### Parent confirmation design (to be resolved with AO-004)

The confirmation obligation is currently unimplemented. It requires either:
1. A dedicated EF (`send-confirmation`) triggered after successful INSERT, or
2. `submit-lead` invoking a notification RPC within the same transaction, or
3. A `leads.status = 'enquiry'` → `leads.status = 'notification_sent'`
   EF flow with a cron trigger.

The choice depends on AO-004 (gates.md) ratification, which formalises the
notification/confirmation gate contracts. AO-001 defers this to row 40
(AO-004).

---

## 3. Security Model

### Threat surface

`submit-lead` is the **only unauthenticated EF**. It must:
- Verify human origin (Cloudflare Turnstile)
- Prevent cross-origin abuse (Origin allowlist, not wildcard)
- Reject unknown payload fields (strict key allowlist)
- Scope to tenant (slug → tenant_devotional.id, is_active + deleted_at checks)
- Never expose `existing_profile` to the submitter (no SELECT policy)

### RLS posture

`public.leads` (078): `ENABLE ROW LEVEL SECURITY`. No SELECT/UPDATE/DELETE
policies defined. `service_role` INSERT granted. This is intentional —
Front Desk read access ships with a future read EF (deferred to v5 row 41).
The default-deny posture means no anonymous or authenticated user can
read leads except via service_role (the EF).

### Secrets

| Secret | Used by | Path |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | `submit-lead` EF | `supabase/functions/.env` (test key for E2E; prod key per row 9) |
| `SUBMIT_LEAD_ALLOWED_ORIGINS` | `submit-lead` EF | Supabase secrets — comma-separated origin allowlist |
| `SUPABASE_URL` | `submit-lead` EF | auto-injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | `submit-lead` EF | auto-injected by Supabase runtime |

> **CF-12:** Production TURNSTILE_SECRET_KEY remains open under row 9.
> The test key (`1x00000000000000000000AA`) is present in `.env` for E2E.

### Constitution alignment

| Principle | Status | Notes |
|---|---|---|
| I. Multi-Surface, Single Backend | PASS | Web intake → shared Supabase `leads` table |
| II. AI Isolation | PASS | No AI imports in submit-lead |
| III. Tenant Isolation | PASS | `tenant_id` FK to `tenant_devotional`, slug-resolved per request |
| IV. Type Safety | PASS | `email_is_registered` typed RPC; TypeScript body validation |
| V. RLS-First Security | PASS | `leads` RLS default-deny; EF inserts via service_role |

---

## 4. Open Items

| Item | Owner | Detail |
|---|---|---|
| Parent confirmation | AO-004 (Gates) | Email/SMS confirmation flow not yet designed. Blocked on AO-004 gate contracts. |
| `_shared/turnstile.ts` extraction | Tech Debt | Turnstile verification inlined in submit-lead; extract when 2nd public EF needed. |
| Front Desk read EF | Row 41 (v5) | SELECT policies for leads deferred to Front Desk console build. |
| Mock-payment trigger | front-desk-registration.md §6 | Lead→registration conversion trigger simulated for demo (deferred to row 41). |
| `leads` status pipeline | Front Desk v5 | `enquiry → qualified → invoiced → converted` transitions need EF mediation (write authority rule §2). |
| Lead table schema finalization | front-desk-registration.md §6 | Schema is locked at 078/079; full column set may expand pre-v5. |

---

## 5. Acceptance Criteria (G6)

| # | Criterion | Evidence |
|---|---|---|
| G6-1 | `submit-lead` EF returns 201 on valid payload | `submit-lead/index.ts:168` |
| G6-2 | Lead row lands in `public.leads` with correct `tenant_id` | `submit-lead/index.ts:157-164` + `078_leads_table.sql:8-19` |
| G6-3 | Turnstile token verified server-side | `submit-lead/index.ts:48-68` (Cloudflare /siteverify) |
| G6-4 | Origin allowlisted (non-wildcard) | `submit-lead/index.ts:27-37` + `SUBMIT_LEAD_ALLOWED_ORIGINS` env |
| G6-5 | Unknown fields rejected (400) | `submit-lead/index.ts:88-90` (ALLOWED_KEYS) |
| G6-6 | Tenant slug resolves to active, non-deleted tenant | `submit-lead/index.ts:139-149` |
| G6-7 | Parent confirmation sent | DEFERRED to AO-004 |

**Status:** G6-1 through G6-6 IMPLEMENTED. G6-7 DEFERRED.
Row 22 (AO-000 EF scaffolding) — CLOSED. This gate is satisfied for implementation.

(End of AO-001 v1)
