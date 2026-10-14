import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");
const templateDir = resolve(__dirname, "../../../resources/templates/typ");

function hasTypst(): boolean {
  try {
    execFileSync(process.env.MARKTWAIN_TYPST || "typst", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

test.skip(!hasTypst() || !existsSync(templateDir), "needs typst and the fetched template");

async function launch(dir: string, file: string, extraEnv: Record<string, string> = {}) {
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");
  return electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: file, MARKTWAIN_TEMPLATE_DIR: templateDir, ...extraEnv },
  });
}

const saveChapter = async (text: string) => {
  const list = await window.marktwain.invoke("document:list");
  if (!list.ok) return;
  const chapter = list.data.find((d) => d.kind === "chapter")!;
  await window.marktwain.invoke("document:save", { id: chapter.id, text });
};

test("a thesis builds to a PDF that the preview loads", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 建置 "));
  const app = await launch(dir, join(dir, "論文.marktwain"));
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    await page.evaluate(saveChapter, "# 緒論\n\n這是**第一章**，公式 $x^2$。\n");
    await page.getByRole("button", { name: "Preview" }).click();
    await page.getByRole("button", { name: "Build PDF" }).click();

    const frame = page.locator("iframe[title='PDF preview']");
    await expect(frame).toBeVisible({ timeout: 90_000 });
    const url = await frame.getAttribute("src");
    expect(url).toMatch(/^marktwain-preview:\/\/pdf\/\d+\.pdf$/);
    // The page CSP blocks fetch, so read the preview through the main process
    const head = await app.evaluate(async ({ net }, u) => {
      const response = await net.fetch(u as string);
      return new TextDecoder().decode((await response.arrayBuffer()).slice(0, 5));
    }, url);
    expect(head).toBe("%PDF-");
    // The default project has no author yet, so the settings warning is listed
    await expect(page.getByRole("log")).toContainText("Not filled in the project settings");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a build error points back to the block that caused it", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 錯誤 "));
  const app = await launch(dir, join(dir, "論文.marktwain"));
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    await page.evaluate(saveChapter, "# 標題\n\n正常段落。\n\n![缺圖](images/missing.png)\n");
    await page.getByRole("button", { name: "Close project" }).click();
    await page.getByRole("button", { name: "Open project" }).click();
    await page.getByRole("button", { name: "Preview" }).click();
    await page.getByRole("button", { name: "Build PDF" }).click();

    const log = page.getByRole("log");
    await expect(log).toContainText("file not found", { timeout: 90_000 });
    await log.getByRole("button", { name: "Go to the source" }).click();
    // The failing block is the figure, which becomes the selected node
    await expect(page.locator(".ProseMirror figure.ProseMirror-selectednode")).toBeAttached();
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the PDF and the whole Typst project can be exported", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 匯出 "));
  const pdfPath = join(dir, "輸出.pdf");
  const parent = join(dir, "匯出位置");
  mkdirSync(parent);
  const first = await launch(dir, join(dir, "論文.marktwain"), { MARKTWAIN_TEST_EXPORT_PATH: pdfPath });
  try {
    const page = await first.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    await page.evaluate(saveChapter, "# 緒論\n\n內容。\n");
    await page.getByRole("button", { name: "Preview" }).click();
    await page.getByRole("button", { name: "Export" }).click();
    // Nothing is built yet, so exporting the PDF is disabled
    await expect(page.getByRole("menuitem", { name: "Export PDF…" })).toBeDisabled();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Build PDF" }).click();
    await expect(page.locator("iframe[title='PDF preview']")).toBeVisible({ timeout: 90_000 });
    await page.getByRole("button", { name: "Export" }).click();
    await page.getByRole("menuitem", { name: "Export PDF…" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Exported to" })).toBeVisible();
    expect(readFileSync(pdfPath).subarray(0, 5).toString()).toBe("%PDF-");
  } finally {
    await first.close();
  }

  const second = await launch(dir, join(dir, "論文.marktwain"), { MARKTWAIN_TEST_EXPORT_PATH: parent });
  try {
    const page = await second.firstWindow();
    // The project of the first session reopens by itself
    await expect(page.getByRole("complementary", { name: "Documents" })).toBeVisible();
    await page.getByRole("button", { name: "Preview" }).click();
    await page.getByRole("button", { name: "Export" }).click();
    await page.getByRole("menuitem", { name: "Export Typst project…" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Exported to" })).toBeVisible();
    const project = join(parent, "論文-typst");
    expect(readFileSync(join(project, "contents/chapter01.typ"), "utf8")).toContain("= 緒論");
    expect(existsSync(join(project, "lib"))).toBe(true);
    expect(existsSync(join(project, "fonts"))).toBe(true);
  } finally {
    await second.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
