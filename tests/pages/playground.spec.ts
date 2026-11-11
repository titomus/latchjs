import { expect, test } from "@playwright/test";

test("the published bundle powers state, swaps, and the performance lab", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await expect(page.locator(".number")).toHaveText("0");
  await page.getByRole("button", { name: "Increment" }).click();
  await expect(page.locator(".number")).toHaveText("1");

  await page.getByRole("button", { name: "Fetch HTML fragment" }).click();
  await expect(page.locator("#fragment")).toContainText("Server fragment");
  await page.locator("#fragment button").click();
  await expect(page.locator("#fragment button")).toContainText("Clicks: 1");

  await page.getByRole("button", { name: "Run 20 updates" }).click();
  await expect(page.locator("#bench-result")).toContainText("bindings");
  expect(errors).toEqual([]);
});
