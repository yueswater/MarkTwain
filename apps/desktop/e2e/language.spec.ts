import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

function launch(userData: string) {
  const args = [`--user-data-dir=${userData}`, "--lang=zh-TW"];
  if (process.platform === "linux") args.push("--no-sandbox");
  return electron.launch({ executablePath: findPackagedExecutable(dist), args });
}

test("switching the language takes effect at once and is remembered", async () => {
  const userData = mkdtempSync(join(tmpdir(), "marktwain 語言 "));
  try {
    const first = await launch(userData);
    try {
      const page = await first.firstWindow();
      await expect(page.locator("main")).toContainText("離線撰寫你的論文。");

      await page.getByTestId("language-toggle").click();
      await expect(page.locator("main")).toContainText("Write your thesis, offline.");
    } finally {
      await first.close();
    }

    // Restart, the OS locale is still Traditional Chinese but the English chosen by the user is remembered
    const second = await launch(userData);
    try {
      const page = await second.firstWindow();
      await expect(page.locator("main")).toContainText("Write your thesis, offline.");
    } finally {
      await second.close();
    }
  } finally {
    rmSync(userData, { recursive: true, force: true });
  }
});
