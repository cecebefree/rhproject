# Office Desk Edge Functions — Deployment Guide

## 1. Environment Variables Checklist

Set these in Supabase Dashboard → Settings → Edge Functions → Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Auto | Project URL (auto-set) |
| `SUPABASE_ANON_KEY` | Auto | Anon key (auto-set) |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto | Service role key (auto-set) |
| `TURNSTILE_SECRET_KEY` | Yes | Cloudflare Turnstile secret |
| `ZADARMA_USER_KEY` | Optional | Zadarma API user key (for SMS) |
| `ZADARMA_SECRET_KEY` | Optional | Zadarma API secret (for SMS) |
| `BREVO_API_KEY` | Optional | Brevo API key (for email) |

---

## 2. Deploy Functions (CLI)

```bash
# Login to Supabase
supabase login

# Link to project
supabase link --project-ref <YOUR_PROJECT_REF>

# Deploy each function
supabase functions deploy verify-turnstile --no-verify-jwt
supabase functions deploy nightly-reconciliation --no-verify-jwt
supabase functions deploy validate-toggle --no-verify-jwt
supabase functions deploy class-start-ping --no-verify-jwt
```

**Note:** `--no-verify-jwt` is used because:
- `verify-turnstile` is public (validates token itself)
- `nightly-reconciliation` and `class-start-ping` use service-role auth internally
- `validate-toggle` validates JWT internally

---

## 3. Apply Migration

```bash
# Reset local database (dev)
supabase db reset

# Or apply single migration (production)
supabase migration up --db-url postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
```

---

## 4. Schedule Cron Jobs

After deployment, enable pg_cron and schedule:

```sql
-- Enable pg_cron (if not already)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule nightly-reconciliation (00:00 UTC daily)
SELECT cron.schedule(
  'nightly-reconciliation',
  '0 0 * * *',
  $job$
  SELECT net.http_post(
    url := (SELECT current_setting('app.settings.supabase_url', true)) || '/functions/v1/nightly-reconciliation',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key', true)),
      'Content-Type', 'application/json'
    ),
    body := '{"timestamp": "' || now()::text || '"}'::jsonb
  );
  $job$
);

-- Schedule class-start-ping (every 5 minutes)
SELECT cron.schedule(
  'class-start-ping',
  '*/5 * * * *',
  $job$
  SELECT net.http_post(
    url := (SELECT current_setting('app.settings.supabase_url', true)) || '/functions/v1/class-start-ping',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key', true)),
      'Content-Type', 'application/json'
    ),
    body := '{"timestamp": "' || now()::text || '"}'::jsonb
  );
  $job$
);
```

---

## 5. Verify Deployment

```bash
# Test verify-turnstile (should return 400 without valid token)
curl -X POST https://<ref>.supabase.co/functions/v1/verify-turnstile \
  -H "Content-Type: application/json" \
  -d '{}'

# Test nightly-reconciliation (should return 401 without service role)
curl -X POST https://<ref>.supabase.co/functions/v1/nightly-reconciliation \
  -H "Content-Type: application/json" \
  -d '{}'

# Test validate-toggle (should return 401 without auth)
curl -X POST https://<ref>.supabase.co/functions/v1/validate-toggle \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 6. Files Created

| File | Purpose |
|------|---------|
| `supabase/functions/verify-turnstile/index.ts` | Turnstile CAPTCHA validation |
| `supabase/functions/nightly-reconciliation/index.ts` | Daily payment reconciliation |
| `supabase/functions/validate-toggle/index.ts` | Family access toggle (module-level) |
| `supabase/functions/class-start-ping/index.ts` | Class reminder notifications |
| `supabase/migrations/186_system_log_and_edge_functions.sql` | system_log + cron setup |
| `supabase/functions/EDGE-FUNCTION-TESTS.md` | Test cases documentation |
| `supabase/functions/DEPLOY.md` | This file |

---

## 7. Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    SCHEDULED (pg_cron)                       │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │ nightly-reconciliation│    │ class-start-ping     │         │
│  │ (00:00 UTC daily)    │    │ (every 5 min)        │         │
│  └──────────┬──────────┘    └──────────┬──────────┘         │
└─────────────┼──────────────────────────┼─────────────────────┘
              │                          │
              ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS                   │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │ verify-turnstile     │    │ validate-toggle      │         │
│  │ (public endpoint)    │    │ (authenticated)      │         │
│  └─────────────────────┘    └─────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
              │                          │
              ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE TABLES                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ family_activity│ │ notifications │ │ system_log   │         │
│  │ (audit trail)  │ │ (user-facing) │ │ (EF logs)   │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Monitoring

- Check `system_log` table for execution status
- Monitor Edge Function logs in Supabase Dashboard → Edge Functions → Logs
- Set up alerts for `status = 'error'` entries in `system_log`
