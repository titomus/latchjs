import { expect, test } from "@playwright/test";

test("showcase: server table, validation, create, live search and deletion", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#contact-results tbody tr")).toHaveCount(5);
  await page.getByLabel("Search contacts").fill("Olivia");
  await expect(page.locator("#contact-results tbody tr")).toHaveCount(1);
  await expect(page.locator("#contact-results")).toContainText("Olivia Chen");
  await page.getByLabel("Search contacts").fill("");
  await expect(page.locator("#contact-results tbody tr")).toHaveCount(5);

  await page.locator("#lead-name").fill("Jamie Test");
  await page.locator("#lead-company").fill("Test Studio");
  await page.locator("#lead-email").fill("jamie@company.test");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.locator("#contact-form-success")).toContainText("Jamie Test");
  await expect(page.locator("#contact-results")).toContainText("Jamie Test");
  await expect(page.locator("#metric-contacts")).toHaveText("9");

  await page.locator("#contact-9").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("alertdialog").getByRole("button", { name: "Confirm" }).click();
  await expect(page.locator("#contact-9")).toHaveCount(0);
  await expect(page.locator("#metric-contacts")).toHaveText("8");

  await page.locator("#feature-search").fill("modal");
  await expect(page.locator("#feature-results")).toContainText("Modals");
  expect(errors).toEqual([]);
});

test("showcase: local reactive pricing, tabs, modal, drawer and toasts", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".pricing-number")).toContainText("117");
  await page.getByRole("button", { name: "Add seat" }).click();
  await expect(page.locator(".pricing-number")).toContainText("156");
  await page.getByRole("button", { name: "Toggle annual billing" }).click();
  await expect(page.locator(".pricing-number")).toContainText("116");

  await page.getByRole("tab", { name: "HTML" }).click();
  await expect(page.getByRole("tabpanel", { name: "HTML" })).toBeVisible();
  await page.getByRole("button", { name: "Open modal" }).click();
  await expect(page.getByRole("dialog")).toContainText("How Latch.js works");
  await page.getByRole("dialog").getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Open remote drawer" }).click();
  await expect(page.getByRole("dialog")).toContainText("Preview drawer");
  await page.getByRole("dialog").getByRole("button", { name: "Close drawer" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});


test("showcase: keyed tasks can be added, reordered, toggled and removed", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#task-list li")).toHaveCount(3);
  await expect(page.locator("#task-open-count")).toHaveText("2");

  await page.locator("#task-add").click();
  await expect(page.locator("#task-list li")).toHaveCount(4);
  await expect(page.locator("#task-open-count")).toHaveText("3");

  await page.locator("#task-reverse").click();
  await expect(page.locator("#task-list li").first()).toContainText("New task 4");
  await page.locator("#task-list li").first().locator("input[type=checkbox]").check();
  await expect(page.locator("#task-open-count")).toHaveText("2");

  await page.locator("#task-list li").first().getByRole("button", { name: "Remove" }).click();
  await expect(page.locator("#task-list li")).toHaveCount(3);
  await expect(page.locator("#task-open-count")).toHaveText("2");
  expect(errors).toEqual([]);
});
