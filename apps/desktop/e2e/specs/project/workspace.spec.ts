import { expect, test } from "../../support/test";
import { existsSync } from "node:fs";
import { closeProject, createProject } from "../../support/project";

// Replaces the native file dialogs with a test hook and walks from the welcome screen through document management.

test("create a project, manage documents, close and reopen it", async ({ launch }) => {
  const { app, file } = await launch({ name: "工作區", lang: "zh-TW", projectName: "我的論文.marktwain" });
  const page = await app.firstWindow();
  const sidebar = page.getByRole("complementary", { name: "文件" });
  const item = (name: string) => sidebar.getByRole("button", { name, exact: true });

  await createProject(page, "zh-TW");
  await expect(item("中文摘要")).toBeVisible();
  await expect(item("第 1 章")).toBeVisible();
  await expect(page.locator("header")).toContainText("我的論文");
  expect(existsSync(file)).toBe(true);

  // Add a second chapter
  await sidebar.getByRole("button", { name: "新增文件" }).click();
  await page.getByRole("menuitem", { name: "章", exact: true }).click();
  await expect(item("第 2 章")).toBeVisible();
  // The new document opens at once, so what is typed next does not land in the old one
  await expect(item("第 2 章")).toHaveAttribute("aria-current", "true");
  await expect(item("第 1 章")).not.toHaveAttribute("aria-current", "true");
  await page.locator(".ProseMirror").click();
  await page.keyboard.type("新章的內容");
  await expect(page.locator(".ProseMirror")).toContainText("新章的內容");
  await item("第 1 章").click();
  await expect(page.locator(".ProseMirror")).not.toContainText("新章的內容");
  await item("第 2 章").click();

  // Only one abstract is allowed so the menu item is disabled
  await sidebar.getByRole("button", { name: "新增文件" }).click();
  await expect(page.getByRole("menuitem", { name: "中文摘要", exact: true })).toBeDisabled();
  await expect(page.getByRole("menuitem", { name: "英文摘要", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");

  // Rename chapter 2
  await sidebar.getByRole("button", { name: "第 2 章的操作" }).click({ force: true });
  await page.getByRole("menuitem", { name: "重新命名" }).click();
  await page.getByLabel("標題").fill("研究方法");
  await page.getByRole("button", { name: "儲存" }).click();
  await expect(item("研究方法")).toBeVisible();

  // Move up, the renamed chapter becomes the first one and the old chapter 1 becomes chapter 2
  await sidebar.getByRole("button", { name: "研究方法的操作" }).click({ force: true });
  await page.getByRole("menuitem", { name: "上移" }).click();
  await expect(item("第 2 章")).toBeVisible();

  // Delete, needs confirmation
  await sidebar.getByRole("button", { name: "第 2 章的操作" }).click({ force: true });
  await page.getByRole("menuitem", { name: "刪除" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "刪除" }).click();
  await expect(item("第 2 章")).toHaveCount(0);

  // After closing, the welcome screen shows, reopen and the content is kept
  await closeProject(page, "zh-TW");
  await expect(page.getByRole("button", { name: "開啟專案" })).toBeVisible();
  await page.getByRole("button", { name: "開啟專案" }).click();
  await expect(item("研究方法")).toBeVisible();
  await expect(item("中文摘要")).toBeVisible();
});
