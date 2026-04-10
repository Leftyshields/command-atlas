import { expect, test } from "@playwright/test";

test.describe("Observations", () => {
  test("List shows empty state when no observations", async ({ page }) => {
    await page.goto("/observations");
    await expect(page.getByRole("heading", { name: /observations/i })).toBeVisible();
    const empty = page.getByText(/no observations yet/i);
    const table = page.getByRole("table");
    await expect(empty.or(table)).toBeVisible();
  });

  test("After creating observation, list shows it and detail works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: "Capture" }).click();
    const text = `Obs for detail ${Date.now()}`;
    await page
      .getByPlaceholder(/describe the manual work|what did you notice/i)
      .fill(text);
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByRole("heading", { name: /quick capture/i })).not.toBeVisible();
    await page.goto("/observations");
    await expect(page.getByText(text)).toBeVisible();
    await page.getByRole("row").filter({ hasText: text }).getByRole("link").click();
    await expect(page.getByText(text)).toBeVisible();
  });

  test("Observation detail has Edit and Delete", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: "Capture" }).click();
    const text = `Obs for edit delete ${Date.now()}`;
    await page.getByPlaceholder("Describe the manual work or steps").fill(text);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Quick capture")).not.toBeVisible({ timeout: 5000 });
    await page.goto("/observations");
    await page.getByRole("row").filter({ hasText: text }).getByRole("link").click();
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
  });
});
