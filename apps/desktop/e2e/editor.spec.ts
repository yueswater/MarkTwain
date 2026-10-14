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

test("math can be inserted from the dialog, typed with $…$, edited, and saved as Markdown", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 公式 "));
  const file = join(dir, "論文.marktwain");
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");

  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: file },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // 從對話框插入：先看預覽，語法錯誤時不能送出
    await page.getByRole("button", { name: "Inline math" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("LaTeX").fill("\\frac{a");
    await expect(dialog.getByRole("alert")).toHaveText("This formula has a syntax error.");
    await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();
    await dialog.getByLabel("LaTeX").fill("x^2");
    await expect(dialog.getByTestId("math-preview")).toBeVisible();
    await dialog.getByRole("button", { name: "Insert" }).click();
    await expect(editor.locator(".katex")).toHaveCount(1);

    // 中文後面直接輸入 $…$ 也能變成公式
    await page.keyboard.type("，且設$y=1$");
    await expect(editor.locator(".katex")).toHaveCount(2);

    // 點擊公式編輯
    await editor.locator("[data-type='inline-math'] .katex-html").first().click();
    await page.getByRole("dialog").getByLabel("LaTeX").fill("z^3");
    await page.getByRole("dialog").getByRole("button", { name: "Update" }).click();
    await expect(editor.locator("[data-type='inline-math']").first()).toHaveAttribute("data-latex", "z^3");

    // 獨立公式
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Math block" }).click();
    await page.getByRole("dialog").getByLabel("LaTeX").fill("E=mc^2");
    await page.getByRole("dialog").getByRole("button", { name: "Insert" }).click();
    await expect(editor.locator("[data-type='block-math']")).toHaveCount(1);
    await expect(page.getByRole("status")).toHaveText("Saved");

    const text = await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return "";
      const chapter = list.data.find((d) => d.kind === "chapter");
      const doc = chapter && (await window.marktwain.invoke("document:get", { id: chapter.id }));
      return doc && doc.ok ? doc.data.text : "";
    });
    expect(text).toContain("$z^3$，且設$y=1$");
    expect(text).toContain("$$\nE=mc^2\n$$");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("footnotes, citations and cross-references can be inserted, shown, and saved as Markdown", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 引用 "));
  const file = join(dir, "論文.marktwain");
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");

  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: file },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    const editor = page.locator(".ProseMirror");
    await editor.click();
    const dialog = page.getByRole("dialog");
    // 對話框關閉、焦點回到編輯器之後才繼續打字
    const settle = async () => {
      await expect(dialog).toBeHidden();
      await expect(editor).toBeFocused();
    };

    await page.keyboard.type("## Motivation");
    await page.keyboard.press("Enter");
    await page.keyboard.type("As shown in ");

    // 交叉引用：選尚未有標籤的標題，會自動加上標籤
    await page.getByRole("button", { name: "Cross-reference" }).click();
    await dialog.getByRole("combobox", { name: "Target" }).click();
    await page.getByRole("option", { name: "Section · Motivation" }).click();
    await dialog.getByRole("button", { name: "Insert" }).click();
    await settle();
    await expect(editor.locator("[data-cross-ref]")).toHaveAttribute("data-display", "Motivation");

    // 腳註
    await page.keyboard.type(" and noted");
    await page.getByRole("button", { name: "Footnote" }).click();
    await dialog.getByLabel("Footnote text").fill("A **bold** remark.");
    await dialog.getByRole("button", { name: "Insert" }).click();
    await settle();
    await expect(editor.locator("sup[data-footnote]")).toHaveAttribute("data-n", "1");

    // 文獻引用
    await page.keyboard.type(" see ");
    await page.getByRole("button", { name: "Citation" }).click();
    await dialog.getByLabel("Bibliography keys").fill("wang2020, lee2019");
    await dialog.getByRole("button", { name: "Insert" }).click();
    await settle();
    await expect(editor.locator("[data-citation]")).toHaveAttribute("data-display", "(wang2020; lee2019)");

    // 點擊腳註可以再編輯
    await editor.locator("sup[data-footnote]").click();
    await dialog.getByLabel("Footnote text").fill("Edited.");
    await dialog.getByRole("button", { name: "Update" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");

    const text = await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return "";
      const chapter = list.data.find((d) => d.kind === "chapter");
      const doc = chapter && (await window.marktwain.invoke("document:get", { id: chapter.id }));
      return doc && doc.ok ? doc.data.text : "";
    });
    expect(text).toMatch(/^## Motivation \{#sec:[0-9a-f]{4}\}\n/);
    expect(text).toMatch(/As shown in @sec:[0-9a-f]{4} and noted\[\^1\] see \[@wang2020; @lee2019\]/);
    expect(text).toContain("[^1]: Edited.");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("tables get rows, a caption and notes; definition lists keep term and description", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 表格 "));
  const file = join(dir, "論文.marktwain");
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");

  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: file },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    const editor = page.locator(".ProseMirror");
    await editor.click();
    const dialog = page.getByRole("dialog");
    const settle = async () => {
      await expect(dialog).toBeHidden();
      await expect(editor).toBeFocused();
    };

    await page.getByRole("button", { name: "Insert table" }).click();
    await page.keyboard.type("A");
    await page.keyboard.press("Tab");
    await page.keyboard.type("B");
    await page.keyboard.press("Tab");
    await page.keyboard.type("C");
    await page.getByRole("button", { name: "Add row below" }).click();
    await expect(editor.locator("tr")).toHaveCount(4);

    await page.getByRole("button", { name: "Table caption and notes" }).click();
    await dialog.getByLabel("Caption").fill("Results");
    await dialog.getByLabel("Notes").fill("Source: survey");
    await dialog.getByRole("button", { name: "Save" }).click();
    await settle();

    // 表格之後：游標移到文件最後，加入定義清單
    await page.keyboard.press("Control+End");
    await page.getByRole("button", { name: "Definition list" }).click();
    await page.keyboard.type("alpha");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Learning rate");
    await expect(editor.locator("dl dt")).toHaveText("alpha");
    await expect(editor.locator("dl dd")).toHaveText("Learning rate");
    await expect(page.getByRole("status")).toHaveText("Saved");

    const text = await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return "";
      const chapter = list.data.find((d) => d.kind === "chapter");
      const doc = chapter && (await window.marktwain.invoke("document:get", { id: chapter.id }));
      return doc && doc.ok ? doc.data.text : "";
    });
    expect(text).toContain("| A");
    expect(text).toContain("Results");
    expect(text).toContain("Source: survey");
    expect(text).toContain("alpha\n: Learning rate");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
