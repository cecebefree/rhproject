/**
 * ef-auth.ts — EF-to-EF Auth Pattern for Redhouse Desk Services
 *
 * HMAC-SHA256 service identity auth for inter-EF calls.
 * Enables secure desk-to-desk communication (front_desk → school_desk → office_desk).
 *
 * Design doc: docs/design/ef-to-ef-auth-pattern.md
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface EFAuthContext {
  caller: string
  tenantId: string
  allowedActions: string[]
  signatureValid: boolean
  replayCheckPassed: boolean
  timestamp: number
}

export interface EFCallLogEntry {
  tenant_id: string
  caller: string
  receiver: string
  action: string
  method: string
  path: string
  status_code: number
  caller_ip?: string
  signature_valid: boolean
  replay_check_passed: boolean
  request_hash?: string
  error_msg?: string
}

// ═══════════════════════════════════════════════════════════
// AUTHORIZATION MATRIX
// ═══════════════════════════════════════════════════════════

const AUTHORIZATION_MATRIX: Record<string, Record<string, string[]>> = {
  front_desk: {
    school_desk: ['create_enrollment', 'notify_lead_conversion'],
    office_desk: ['create_registration', 'notify_lead_conversion'],
  },
  school_desk: {
    office_desk: ['notify_enrollment_status', 'query_registration'],
  },
  office_desk: {
    school_desk: ['query_registration', 'notify_payment_status'],
  },
}

// ═══════════════════════════════════════════════════════════
// REPLAY PROTECTION
// ═══════════════════════════════════════════════════════════

const MAX_TIMESTAMP_AGE_MS = 60 * 1000 // 60 seconds

// ═══════════════════════════════════════════════════════════
// CRYPTO UTILITIES
// ═══════════════════════════════════════════════════════════

/**
 * Compute SHA256 hash of request body
 */
