import { expect, test } from "@playwright/test";

test.describe("Not found", () => {
  test("Invalid observation id shows not found", async ({ page }) => {
    await page.goto("/observations/bad-id-12345");
    await expect(page.getByText("Not found")).toBeVisible({ timeout: 10000 });
  });

  test("Invalid person id shows not found", async ({ page }) => {
    await page.goto("/people/bad-id-12345");
    await expect(page.getByText("Not found")).toBeVisible({ timeout: 10000 });
  });

  test("Invalid system id shows not found", async ({ page }) => {
    await page.goto("/systems/bad-id-12345");
    await expect(page.getByText("Not found")).toBeVisible({ timeout: 10000 });
  });
});
