# Stripe + PayPal Account Setup & Webhook Configuration Guide

**Row:** 82
**Date:** 2026-08-17
**Related EF:** `website-lead-to-registration` (Row 81)
**Migration:** `148_website_lead_to_registration_edge_function.sql`

---

## Overview

This guide covers the account setup and webhook configuration for the dual payment processor integration used by the `website-lead-to-registration` Edge Function. Both Stripe and PayPal are supported — users select their preferred method at the Lovable registration form.

---

## Stripe Setup

### 1. Create Account
- Go to [stripe.com](https://stripe.com) and create an account
- Complete business verification for live mode

### 2. Get API Keys
- Navigate to **Developers > API keys**
- Copy the following:
  - **STRIPE_SECRET_KEY** — Secret key (`sk_test_...` for sandbox, `sk_live_...` for production)
  - **STRIPE_PUBLISHABLE_KEY** — Publishable key (`pk_test_...` or `pk_live_...`)

### 3. Create Webhook Endpoint
- Navigate to **Developers > Webhooks**
- Click **Add endpoint**
- Set the endpoint URL:
  ```
  https://[YOUR_SUPABASE_URL]/functions/v1/website-lead-payment-webhook
  ```
  Replace `[YOUR_SUPABASE_URL]` with your Supabase project URL (e.g., `https://xyzcompany.supabase.co`)

### 4. Subscribe to Events
- Select the following event types:
  - `payment_intent.succeeded`
  - `charge.dispute.created`
- Note: The function also handles `checkout.session.completed` for Stripe Checkout flows

### 5. Get Webhook Signing Secret
- After creating the webhook, click on it to reveal the **Signing secret**
- Copy the **STRIPE_WEBHOOK_SECRET** (`whsec_...`)

### 6. Add to Environment
- Add to `supabase/functions/.env`:
  ```
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```

---

## PayPal Setup

### 1. Create Developer Account
- Go to [developer.paypal.com](https://developer.paypal.com) and create an account
- Complete business verification for live mode

### 2. Create REST App
- Navigate to **Apps & Credentials**
- Click **Create App**
- Name the app (e.g., `Redhouse Registration`)
- Copy the following:
  - **PAYPAL_CLIENT_ID** — Client ID
  - **PAYPAL_CLIENT_SECRET** — Secret (switch to Live tab for production keys)

### 3. Create Webhook
- Navigate to your app > **Webhooks** > **Create Webhook**
- Set the webhook URL:
  ```
  https://[YOUR_SUPABASE_URL]/functions/v1/website-lead-payment-webhook
  ```
- Select the following event types:
  - `CHECKOUT.ORDER.APPROVED`
  - `CHECKOUT.ORDER.COMPLETED`
- Copy the **PAYPAL_WEBHOOK_ID** after creation

### 4. Add to Environment
- Add to `supabase/functions/.env`:
  ```
  PAYPAL_CLIENT_ID=...
  PAYPAL_CLIENT_SECRET=...
  PAYPAL_WEBHOOK_ID=...
  PAYPAL_MODE=sandbox
  ```
- Change `PAYPAL_MODE` to `live` when ready for production

---

## Environment Variables Checklist

| Variable | Value | Source |
|----------|-------|--------|
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | Stripe Dashboard > API Keys |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` | Stripe Dashboard > API Keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Dashboard > Webhooks > Signing secret |
| `PAYPAL_CLIENT_ID` | `...` | PayPal Developer > Apps & Credentials |
| `PAYPAL_CLIENT_SECRET` | `...` | PayPal Developer > Apps & Credentials |
| `PAYPAL_WEBHOOK_ID` | `...` | PayPal Developer > Webhooks |
| `PAYPAL_MODE` | `sandbox` or `live` | Set to `sandbox` for testing |
| `SITE_URL` | `https://[your-domain]` | Your production or staging domain |

---

## Testing

### Stripe Local Testing
1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhook events locally:
   ```bash
   stripe listen --forward-to localhost:54321/functions/v1/website-lead-payment-webhook
   ```
4. Copy the webhook signing secret from the CLI output (starts with `whsec_`)
5. Test with Stripe Dashboard > Webhooks > Send test webhook

### PayPal Sandbox Testing
1. Use PayPal Sandbox environment (default: `PAYPAL_MODE=sandbox`)
2. Create sandbox accounts in PayPal Developer Dashboard
3. Test order creation and webhook delivery via PayPal Dashboard > Webhooks > Events

### Verification
- Check Edge Function logs in Supabase Dashboard > Edge Functions > website-lead-to-registration
- Verify webhook events appear in Stripe Dashboard > Webhooks > Events
- Verify webhook events appear in PayPal Dashboard > Webhooks > Events
- Confirm `office_desk.registrations` rows are created after successful payment
- Confirm `public.website_leads` records are archived with `archive_reason = 'converted_to_registration'`

---

## Deployment Checklist

1. **Set all secrets** in Supabase Dashboard > Project Settings > Secrets
2. **Run migration:**
   ```bash
   supabase db push
   # or
   supabase migration up
   ```
3. **Deploy Edge Function:**
   ```bash
   supabase functions deploy website-lead-to-registration
   ```
4. **Update webhook URLs** in Stripe/PayPal dashboards to point to production URL
5. **Test webhook delivery** in both Stripe and PayPal dashboards
6. **Monitor logs** for 24 hours post-launch
7. **Switch to live keys** when ready (update secrets in Supabase dashboard)

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Webhook returns 401 | Invalid signature | Verify `STRIPE_WEBHOOK_SECRET` or `PAYPAL_WEBHOOK_ID` match dashboard values |
| Webhook returns 500 | DB function error | Check `archive_lead_and_create_registration` exists and has correct grants |
| Lead archived but no registration | Function partial failure | Check Supabase logs for the specific error |
| Stripe session creation fails | Invalid API key | Verify `STRIPE_SECRET_KEY` starts with `sk_test_` or `sk_live_` |
| PayPal order creation fails | Invalid credentials | Verify `PAYPAL_CLIENT_ID` and `PAYPAL_SECRET` are correct for the mode |
| Redirect URL incorrect | `SITE_URL` not set | Set `SITE_URL` in environment to your domain |

---

## Security Notes

- Never commit secrets to git — use `.env` and Supabase Dashboard secrets
- Stripe/PayPal webhooks are verified by signature before processing
- The Edge Function runs with `verify_jwt = false` (webhooks don't have JWT)
- All DB operations use `service_role` key with `SECURITY DEFINER` functions
- Test in sandbox/staging before production deployment
