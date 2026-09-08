import { defineConfig, devices } from "@playwright/test";

const PORT = 5173;

/**
 * Drives the real dev server against the real database — there are no mocks in
 * this suite. It exists to cover what react-dom/server and curl could not:
 * popstate, click propagation, and the admin forms end to end.
 *
 * Serial, single worker: the tests share one Postgres and assert on counts, so
 * parallel runs would race each other.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    stdout: "pipe",
    timeout: 60_000,
  },
});
