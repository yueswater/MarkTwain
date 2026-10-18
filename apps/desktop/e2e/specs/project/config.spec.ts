import type { Page } from "@playwright/test";
import { expect, test } from "../../support/test";
import { closeProject, createProject } from "../../support/project";

/** Opens the settings window on a page of the thesis section. */
async function openThesisSettings(page: import("@playwright/test").Page, name = "基本資料"): Promise<void> {
  // The dialog about the thesis of a new project can still be closing, so only the dialog of the settings counts
  const dialog = page.getByRole("dialog", { name: "設定" });
  // A list that was just chosen from is still closing and hides the dialog from the roles for a moment
  await expect(page.getByRole("listbox")).toHaveCount(0);
  if (!(await dialog.isVisible())) await page.getByRole("button", { name: "設定", exact: true }).click();
  await dialog.getByRole("button", { name, exact: true }).click();
}

test("project settings are filled in, validated, saved and restored", async ({ launch }) => {
  const { app, file } = await launch({ name: "設定", lang: "zh-TW", projectName: "我的論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page, "zh-TW");
  await openThesisSettings(page);

  // The title defaults to the project name, no red text before the author is filled in
  await expect(page.getByLabel("論文題目（中文）")).toHaveValue("我的論文");
  await expect(page.getByRole("alert")).toHaveCount(0);

  await page.getByLabel("作者（中文）").fill("王小明");
  await page.getByLabel("學號").fill("112345678");
  // Keywords are tags, a comma closes a word and Enter closes the last one
  const keywords = page.getByLabel("關鍵字（中文）");
  await keywords.fill("機器學習，自然語言處理, 論文");
  await keywords.press("Enter");
  await expect(page.locator("[data-tag]")).toHaveText(["#機器學習", "#自然語言處理", "#論文"]);
  await page.getByRole("button", { name: "移除 #自然語言處理" }).click();
  await keywords.fill("自然語言處理");
  await keywords.press("Enter");
  // The school, department and language are on the other page
  await openThesisSettings(page, "學校與格式");
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

  // Dates are picked, so a badly written date cannot be typed
  await openThesisSettings(page, "基本資料");
  await expect(page.getByLabel("口試日期")).toHaveAttribute("type", "date");
  await expect(page.getByLabel("出版日期")).toHaveAttribute("type", "date");
  await page.getByLabel("口試日期").fill("2026-06-15");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("已儲存");

  // Close and reopen the project, the settings are still there
  await page.keyboard.press("Escape");
  await closeProject(page, "zh-TW");
  await page.getByRole("button", { name: "開啟專案" }).click();
  await openThesisSettings(page);
  await expect(page.getByLabel("作者（中文）")).toHaveValue("王小明");
  await expect(page.getByLabel("學號")).toHaveValue("112345678");
  await expect(page.getByLabel("口試日期")).toHaveValue("2026-06-15");
  await expect(page.locator("[data-tag]")).toHaveText(["#機器學習", "#論文", "#自然語言處理"]);
  await openThesisSettings(page, "學校與格式");
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
  expect(state?.fields.keywords).toEqual(["機器學習", "論文", "自然語言處理"]);
});


test("editing the last field of the settings never scrolls the whole window", async ({ launch }) => {
  const { app, file } = await launch({ name: "捲動", lang: "zh-TW", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page, "zh-TW");
  await openThesisSettings(page);
  await page.getByLabel("關鍵字（英文）").fill("one, two");
  await page.getByLabel("關鍵字（英文）").press("Enter");
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
});
