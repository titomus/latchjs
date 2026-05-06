import { expect, test } from "@playwright/test";

test.describe("showcase", () => {
  test("handles task creation, confirm cancel, confirm delete, and table filtering", async ({ page }) => {
    await page.goto("/examples/showcase/index.html");

    await expect(page.getByRole("heading", { name: "Task board" })).toBeVisible();
    await expect(page.locator("#task-list .task-item")).toHaveCount(3);

    await page.getByPlaceholder("Ship keyboard shortcuts").fill("Ship keyboard shortcuts");
    await page.getByRole("button", { name: "Add task" }).click();

    await expect(page.locator("#task-list .task-item")).toHaveCount(4);
    await expect(page.locator(".latch-toast").filter({ hasText: "Task added" }).last()).toBeVisible();
    await expect(page.locator("#stats")).toContainText("4");

    const firstDelete = page.locator("#task-list .task-item").first().getByRole("button", { name: "Delete" });
    await firstDelete.click();
    await expect(page.getByRole("alertdialog", { name: "Delete task" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator("#task-list .task-item")).toHaveCount(4);

    await firstDelete.click();
    await page.getByRole("button", { name: "Delete task" }).click();
    await expect(page.locator("#task-list .task-item")).toHaveCount(3);
    await expect(page.locator(".latch-toast").filter({ hasText: "Task deleted" }).last()).toBeVisible();

    const search = page.getByPlaceholder("Search a release or owner");
    await search.fill("malik");
    await expect(page.locator("#release-table tbody tr")).toHaveCount(2);
    await expect(page).toHaveURL(/q=malik/);
  });

  test("supports keyboard interaction for dropdown and tabs", async ({ page }) => {
    await page.goto("/examples/showcase/index.html");

    await page.locator("[lt-dropdown-trigger]").focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("[lt-dropdown-menu]")).toBeVisible();
    await expect(page.locator("[lt-dropdown-menu] button").first()).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(page.locator("[lt-dropdown-menu]")).toBeHidden();

    await page.locator('[lt-tab="events"]').focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator('[lt-tab="state"]')).toBeFocused();
    await expect(page.locator('[lt-panel="state"]')).toBeVisible();
  });
});