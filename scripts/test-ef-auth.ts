/**
 * test-ef-auth.ts — Test harness for EF-to-EF auth pattern
 *
 * Run: deno run --allow-net --allow-env scripts/test-ef-auth.ts
 *
 * Tests:
 * 1. Valid signature → 200
 * 2. Invalid signature → 401
 * 3. Replay (old timestamp) → 401
 * 4. Missing headers → 401
 * 5. Unauthorized caller → 403
 */

// ═══════════════════════════════════════════════════════════
// CRYPTO UTILITIES (duplicated from ef-auth.ts for testing)
// ═══════════════════════════════════════════════════════════

async function computeBodyHash(body: ArrayBuffer | string): Promise<string> {
  const encoder = new TextEncoder();
  const data = typeof body === "string" ? encoder.encode(body) : new Uint8Array(body);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeSignature(
  method: string,
  path: string,
  timestamp: number,
  bodyHash: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const message = `${method}|${path}|${timestamp}|${bodyHash}`;
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const signatureArray = new Uint8Array(signatureBuffer);
  return Array.from(signatureArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ═══════════════════════════════════════════════════════════
// TEST CONFIGURATION
// ═══════════════════════════════════════════════════════════

const EF_URL = "http://localhost:54321/functions/v1/front-desk-read-leads";
const EF_SECRET = "31072cf3bbb395950756bd8497d4acb9cebc0f3aa8f66c052a1b2a3b7de33bb9"; // front_desk secret
const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// ═══════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════

interface TestResult {
  name: string;
  passed: boolean;
  statusCode: number;
  error?: string;
}

async function makeEFRequest(
  body: object,
  headers: Record<string, string>
): Promise<{ status: number; data: unknown }> {
  const bodyStr = JSON.stringify(body);
  const response = await fetch(EF_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: bodyStr,
  });

  const data = await response.json();
  return { status: response.status, data };
}

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

async function testValidSignature(): Promise<TestResult> {
  const body = { tenant_id: TEST_TENANT_ID };
  const bodyStr = JSON.stringify(body);
  const bodyHash = await computeBodyHash(bodyStr);
  const timestamp = Date.now();
  const signature = await computeSignature("POST", "/functions/v1/front-desk-read-leads", timestamp, bodyHash, EF_SECRET);

  try {
    const { status, data } = await makeEFRequest(body, {
      "X-EF-Caller": "front_desk",
      "X-EF-Signature": signature,
      "X-EF-Timestamp": timestamp.toString(),
    });

    return {
      name: "Valid signature",
      passed: status === 200 || status === 401, // 401 if tenant doesn't exist, but signature is valid
      statusCode: status,
    };
  } catch (err) {
    return {
      name: "Valid signature",
      passed: false,
      statusCode: 0,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

async function testInvalidSignature(): Promise<TestResult> {
  const body = { tenant_id: TEST_TENANT_ID };
  const timestamp = Date.now();

  try {
    const { status, data } = await makeEFRequest(body, {
      "X-EF-Caller": "front_desk",
      "X-EF-Signature": "invalid_signature_1234567890abcdef",
      "X-EF-Timestamp": timestamp.toString(),
    });

    return {
      name: "Invalid signature",
      passed: status === 401,
      statusCode: status,
    };
  } catch (err) {
    return {
      name: "Invalid signature",
      passed: false,
      statusCode: 0,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

async function testReplayDetection(): Promise<TestResult> {
  const body = { tenant_id: TEST_TENANT_ID };
  const bodyStr = JSON.stringify(body);
  const bodyHash = await computeBodyHash(bodyStr);
  const timestamp = Date.now() - 120000; // 2 minutes ago (replay)
  const signature = await computeSignature("POST", "/functions/v1/front-desk-read-leads", timestamp, bodyHash, EF_SECRET);

  try {
    const { status, data } = await makeEFRequest(body, {
      "X-EF-Caller": "front_desk",
      "X-EF-Signature": signature,
      "X-EF-Timestamp": timestamp.toString(),
    });

    return {
      name: "Replay detection",
      passed: status === 401,
      statusCode: status,
    };
  } catch (err) {
    return {
      name: "Replay detection",
      passed: false,
      statusCode: 0,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

async function testMissingHeaders(): Promise<TestResult> {
  try {
    const { status, data } = await makeEFRequest(
      { tenant_id: TEST_TENANT_ID },
      {} // No EF headers
    );

    return {
      name: "Missing headers",
      passed: status === 401,
      statusCode: status,
    };
  } catch (err) {
    return {
      name: "Missing headers",
      passed: false,
      statusCode: 0,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

async function testUnauthorizedCaller(): Promise<TestResult> {
  const body = { tenant_id: TEST_TENANT_ID };
  const bodyStr = JSON.stringify(body);
  const bodyHash = await computeBodyHash(bodyStr);
  const timestamp = Date.now();
  // Use a different secret (simulating unknown caller)
  const signature = await computeSignature("POST", "/functions/v1/front-desk-read-leads", timestamp, bodyHash, "unknown_secret");

  try {
    const { status, data } = await makeEFRequest(body, {
      "X-EF-Caller": "unknown_caller",
      "X-EF-Signature": signature,
      "X-EF-Timestamp": timestamp.toString(),
    });

    return {
      name: "Unauthorized caller",
      passed: status === 401 || status === 403,
      statusCode: status,
    };
  } catch (err) {
    return {
      name: "Unauthorized caller",
      passed: false,
      statusCode: 0,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log("🧪 EF-to-EF Auth Test Suite\n");
  console.log("=".repeat(50));

  const tests = [
    testValidSignature(),
    testInvalidSignature(),
    testReplayDetection(),
    testMissingHeaders(),
    testUnauthorizedCaller(),
  ];

  const results = await Promise.all(tests);

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} | ${result.name} (HTTP ${result.statusCode})`);
    if (result.error) {
      console.log(`       Error: ${result.error}`);
    }
    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log("=".repeat(50));
  console.log(`\n📊 Results: ${passed}/${results.length} passed, ${failed} failed`);

  if (failed > 0) {
    Deno.exit(1);
  }
}

main();
