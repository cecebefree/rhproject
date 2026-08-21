/**
 * Payment Webhook Handler
 * =======================
 * Endpoint: POST /api/webhooks/payment?provider=stripe|payfast
 *
 * Handles incoming payment provider webhooks with:
 *   - Provider-specific signature verification (Stripe HMAC-SHA256, PayFast MD5)
 *   - Idempotency via webhook_id (same event processed only once)
 *   - Supabase RPC call to process_webhook_safe() for DB processing
 *   - Structured error handling with audit logging
 *
 * ENVIRONMENT VARIABLES REQUIRED:
 *   STRIPE_WEBHOOK_SECRET       - Stripe webhook signing secret (whsec_...)
 *   PAYFAST_PASSPHRASE          - PayFast ITN passphrase (from dashboard)
 *   NEXT_PUBLIC_SUPABASE_URL    - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY   - Service role key (bypasses RLS)
 *
 * @module app/api/webhooks/payment
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// TYPESCRIPT INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Stripe Charge object (subset of fields we use)
 * @see https://docs.stripe.com/api/charges/object
 */
interface StripeCharge {
  id: string;                    // "ch_..." - charge ID (idempotency key)
  object: 'charge';
  amount: number;                // Amount in cents (e.g. 500000 = R5000.00)
  currency: string;              // "zar"
  status: 'succeeded' | 'failed' | 'pending';
  metadata: {
    student_id?: string;         // UUID of the student
    [key: string]: unknown;
  };
}

/**
 * PayFast ITN (Instant Transaction Notification) payload
 * @see https://sandbox.payfast.co.za/eng/process/managed/test-itn
 */
interface PayFastITN {
  m_payment_id: string;          // Unique payment ID (idempotency key)
  m_amount_gross: string;        // Amount in Rands (e.g. "5000.00")
  m_amount_fee: string;          // PayFast fee
  m_amount_net: string;          // Net amount
  custom_str1: string;           // Student UUID (passed via custom_str1)
  payment_status: 'COMPLETE' | 'FAILED' | 'PENDING' | 'CANCELLED';
  merchant_id: string;           // PayFast merchant ID
  signature?: string;            // MD5 signature for verification
  [key: string]: unknown;        // Other PayFast fields
}

/**
 * Webhook processing result from Supabase RPC
 */
interface WebhookResult {
  success: boolean;
  message: string;
  status_code?: number;
  payment_id?: string;
  student_id?: string;
  webhook_id?: string;
}

/**
 * Audit log entry for webhook failures
 */
