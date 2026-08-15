// create-subscription — Dual processor subscription creation (Row 27)
// POST body: { tenant_id, plan_id, processor, billing_interval }
// Creates subscription on Stripe, PayPal, or both

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET");
const PAYPAL_MODE = Deno.env.get("PAYPAL_MODE") || "sandbox";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICES: Record<string, Record<string, Record<string, number>>> = {
  starter: {
    month: { stripe: 9900, paypal: 99.00 },
    year: { stripe: 99000, paypal: 990.00 },
  },
  pro: {
    month: { stripe: 29900, paypal: 299.00 },
    year: { stripe: 299000, paypal: 2990.00 },
  },
  enterprise: {
    month: { stripe: 99900, paypal: 999.00 },
    year: { stripe: 999000, paypal: 9990.00 },
  },
};

function getPayPalBaseUrl(): string {
  return PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getPayPalAccessToken(): Promise<string> {
  const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Missing authorization", { status: 401, headers: corsHeaders });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { tenant_id, plan_id, processor, billing_interval } = body;
  if (!tenant_id || !plan_id || !processor) {
    return new Response(
      JSON.stringify({ success: false, error: "tenant_id, plan_id, and processor are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!["starter", "pro", "enterprise"].includes(plan_id as string)) {
    return new Response(
      JSON.stringify({ success: false, error: "plan_id must be starter, pro, or enterprise" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!["stripe", "paypal", "both"].includes(processor as string)) {
    return new Response(
      JSON.stringify({ success: false, error: "processor must be stripe, paypal, or both" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const interval = (billing_interval as string) || "month";
  if (!["month", "year"].includes(interval)) {
    return new Response(
      JSON.stringify({ success: false, error: "billing_interval must be month or year" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify user is admin of tenant
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.tenant_id !== tenant_id || profile.role !== "admin") {
    return new Response(
      JSON.stringify({ success: false, error: "Only tenant admins can create subscriptions" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Look up billing identity
  const { data: billingIdentity } = await supabase
    .schema("office_desk")
    .from("stripe_customers")
    .select("id, stripe_customer_id, paypal_customer_id, billing_email")
    .eq("tenant_id", tenant_id)
    .single();

  let billingEmail = billingIdentity?.billing_email;

  const results: Array<Record<string, unknown>> = [];

  // ─── STRIPE ────────────────────────────────────────────
  if (processor === "stripe" || processor === "both") {
    if (!STRIPE_SECRET_KEY) {
      results.push({ processor: "stripe", success: false, error: "STRIPE_SECRET_KEY not configured" });
    } else {
      let stripeCustomerId = billingIdentity?.stripe_customer_id;

      if (!stripeCustomerId) {
        const cParams = new URLSearchParams({ "metadata[tenant_id]": tenant_id, name: `Tenant ${tenant_id.slice(0, 8)}` });
        if (billingEmail) cParams.set("email", billingEmail);

        const cRes = await fetch("https://api.stripe.com/v1/customers", {
          method: "POST",
          headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: cParams.toString(),
        });

        if (cRes.ok) {
          const customer = await cRes.json();
          stripeCustomerId = customer.id;
          await supabase.schema("office_desk").from("stripe_customers").upsert(
            { tenant_id, stripe_customer_id: stripeCustomerId, billing_email: billingEmail || null },
            { onConflict: "tenant_id" }
          );
        } else {
          results.push({ processor: "stripe", success: false, error: "Failed to create Stripe customer" });
        }
      }

      if (stripeCustomerId) {
        const priceKey = `STRIPE_PRICE_${plan_id.toUpperCase()}_${interval.toUpperCase()}`;
        const priceId = Deno.env.get(priceKey);

        if (!priceId) {
          results.push({ processor: "stripe", success: false, error: `Missing env ${priceKey}` });
        } else {
          const subRes = await fetch("https://api.stripe.com/v1/subscriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              customer: stripeCustomerId,
              "items[0][price]": priceId,
              "metadata[tenant_id]": tenant_id,
              "metadata[plan_id]": plan_id as string,
            }).toString(),
          });

          if (subRes.ok) {
            const sub = await subRes.json();
            const amountMonthly = PLAN_PRICES[plan_id as string]?.[interval]?.stripe || 0;

            const now = new Date();
            const periodEnd = new Date(now);
            if (interval === "year") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            else periodEnd.setMonth(periodEnd.getMonth() + 1);

            await supabase.schema("office_desk").from("subscriptions").insert({
              tenant_id,
              stripe_subscription_id: sub.id,
              processor: "stripe",
              plan_id: plan_id as string,
              status: "active",
              amount_monthly: amountMonthly / 100,
              billing_interval: interval,
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
            });

            results.push({
              processor: "stripe",
              success: true,
              subscription_id: sub.id,
              status: "active",
              current_period_end: periodEnd.toISOString(),
            });
          } else {
            const err = await subRes.text();
            console.error("Stripe subscription failed:", err);
            results.push({ processor: "stripe", success: false, error: "Failed to create Stripe subscription" });
          }
        }
      }
    }
  }

  // ─── PAYPAL ────────────────────────────────────────────
  if (processor === "paypal" || processor === "both") {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      results.push({ processor: "paypal", success: false, error: "PayPal not configured" });
    } else {
      const accessToken = await getPayPalAccessToken();
      const paypalBaseUrl = getPayPalBaseUrl();

      // Create PayPal Product
      const prodRes = await fetch(`${paypalBaseUrl}/v1/catalogs/products`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `VAS Studio ${plan_id} Plan`,
          description: `${plan_id} subscription (${interval}ly)`,
          type: "SERVICE",
        }),
      });

      if (prodRes.ok) {
        const product = await prodRes.json();

        // Create PayPal Plan
        const planRes = await fetch(`${paypalBaseUrl}/v1/billing/plans`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: product.id,
            name: `${plan_id} ${interval}`,
            description: `${plan_id} subscription billed ${interval}ly`,
            billing_cycles: [{
              frequency: { interval_unit: interval === "year" ? "YEAR" : "MONTH", interval_count: 1 },
              tenure_type: "REGULAR",
              sequence: 1,
              total_cycles: 0,
              pricing_scheme: {
                fixed_price: {
                  value: String(PLAN_PRICES[plan_id as string]?.[interval]?.paypal || 99),
                  currency_code: "USD",
                },
              },
            }],
            payment_preferences: { auto_bill_outstanding_amount: true },
          }),
        });

        if (planRes.ok) {
          const paypalPlan = await planRes.json();

          // Create PayPal Subscription
          const subRes = await fetch(`${paypalBaseUrl}/v1/billing/subscriptions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              plan_id: paypalPlan.id,
              subscriber: billingEmail ? { email_address: billingEmail } : undefined,
              custom_id: tenant_id,
            }),
          });

          if (subRes.ok) {
            const sub = await subRes.json();
            const amountMonthly = PLAN_PRICES[plan_id as string]?.[interval]?.paypal || 0;

            await supabase.schema("office_desk").from("subscriptions").insert({
              tenant_id,
              paypal_plan_id: sub.id,
              processor: "paypal",
              plan_id: plan_id as string,
              status: "active",
              amount_monthly: amountMonthly,
              billing_interval: interval,
            });

            results.push({
              processor: "paypal",
              success: true,
              subscription_id: sub.id,
              status: "active",
            });
          } else {
            const err = await subRes.text();
            console.error("PayPal subscription failed:", err);
            results.push({ processor: "paypal", success: false, error: "Failed to create PayPal subscription" });
          }
        } else {
          results.push({ processor: "paypal", success: false, error: "Failed to create PayPal plan" });
        }
      } else {
        results.push({ processor: "paypal", success: false, error: "Failed to create PayPal product" });
      }
    }
  }

  return new Response(
    JSON.stringify({ success: true, subscriptions: results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
