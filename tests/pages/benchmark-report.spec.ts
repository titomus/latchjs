import { expect, test } from "@playwright/test";
test("capture comparative runtime samples for CI artifact", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/benchmark.html");
  await expect(page.locator("#size-metrics")).toContainText("HTMX");

  // The controlled CI runner is a repeatable reference machine, not a
  // universal end-user performance result.
  await page.locator("#state-rows").selectOption("250");
  await page.locator("#state-reps").selectOption("20");
  await page.locator("#run-state").click();
  await expect(page.locator("#state-status")).toContainText("Completed", { timeout: 60_000 });

  await page.locator("#swap-reps").selectOption("10");
  await page.locator("#run-swap").click();
  await expect(page.locator("#swap-status")).toContainText("Completed", { timeout: 60_000 });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#download-results").click()
  ]);
  expect(download.suggestedFilename()).toMatch(/^latch-comparison-.*\.json$/);
  const result = await page.evaluate(() => (window as unknown as { LatchBenchmarkReport: any }).LatchBenchmarkReport);
  await testInfo.attach("comparison-samples", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json"
  });
  expect(result.versions.latch).toBeTruthy();
  expect(result.versions.htmx).toBe("2.0.11");
  expect(result.versions.alpine).toBe("3.17.5");
  expect(result.tests.state.libraries.latch.samples).toHaveLength(20);
  expect(result.tests.state.libraries.alpine.samples).toHaveLength(20);
  expect(result.tests.swap.libraries.latch.samples).toHaveLength(10);
  expect(result.tests.swap.libraries.htmx.samples).toHaveLength(10);

  const summary = {
    state250: {
      latchMedianMs: result.tests.state.libraries.latch.medianMs,
      alpineMedianMs: result.tests.state.libraries.alpine.medianMs
    },
    swap80: {
      latchMedianMs: result.tests.swap.libraries.latch.medianMs,
      htmxMedianMs: result.tests.swap.libraries.htmx.medianMs
    }
  };
  console.log("LATCH_CI_BENCHMARK_SAMPLES", JSON.stringify(summary));
});
