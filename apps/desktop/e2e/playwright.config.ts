import { defineConfig } from "@playwright/test";

// A new project asks for the facts of the thesis, the tests skip that question unless they are about it
process.env.MARKTWAIN_TEST_NO_PROFILE_DIALOG = "1";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: { trace: "retain-on-failure" },
});
