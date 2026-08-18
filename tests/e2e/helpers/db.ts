// helpers/db.ts — Supabase DB helpers for E2E tests
// Uses service_role key to bypass RLS for test setup/teardown

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export const TEST_TENANT_ID = "e97e5c3a-1234-4321-abcd-000000000001";

// ═══════════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════════

export interface TestUsers {
  admin: { id: string; email: string; password: string };
  office: { id: string; email: string; password: string };
  teacher: { id: string; email: string; password: string };
  parent: { id: string; email: string; password: string };
}

export const TEST_USERS: TestUsers = {
  admin: {
    id: "a1000000-0000-0000-0000-000000000001",
    email: "admin@e2e-test.edu",
    password: "TestPass123!",
  },
  office: {
    id: "a2000000-0000-0000-0000-000000000002",
    email: "office@e2e-test.edu",
    password: "TestPass123!",
  },
  teacher: {
    id: "a3000000-0000-0000-0000-000000000003",
    email: "teacher@e2e-test.edu",
    password: "TestPass123!",
  },
  parent: {
    id: "a4000000-0000-0000-0000-000000000004",
    email: "parent@e2e-test.edu",
    password: "TestPass123!",
  },
};

export const TEST_COURSES = [
  {
    id: "c1000000-0000-0000-0000-000000000001",
    title: "Mathematics 101",
    description: "E2E test course — basic math",
    price: 500,
    teacher_id: TEST_USERS.teacher.id,
    status: "published" as const,
  },
  {
    id: "c1000000-0000-0000-0000-000000000002",
    title: "English 101",
    description: "E2E test course — English fundamentals",
    price: 450,
    teacher_id: TEST_USERS.teacher.id,
    status: "draft" as const,
  },
];

// ═══════════════════════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════════════════════

export async function seedTestData(): Promise<void> {
  // Create auth users (ignore if exists)
  for (const user of Object.values(TEST_USERS)) {
    await supabaseAdmin.auth.admin
      .createUser({
        id: user.id,
        email: user.email,
        password: user.password,
        email_confirm: true,
      })
      .catch(() => {});
  }

  // Create profiles (upsert without tenant_id first, then assign via bypass RPC)
  for (const [role, user] of Object.entries(TEST_USERS)) {
    const profileRole = role === "parent" ? "parent" : role;
    await supabaseAdmin.from("profiles").upsert(
      {
        id: user.id,
        name: `${role.charAt(0).toUpperCase() + role.slice(1)} E2E`,
        role: profileRole,
      },
      { onConflict: "id" }
    );
    // Assign tenant_id via helper that bypasses the immutability trigger
    await supabaseAdmin.rpc("seed_profile_tenant", {
      p_user_id: user.id,
      p_tenant_id: TEST_TENANT_ID,
    });
  }

  // Create courses
  for (const course of TEST_COURSES) {
    await supabaseAdmin
      .schema("school_desk")
      .from("courses")
      .upsert(
        {
          id: course.id,
          title: course.title,
          description: course.description,
          price: course.price,
          teacher_id: course.teacher_id,
          status: course.status,
          tenant_id: TEST_TENANT_ID,
        },
        { onConflict: "id" }
      );
  }
}

// ═══════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════

export async function cleanupTestData(): Promise<void> {
  // Delete any stale courses from prior test runs (title contains "E2E")
  await supabaseAdmin
    .schema("school_desk")
    .from("courses")
    .delete()
    .ilike("title", "%E2E%");

  await supabaseAdmin
    .from("email_logs")
    .delete()
    .like("recipient_email", "%@e2e-test.edu");

  await supabaseAdmin
    .from("notifications")
    .delete()
    .in("user_id", Object.values(TEST_USERS).map((u) => u.id));

  await supabaseAdmin
    .schema("office_desk")
    .from("refunds")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  await supabaseAdmin
    .schema("office_desk")
    .from("stripe_events")
    .delete()
    .like("stripe_event_id", "evt_e2e_%");

  await supabaseAdmin
    .schema("office_desk")
    .from("registrations")
    .delete()
    .like("student_email", "%@e2e-test.edu");

  await supabaseAdmin
    .schema("school_desk")
    .from("courses")
    .delete()
    .in("id", TEST_COURSES.map((c) => c.id));

  // Cleanup gradebook for E2E students
  await supabaseAdmin
    .schema("school_desk")
    .from("gradebook")
    .delete()
    .eq("student_id", "b1000000-0000-0000-0000-000000000001");

  // Cleanup enrollment
  await supabaseAdmin
    .schema("school_desk")
    .from("enrollments")
    .delete()
    .eq("student_id", "b1000000-0000-0000-0000-000000000001");

  // Cleanup test student user
  await supabaseAdmin.auth.admin
    .deleteUser("b1000000-0000-0000-0000-000000000001")
    .catch(() => {});
}

// ═══════════════════════════════════════════════════════════
// QUERY HELPERS
// ═══════════════════════════════════════════════════════════

export async function getRegistration(email: string) {
  const { data } = await supabaseAdmin
    .schema("office_desk")
    .from("registrations")
    .select("*")
    .eq("student_email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function getNotifications(userId: string) {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getEmailLogs(tenantId?: string) {
  const query = supabaseAdmin
    .from("email_logs")
    .select("*")
    .order("created_at", { ascending: false });
  if (tenantId) query.eq("tenant_id", tenantId);
  const { data } = await query;
  return data ?? [];
}

export async function getStripeEvents() {
  const { data } = await supabaseAdmin
    .schema("office_desk")
    .from("stripe_events")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getRefunds() {
  const { data } = await supabaseAdmin
    .schema("office_desk")
    .from("refunds")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}
