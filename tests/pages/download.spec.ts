import { expect, test } from "@playwright/test";

test("published distribution contains standalone JS, ZIP and verifiable manifest", async ({ page, request }) => {
  await page.goto("/download.html");
  await expect(page.getByRole("heading", { name: "Du JavaScript. Aucun npm." })).toBeVisible();
  const manifestResponse = await request.get("/downloads/manifest.json");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json() as {
    version: string;
    files: Array<{ name: string; bytes: number }>;
  };
  expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/);
  for (const name of ["latch.js", "latch.min.js", "latch.esm.js", "latch-latest.zip"]) {
    const entry = manifest.files.find((file) => file.name === name);
    expect(entry, name).toBeDefined();
    expect(entry!.bytes).toBeGreaterThan(500);
    const path = name.endsWith(".zip") ? "/downloads/" + name : "/dist/" + name;
    const response = await request.get(path);
    expect(response.ok(), name).toBe(true);
    expect((await response.body()).byteLength).toBe(entry!.bytes);
    await expect(page.locator('[data-size="' + name + '"]')).toContainText("Ko");
  }
  const sums = await request.get("/downloads/SHA256SUMS.txt");
  expect(sums.ok()).toBe(true);
  const text = await sums.text();
  expect(text).toContain("dist/latch.min.js");
  expect(text).toContain("downloads/latch-latest.zip");
});
