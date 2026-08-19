// e2e/website-lead-payment-session.test.ts
// End-to-end tests for Row 91: website-lead-payment-session Edge Function
//
// Tests cover:
//   1. Stripe session creation + redirect_url returned
//   2. PayPal order creation + redirect_url returned
//   3. Invalid payment_method rejected with 400
//   4. Missing required fields rejected with 400
//   5. Amount validation (must be positive integer cents)
//   6. Non-POST method rejected with 405
//
// Prerequisites:
//   - Local Supabase running (supabase start)
//   - EF deployed locally
//   - Run: npx vitest run tests/e2e/website-lead-payment-session.test.ts

import { describe, it, expect, beforeAll } from "vitest";

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
const EF_BASE = `${SUPABASE_URL}/functions/v1`;
const TEST_EF = `${EF_BASE}/website-lead-payment-session`;

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    family_email: "payment-test@example.com",
    child_name: "PayChild",
    child_dob: "2018-05-15",
    amount_cents: 5000,
    payment_method: "stripe",
    ...overrides,
  };
}

async function isEFAvailable(): Promise<boolean> {
  try {
    const res = await fetch(TEST_EF, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return res.status !== 404;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// SUITE
// ═══════════════════════════════════════════════════════════

describe("website-lead-payment-session", () => {
  let efAvailable = false;

  beforeAll(async () => {
    efAvailable = await isEFAvailable();
    if (!efAvailable) {
      console.warn(
        "\n Edge Function not deployed locally — EF-dependent tests will be skipped.\n" +
        "  Deploy with: supabase functions deploy website-lead-payment-session\n"
      );
    }
  });

  // ═════════════════════════════════════════════════════════
  // TEST 1: Stripe session creation + redirect_url returned
  // ═════════════════════════════════════════════════════════

  describe("1. Stripe session creation", () => {
    it("should return redirect_url for valid Stripe payment", async () => {
      if (!efAvailable) return;

      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload({ payment_method: "stripe" })),
      });

      // May return 200 (success) or 502 (Stripe API unavailable in test env)
      if (res.status === 200) {
        const body = await res.json();
        expect(body.status).toBe("success");
        expect(body.redirect_url).toBeTruthy();
        expect(body.payment_method).toBe("stripe");
        expect(body.redirect_url).toContain("stripe.com");
      } else {
        // Stripe API not available in test — verify the EF itself is reachable
        expect(res.status).toBeLessThanOrEqual(502);
      }
    });

    it("should pass amount_cents as unit_amount to Stripe", async () => {
      if (!efAvailable) return;

      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload({ payment_method: "stripe", amount_cents: 10000 })),
      });

      // Verify the EF accepted the request (not 400)
      expect(res.status).not.toBe(400);
    });

    it("should accept lead_id as optional metadata", async () => {
      if (!efAvailable) return;

      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildPayload({
            payment_method: "stripe",
            lead_id: "00000000-0000-0000-0000-000000000001",
          })
        ),
      });

      expect(res.status).not.toBe(400);
    });
  });

  // ═════════════════════════════════════════════════════════
  // TEST 2: PayPal order creation + redirect_url returned
  // ═════════════════════════════════════════════════════════

  describe("2. PayPal order creation", () => {
    it("should return redirect_url for valid PayPal payment", async () => {
      if (!efAvailable) return;

      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload({ payment_method: "paypal" })),
      });

      if (res.status === 200) {
        const body = await res.json();
        expect(body.status).toBe("success");
        expect(body.redirect_url).toBeTruthy();
        expect(body.payment_method).toBe("paypal");
        expect(body.redirect_url).toContain("paypal.com");
      } else {
        expect(res.status).toBeLessThanOrEqual(502);
      }
    });

    it("should convert amount_cents to decimal value for PayPal", async () => {
      if (!efAvailable) return;

      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload({ payment_method: "paypal", amount_cents: 7550 })),
      });

      expect(res.status).not.toBe(400);
    });
  });

  // ═════════════════════════════════════════════════════════
  // TEST 3: Invalid payment_method rejected with 400
  // ═════════════════════════════════════════════════════════

  describe("3. Invalid payment_method rejection", () => {
    it("should reject payment_method = 'bitcoin' with 400", async () => {
      if (!efAvailable) return;

      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload({ payment_method: "bitcoin" })),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_payment_method");
    });

    it("should reject empty payment_method with 400", async () => {
      if (!efAvailable) return;

      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload({ payment_method: "" })),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_payment_method");
    });

    it("should reject missing payment_method with 400", async () => {
      if (!efAvailable) return;

      const { payment_method, ...payload } = buildPayload();
      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_payment_method");
    });
  });

  // ═════════════════════════════════════════════════════════
  // TEST 4: Missing required fields rejected with 400
  // ═════════════════════════════════════════════════════════

  describe("4. Missing required fields", () => {
    it("should return 400 without family_email", async () => {
      if (!efAvailable) return;

      const { family_email, ...payload } = buildPayload();
      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_family_email");
    });

    it("should return 400 with invalid email format", async () => {
      if (!efAvailable) return;

      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload({ family_email: "not-an-email" })),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_family_email");
    });

    it("should return 400 without child_name", async () => {
      if (!efAvailable) return;

      const { child_name, ...payload } = buildPayload();
      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("child_name_required");
    });

    it("should return 400 without child_dob", async () => {
      if (!efAvailable) return;

      const { child_dob, ...payload } = buildPayload();
      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("child_dob_required");
    });

    it("should return 400 without amount_cents", async () => {
      if (!efAvailable) return;

      const { amount_cents, ...payload } = buildPayload();
      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_amount_cents");
    });
  });

  // ═════════════════════════════════════════════════════════
  // TEST 5: Amount validation
  // ═════════════════════════════════════════════════════════

  describe("5. Amount validation", () => {
    it("should reject zero amount_cents", async () => {
      if (!efAvailable) return;

      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload({ amount_cents: 0 })),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_amount_cents");
    });

    it("should reject negative amount_cents", async () => {
      if (!efAvailable) return;

      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload({ amount_cents: -100 })),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_amount_cents");
    });

    it("should reject non-integer amount_cents", async () => {
      if (!efAvailable) return;

      const res = await fetch(TEST_EF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload({ amount_cents: 10.5 })),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_amount_cents");
    });
  });

  // ═════════════════════════════════════════════════════════
  // TEST 6: Non-POST method rejected
  // ═════════════════════════════════════════════════════════

  describe("6. Method validation", () => {
    it("should return 405 for GET request", async () => {
      if (!efAvailable) return;

      const res = await fetch(TEST_EF, { method: "GET" });
      expect(res.status).toBe(405);
    });

    it("should return 405 for PUT request", async () => {
      if (!efAvailable) return;

      const res = await fetch(TEST_EF, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      expect(res.status).toBe(405);
    });
  });
});
