import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/pages",
  timeout: 30000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4180",
    ...devices["Desktop Chrome"]
  },
  webServer: {
    command: "python3 -m http.server 4180 --bind 127.0.0.1 --directory _site",
    url: "http://127.0.0.1:4180/",
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
