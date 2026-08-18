// flows/school-desk-grades.spec.ts
// FLOW 4: School Desk → Manage Student → Post Grade → Send Message

import { test, expect } from "@playwright/test";
import {
  seedTestData,
  cleanupTestData,
  supabaseAdmin,
  TEST_USERS,
  TEST_TENANT_ID,
} from "../helpers/db";
import { loginViaAPI } from "../helpers/auth";
import { sendTemplateEmail } from "../helpers/payment";
import { assertEmailSent, assertNotificationCreated } from "../helpers/assertions";

const STUDENT_EMAIL = "school-student-e2e@example.com";
const PARENT_EMAIL = "school-parent-e2e@example.com";
const STUDENT_NAME = "School Desk Student";

test.describe("FLOW 4: School Desk → Grades → Message", () => {
  let teacherToken: string;
  const STUDENT_USER_ID = "b1000000-0000-0000-0000-000000000001";
  let assignmentId: string;

  test.beforeAll(async () => {
    await seedTestData();
    teacherToken = await loginViaAPI(
      TEST_USERS.teacher.email,
      TEST_USERS.teacher.password
    );

    // Create or update student user (ignore error if already exists)
    await supabaseAdmin.auth.admin.createUser({
      id: STUDENT_USER_ID,
      email: STUDENT_EMAIL,
      password: "TestPass123!",
      email_confirm: true,
    });

    // Create student profile (without tenant_id first, then assign via bypass)
    await supabaseAdmin.from("profiles").upsert(
      {
        id: STUDENT_USER_ID,
        name: STUDENT_NAME,
        role: "student",
      },
      { onConflict: "id" }
    );
    await supabaseAdmin.rpc("seed_profile_tenant", {
      p_user_id: STUDENT_USER_ID,
      p_tenant_id: TEST_TENANT_ID,
    });

    // Create parent profile (without tenant_id first, then assign via bypass)
    await supabaseAdmin.from("profiles").upsert(
      {
        id: TEST_USERS.parent.id,
        name: "Parent E2E",
        role: "parent",
      },
      { onConflict: "id" }
    );
    await supabaseAdmin.rpc("seed_profile_tenant", {
      p_user_id: TEST_USERS.parent.id,
      p_tenant_id: TEST_TENANT_ID,
    });

    // Seed parent course for FK constraint
    await supabaseAdmin
      .schema("school_desk")
      .from("courses")
      .upsert(
        {
          id: "c1000000-0000-0000-0000-000000000001",
          tenant_id: TEST_TENANT_ID,
          title: "E2E Math 101 (Parent)",
          description: "Parent course for assignment FK",
          price: 999,
          teacher_id: TEST_USERS.teacher.id,
          status: "published",
        },
        { onConflict: "id" }
      );

    // Create assignment
    const { data: assignment } = await supabaseAdmin
      .schema("school_desk")
      .from("assignments")
      .insert({
        tenant_id: TEST_TENANT_ID,
        course_id: "c1000000-0000-0000-0000-000000000001",
        title: "E2E Midterm Exam",
        description: "E2E test assignment",
        max_score: 100,
        weight: 0.5,
        created_by: TEST_USERS.teacher.id,
      })
      .select()
      .single();

    assignmentId = assignment!.id;
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test("4.1 — teacher posts grade via API", async () => {
    const { error } = await supabaseAdmin
      .schema("school_desk")
      .from("gradebook")
      .insert({
        tenant_id: TEST_TENANT_ID,
        assignment_id: assignmentId,
        student_id: STUDENT_USER_ID,
        course_id: "c1000000-0000-0000-0000-000000000001",
        score: 85,
        graded_by: TEST_USERS.teacher.id,
      });

    expect(error, `Grade insert failed: ${error?.message}`).toBeNull();
  });

  test("4.2 — grade appears in student's gradebook", async () => {
    const { data: grades } = await supabaseAdmin
      .schema("school_desk")
      .from("gradebook")
      .select("*")
      .eq("student_id", STUDENT_USER_ID)
      .eq("assignment_id", assignmentId);

    expect(grades, "Grades not found").toBeTruthy();
    expect(grades!.length).toBeGreaterThan(0);
    expect(Number(grades![0].score)).toBe(85);
  });

  test("4.3 — grade_posted email sent to parent", async () => {
    const result = await sendTemplateEmail({
      accessToken: teacherToken,
      templateId: "grade_posted",
      recipientEmail: PARENT_EMAIL,
      recipientName: "Parent",
      data: {
        student_name: STUDENT_NAME,
        course_name: "Mathematics 101",
        assignment_name: "E2E Midterm Exam",
        score: "85",
        max_score: "100",
        percentage: "85",
        class_average: "72",
        portal_url: "http://localhost:5173/lms/school-desk",
      },
    });

    expect(result.status).toBe(200);
    await assertEmailSent("grade_posted", PARENT_EMAIL);
  });

  test("4.4 — teacher sends message notification to parent", async () => {
    const { error } = await supabaseAdmin.from("notifications").insert({
      tenant_id: TEST_TENANT_ID,
      user_id: TEST_USERS.parent.id,
      type: "message_received",
      title: "New Message",
      body: `Teacher sent a message about ${STUDENT_NAME}: "Great progress on the midterm!"`,
      data: {
        studentName: STUDENT_NAME,
        senderName: "Teacher E2E",
        channel: "in_app",
      },
    });

    expect(error, `Message notification failed: ${error?.message}`).toBeNull();
    await assertNotificationCreated(TEST_USERS.parent.id, "message_received");
  });
});
