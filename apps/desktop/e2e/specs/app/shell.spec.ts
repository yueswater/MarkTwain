import { expect, test } from "../../support/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { captureDesktop } from "../../support/desktop-capture";
import { OUT_DIR } from "../../support/paths";

const cases = [
  { locale: "zh-Hant", lang: "zh-TW", tagline: "離線撰寫你的論文。" },
  { locale: "en", lang: "en-US", tagline: "Write your thesis, offline." },
] as const;

for (const { locale, lang, tagline } of cases) {
  for (const scale of [1, 1.5]) {
    test(`shell in ${locale} at ${scale}x`, async ({ launch }) => {
      // The path of the folder contains a space and Chinese characters, like real user environments
      const { app } = await launch({ name: "測試", lang, args: [`--force-device-scale-factor=${scale}`] });
      const page = await app.firstWindow();
      await expect(page.getByRole("heading", { name: "MarkTwain" })).toBeVisible();
      await expect(page.locator("main")).toContainText(tagline);

      mkdirSync(OUT_DIR, { recursive: true });
      await page.screenshot({ path: join(OUT_DIR, `shell-${locale}-${scale}x.png`) });
      // Whole desktop with title bar, implemented on Windows only and only when the window is shown, results land in the CI screenshots artifact
      if (scale === 1 && process.env.E2E_HEADED === "1") {
        await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.focus());
        captureDesktop(join(OUT_DIR, `desktop-${process.platform}-${locale}.png`));
      }
    });
  }
}
