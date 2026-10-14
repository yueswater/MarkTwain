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
      await expect(page.locator("main")).toContainText("離線論文編輯器");

      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "English" }).click();
      await expect(page.locator("main")).toContainText("Offline thesis editor");
    } finally {
      await first.close();
    }

    // 重新啟動：作業系統語系仍是繁體中文，但使用者選的英文要被記住
    const second = await launch(userData);
    try {
      const page = await second.firstWindow();
      await expect(page.locator("main")).toContainText("Offline thesis editor");
    } finally {
      await second.close();
    }
  } finally {
    rmSync(userData, { recursive: true, force: true });
  }
});
