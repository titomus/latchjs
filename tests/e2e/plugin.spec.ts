import { expect, test } from "@playwright/test";

test.describe("plugin lab", () => {
  test("loads with autofocus and runs plugin commands", async ({ page }) => {
    await page.goto("/examples/plugin/index.html");

    const input = page.getByPlaceholder("The plugin autofocuses this field on load");
    await expect(input).toBeFocused();

    await page.getByRole("button", { name: "Publish changelog" }).click();
    await expect(page.getByText("publish changelog", { exact: true })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Plugin command: publish changelog" })).toBeVisible();
  });
});