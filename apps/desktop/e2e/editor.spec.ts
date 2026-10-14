import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

test("typing in the editor is saved as Markdown and survives a reopen", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 編輯 "));
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

    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await editor.click();
    // Markdown 輸入規則：「# 」變成標題，「**」包住的文字變成粗體
    await page.keyboard.type("# 緒論");
    await page.keyboard.press("Enter");
    await page.keyboard.type("這是**重點**內文。");
    await expect(page.getByRole("status")).toHaveText("已儲存");
    await expect(editor.locator("h1")).toHaveText("緒論");
    await expect(editor.locator("strong")).toHaveText("重點");

    // 切到摘要再切回來：內容還在（切換時會先存檔）
    const sidebar = page.getByRole("complementary", { name: "文件" });
    await sidebar.getByRole("button", { name: "摘要", exact: true }).click();
    await expect(page.locator(".ProseMirror h1")).toHaveCount(0);
    await sidebar.getByRole("button", { name: "第 1 章", exact: true }).click();
    await expect(page.locator(".ProseMirror h1")).toHaveText("緒論");

    // 關閉再開啟專案：從 SQLite 讀回 Markdown
    await page.getByRole("button", { name: "關閉專案" }).click();
    await page.getByRole("button", { name: "開啟專案" }).click();
    await expect(page.locator(".ProseMirror h1")).toHaveText("緒論");
    await expect(page.locator(".ProseMirror strong")).toHaveText("重點");

    // 檔案裡存的是 Markdown，不是 JSON
    const text = await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return "";
      const chapter = list.data.find((d) => d.kind === "chapter");
      const doc = chapter && (await window.marktwain.invoke("document:get", { id: chapter.id }));
      return doc && doc.ok ? doc.data.text : "";
    });
    expect(text).toBe("# 緒論\n\n這是**重點**內文。\n");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
