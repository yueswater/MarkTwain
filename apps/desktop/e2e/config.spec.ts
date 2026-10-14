import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

test("project settings are filled in, validated, saved and restored", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 設定 "));
  const file = join(dir, "我的論文.marktwain");
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=zh-TW"];
  if (process.platform === "linux") args.push("--no-sandbox");

  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: file },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "新增專案" }).click();
    await page.getByRole("button", { name: "專案設定" }).click();

    // The title defaults to the project name, no red text before the author is filled in
    await expect(page.getByLabel("論文題目（中文）")).toHaveValue("我的論文");
    await expect(page.getByRole("alert")).toHaveCount(0);

    await page.getByLabel("作者（中文）").fill("王小明");
    await page.getByLabel("學號").fill("112345678");
    await page.getByLabel("關鍵字（中文）").fill("機器學習，自然語言處理, 論文");
    await page.getByRole("combobox", { name: "學校格式" }).click();
    await page.getByRole("option", { name: "國立臺灣大學" }).click();

    // A bad date shows below the field and disappears once fixed
    await page.getByLabel("口試日期").fill("2026/06/15");
    await expect(page.getByRole("alert")).toHaveText("請使用 YYYY-MM-DD 格式。");
    await page.getByLabel("口試日期").fill("2026-06-15");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("已儲存");

    // Close and reopen the project, the settings are still there
    await page.getByRole("button", { name: "關閉專案" }).click();
    await page.getByRole("button", { name: "開啟專案" }).click();
    await page.getByRole("button", { name: "專案設定" }).click();
    await expect(page.getByLabel("作者（中文）")).toHaveValue("王小明");
    await expect(page.getByLabel("學號")).toHaveValue("112345678");
    await expect(page.getByLabel("口試日期")).toHaveValue("2026-06-15");
    await expect(page.getByLabel("關鍵字（中文）")).toHaveValue("機器學習, 自然語言處理, 論文");
    await expect(page.getByRole("combobox", { name: "學校格式" })).toContainText("國立臺灣大學");

    const state = await page.evaluate(async () => {
      const result = await window.marktwain.invoke("config:get");
      return result.ok ? result.data : null;
    });
    expect(state?.issues).toEqual([]);
    expect(state?.fields.keywords).toEqual(["機器學習", "自然語言處理", "論文"]);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
