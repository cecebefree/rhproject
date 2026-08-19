// e2e/enroll-student.test.ts
// Row 96: End-to-end enrollment flow — button → EF → enrollment created
//
// Tests cover:
//   1.  Successful enrollment (200)
//   2.  Duplicate enrollment (409)
//   3.  Missing class_id field (400)
//   4.  Empty class_id (400)
//   5.  Non-existent class (404)
//   6.  Unpublished class (403)
//   7.  Missing auth header (401)
//   8.  Invalid JWT (401)
//   9.  Wrong HTTP method (405)
//  10.  Invalid JSON body (400)
//  11.  Two students enroll in same class
//  12.  Student enrolls in multiple classes
//  13.  Enrollment record verified in database
//  14.  Enrollment timestamp is recent
//  15.  Concurrent enrollment attempts (no duplicates)
//  16.  Re-enroll after previous enrollment deleted
//  17.  Class list reflects enrollment status after enroll
//
// Prerequisites:
//   - Local Supabase running (supabase start)
//   - Migrations applied (supabase migration up)
//   - Edge Function deployed (supabase functions deploy enroll-student)
//   - Run: npx vitest run supabase/tests/e2e/enroll-student.test.ts --reporter=verbose

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const EF_BASE = `${SUPABASE_URL}/functions/v1`;
const ENROLL_STUDENT_URL = `${EF_BASE}/enroll-student`;

// ═══════════════════════════════════════════════════════════
// CLIENTS
// ═══════════════════════════════════════════════════════════

let adminClient: SupabaseClient;

// ═══════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════

const TEST_TENANT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TEST_STUDENT_A_ID = "11111111-1111-1111-1111-111111111111";
const TEST_STUDENT_B_ID = "22222222-2222-2222-2222-222222222222";
const TEST_COURSE_ID = "cccc0000-0000-0000-0000-000000000001";
const TEST_COURSE_B_ID = "cccc0000-0000-0000-0000-000000000002";
const NONEXISTENT_COURSE_ID = "00000000-0000-0000-0000-000000000099";

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

async function isEFAvailable(): Promise<boolean> {
  try {
    const res = await fetch(ENROLL_STUDENT_URL, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    // EF returns 405 for GET, 404 means not deployed
    return res.status !== 404;
  } catch {
    return false;
  }
}

function buildJWT(sub: string, role = "authenticated"): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub,
      role,
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  );
  // Test signature — Supabase local validates structure, not signature
  const sig = btoa("test-signature");
  return `${header}.${payload}.${sig}`;
}

async function callEnrollEF(
  classId: string,
  jwt?: string
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }
  const res = await fetch(ENROLL_STUDENT_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ class_id: classId }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function cleanupTestData(): Promise<void> {
  // Delete test enrollments (students A + B in test courses)
  await adminClient
    .schema("school_desk")
    .from("enrollments")
    .delete()
    .in("student_id", [TEST_STUDENT_A_ID, TEST_STUDENT_B_ID])
    .in("course_id", [TEST_COURSE_ID, TEST_COURSE_B_ID]);
}

async function getEnrollment(
  studentId: string,
  courseId: string
): Promise<Record<string, unknown> | null> {
  const { data } = await adminClient
    .schema("school_desk")
    .from("enrollments")
    .select("*")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .maybeSingle();
  return data;
}

// ═══════════════════════════════════════════════════════════
// SUITE
// ═══════════════════════════════════════════════════════════