export async function computeBodyHash(body: ArrayBuffer | string): Promise<string> {
  const encoder = new TextEncoder()
  const data = typeof body === 'string' ? encoder.encode(body) : new Uint8Array(body)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Compute HMAC-SHA256 signature
 */
export async function computeSignature(
  method: string,
  path: string,
  timestamp: number,
  bodyHash: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder()
  const message = `${method}|${path}|${timestamp}|${bodyHash}`
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(message)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  const signatureArray = new Uint8Array(signatureBuffer)
  return Array.from(signatureArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// ═══════════════════════════════════════════════════════════
// SIGNATURE VERIFICATION
// ═══════════════════════════════════════════════════════════

/**
 * Verify EF-to-EF HMAC-SHA256 signature
 *
 * @param req - Incoming request
 * @param efSecret - Current service secret
 * @param efSecretPrev - Previous service secret (for rotation)
 * @returns EFAuthContext if valid, throws Response if invalid
 */
export async function verifyEFSignature(
  req: Request,
  efSecret: string,
  efSecretPrev?: string
): Promise<EFAuthContext> {
  // 1. Extract headers
  const caller = req.headers.get('X-EF-Caller')
  const signature = req.headers.get('X-EF-Signature')
  const timestampStr = req.headers.get('X-EF-Timestamp')

  if (!caller || !signature || !timestampStr) {
    throw new Response(
      JSON.stringify({ error: 'missing_ef_headers' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 2. Parse timestamp
  const timestamp = parseInt(timestampStr, 10)
  if (isNaN(timestamp)) {
    throw new Response(
      JSON.stringify({ error: 'invalid_timestamp' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 3. Replay protection
  const now = Date.now()
  const age = now - timestamp
  const replayCheckPassed = age <= MAX_TIMESTAMP_AGE_MS

  if (!replayCheckPassed) {
    throw new Response(
      JSON.stringify({ error: 'replay_detected', age_ms: age }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 4. Read body and compute hash
  const body = await req.arrayBuffer()
  const bodyHash = await computeBodyHash(body)

  // 5. Get request details
  const url = new URL(req.url)
  const method = req.method.toUpperCase()
  const path = url.pathname

  // 6. Verify signature (try current, then prev)
  const computedSig = await computeSignature(method, path, timestamp, bodyHash, efSecret)
  let signatureValid = constantTimeCompare(signature, computedSig)

  if (!signatureValid && efSecretPrev) {
    const computedSigPrev = await computeSignature(method, path, timestamp, bodyHash, efSecretPrev)
    signatureValid = constantTimeCompare(signature, computedSigPrev)
  }

  if (!signatureValid) {
    throw new Response(
      JSON.stringify({ error: 'invalid_signature' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 7. Look up caller in authorization matrix
  // Note: We don't know the receiver yet, so we just verify the caller is valid
  // The receiver-specific authorization is checked in authorizeEFCall()
  if (!AUTHORIZATION_MATRIX[caller]) {
    throw new Response(
      JSON.stringify({ error: 'unknown_caller', caller }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 8. Extract tenant_id from body (if present)
  let tenantId = ''
  try {
    const textBody = new TextDecoder().decode(body)
    if (textBody) {
      const jsonBody = JSON.parse(textBody)
      tenantId = jsonBody.tenant_id || ''
    }
  } catch {
    // Body may not be JSON, that's okay
  }

  return {
    caller,
    tenantId,
    allowedActions: [],
    signatureValid,
    replayCheckPassed,
    timestamp,
  }
}

// ═══════════════════════════════════════════════════════════
// AUTHORIZATION
// ═══════════════════════════════════════════════════════════

/**
 * Authorize EF-to-EF call based on authorization matrix
 *
 * @param context - EFAuthContext from verifyEFSignature
 * @param receiver - Name of the receiving EF
 * @param action - Action being performed
 * @returns true if authorized, throws Response if not
 */
export function authorizeEFCall(
  context: EFAuthContext,
  receiver: string,
  action: string
): boolean {
  const callerTargets = AUTHORIZATION_MATRIX[context.caller]

  if (!callerTargets) {
    throw new Response(
      JSON.stringify({ error: 'unknown_caller', caller: context.caller }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const allowedActions = callerTargets[receiver]

  if (!allowedActions) {
    throw new Response(
      JSON.stringify({
        error: 'unauthorized_target',
        caller: context.caller,
        receiver,
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!allowedActions.includes(action)) {
    throw new Response(
      JSON.stringify({
        error: 'unauthorized_action',
        caller: context.caller,
        receiver,
        action,
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Update context with allowed actions
  context.allowedActions = allowedActions

  return true
}

// ═══════════════════════════════════════════════════════════
// AUDIT LOGGING
// ═══════════════════════════════════════════════════════════

/**
 * Write EF call to audit log (non-blocking, catches errors)
 */
export async function writeEfCallLog(
  entry: EFCallLogEntry
): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabase.from('ef_call_log').insert({
      tenant_id: entry.tenant_id,
      caller: entry.caller,
      receiver: entry.receiver,
      action: entry.action,
      method: entry.method,
      path: entry.path,
      status_code: entry.status_code,
      caller_ip: entry.caller_ip,
      signature_valid: entry.signature_valid,
      replay_check_passed: entry.replay_check_passed,
      request_hash: entry.request_hash,
      error_msg: entry.error_msg,
    })
  } catch (err) {
    // Audit log failure is non-fatal
    console.error('Failed to write ef_call_log:', err)
  }
}

// ═══════════════════════════════════════════════════════════
// HELPER: GET SERVICE SECRET
// ═══════════════════════════════════════════════════════════

/**
 * Get service secret from environment
 */
export function getServiceSecret(serviceName: string): string {
  const envKey = `EF_${serviceName.toUpperCase().replace(/-/g, '_')}_SERVICE_SECRET`
  const secret = Deno.env.get(envKey)
  if (!secret) {
    throw new Response(
      JSON.stringify({ error: 'missing_service_secret', service: serviceName }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
  return secret
}

/**
 * Get previous service secret from environment (for rotation)
 */
export function getPreviousServiceSecret(serviceName: string): string | undefined {
  const envKey = `EF_${serviceName.toUpperCase().replace(/-/g, '_')}_SERVICE_SECRET_PREV`
  return Deno.env.get(envKey) || undefined
}

// ═══════════════════════════════════════════════════════════
// HELPER: EXTRACT CALLER IP
// ═══════════════════════════════════════════════════════════

/**
 * Extract caller IP from request headers
 */
export function getCallerIP(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}
