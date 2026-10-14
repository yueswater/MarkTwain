import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import zlib from "node:zlib";
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
    // Markdown input rules, "# " becomes a heading and text wrapped in ** becomes bold
    await page.keyboard.type("# 緒論");
    await page.keyboard.press("Enter");
    await page.keyboard.type("這是**重點**內文。");
    await expect(page.getByRole("status")).toHaveText("已儲存");
    await expect(editor.locator("h1")).toHaveText("緒論");
    await expect(editor.locator("strong")).toHaveText("重點");

    // Switch to the abstract and back, the content is kept because switching saves first
    const sidebar = page.getByRole("complementary", { name: "文件" });
    await sidebar.getByRole("button", { name: "摘要", exact: true }).click();
    await expect(page.locator(".ProseMirror h1")).toHaveCount(0);
    await sidebar.getByRole("button", { name: "第 1 章", exact: true }).click();
    await expect(page.locator(".ProseMirror h1")).toHaveText("緒論");

    // Close and reopen the project, Markdown is read back from SQLite
    await page.getByRole("button", { name: "關閉專案" }).click();
    await page.getByRole("button", { name: "開啟專案" }).click();
    await expect(page.locator(".ProseMirror h1")).toHaveText("緒論");
    await expect(page.locator(".ProseMirror strong")).toHaveText("重點");

    // The file stores Markdown, not JSON
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

    // Insert from the dialog, preview first, a syntax error blocks submit
    await page.getByRole("button", { name: "Inline math" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("LaTeX").fill("\\frac{a");
    await expect(dialog.getByRole("alert")).toHaveText("This formula has a syntax error.");
    await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();
    await dialog.getByLabel("LaTeX").fill("x^2");
    await expect(dialog.getByTestId("math-preview")).toBeVisible();
    await dialog.getByRole("button", { name: "Insert" }).click();
    await expect(editor.locator(".katex")).toHaveCount(1);

    // Typing $...$ right after Chinese text also becomes a formula
    await page.keyboard.type("，且設$y=1$");
    await expect(editor.locator(".katex")).toHaveCount(2);

    // Click a formula to edit it
    await editor.locator("[data-type='inline-math'] .katex-html").first().click();
    await page.getByRole("dialog").getByLabel("LaTeX").fill("z^3");
    await page.getByRole("dialog").getByRole("button", { name: "Update" }).click();
    await expect(editor.locator("[data-type='inline-math']").first()).toHaveAttribute("data-latex", "z^3");

    // Block formula
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
    // Continue typing only after the dialog closes and focus is back in the editor
    const settle = async () => {
      await expect(dialog).toBeHidden();
      await expect(editor).toBeFocused();
    };

    await page.keyboard.type("## Motivation");
    await page.keyboard.press("Enter");
    await page.keyboard.type("As shown in ");

    // Cross-reference, pick an unlabeled heading and a label is added automatically
    await page.getByRole("button", { name: "Cross-reference" }).click();
    await dialog.getByRole("combobox", { name: "Target" }).click();
    await page.getByRole("option", { name: "Section · Motivation" }).click();
    await dialog.getByRole("button", { name: "Insert" }).click();
    await settle();
    await expect(editor.locator("[data-cross-ref]")).toHaveAttribute("data-display", "Motivation");

    // Footnote
    await page.keyboard.type(" and noted");
    await page.getByRole("button", { name: "Footnote" }).click();
    await dialog.getByLabel("Footnote text").fill("A **bold** remark.");
    await dialog.getByRole("button", { name: "Insert" }).click();
    await settle();
    await expect(editor.locator("sup[data-footnote]")).toHaveAttribute("data-n", "1");

    // Citation
    await page.keyboard.type(" see ");
    await page.getByRole("button", { name: "Citation" }).click();
    await dialog.getByLabel("Bibliography keys").fill("wang2020, lee2019");
    await dialog.getByRole("button", { name: "Insert" }).click();
    await settle();
    await expect(editor.locator("[data-citation]")).toHaveAttribute("data-display", "(wang2020; lee2019)");

    // Click a footnote to edit it again
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
    await page.getByRole("dialog").getByRole("button", { name: "Insert" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(editor).toBeFocused();
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

    // After the table, move the cursor to the end and add a definition list
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

// A 1x1 PNG
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("an image is stored in the project, shown in the editor, and saved as Markdown", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 圖片 "));
  const file = join(dir, "論文.marktwain");
  const image = join(dir, "我的 圖.png");
  writeFileSync(image, PNG_1X1);
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");

  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: file, MARKTWAIN_TEST_IMAGE_PATH: image },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    const editor = page.locator(".ProseMirror");
    await editor.click();
    const dialog = page.getByRole("dialog");

    await page.getByRole("button", { name: "Insert image" }).click();
    await dialog.getByLabel("Caption").fill("Sample");
    await dialog.getByRole("combobox", { name: "Width" }).click();
    await page.getByRole("option", { name: "60%" }).click();
    await dialog.getByRole("button", { name: "Insert" }).click();
    await expect(dialog).toBeHidden();

    // The image loads from the project file through the custom protocol
    const img = editor.locator("figure img");
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1);
    await expect(editor.locator("figcaption")).toHaveText("Sample");
    await expect(page.getByRole("status")).toHaveText("Saved");

    // The image is still there after reopening the project
    await page.getByRole("button", { name: "Close project" }).click();
    await page.getByRole("button", { name: "Open project" }).click();
    await expect.poll(() => editor.locator("figure img").evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1);

    const text = await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return "";
      const chapter = list.data.find((d) => d.kind === "chapter");
      const doc = chapter && (await window.marktwain.invoke("document:get", { id: chapter.id }));
      return doc && doc.ok ? doc.data.text : "";
    });
    expect(text).toMatch(/!\[Sample\]\(images\/[0-9a-f]{16}\.png\)\{[^}]*width=60%[^}]*\}/);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("pasting Markdown text becomes document structure; Ctrl+S saves at once", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 貼上 "));
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

    await page.evaluate(() => {
      const data = new DataTransfer();
      data.setData("text/plain", "# 貼上的標題\n\n- 一\n- 二\n\n含 **粗體** 與 $x^2$。\n");
      document
        .querySelector(".ProseMirror")!
        .dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    });
    await expect(editor.locator("h1")).toHaveText("貼上的標題");
    await expect(editor.locator("ul li")).toHaveCount(2);
    await expect(editor.locator("strong")).toHaveText("粗體");
    await expect(editor.locator("[data-type='inline-math']")).toHaveCount(1);

    await page.keyboard.press("ControlOrMeta+s");
    await expect(page.getByRole("status")).toHaveText("Saved");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("tables can be merged, aligned, restyled and given a row height", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 表格版面 "));
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

    await page.getByRole("button", { name: "Insert table" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Insert" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(editor).toBeFocused();
    await page.keyboard.type("A");
    await page.keyboard.press("Tab");
    await page.keyboard.type("B");
    await page.keyboard.press("Tab");
    await page.keyboard.type("C");
    await page.keyboard.press("Tab");
    await page.keyboard.type("1");

    // Merge the first two cells of the second row by dragging across them
    const row2 = editor.locator("tr").nth(1).locator("td");
    await row2.nth(0).click();
    await row2.nth(1).click({ modifiers: ["Shift"] });
    // Selecting two cells suggests merging them right next to the selection
    await page.getByRole("button", { name: "Merge the selected cells" }).click();
    await expect(editor.locator("tr").nth(1).locator("td").first()).toHaveAttribute("colspan", "2");

    // Align the third column to the right, switch to grid lines and set the height of the second row
    await editor.locator("tr").nth(0).locator("th").nth(2).click();
    await page.getByRole("toolbar", { name: "Table tools" }).getByRole("button", { name: "Align column right" }).click();
    await page.getByRole("button", { name: "Switch to grid lines" }).click();
    await expect(editor.locator(".tableWrapper")).toHaveAttribute("data-table-style", "grid");

    await row2.first().click();
    // The tools show where the cursor is and the size of its row and column, and let you type new values
    await expect(page.getByTestId("table-readout")).toContainText("Row 2 of 3, column 1 of 3");
    await page.getByLabel("Row height").fill("2cm");
    await page.getByLabel("Row height").press("Enter");
    await expect(editor.locator("tr").nth(1)).toHaveAttribute("data-height", "2cm");
    await row2.first().click();
    await expect(page.getByLabel("Row height")).toHaveValue("2cm");
    await page.getByLabel("Column width").fill("30");
    await page.getByLabel("Column width").press("Enter");
    await row2.first().click();
    await expect(page.getByLabel("Column width")).toHaveValue("30");
    await expect(page.getByRole("status")).toHaveText("Saved");

    const text = await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return "";
      const chapter = list.data.find((d) => d.kind === "chapter");
      const doc = chapter && (await window.marktwain.invoke("document:get", { id: chapter.id }));
      return doc && doc.ok ? doc.data.text : "";
    });
    expect(text).toContain("| A | B | C |");
    expect(text).toContain("---:");
    expect(text).toContain("cells=2.1:colspan=2");
    expect(text).toContain("heights=2:2cm");
    expect(text).toMatch(/widths=30%,/);
    expect(text).toContain("style=grid");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a table or figure without a caption has no number, and an image never lands inside a table", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 無標題 "));
  const file = join(dir, "論文.marktwain");
  const image = join(dir, "圖.png");
  writeFileSync(image, PNG_1X1);
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");
  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: file, MARKTWAIN_TEST_IMAGE_PATH: image },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    const editor = page.locator(".ProseMirror");
    await editor.click();
    const dialog = page.getByRole("dialog");

    // The caption fields offer a placeholder and may stay empty
    await page.getByRole("button", { name: "Insert table" }).click();
    await expect(dialog.getByPlaceholder("Table caption, optional")).toBeVisible();
    await dialog.getByRole("button", { name: "Insert" }).click();
    await expect(dialog).toBeHidden();

    // With the cursor still in the table, an image goes after it
    await page.getByRole("button", { name: "Insert image" }).click();
    await expect(dialog.getByPlaceholder("Figure caption, optional")).toBeVisible();
    await dialog.getByRole("button", { name: "Insert" }).click();
    await expect(dialog).toBeHidden();
    await expect(editor.locator("td figure")).toHaveCount(0);
    await expect(editor.locator("figure")).toHaveCount(1);
    await expect(page.getByRole("status")).toHaveText("Saved");

    const text = await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return "";
      const chapter = list.data.find((d) => d.kind === "chapter");
      const doc = chapter && (await window.marktwain.invoke("document:get", { id: chapter.id }));
      return doc && doc.ok ? doc.data.text : "";
    });
    expect(text).toMatch(/\|\n\n!\[\]\(images\/[0-9a-f]{16}\.png\)\n$/);
    expect(text).not.toContain(": !");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("selecting text shows a floating menu with the marks", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 浮動 "));
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
    await page.keyboard.type("hello world");
    await editor.getByText("hello world").dblclick();
    const bubble = page.getByLabel("Selection tools");
    await expect(bubble).toBeVisible();
    await bubble.getByRole("button", { name: "Bold" }).click();
    await expect(editor.locator("strong")).toHaveCount(1);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("code blocks take a language, are highlighted, and keep it in the Markdown", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 程式碼 "));
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
    await page.getByRole("button", { name: "Code block" }).click();
    await page.getByRole("combobox", { name: "Code language" }).click();
    await page.getByRole("option", { name: "Python" }).click();
    await page.keyboard.type('def hello():\n    return "hi"');
    await expect(editor.locator("pre code .hljs-keyword").first()).toHaveText("def");
    await expect(editor.locator("pre code .hljs-string")).toHaveCount(1);
    await expect(page.getByRole("status")).toHaveText("Saved");
    const text = await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return "";
      const chapter = list.data.find((d) => d.kind === "chapter");
      const doc = chapter && (await window.marktwain.invoke("document:get", { id: chapter.id }));
      return doc && doc.ok ? doc.data.text : "";
    });
    expect(text).toBe('```python\ndef hello():\n    return "hi"\n```\n');
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("dragging a row or a column edge shows the value that it takes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 拖曳 "));
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
    await page.getByRole("button", { name: "Insert table" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Insert" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Row: grab the bottom edge of the second row and pull it down
    const cell = editor.locator("tr").nth(1).locator("td").first();
    const box = (await cell.boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + box.height - 1);
    await page.mouse.down();
    await page.mouse.move(box.x + 20, box.y + box.height + 40, { steps: 6 });
    await expect(page.getByTestId("resize-value")).toContainText(/Row height \d+ pt/);
    await page.mouse.up();
    await expect(page.getByTestId("resize-value")).toBeHidden();
    await expect(editor.locator("tr").nth(1)).toHaveAttribute("data-height", /^\d+pt$/);
    const height = Number(((await editor.locator("tr").nth(1).getAttribute("data-height")) ?? "").replace("pt", ""));
    expect(height).toBeGreaterThan(30);

    // Column: pull the right edge of the first column to the right
    const head = editor.locator("tr").first().locator("th").first();
    const hbox = (await head.boundingBox())!;
    await page.mouse.move(hbox.x + hbox.width - 2, hbox.y + 10);
    await page.mouse.down();
    await page.mouse.move(hbox.x + hbox.width + 60, hbox.y + 10, { steps: 6 });
    await expect(page.getByTestId("resize-value")).toContainText(/Column width [\d.]+%/);
    await page.mouse.up();
    await expect(page.getByTestId("table-readout")).toContainText("Column width");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

/** A solid colour PNG of the given size, made without any image library. */
function makePng(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(zlib.crc32(body) >>> 0, 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x66)]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

test("a picture is resized by its corners and cropped, in the manner of Word", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 圖片編輯 "));
  const file = join(dir, "論文.marktwain");
  const image = join(dir, "照片.png");
  writeFileSync(image, makePng(200, 100));
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");
  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: file, MARKTWAIN_TEST_IMAGE_PATH: image },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    const editor = page.locator(".ProseMirror");
    await editor.click();
    const dialog = page.getByRole("dialog");
    await page.getByRole("button", { name: "Insert image" }).click();
    await dialog.getByLabel("Caption").fill("Photo");
    await dialog.getByRole("button", { name: "Insert" }).click();
    await expect(dialog).toBeHidden();

    // A click selects the picture, handles and a floating menu appear
    const figure = editor.locator("figure");
    await figure.locator("img").click();
    await expect(figure).toHaveClass(/is-selected/);
    await expect(page.getByLabel("Picture tools")).toBeVisible();

    // Preset widths from the menu
    await page.getByRole("button", { name: "Width 50%" }).click();
    await expect(figure).toHaveAttribute("data-width", "50%");

    // Dragging a corner resizes it and shows the width on the way
    const handle = figure.locator("[data-handle='se']");
    const hbox = (await handle.boundingBox())!;
    await page.mouse.move(hbox.x + hbox.width / 2, hbox.y + hbox.height / 2);
    await page.mouse.down();
    await page.mouse.move(hbox.x + 120, hbox.y + 10, { steps: 6 });
    await expect(page.getByTestId("figure-value")).toContainText(/Width \d+%/);
    await page.mouse.up();
    const width = Number(((await figure.getAttribute("data-width")) ?? "").replace("%", ""));
    expect(width).toBeGreaterThan(50);

    // Crop to the left half, the picture is replaced by a new one that is half as wide
    await figure.locator("img").click();
    await page.getByRole("button", { name: "Crop", exact: true }).click();
    const stage = page.getByTestId("crop-stage");
    await expect(stage).toBeVisible();
    const corner = page.locator("[data-corner='se']");
    const cbox = (await corner.boundingBox())!;
    const sbox = (await stage.boundingBox())!;
    await page.mouse.move(cbox.x + cbox.width / 2, cbox.y + cbox.height / 2);
    await page.mouse.down();
    await page.mouse.move(sbox.x + sbox.width / 2, cbox.y + cbox.height / 2, { steps: 6 });
    await page.mouse.up();
    const before = await figure.locator("img").getAttribute("src");
    await page.getByRole("dialog").getByRole("button", { name: "Crop", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect.poll(() => figure.locator("img").getAttribute("src")).not.toBe(before);
    await expect.poll(() => figure.locator("img").evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(80);
    const natural = await figure.locator("img").evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight]);
    expect(natural[0]).toBeLessThan(120);
    expect(natural[1]).toBe(100);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
