import { defineConfig } from "@playwright/test";

// A new project asks for the facts of the thesis, the tests skip that question unless they are about it
process.env.MARKTWAIN_TEST_NO_PROFILE_DIALOG = "1";

export default defineConfig({
  testDir: "./specs",
  testMatch: "**/*.spec.ts",
  // A build waits up to 90 s for the first PDF on a slow runner, so a test has to be allowed longer than that
  timeout: 150_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  outputDir: "../test-results",
  use: { trace: "retain-on-failure" },
});
