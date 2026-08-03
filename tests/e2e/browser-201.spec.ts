import { test, expect } from "@playwright/test";

const LEAD_FORM_URL = "http://localhost:3456/lead-form.html";

test.describe("browser-201 — submit-lead E2E", () => {
  test("fills lead form and gets 201 from submit-lead EF", async ({ page }) => {
    let capturedStatus = 0;
    let capturedBody = "";

    await page.route("**/functions/v1/submit-lead", async (route) => {
      const response = await route.fetch();
      capturedStatus = response.status();
      capturedBody = await response.text();
      await route.fulfill({ response });
    });

    await page.goto(LEAD_FORM_URL);

    // Wait for the Turnstile widget to produce a real token.
    await expect
      .poll(
        async () =>
          page
            .locator("#turnstile-widget input[name='cf-turnstile-response']")
            .inputValue(),
        { timeout: 15_000 },
      )
      .not.toBe("");

    // Fill the form fields.
    await page.fill("#name", "E2E Browser");
    await page.fill("#email", "e2e-browser-2026-08-03@test.local");
    await page.fill("#tenant", "redhouse-devotional");

    // Submit — the intercepted route forwards the original request as-is.
    await page.click("#leadForm button[type='submit']");

    // Assert 201.
    await expect
      .poll(() => capturedStatus, { timeout: 10_000 })
      .toBe(201);

    const body = JSON.parse(capturedBody);
    expect(body.status).toBe("received");

    // Verify the page response element shows 201.
    await expect(page.locator("#response")).toContainText("201");
  });
});
