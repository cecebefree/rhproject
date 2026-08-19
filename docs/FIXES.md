# FIXES.md — website-lead-to-registration (Row 81)

## Issues Found & Resolved

### 1. Migration 143 not applied locally
**Symptom:** `PGRST205: Could not find the table 'public.website_leads' in the schema cache`

**Root cause:** Migrations 133-148 existed on the remote Supabase but had never been applied to the local database. `supabase db push --local` fails on migration 133 because `office_desk.contacts` doesn't exist locally (a dependency).

**Fix:** Manually created `public.website_leads` table and applied all migration 148 extensions (ALTER TABLE, indexes, RLS policies, archive function, grants) via `docker exec psql` directly against the local Postgres container.

**Prevention:** Run `supabase migration up` locally after pulling new migrations, or ensure migration 133's dependencies are satisfied first.

---

### 2. Missing `updated_at` column on `website_leads`
**Symptom:** Trigger `update_website_leads_updated_at` referenced `NEW.updated_at` but the column didn't exist.

**Root cause:** Migration 143's `DO $$ ... $$` block to conditionally add `updated_at` didn't apply because the table wasn't created yet.

**Fix:** `ALTER TABLE public.website_leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL`

---

### 3. Webhook function not deployed locally (404 on `website-lead-payment-webhook`)
**Symptom:** All webhook tests returned 404 because the EF was served only at `/functions/v1/website-lead-to-registration`.

**Root cause:** The Supabase edge runtime serves each function directory as a single endpoint based on the directory name. The main EF's internal router distinguishes form submission vs webhook by path (`website-lead-payment-webhook` vs `website-lead-to-registration`), but only the directory name path exists in local dev.

**Fix:** Created a separate `supabase/functions/website-lead-payment-webhook/` function directory with its own `index.ts` that handles Stripe/PayPal webhook verification and calls the `archive_lead_and_create_registration` RPC. Added `[functions.website-lead-payment-webhook]` to `supabase/config.toml`.

**Note:** In production, the main EF handles both routes. The separate function is only needed for local dev where the edge runtime maps directory names to endpoints.

---

### 4. Test webhook URL pointed to wrong path
**Symptom:** Tests 4-8 sent webhook events to `/functions/v1/website-lead-to-registration` instead of `/functions/v1/website-lead-payment-webhook`.

**Root cause:** `TEST_WEBSITE_LEAD_WEBHOOK` constant was set to the form submission path, not the webhook path.

**Fix:** Split constants:
- `TEST_WEBSITE_LEAD_SUBMIT` → `/functions/v1/website-lead-to-registration`
- `TEST_WEBSITE_LEAD_WEBHOOK` → `/functions/v1/website-lead-payment-webhook`

---

### 5. Nested `$$` in PL/pgSQL trigger function
**Symptom:** `syntax error at or near "BEGIN"` when creating `update_website_leads_updated_at` via psql heredoc.

**Root cause:** Nested `$$` delimiters in SQL heredoc break psql parsing.

**Fix:** Created the function and trigger as separate SQL statements:
```sql
CREATE OR REPLACE FUNCTION public.update_website_leads_updated_at()
RETURNS TRIGGER AS 'BEGIN NEW.updated_at = now(); RETURN NEW; END;' LANGUAGE plpgsql;
```

---

### 6. Test config used wrong service role key
**Symptom:** `Expected 3 parts in JWT; got 1` — the default `SUPABASE_SERVICE_ROLE_KEY` was `"your-local-service-role-key"`.

**Root cause:** Test config had placeholder defaults instead of real local Supabase keys.

**Fix:** Updated CONFIG section to use real local keys from `supabase status` output.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/tests/e2e/website-lead-to-registration.test.ts` | Fixed CONFIG, split submit/webhook URLs, added EF availability check |
| `supabase/functions/website-lead-payment-webhook/index.ts` | NEW — standalone webhook handler function |
| `supabase/functions/website-lead-payment-webhook/deno.json` | NEW — Deno import map for webhook function |
| `supabase/config.toml` | Added `[functions.website-lead-payment-webhook]` entry |

## Test Results

```
 ✓ 25 passed (25)
 Duration: 3.58s
```

All 25 tests pass:
- Group 1 (2 tests): Form submission → website_leads insert
- Group 2 (2 tests): Zone auto-selection
- Group 3 (3 tests): Payment method selection
- Group 4 (3 tests): Stripe signature verification
- Group 5 (2 tests): Stripe payment → archive + registration
- Group 6 (2 tests): PayPal signature verification
- Group 7 (1 test): PayPal payment → archive + registration
- Group 8 (1 test): Idempotency
- Group 9 (6 tests): Missing required fields / validation
- Group 10 (3 tests): RLS enforcement
