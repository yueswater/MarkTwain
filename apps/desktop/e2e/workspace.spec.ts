import { _electron as electron, expect, test } from "@playwright/test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

// Replaces the native file dialogs with a test hook and walks from the welcome screen through document management.
test("create a project, manage documents, close and reopen it", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 工作區 "));
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
    const sidebar = page.getByRole("complementary", { name: "文件" });
    const item = (name: string) => sidebar.getByRole("button", { name, exact: true });

    await page.getByRole("button", { name: "新增專案" }).click();
    await expect(item("摘要")).toBeVisible();
    await expect(item("第 1 章")).toBeVisible();
    await expect(page.locator("header")).toContainText("我的論文");
    expect(existsSync(file)).toBe(true);

    // Add a second chapter
    await sidebar.getByRole("button", { name: "新增文件" }).click();
    await page.getByRole("menuitem", { name: "章", exact: true }).click();
    await expect(item("第 2 章")).toBeVisible();

    // Only one abstract is allowed so the menu item is disabled
    await sidebar.getByRole("button", { name: "新增文件" }).click();
    await expect(page.getByRole("menuitem", { name: "摘要", exact: true })).toBeDisabled();
    await page.keyboard.press("Escape");

    // Rename chapter 2
    await sidebar.getByRole("button", { name: "「第 2 章」的操作" }).click({ force: true });
    await page.getByRole("menuitem", { name: "重新命名" }).click();
    await page.getByLabel("標題").fill("研究方法");
    await page.getByRole("button", { name: "儲存" }).click();
    await expect(item("研究方法")).toBeVisible();

    // Move up, the renamed chapter becomes the first one and the old chapter 1 becomes chapter 2
    await sidebar.getByRole("button", { name: "「研究方法」的操作" }).click({ force: true });
    await page.getByRole("menuitem", { name: "上移" }).click();
    await expect(item("第 2 章")).toBeVisible();

    // Delete, needs confirmation
    await sidebar.getByRole("button", { name: "「第 2 章」的操作" }).click({ force: true });
    await page.getByRole("menuitem", { name: "刪除" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "刪除" }).click();
    await expect(item("第 2 章")).toHaveCount(0);

    // After closing, the welcome screen shows, reopen and the content is kept
    await page.getByRole("button", { name: "關閉專案" }).click();
    await expect(page.getByRole("button", { name: "開啟專案" })).toBeVisible();
    await page.getByRole("button", { name: "開啟專案" }).click();
    await expect(item("研究方法")).toBeVisible();
    await expect(item("摘要")).toBeVisible();
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
