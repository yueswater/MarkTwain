import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

/** Opens the settings window on the thesis section. */
async function openThesisSettings(page: import("@playwright/test").Page): Promise<void> {
  const dialog = page.getByRole("dialog");
  if (!(await dialog.isVisible())) await page.locator("header").getByRole("button", { name: "設定" }).click();
  await dialog.getByRole("button", { name: "論文", exact: true }).click();
}

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
    await openThesisSettings(page);

    // The title defaults to the project name, no red text before the author is filled in
    await expect(page.getByLabel("論文題目（中文）")).toHaveValue("我的論文");
    await expect(page.getByRole("alert")).toHaveCount(0);

    await page.getByLabel("作者（中文）").fill("王小明");
    await page.getByLabel("學號").fill("112345678");
    await page.getByLabel("關鍵字（中文）").fill("機器學習，自然語言處理, 論文");
    await page.getByRole("combobox", { name: "學校格式" }).click();
    await page.getByRole("option", { name: "國立臺灣大學" }).click();

    // College and department come from lists of the chosen school and fill the English names too
    await page.getByRole("combobox", { name: "學院", exact: true }).click();
    await page.getByRole("option").first().click();
    await page.getByRole("combobox", { name: "系所", exact: true }).click();
    await page.getByRole("option").first().click();
    await page.getByRole("combobox", { name: "學位（中文）" }).click();
    await page.getByRole("option", { name: "博士" }).click();
    await page.getByRole("combobox", { name: "論文語言" }).click();
    await page.getByRole("option", { name: "英文" }).click();

    // A bad date shows below the field and disappears once fixed
    await page.getByLabel("口試日期").fill("2026/06/15");
    await expect(page.getByRole("alert")).toHaveText("請使用 YYYY-MM-DD 格式。");
    await page.getByLabel("口試日期").fill("2026-06-15");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("已儲存");

    // Close and reopen the project, the settings are still there
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "關閉專案" }).click();
    await page.getByRole("button", { name: "開啟專案" }).click();
    await openThesisSettings(page);
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
    expect(state?.fields.college).not.toBe("");
    expect({ c: state?.fields.college, e: state?.fields.collegeEn }).toEqual({ c: expect.any(String), e: expect.stringMatching(/./) });
    expect(state?.fields.institute).not.toBe("");
    expect(state?.fields).toMatchObject({ degree: "博士", degreeEn: "Doctor", language: "english" });
    expect(state?.fields.keywords).toEqual(["機器學習", "自然語言處理", "論文"]);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("editing the last field of the settings never scrolls the whole window", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 捲動 "));
  const file = join(dir, "論文.marktwain");
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
    await openThesisSettings(page);
    await page.getByLabel("關鍵字（英文）").fill("one, two");
    await page.getByLabel("關鍵字（英文）").press("End");
    const state = await page.evaluate(() => ({
      pageScroll: document.scrollingElement?.scrollTop ?? 0,
      bodyScroll: document.body.scrollTop,
      headerTop: document.querySelector("header")?.getBoundingClientRect().top ?? -1,
      sidebarBottom: document.querySelector("aside")?.getBoundingClientRect().bottom ?? 0,
      innerHeight: window.innerHeight,
    }));
    expect(state.pageScroll).toBe(0);
    expect(state.bodyScroll).toBe(0);
    expect(state.headerTop).toBe(0);
    // The sidebar still reaches the bottom of the window
    expect(Math.round(state.sidebarBottom)).toBe(state.innerHeight);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
