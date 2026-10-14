import { _electron as electron, expect, test } from "@playwright/test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { captureDesktop } from "./desktop-capture";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");
const outDir = resolve(__dirname, "../e2e-output");

const cases = [
  { locale: "zh-Hant", lang: "zh-TW", tagline: "離線撰寫你的論文。" },
  { locale: "en", lang: "en-US", tagline: "Write your thesis, offline." },
] as const;

for (const { locale, lang, tagline } of cases) {
  for (const scale of [1, 1.5]) {
    test(`shell in ${locale} at ${scale}x`, async () => {
      // Path contains a space and Chinese characters, like real user environments
      const userData = mkdtempSync(join(tmpdir(), "marktwain 測試 "));
      const args = [
        `--user-data-dir=${userData}`,
        `--lang=${lang}`,
        `--force-device-scale-factor=${scale}`,
      ];
      if (process.platform === "linux") args.push("--no-sandbox");

      const app = await electron.launch({
        executablePath: findPackagedExecutable(dist),
        args,
      });
      try {
        const page = await app.firstWindow();
        await expect(page.getByRole("heading", { name: "MarkTwain" })).toBeVisible();
        await expect(page.locator("main")).toContainText(tagline);

        mkdirSync(outDir, { recursive: true });
        await page.screenshot({ path: join(outDir, `shell-${locale}-${scale}x.png`) });
        // Whole desktop with title bar, implemented on Windows only, results land in the CI screenshots artifact
        if (scale === 1) {
          await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.focus());
          captureDesktop(join(outDir, `desktop-${process.platform}-${locale}.png`));
        }
      } finally {
        await app.close();
        rmSync(userData, { recursive: true, force: true });
      }
    });
  }
}
