// flows/admin-courses.spec.ts
// FLOW 5: Admin Course Builder → Assign Instructor

import { test, expect } from "@playwright/test";
import {
  seedTestData,
  cleanupTestData,
  supabaseAdmin,
  TEST_USERS,
  TEST_TENANT_ID,
  TEST_COURSES,
} from "../helpers/db";
import { assertCourseExists } from "../helpers/assertions";

const NEW_COURSE = {
  title: "E2E Science 101",
  description: "Automated test course for E2E validation",
  price: 600,
};

test.describe("FLOW 5: Admin Course Builder", () => {
  test.beforeAll(async () => {
    await seedTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test("5.1 — admin creates new course via API", async () => {
    const { data: course, error } = await supabaseAdmin
      .schema("school_desk")
      .from("courses")
      .insert({
        tenant_id: TEST_TENANT_ID,
        title: NEW_COURSE.title,
        description: NEW_COURSE.description,
        price: NEW_COURSE.price,
        teacher_id: TEST_USERS.teacher.id,
        status: "draft",
      })
      .select()
      .single();

    expect(error, `Course creation failed: ${error?.message}`).toBeNull();
    expect(course).toBeTruthy();
    expect(course!.title).toBe(NEW_COURSE.title);
    expect(course!.status).toBe("draft");
  });

  test("5.2 — admin publishes course", async () => {
    const { error } = await supabaseAdmin
      .schema("school_desk")
      .from("courses")
      .update({ status: "published" })
      .eq("title", NEW_COURSE.title);

    expect(error, `Publish failed: ${error?.message}`).toBeNull();
    await assertCourseExists(NEW_COURSE.title, { status: "published" });
  });

  test("5.3 — course has correct price and instructor", async () => {
    const course = await assertCourseExists(NEW_COURSE.title, {
      price: NEW_COURSE.price,
    });
    expect(course.teacher_id).toBe(TEST_USERS.teacher.id);
  });

  test("5.4 — existing E2E courses are seeded correctly", async () => {
    for (const c of TEST_COURSES) {
      await assertCourseExists(c.title, { status: c.status });
    }
  });

  test("5.5 — admin unpublishes course (toggle status)", async () => {
    const { error } = await supabaseAdmin
      .schema("school_desk")
      .from("courses")
      .update({ status: "draft" })
      .eq("title", NEW_COURSE.title);

    expect(error).toBeNull();
    await assertCourseExists(NEW_COURSE.title, { status: "draft" });
  });
});
