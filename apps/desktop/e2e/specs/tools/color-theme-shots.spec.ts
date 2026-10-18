import { join, resolve } from "node:path";
import { mkdirSync, readdirSync } from "node:fs";
import { expect, test } from "../../support/test";
import { createProject, reopenWithChapter } from "../../support/project";

/**
 * Takes the screenshots of the color themes that the settings show, one for each theme of resources/color-themes and one for the look of the app.
 * It is a tool and not a test: run it with MARKTWAIN_SHOTS=1 when a theme is added or changed, and commit the pictures.
 */
test.skip(process.env.MARKTWAIN_SHOTS !== "1", "a tool, run with MARKTWAIN_SHOTS=1");

const THEMES = resolve(__dirname, "../../../../../resources/color-themes");
const OUT = resolve(__dirname, "../../../src/renderer/src/assets/color-themes");

const SAMPLE = `# 緒論

近年來，**深度學習**在醫療影像上的表現相當亮眼，詳見[相關研究](https://example.com)。本文以 $f(x)=x^2$ 為例，說明方法。

- 資料蒐集與前處理
- 模型訓練與評估
- 結果分析與討論

> 模型的好壞，最終由資料決定。

\`\`\`python
def loss(y, y_hat):
    return (y - y_hat) ** 2
\`\`\`

## 研究方法

本研究採用三個步驟，詳見下表。

| 步驟 | 內容 |
| --- | --- |
| 一 | 蒐集資料 |
| 二 | 訓練模型 |
`;

test("color theme screenshots", async ({ launch }) => {
  test.setTimeout(300_000);
  mkdirSync(OUT, { recursive: true });
  const ids = ["default", ...readdirSync(THEMES).filter((name) => name.endsWith(".marktwain.colortheme")).map((name) => name.replace(".marktwain.colortheme", ""))];
  const { app } = await launch({ name: "主題", lang: "zh-TW", projectName: "我的論文.marktwain" });
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setContentSize(960, 600));
  await createProject(page, "zh-TW");
  await reopenWithChapter(page, SAMPLE, "zh-TW");
  await expect(page.locator(".ProseMirror h1")).toHaveText("緒論");

  for (const id of ids) {
    await page.keyboard.press("ControlOrMeta+,");
    const dialog = page.getByRole("dialog", { name: "設定" });
    await dialog.getByRole("button", { name: "色彩主題", exact: true }).click();
    await dialog.locator(`[data-theme-id="${id}"]`).click();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // The colors are set at once, the dialog takes a moment to fade
    await page.locator(".ProseMirror").click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, `${id}.jpg`), type: "jpeg", quality: 82 });
  }
});
