import { expect, test } from "@playwright/test";

test.describe("Dashboard and navigation", () => {
  test("Header has title and nav links", async ({ page }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Command Atlas" })).toBeVisible({ timeout: 10000 });
    await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Observations" })).toBeVisible();
    await expect(header.getByRole("link", { name: "People" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Systems" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Search" })).toBeVisible();
    await expect(header.getByRole("button", { name: "Capture" })).toBeVisible();
  });

  test("Nav links go to correct pages", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Observations" }).click();
    await expect(page).toHaveURL(/\/observations/);
    await page.getByRole("link", { name: "People" }).click();
    await expect(page).toHaveURL(/\/people/);
    await page.getByRole("link", { name: "Systems" }).click();
    await expect(page).toHaveURL(/\/systems/);
    await page.getByRole("link", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/search/);
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\//);
  });

  test("Dashboard shows recent observations or empty state", async ({ page }) => {
    await page.goto("/");
    const recent = page.getByText(/recent observations/i);
    const empty = page.getByText(/no observations yet/i);
    await expect(recent.or(empty)).toBeVisible({ timeout: 5000 });
  });
});
