import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");
const sample = readFileSync(resolve(__dirname, "../../../packages/schema/fixtures/dialect-sample.md"), "utf8");

async function launch(dir: string, file: string, lang: string) {
  const args = [`--user-data-dir=${join(dir, "userData")}`, `--lang=${lang}`];
  if (process.platform === "linux") args.push("--no-sandbox");
  return electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: file },
  });
}

// v0.2.0 的完成條件：使用到每種節點的內容，關閉再開啟專案後保持不變
test("a document that uses every node survives closing and reopening", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 驗收 "));
  const file = join(dir, "論文.marktwain");
  const app = await launch(dir, file, "zh-TW");
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "新增專案" }).click();
    await expect(page.locator(".ProseMirror")).toBeVisible();

    // 把涵蓋所有語法的範例寫進第一章
    const id = await page.evaluate(async (text) => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return null;
      const chapter = list.data.find((d) => d.kind === "chapter");
      if (!chapter) return null;
      await window.marktwain.invoke("document:save", { id: chapter.id, text });
      return chapter.id;
    }, sample);
    expect(id).not.toBeNull();

    // 重新開啟專案，在編輯器裡載入，不做任何修改，再讀回文字
    await page.getByRole("button", { name: "關閉專案" }).click();
    await page.getByRole("button", { name: "開啟專案" }).click();
    await expect(page.locator(".ProseMirror")).toBeVisible();
    for (const selector of [
      "h1",
      "table",
      "figure",
      "[data-type='inline-math']",
      "[data-type='block-math']",
      "sup[data-footnote]",
      "[data-citation]",
      "[data-cross-ref]",
      "dl dt",
      "blockquote",
      "pre",
    ]) {
      await expect(page.locator(`.ProseMirror ${selector}`).first(), selector).toBeAttached();
    }

    const after = await page.evaluate(async (docId) => {
      const result = await window.marktwain.invoke("document:get", { id: docId! });
      return result.ok ? result.data.text : null;
    }, id);
    expect(after).toBe(sample);

    // 在編輯器裡打字再存：序列化出來與範例的差異只有那幾個字（沒有節點被吃掉）
    // 打在第一個標題的開頭：不依賴文件結尾是哪一種節點（分隔線後面打字會多出空段落）
    await page.locator(".ProseMirror h1").first().click();
    await page.keyboard.press("ControlOrMeta+Home");
    await page.keyboard.type("結尾");
    await page.keyboard.press("ControlOrMeta+s");
    await expect(page.getByRole("status")).toHaveText("已儲存");
    const edited = await page.evaluate(async (docId) => {
      const result = await window.marktwain.invoke("document:get", { id: docId! });
      return result.ok ? result.data.text : null;
    }, id);
    expect(edited?.replace("結尾", "")).toBe(sample);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

// 圖表增減後，交叉引用的編號立刻更新
test("cross-reference numbers update when a figure is removed", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 編號 "));
  const file = join(dir, "論文.marktwain");
  const app = await launch(dir, file, "en-US");
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    await expect(page.locator(".ProseMirror")).toBeVisible();
    await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return;
      const chapter = list.data.find((d) => d.kind === "chapter")!;
      await window.marktwain.invoke("document:save", {
        id: chapter.id,
        text: "![A](images/a.png){#fig:a}\n\n![B](images/b.png){#fig:b}\n\nSee @fig:b.\n",
      });
    });
    await page.getByRole("button", { name: "Close project" }).click();
    await page.getByRole("button", { name: "Open project" }).click();

    const ref = page.locator(".ProseMirror [data-cross-ref]");
    await expect(ref).toHaveAttribute("data-display", "Figure 1.2");

    // 刪掉第一張圖，第二張變成 1.1
    await page.locator(".ProseMirror figure").first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
    await expect(page.locator(".ProseMirror figure")).toHaveCount(1);
    await expect(ref).toHaveAttribute("data-display", "Figure 1.1");

    // 再刪掉被引用的那張，引用變成失效
    await page.locator(".ProseMirror figure").first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
    await expect(ref).toHaveAttribute("data-broken", "");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