interface AuditEntry {
  provider: string;
  webhook_id?: string;
  student_id?: string;
  amount?: number;
  error: string;
  error_code?: string;
  timestamp: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE ?? '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// ══════════════════════════════════════════════════════════════════════════════
// SIGNATURE VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Verify Stripe webhook signature (HMAC-SHA256)
 *
 * Stripe sends the signature in the stripe-signature header:
 *   "t=1234567890,v1=abcdef1234567890..."
 *
 * We compute HMAC-SHA256(payload, secret) and compare to v1.
 *
 * @param payloadRaw - Raw request body string
 * @param signature - Value from stripe-signature header
 * @param secret - Webhook signing secret (whsec_...)
 * @returns true if signature is valid
 */
function verifyStripeSignature(
  payloadRaw: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;

  try {
    const v1Match = signature.match(/v1=([a-f0-9]+)/);
    if (!v1Match) return false;

    const expectedSignature = v1Match[1];

    const computed = crypto
      .createHmac('sha256', secret)
      .update(payloadRaw, 'utf8')
      .digest('hex');

    if (computed.length !== expectedSignature.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  } catch {
    return false;
  }
}

/**
 * Verify PayFast ITN signature (MD5)
 *
 * PayFast signature = MD5(passphrase + query_string + passphrase)
 * The passphrase is configured in PayFast dashboard settings.
 *
 * @param payloadRaw - Raw request body (URL-encoded form data)
 * @param signature - MD5 hash from PayFast
 * @param passphrase - PayFast passphrase from environment
 * @returns true if signature is valid
 */
function verifyPayFastSignature(
  payloadRaw: string,
  signature: string,
  passphrase: string,
): boolean {
  if (!signature || !passphrase) return false;

  try {
    const computed = crypto
      .createHash('md5')
      .update(passphrase + payloadRaw + passphrase)
      .digest('hex');

    return computed === signature;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Log webhook failure to Supabase audit_log table
 * Used when signature verification fails or processing errors occur.
 */
async function logWebhookError(
  supabase: ReturnType<typeof createClient>,
  entry: AuditEntry,
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      table_name: 'payment_webhooks',
      operation: entry.error_code ?? 'WEBHOOK_ERROR',
      new_values: entry,
      user_id: null,
    });
  } catch (err) {
    console.error('[Webhook] Failed to log audit entry:', err);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYLOAD EXTRACTION (Provider-Specific)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Extract common fields from Stripe charge payload
 * Stripe amount is in cents - divide by 100 for ZAR
 */
function extractStripePayload(charge: StripeCharge) {
  return {
    webhook_id: charge.id,
    student_id: charge.metadata?.student_id,
    amount: charge.amount / 100,
    status: charge.status === 'succeeded' ? 'completed' : 'failed',
  };
}

/**
 * Extract common fields from PayFast ITN payload
 * PayFast amount is already in Rands (string, parse to float)
 */
function extractPayFastPayload(itn: PayFastITN) {
  return {
    webhook_id: itn.m_payment_id,
    student_id: itn.custom_str1,
    amount: parseFloat(itn.m_amount_gross),
    status: itn.payment_status === 'COMPLETE' ? 'completed' : 'failed',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/webhooks/payment?provider=stripe|payfast
 *
 * Receives payment webhooks from Stripe or PayFast.
 * Flow:
 *   1. Parse provider from query string
 *   2. Read raw body + signature header
 *   3. Verify signature (before any DB writes)
 *   4. Call Supabase RPC: process_webhook_safe()
 *   5. Return appropriate HTTP status
 *
 * @example Stripe webhook
 * ```
 * curl -X POST http://localhost:3000/api/webhooks/payment?provider=stripe \
 *   -H "Content-Type: application/json" \
 *   -H "stripe-signature: t=1234567890,v1={hmac_hex}" \
 *   -d '{
 *     "id": "ch_test_12345",
 *     "object": "charge",
 *     "amount": 500000,
 *     "currency": "zar",
 *     "metadata": { "student_id": "00000000-0000-0000-0000-000000000001" },
 *     "status": "succeeded"
 *   }'
 * ```
 *
 * @example PayFast ITN
 * ```
 * curl -X POST "http://localhost:3000/api/webhooks/payment?provider=payfast" \
 *   -H "Content-Type: application/x-www-form-urlencoded" \
 *   -d "m_payment_id=pf_test_67890&m_amount_gross=3000.00&custom_str1=00000000-0000-0000-0000-000000000002&payment_status=COMPLETE&merchant_id=10000100&signature={md5_hash}"
 * ```
 */
export async function POST(req: Request): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // ──────────────────────────────────────────────────────────────────────
    // STEP 1: Parse provider from query string
    // ──────────────────────────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider');

    if (!provider || !['stripe', 'payfast'].includes(provider)) {
      return NextResponse.json(
        { received: false, error: 'Invalid or missing provider. Use ?provider=stripe or ?provider=payfast' },
        { status: 400 },
      );
    }

    // ──────────────────────────────────────────────────────────────────────
    // STEP 2: Read raw body + signature
    // ──────────────────────────────────────────────────────────────────────
    const payloadRaw = await req.text();

    if (!payloadRaw) {
      return NextResponse.json(
        { received: false, error: 'Empty request body' },
        { status: 400 },
      );
    }

    // ──────────────────────────────────────────────────────────────────────
    // STEP 3: Parse JSON payload
    // ──────────────────────────────────────────────────────────────────────
    let payloadParsed: StripeCharge | PayFastITN;
    try {
      payloadParsed = JSON.parse(payloadRaw);
    } catch {
      return NextResponse.json(
        { received: false, error: 'Invalid JSON payload' },
        { status: 400 },
      );
    }

    // ──────────────────────────────────────────────────────────────────────
    // STEP 4: Initialize Supabase client (service_role for webhook bypass)
    // ──────────────────────────────────────────────────────────────────────
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('[Webhook] Missing Supabase environment variables');
      return NextResponse.json(
        { received: false, error: 'Server configuration error' },
        { status: 500 },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // ──────────────────────────────────────────────────────────────────────
    // STEP 5: Verify signature (BEFORE any DB writes)
    // ──────────────────────────────────────────────────────────────────────
    let signatureValid = false;
    let signatureHeader = '';

    if (provider === 'stripe') {
      signatureHeader = req.headers.get('stripe-signature') ?? '';
      signatureValid = verifyStripeSignature(payloadRaw, signatureHeader, STRIPE_WEBHOOK_SECRET);
    } else if (provider === 'payfast') {
      signatureHeader = (payloadParsed as PayFastITN).signature ?? '';
      signatureValid = verifyPayFastSignature(payloadRaw, signatureHeader, PAYFAST_PASSPHRASE);
    }

    if (!signatureValid) {
      const auditEntry: AuditEntry = {
        provider,
        error: 'Signature verification failed',
        error_code: 'WEBHOOK_SIGNATURE_FAILED',
        timestamp: new Date().toISOString(),
      };

      await logWebhookError(supabase, auditEntry);

      console.warn(`[Webhook] Invalid signature from ${provider}`, {
        ip: req.headers.get('x-forwarded-for') ?? 'unknown',
        timestamp: auditEntry.timestamp,
      });

      return NextResponse.json(
        { received: false, error: 'Unauthorized: Invalid signature' },
        { status: 401 },
      );
    }

    // ──────────────────────────────────────────────────────────────────────
    // STEP 6: Call Supabase RPC for idempotent processing
    // ──────────────────────────────────────────────────────────────────────
    let webhookId: string;
    if (provider === 'stripe') {
      webhookId = (payloadParsed as StripeCharge).id;
    } else {
      webhookId = (payloadParsed as PayFastITN).m_payment_id;
    }

    const { data, error: rpcError } = await supabase.rpc('process_webhook_safe', {
      p_provider: provider,
      p_signature: signatureHeader,
      p_payload_raw: payloadRaw,
      p_webhook_secret: provider === 'stripe' ? STRIPE_WEBHOOK_SECRET : PAYFAST_PASSPHRASE,
      p_payload_parsed: payloadParsed,
    });

    if (rpcError) {
      console.error(`[Webhook] RPC error for ${provider}:`, rpcError);
      return NextResponse.json(
        { received: false, error: 'Internal processing error' },
        { status: 500 },
      );
    }

    const result = data as WebhookResult;

    // ──────────────────────────────────────────────────────────────────────
    // STEP 7: Return appropriate HTTP response
    // ──────────────────────────────────────────────────────────────────────

    // Idempotent duplicate: return 200 OK (webhook already processed)
    if (result.message?.includes('already processed')) {
      return NextResponse.json(
        { received: true, message: 'Webhook already processed' },
        { status: 200 },
      );
    }

    // Signature failed (from RPC): return 401
    if (result.status_code === 401) {
      return NextResponse.json(
        { received: false, error: result.message },
        { status: 401 },
      );
    }

    // Missing student_id: return 400
    if (!result.success && result.message?.includes('student_id')) {
      return NextResponse.json(
        { received: false, error: result.message },
        { status: 400 },
      );
    }

    // Invalid amount: return 400
    if (!result.success && result.message?.includes('amount')) {
      return NextResponse.json(
        { received: false, error: result.message },
        { status: 400 },
      );
    }

    // No matching payment: return 400 (requires manual review)
    if (!result.success && result.message?.includes('No matching')) {
      console.warn(`[Webhook] No matching payment for ${provider}:`, {
        webhook_id: webhookId,
        student_id: result.student_id,
      });
      return NextResponse.json(
        { received: false, error: 'Payment not matched - requires manual review' },
        { status: 400 },
      );
    }

    // Success
    const elapsed = Date.now() - startTime;
    console.log(`[Webhook] Processed ${provider} webhook in ${elapsed}ms:`, {
      webhook_id: webhookId,
      payment_id: result.payment_id,
      status: result.success ? 'success' : 'failed',
    });

    return NextResponse.json(
      { received: true },
      { status: 200 },
    );
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[Webhook] Unhandled error after ${elapsed}ms:`, err);
    return NextResponse.json(
      { received: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST DATA REFERENCE (for Postman / curl testing)
// ══════════════════════════════════════════════════════════════════════════════
//
// STRIPE TEST: Success
// ─────────────────────
// curl -X POST http://localhost:3000/api/webhooks/payment?provider=stripe \
//   -H "Content-Type: application/json" \
//   -H "stripe-signature: t=1234567890,v1={computed_hmac}" \
//   -d '{
//     "id": "ch_test_12345",
//     "object": "charge",
//     "amount": 500000,
//     "currency": "zar",
//     "metadata": { "student_id": "00000000-0000-0000-0000-000000000001" },
//     "status": "succeeded"
//   }'
//
// STRIPE TEST: Failed
// ────────────────────
// curl -X POST http://localhost:3000/api/webhooks/payment?provider=stripe \
//   -H "Content-Type: application/json" \
//   -H "stripe-signature: t=1234567890,v1={computed_hmac}" \
//   -d '{
//     "id": "ch_test_failed_999",
//     "object": "charge",
//     "amount": 250000,
//     "currency": "zar",
//     "metadata": { "student_id": "00000000-0000-0000-0000-000000000001" },
//     "status": "failed"
//   }'
//
// STRIPE TEST: Duplicate (idempotent)
// ─────────────────────────────────────
// Send the same ch_test_12345 again -> returns 200 OK "already processed"
//
// PAYFAST TEST: Success
// ──────────────────────
// curl -X POST "http://localhost:3000/api/webhooks/payment?provider=payfast" \
//   -H "Content-Type: application/x-www-form-urlencoded" \
//   -d "m_payment_id=pf_test_67890&m_amount_gross=3000.00&custom_str1=00000000-0000-0000-0000-000000000002&payment_status=COMPLETE&merchant_id=10000100&signature={md5_hash}"
//
// PAYFAST TEST: Pending
// ─────────────────────
// curl -X POST "http://localhost:3000/api/webhooks/payment?provider=payfast" \
//   -H "Content-Type: application/x-www-form-urlencoded" \
//   -d "m_payment_id=pf_test_11111&m_amount_gross=1500.00&custom_str1=00000000-0000-0000-0000-000000000003&payment_status=PENDING&merchant_id=10000100&signature={md5_hash}"
//
// ERROR TESTS:
// ─────────────
// Invalid signature: returns 401 Unauthorized
// Missing student_id: returns 400 Bad Request
// Amount mismatch: returns 400 "requires manual review"
// Unknown provider: returns 400 "Invalid or missing provider"
// Empty body: returns 400 "Empty request body"
// ══════════════════════════════════════════════════════════════════════════════
