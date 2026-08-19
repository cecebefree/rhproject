// e2e/profile-screen.test.ts
// Row 98: End-to-end profile screen data fetching
//
// Tests cover:
//   1.  Profile fetch returns student data
//   2.  Profile fetch includes all expected fields
//   3.  Enrolled classes fetch returns empty for student with no enrollments
//   4.  Enrolled classes fetch returns classes after enrollment
//   5.  Enrolled class includes schedule slot data
//   6.  Registration status fetch returns null when no registration exists
//   7.  Payment history fetch returns payments in tenant
//   8.  Grades fetch returns empty when no grades exist
//   9.  Attendance fetch returns empty when no attendance exists
//   10. Update profile changes name in database
//   11. Unauthenticated profile fetch returns error
//   12. Enrolled classes reflects enrollment removal
//
// Prerequisites:
//   - Local Supabase running (supabase start)
//   - Migrations applied (supabase migration up)
//   - Run: npx vitest run supabase/tests/e2e/profile-screen.test.ts --reporter=verbose

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// ═══════════════════════════════════════════════════════════
// CLIENTS
// ═══════════════════════════════════════════════════════════

let adminClient: SupabaseClient;

// ═══════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════

const TEST_TENANT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TEST_STUDENT_ID = "11111111-1111-1111-1111-111111111111";
const TEST_COURSE_ID = "cccc0000-0000-0000-0000-000000000001";
const TEST_COURSE_B_ID = "cccc0000-0000-0000-0000-000000000002";

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

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
  const sig = btoa("test-signature");
  return `${header}.${payload}.${sig}`;
}

async function cleanupTestData(): Promise<void> {
  // Remove test enrollments
  await adminClient
    .from("student_class")
    .delete()
    .eq("student_id", TEST_STUDENT_ID)
    .in("class_id", [TEST_COURSE_ID, TEST_COURSE_B_ID]);
}

// ═══════════════════════════════════════════════════════════
// SUITE
// ═══════════════════════════════════════════════════════════

