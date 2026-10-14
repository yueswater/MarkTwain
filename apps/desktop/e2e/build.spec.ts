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

test("opening the preview builds and shows page images, and the watch switch decides when it rebuilds", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 建置 "));
  const app = await launch(dir, join(dir, "論文.marktwain"));
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    await page.evaluate(saveChapter, "# 緒論\n\n這是**第一章**，公式 $x^2$。\n");
    await page.getByRole("button", { name: "Close project" }).click();
    await page.getByRole("button", { name: /論文/ }).first().click();

    // Opening the preview starts watching and builds at once
    await page.getByRole("button", { name: "Preview" }).click();
    const pages = page.getByTestId("preview-pages").locator("img");
    await expect(pages.first()).toBeVisible({ timeout: 90_000 });
    await expect.poll(() => pages.first().evaluate((el: HTMLImageElement) => el.naturalWidth), { timeout: 30_000 }).toBeGreaterThan(100);
    const count = await pages.count();
    expect(count).toBeGreaterThan(1);
    // The page images come from the custom protocol
    const head = await app.evaluate(async ({ net }) => {
      const response = await net.fetch("marktwain-preview://page/1/0.png");
      return [...new Uint8Array((await response.arrayBuffer()).slice(1, 4))].map((n) => String.fromCharCode(n)).join("");
    });
    expect(head).toBe("PNG");
    // The default project has no author yet, so the settings warning is listed
    await expect(page.getByRole("log")).toContainText("Not filled in the project settings");

    // Watching rebuilds after a save, switching it off leaves a manual build button
    await expect(page.getByRole("button", { name: "Build PDF" })).toHaveCount(0);
    await page.getByRole("button", { name: "Auto update" }).click();
    await expect(page.getByRole("button", { name: "Build PDF" })).toBeVisible();
    const before = await pages.first().getAttribute("src");
    await page.locator(".ProseMirror").click();
    await page.keyboard.type(" more text");
    await expect(page.getByRole("status")).toHaveText("Saved");
    await page.waitForTimeout(1500);
    expect(await pages.first().getAttribute("src")).toBe(before);
    await page.getByRole("button", { name: "Build PDF" }).click();
    await expect.poll(() => pages.first().getAttribute("src")).not.toBe(before);
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

    const log = page.getByRole("log");
    await expect(log).toContainText("file not found", { timeout: 90_000 });
    await log.getByRole("button", { name: "Go to the source" }).click();
    // The failing block is the figure, which becomes the selected node
    await expect(page.locator(".ProseMirror figure.is-selected")).toBeAttached();
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
    // The PDF is built at export time, no preview is needed first
    await page.getByRole("button", { name: "Export" }).click();
    await page.getByRole("menuitem", { name: "Export draft PDF…" }).click();
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
