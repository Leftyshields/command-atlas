import { expect, test } from "@playwright/test";

test.describe("People", () => {
  test("Add person requires name", async ({ page }) => {
    await page.goto("/people/new");
    await expect(page.getByRole("heading", { name: "Add person" })).toBeVisible();
    await page.getByRole("textbox").first().fill("   ");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Name is required")).toBeVisible({ timeout: 5000 });
  });

  test("Create person and see on detail", async ({ page }) => {
    await page.goto("/people/new");
    const name = `E2E Person ${Date.now()}`;
    await page.getByRole("textbox").first().fill(name);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/people\/[^/]+$/);
    await expect(page.getByRole("heading", { name })).toBeVisible();
  });

});

test.describe("Systems", () => {
  test("Add system requires name", async ({ page }) => {
    await page.goto("/systems/new");
    await expect(page.getByRole("heading", { name: "Add system" })).toBeVisible();
    await page.getByRole("textbox").first().fill("   ");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Name is required")).toBeVisible({ timeout: 5000 });
  });

  test("Create system and see on detail", async ({ page }) => {
    await page.goto("/systems/new");
    const name = `E2E System ${Date.now()}`;
    await page.getByRole("textbox").first().fill(name);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/systems\/[^/]+$/);
    await expect(page.getByText(name)).toBeVisible();
  });
});
