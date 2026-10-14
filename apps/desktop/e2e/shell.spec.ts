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
      // 路徑含空白與中文，與使用者的實際環境一致（規格 9.1 節規則 2）
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
        // 整個桌面（含標題列）：Windows 才有實作，結果在 CI 的 screenshots 成品裡
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