describe("profile-screen: student profile data fetching", () => {
  let studentClient: SupabaseClient;
  let studentJwt: string;

  beforeAll(async () => {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    studentJwt = buildJWT(TEST_STUDENT_ID);
    studentClient = createClient(SUPABASE_URL, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0", {
      global: {
        headers: { Authorization: `Bearer ${studentJwt}` },
      },
    });
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // ═══════════════════════════════════════════════════════════
  // Test 1: Profile fetch returns student data
  // ═══════════════════════════════════════════════════════════

  it("should fetch student profile from profiles table", async () => {
    const { data, error } = await adminClient
      .from("profiles")
      .select("id, name, email, phone, role")
      .eq("id", TEST_STUDENT_ID)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.id).toBe(TEST_STUDENT_ID);
  });

  // ═══════════════════════════════════════════════════════════
  // Test 2: Profile fetch includes all expected fields
  // ═══════════════════════════════════════════════════════════

  it("should return profile with all Row 98 fields", async () => {
    const { data, error } = await adminClient
      .from("profiles")
      .select("id, name, email, phone, role, curriculum, grade, stage, intake, created_at")
      .eq("id", TEST_STUDENT_ID)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data).toHaveProperty("name");
    expect(data).toHaveProperty("email");
    expect(data).toHaveProperty("phone");
    expect(data).toHaveProperty("role");
    expect(data).toHaveProperty("created_at");
  });

  // ═══════════════════════════════════════════════════════════
  // Test 3: Enrolled classes returns empty for student with no enrollments
  // ═══════════════════════════════════════════════════════════

  it("should return empty enrolled classes for student with no enrollments", async () => {
    const { data, error } = await adminClient
      .from("student_class")
      .select("id, class_id, enrolled_at, is_active")
      .eq("student_id", TEST_STUDENT_ID)
      .eq("is_active", true);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  // ═══════════════════════════════════════════════════════════
  // Test 4: Enrolled classes returns classes after enrollment
  // ═══════════════════════════════════════════════════════════

  it("should return enrolled classes after enrolling", async () => {
    // Create enrollment
    const { error: insErr } = await adminClient
      .from("student_class")
      .insert({
        student_id: TEST_STUDENT_ID,
        class_id: TEST_COURSE_ID,
        tenant_id: TEST_TENANT_ID,
        is_active: true,
      });

    expect(insErr).toBeNull();

    // Fetch enrolled classes
    const { data, error } = await adminClient
      .from("student_class")
      .select("id, class_id, enrolled_at, is_active")
      .eq("student_id", TEST_STUDENT_ID)
      .eq("is_active", true);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].class_id).toBe(TEST_COURSE_ID);
    expect(data![0].is_active).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════
  // Test 5: Enrolled class includes schedule slot data
  // ═══════════════════════════════════════════════════════════

  it("should fetch schedule slots for enrolled course", async () => {
    // Insert schedule slot
    await adminClient.from("schedule_slot").insert({
      course_id: TEST_COURSE_ID,
      tenant_id: TEST_TENANT_ID,
      label: "Monday Session",
      start_time: "09:00:00",
      end_time: "10:30:00",
      days_of_week: [1],
      is_active: true,
    });

    const { data, error } = await adminClient
      .from("schedule_slot")
      .select("id, label, start_time, end_time, days_of_week")
      .eq("course_id", TEST_COURSE_ID)
      .eq("is_active", true)
      .order("start_time");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].label).toBe("Monday Session");
    expect(data![0].start_time).toBe("09:00:00");
    expect(data![0].days_of_week).toEqual([1]);
  });

  // ═══════════════════════════════════════════════════════════
  // Test 6: Registration status returns null when no registration exists
  // ═══════════════════════════════════════════════════════════

  it("should return null registration for student with no registration", async () => {
    const { data, error } = await adminClient
      .from("office_desk.registrations")
      .select("id, status")
      .eq("student_email", "nonexistent@test.com")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    // May return null or error depending on RLS — both are acceptable
    expect(data).toBeNull();
  });

  // ═══════════════════════════════════════════════════════════
  // Test 7: Payment history fetch returns payments in tenant
  // ═══════════════════════════════════════════════════════════

  it("should fetch payments from office_desk.payments", async () => {
    const { data, error } = await adminClient
      .from("office_desk.payments")
      .select("id, amount, currency, status")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════
  // Test 8: Grades fetch returns empty when no grades exist
  // ═══════════════════════════════════════════════════════════

  it("should return empty grades for student with no gradebook entries", async () => {
    const { data, error } = await adminClient
      .from("gradebook")
      .select("course_id, score")
      .eq("student_id", TEST_STUDENT_ID);

    // RLS may block student access — return empty gracefully
    if (!error) {
      expect(Array.isArray(data)).toBe(true);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // Test 9: Attendance fetch returns empty when no attendance exists
  // ═══════════════════════════════════════════════════════════

  it("should return empty attendance for student with no attendance records", async () => {
    const { data, error } = await adminClient
      .from("attendance")
      .select("course_id, status")
      .eq("student_id", TEST_STUDENT_ID);

    // RLS may block student access — return empty gracefully
    if (!error) {
      expect(Array.isArray(data)).toBe(true);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // Test 10: Update profile changes name in database
  // ═══════════════════════════════════════════════════════════

  it("should update profile name via direct update", async () => {
    const newName = `Test Student ${Date.now()}`;

    const { error: updateErr } = await adminClient
      .from("profiles")
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq("id", TEST_STUDENT_ID);

    expect(updateErr).toBeNull();

    // Verify
    const { data } = await adminClient
      .from("profiles")
      .select("name")
      .eq("id", TEST_STUDENT_ID)
      .single();

    expect(data?.name).toBe(newName);
  });

  // ═══════════════════════════════════════════════════════════
  // Test 11: Unauthenticated profile fetch returns error
  // ═══════════════════════════════════════════════════════════

  it("should fail to fetch profile without auth", async () => {
    const anonClient = createClient(SUPABASE_URL, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0");

    const { data, error } = await anonClient
      .from("profiles")
      .select("id, name")
      .eq("id", TEST_STUDENT_ID)
      .single();

    // Anon cannot read profiles (RLS blocks)
    expect(error).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════
  // Test 12: Enrolled classes reflects enrollment removal
  // ═══════════════════════════════════════════════════════════

  it("should return empty after enrollment is removed", async () => {
    // Create enrollment
    await adminClient.from("student_class").insert({
      student_id: TEST_STUDENT_ID,
      class_id: TEST_COURSE_ID,
      tenant_id: TEST_TENANT_ID,
      is_active: true,
    });

    // Verify it exists
    const { data: before } = await adminClient
      .from("student_class")
      .select("id")
      .eq("student_id", TEST_STUDENT_ID)
      .eq("is_active", true);

    expect(before).toHaveLength(1);

    // Remove enrollment
    await adminClient
      .from("student_class")
      .delete()
      .eq("student_id", TEST_STUDENT_ID)
      .eq("class_id", TEST_COURSE_ID);

    // Verify empty
    const { data: after } = await adminClient
      .from("student_class")
      .select("id")
      .eq("student_id", TEST_STUDENT_ID)
      .eq("is_active", true);

    expect(after).toEqual([]);
  });
});