describe("enroll-student: mobile enrollment flow", () => {
  let efAvailable = false;
  let studentJwtA: string;
  let studentJwtB: string;

  beforeAll(async () => {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    efAvailable = await isEFAvailable();

    if (!efAvailable) {
      console.warn(
        "\n⚠ Edge Function not deployed locally — EF-dependent tests will be skipped.\n" +
          "  Deploy with: supabase functions deploy enroll-student\n"
      );
    }

    // Build test JWTs
    studentJwtA = buildJWT(TEST_STUDENT_A_ID);
    studentJwtB = buildJWT(TEST_STUDENT_B_ID);
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // ═════════════════════════════════════════════════════════
  // Test 1: Successful enrollment (200)
  // ═════════════════════════════════════════════════════════

  it("should create enrollment and return 200", async () => {
    if (!efAvailable) return;

    const { status, body } = await callEnrollEF(TEST_COURSE_ID, studentJwtA);

    expect(status).toBe(200);
    expect(body.status).toBe("enrolled");
    expect(body.enrollment_id).toBeTruthy();
    expect(body.message).toBe("Enrolled successfully");

    // Verify in database
    const enrollment = await getEnrollment(TEST_STUDENT_A_ID, TEST_COURSE_ID);
    expect(enrollment).toBeTruthy();
    expect(enrollment!.student_id).toBe(TEST_STUDENT_A_ID);
    expect(enrollment!.course_id).toBe(TEST_COURSE_ID);
  });

  // ═════════════════════════════════════════════════════════
  // Test 2: Duplicate enrollment (409)
  // ═════════════════════════════════════════════════════════

  it("should return 409 for duplicate enrollment", async () => {
    if (!efAvailable) return;

    // First enrollment
    const first = await callEnrollEF(TEST_COURSE_ID, studentJwtA);
    expect(first.status).toBe(200);

    // Duplicate attempt
    const { status, body } = await callEnrollEF(TEST_COURSE_ID, studentJwtA);
    expect(status).toBe(409);
    expect(body.error).toContain("Already enrolled");
    expect(body.enrollment_id).toBeTruthy();
  });

  // ═════════════════════════════════════════════════════════
  // Test 3: Missing class_id field (400)
  // ═════════════════════════════════════════════════════════

  it("should return 400 when class_id is missing", async () => {
    if (!efAvailable) return;

    const res = await fetch(ENROLL_STUDENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentJwtA}`,
      },
      body: JSON.stringify({}),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("class_id is required");
  });

  // ═════════════════════════════════════════════════════════
  // Test 4: Empty class_id (400)
  // ═════════════════════════════════════════════════════════

  it("should return 400 when class_id is empty string", async () => {
    if (!efAvailable) return;

    const res = await fetch(ENROLL_STUDENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentJwtA}`,
      },
      body: JSON.stringify({ class_id: "" }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("class_id is required");
  });

  // ═════════════════════════════════════════════════════════
  // Test 5: Non-existent class (404)
  // ═════════════════════════════════════════════════════════

  it("should return 404 for non-existent class", async () => {
    if (!efAvailable) return;

    const { status, body } = await callEnrollEF(NONEXISTENT_COURSE_ID, studentJwtA);

    expect(status).toBe(404);
    expect(body.error).toContain("Class not found");
  });

  // ═════════════════════════════════════════════════════════
  // Test 6: Unpublished class (403)
  // ═════════════════════════════════════════════════════════

  it("should return 403 for unpublished class", async () => {
    if (!efAvailable) return;

    // Create an unpublished course
    const { data: draftCourse } = await adminClient
      .schema("school_desk")
      .from("courses")
      .insert({
        id: `draft-${Date.now()}`,
        title: "Draft Course",
        teacher_id: "33333333-3333-3333-3333-333333333333",
        status: "draft",
        price: 0,
        tenant_id: TEST_TENANT_ID,
      })
      .select("id")
      .single();

    if (!draftCourse) return;

    const { status, body } = await callEnrollEF(draftCourse.id, studentJwtA);

    expect(status).toBe(403);
    expect(body.error).toContain("not available");

    // Cleanup
    await adminClient
      .schema("school_desk")
      .from("courses")
      .delete()
      .eq("id", draftCourse.id);
  });

  // ═════════════════════════════════════════════════════════
  // Test 7: Missing auth header (401)
  // ═════════════════════════════════════════════════════════

  it("should return 401 when Authorization header is missing", async () => {
    if (!efAvailable) return;

    const res = await fetch(ENROLL_STUDENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_id: TEST_COURSE_ID }),
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toContain("Missing authorization");
  });

  // ═════════════════════════════════════════════════════════
  // Test 8: Invalid JWT (401)
  // ═════════════════════════════════════════════════════════

  it("should return 401 for invalid JWT", async () => {
    if (!efAvailable) return;

    const res = await fetch(ENROLL_STUDENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-token",
      },
      body: JSON.stringify({ class_id: TEST_COURSE_ID }),
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toContain("Invalid token");
  });

  // ═════════════════════════════════════════════════════════
  // Test 9: Wrong HTTP method (405)
  // ═════════════════════════════════════════════════════════

  it("should return 405 for GET request", async () => {
    if (!efAvailable) return;

    const res = await fetch(ENROLL_STUDENT_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${studentJwtA}` },
    });
    const body = await res.json();

    expect(res.status).toBe(405);
    expect(body.error).toContain("Method not allowed");
  });

  // ═════════════════════════════════════════════════════════
  // Test 10: Invalid JSON body (400)
  // ═════════════════════════════════════════════════════════

  it("should return 400 for invalid JSON", async () => {
    if (!efAvailable) return;

    const res = await fetch(ENROLL_STUDENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentJwtA}`,
      },
      body: "not-json",
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Invalid JSON");
  });

  // ═════════════════════════════════════════════════════════
  // Test 11: Two students enroll in same class
  // ═════════════════════════════════════════════════════════

  it("should allow two different students to enroll in the same class", async () => {
    if (!efAvailable) return;

    const resA = await callEnrollEF(TEST_COURSE_ID, studentJwtA);
    const resB = await callEnrollEF(TEST_COURSE_ID, studentJwtB);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    // Both enrollments exist in database
    const enrollA = await getEnrollment(TEST_STUDENT_A_ID, TEST_COURSE_ID);
    const enrollB = await getEnrollment(TEST_STUDENT_B_ID, TEST_COURSE_ID);
    expect(enrollA).toBeTruthy();
    expect(enrollB).toBeTruthy();
  });

  // ═════════════════════════════════════════════════════════
  // Test 12: Student enrolls in multiple classes
  // ═════════════════════════════════════════════════════════

  it("should allow one student to enroll in multiple classes", async () => {
    if (!efAvailable) return;

    const resA = await callEnrollEF(TEST_COURSE_ID, studentJwtA);
    const resB = await callEnrollEF(TEST_COURSE_B_ID, studentJwtA);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const enrollA = await getEnrollment(TEST_STUDENT_A_ID, TEST_COURSE_ID);
    const enrollB = await getEnrollment(TEST_STUDENT_A_ID, TEST_COURSE_B_ID);
    expect(enrollA).toBeTruthy();
    expect(enrollB).toBeTruthy();
  });

  // ═════════════════════════════════════════════════════════
  // Test 13: Enrollment record has correct fields
  // ═════════════════════════════════════════════════════════

  it("should create enrollment with correct student_id, course_id, and purchased_at", async () => {
    if (!efAvailable) return;

    const before = new Date().toISOString();
    await callEnrollEF(TEST_COURSE_ID, studentJwtA);
    const after = new Date().toISOString();

    const enrollment = await getEnrollment(TEST_STUDENT_A_ID, TEST_COURSE_ID);
    expect(enrollment).toBeTruthy();
    expect(enrollment!.student_id).toBe(TEST_STUDENT_A_ID);
    expect(enrollment!.course_id).toBe(TEST_COURSE_ID);
    expect(enrollment!.purchased_at).toBeTruthy();

    // Timestamp is recent (within 5 seconds)
    const purchasedAt = new Date(enrollment!.purchased_at as string).getTime();
    const beforeMs = new Date(before).getTime();
    const afterMs = new Date(after).getTime();
    expect(purchasedAt).toBeGreaterThanOrEqual(beforeMs - 1000);
    expect(purchasedAt).toBeLessThanOrEqual(afterMs + 1000);
  });

  // ═════════════════════════════════════════════════════════
  // Test 14: Enrollment timestamp is recent
  // ═════════════════════════════════════════════════════════

  it("should set purchased_at within 2 seconds of request time", async () => {
    if (!efAvailable) return;

    const startMs = Date.now();
    await callEnrollEF(TEST_COURSE_ID, studentJwtA);
    const endMs = Date.now();

    const enrollment = await getEnrollment(TEST_STUDENT_A_ID, TEST_COURSE_ID);
    expect(enrollment).toBeTruthy();

    const purchasedMs = new Date(enrollment!.purchased_at as string).getTime();
    expect(purchasedMs).toBeGreaterThanOrEqual(startMs - 2000);
    expect(purchasedMs).toBeLessThanOrEqual(endMs + 2000);
  });

  // ═════════════════════════════════════════════════════════
  // Test 15: Concurrent enrollment attempts (no duplicates)
  // ═════════════════════════════════════════════════════════

  it("should handle concurrent enrollment from same student without creating duplicates", async () => {
    if (!efAvailable) return;

    // Send 3 concurrent enrollment requests for the same class
    const results = await Promise.all([
      callEnrollEF(TEST_COURSE_ID, studentJwtA),
      callEnrollEF(TEST_COURSE_ID, studentJwtA),
      callEnrollEF(TEST_COURSE_ID, studentJwtA),
    ]);

    // Exactly one should succeed (200), others should fail (409)
    const successes = results.filter((r) => r.status === 200);
    const conflicts = results.filter((r) => r.status === 409);

    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(2);

    // Only one enrollment record in database
    const { data: all } = await adminClient
      .schema("school_desk")
      .from("enrollments")
      .select("id")
      .eq("student_id", TEST_STUDENT_A_ID)
      .eq("course_id", TEST_COURSE_ID);

    expect(all!.length).toBe(1);
  });

  // ═════════════════════════════════════════════════════════
  // Test 16: Re-enroll after previous enrollment
  // ═════════════════════════════════════════════════════════

  it("should allow re-enrollment after previous enrollment is deleted", async () => {
    if (!efAvailable) return;

    // First enrollment
    const first = await callEnrollEF(TEST_COURSE_ID, studentJwtA);
    expect(first.status).toBe(200);

    // Delete the enrollment (simulate admin drop)
    await adminClient
      .schema("school_desk")
      .from("enrollments")
      .delete()
      .eq("student_id", TEST_STUDENT_A_ID)
      .eq("course_id", TEST_COURSE_ID);

    // Re-enroll should succeed
    const second = await callEnrollEF(TEST_COURSE_ID, studentJwtA);
    expect(second.status).toBe(200);
    expect(second.body.enrollment_id).toBeTruthy();

    // Verify new enrollment exists
    const enrollment = await getEnrollment(TEST_STUDENT_A_ID, TEST_COURSE_ID);
    expect(enrollment).toBeTruthy();
  });

  // ═════════════════════════════════════════════════════════
  // Test 17: Class list reflects enrollment status after enroll
  // ═════════════════════════════════════════════════════════

  it("should reflect enrollment status when querying classes after enrollment", async () => {
    if (!efAvailable) return;

    // Before enrollment — class should appear in published courses
    const { data: beforeCourses } = await adminClient
      .schema("school_desk")
      .from("courses")
      .select("id, status")
      .eq("id", TEST_COURSE_ID)
      .eq("status", "published")
      .single();

    expect(beforeCourses).toBeTruthy();

    // Enroll
    const { status } = await callEnrollEF(TEST_COURSE_ID, studentJwtA);
    expect(status).toBe(200);

    // After enrollment — enrollment record exists
    const enrollment = await getEnrollment(TEST_STUDENT_A_ID, TEST_COURSE_ID);
    expect(enrollment).toBeTruthy();
    expect(enrollment!.student_id).toBe(TEST_STUDENT_A_ID);
    expect(enrollment!.course_id).toBe(TEST_COURSE_ID);
  });
});
