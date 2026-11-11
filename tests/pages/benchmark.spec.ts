import { expect, test } from "@playwright/test";

test("comparison lab runs pinned Alpine and HTMX workloads and shows actual results", async ({ page }) => {
  test.setTimeout(110_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/benchmark.html");
  await expect(page.locator("#size-metrics")).toContainText("HTMX");
  await page.locator("#state-rows").selectOption("50");
  await page.locator("#state-reps").selectOption("5");
  await page.getByRole("button", { name: /Run reactivity comparison/ }).click();
  await expect(page.locator("#state-result")).toContainText("Alpine.js", { timeout: 60_000 });
  await expect(page.locator("#state-result")).toContainText("Latch.js");
  await expect(page.locator("#state-status")).toContainText("Completed");

  await page.locator("#swap-reps").selectOption("3");
  await page.getByRole("button", { name: /Run HTTP swap comparison/ }).click();
  await expect(page.locator("#swap-result")).toContainText("HTMX", { timeout: 60_000 });
  await expect(page.locator("#swap-result")).toContainText("Latch.js");
  await expect(page.locator("#swap-status")).toContainText("Completed");
  expect(errors).toEqual([]);
});
