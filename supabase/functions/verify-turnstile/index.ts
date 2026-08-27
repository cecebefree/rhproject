// verify-turnstile — Validate Cloudflare Turnstile CAPTCHA token
// Called from Web/Mobile app during registration form submit
// Public endpoint (no auth required — token validates itself)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY");
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

Deno.serve(async (req) => {
  if (handleCors(req)) return handleCors(req);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!TURNSTILE_SECRET_KEY) {
    console.error("[verify-turnstile] TURNSTILE_SECRET_KEY not configured");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  try {
    const { token, remoteip } = await req.json();

    if (!token || typeof token !== "string") {
      return jsonResponse({ error: "Missing or invalid token" }, 400);
    }

    // Call Cloudflare Turnstile verification API
    const formData = new URLSearchParams();
    formData.append("secret", TURNSTILE_SECRET_KEY);
    formData.append("response", token);
    if (remoteip) {
      formData.append("remoteip", remoteip);
    }

    const cfResponse = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const result = await cfResponse.json();

    if (!result.success) {
      console.error("[verify-turnstile] Verification failed:", result["error-codes"]);
      return jsonResponse({
        success: false,
        error_codes: result["error-codes"] || ["unknown"],
      }, 403);
    }

    return jsonResponse({
      success: true,
      challenge_ts: result.challenge_ts,
      hostname: result.hostname,
      error_codes: [],
    });
  } catch (err) {
    console.error("[verify-turnstile] Error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
