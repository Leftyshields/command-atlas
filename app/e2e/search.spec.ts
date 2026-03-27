import { expect, test } from "@playwright/test";

test.describe("Search", () => {
  test("Search page has input and min 2 chars hint", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: /search/i })).toBeVisible();
    await expect(page.getByPlaceholder(/min 2 chars/i)).toBeVisible();
    await page.getByPlaceholder(/min 2 chars/i).fill("a");
    await page.getByRole("button", { name: /search/i }).click();
    await expect(page.getByText(/at least 2 characters/i)).toBeVisible();
  });

  test("Search with no results shows message", async ({ page }) => {
    await page.goto("/search");
    await page.getByPlaceholder(/min 2 chars/i).fill("xyznonexistent123");
    await page.getByRole("button", { name: /search/i }).click();
    await expect(page.getByText(/no results for/i)).toBeVisible({ timeout: 5000 });
  });

  test("Search finds observation by text", async ({ page }) => {
    const phrase = `UniqueSearchable${Date.now()}`;
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: "Capture" }).click();
    await page.getByPlaceholder("Describe the manual work or steps").fill(phrase);
    await page.getByRole("button", { name: "Save" }).click();
    await page.goto("/search");
    await page.getByPlaceholder(/min 2 chars/i).fill("UniqueSearchable");
    await page.getByRole("button", { name: /search/i }).click();
    await expect(page.getByText(phrase)).toBeVisible({ timeout: 5000 });
  });
});
