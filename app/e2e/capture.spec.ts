import { expect, test } from "@playwright/test";

const captureBtn = (page: { getByRole: (a: string, b?: { name: string }) => unknown }) =>
  page.getByRole("banner").getByRole("button", { name: "Capture" });

test.describe("Fast capture", () => {
  test("Capture button opens modal", async ({ page }) => {
    await page.goto("/");
    await captureBtn(page).waitFor({ state: "visible" });
    await captureBtn(page).click();
    await expect(page.getByText("Quick capture")).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder("What did you notice?")).toBeVisible();
  });

  test("Submit with empty observation shows validation", async ({ page }) => {
    await page.goto("/");
    await captureBtn(page).waitFor({ state: "visible" });
    await captureBtn(page).click();
    await expect(page.getByText("Quick capture")).toBeVisible({ timeout: 5000 });
    // Fill spaces so form submits (textarea has required) but our validation rejects
    await page.getByPlaceholder("What did you notice?").fill("   ");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Observation is required.")).toBeVisible({ timeout: 3000 });
  });

  test("Create observation with only text closes modal and creates", async ({ page }) => {
    const text = `E2E test observation ${Date.now()}`;
    await page.goto("/");
    await captureBtn(page).click();
    await page.getByPlaceholder("What did you notice?").fill(text);
    await page.getByRole("button", { name: "Save" }).click();
    await page.goto("/observations");
    await expect(page.getByText(text)).toBeVisible({ timeout: 15000 });
  });

  test("Cancel closes modal without saving", async ({ page }) => {
    await page.goto("/");
    await captureBtn(page).click();
    await page.getByPlaceholder("What did you notice?").fill("Will not save");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Quick capture")).not.toBeVisible({ timeout: 3000 });
    await page.goto("/observations");
    await expect(page.getByText("Will not save")).not.toBeVisible();
  });

  test("Inline add person: create person in modal, then save observation with link", async ({ page }) => {
    const personName = `E2E Inline Person ${Date.now()}`;
    const obsText = `E2E observation linked to inline person ${Date.now()}`;
    await page.goto("/");
    await captureBtn(page).click();
    await expect(page.getByText("Quick capture")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "+ Add person" }).click();
    await expect(page.getByPlaceholder("Full name")).toBeVisible({ timeout: 3000 });
    await page.getByPlaceholder("Full name").fill(personName);
    await page.getByRole("button", { name: "Save and link" }).click();
    await expect(page.getByPlaceholder("Full name")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(personName)).toBeVisible();
    await page.getByPlaceholder("What did you notice?").fill(obsText);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Quick capture")).not.toBeVisible({ timeout: 5000 });
    await page.goto("/observations");
    await expect(page.getByText(obsText)).toBeVisible({ timeout: 10000 });
    await page.getByRole("row").filter({ hasText: obsText }).getByRole("link").click();
    await expect(page.getByText(personName)).toBeVisible();
  });
});
