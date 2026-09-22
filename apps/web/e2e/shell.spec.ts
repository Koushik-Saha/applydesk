import { test, expect } from "@playwright/test";

test("app shell renders sidebar nav and dashboard empty state", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Jobs" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(/no activity yet/i)).toBeVisible();

  await page.getByRole("link", { name: "Jobs" }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.getByText(/no jobs yet/i)).toBeVisible();
});
