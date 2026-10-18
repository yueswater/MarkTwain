import { expect, test } from "../../support/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { findBundledTypst } from "../../support/find-app";
import { viewerState } from "../../support/preview-viewer";
import { zipEntries, zipText } from "../../support/zip";
import { DIST, TEMPLATE_DIR } from "../../support/paths";
import { brokenTemplate } from "../../support/broken-template";
import { closeProject, createProject, seedChapter } from "../../support/project";

function hasTypst(): boolean {
  try {
    execFileSync(process.env.MARKTWAIN_TYPST || findBundledTypst(DIST), ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

test.skip(!hasTypst() || !existsSync(TEMPLATE_DIR), "needs typst and the fetched template");


test("opening the preview builds and shows the PDF, and the watch switch decides when it rebuilds", async ({ launch }) => {
  const { app } = await launch({ name: "建置", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page);
  await seedChapter(page, "# 緒論\n\n這是**第一章**，公式 $x^2$。\n");
  await closeProject(page);
  await page.getByRole("button", { name: /論文/ }).first().click();

  // Opening the preview starts watching and builds at once
  await page.getByRole("button", { name: "Preview" }).click();
  // The PDF is shown by a viewer with links, search and zoom, its engine and the PDF come from the custom protocol
  await expect.poll(async () => (await viewerState(page))?.total ?? 0, { timeout: 90_000 }).toBeGreaterThan(1);
  const head = await app.evaluate(async ({ net }) => {
    const response = await net.fetch("marktwain-preview://pdf/1.pdf");
    return [...new Uint8Array((await response.arrayBuffer()).slice(0, 4))].map((n) => String.fromCharCode(n)).join("");
  });
  expect(head).toBe("%PDF");
  const engine = await app.evaluate(async ({ net }) => {
    const response = await net.fetch("marktwain-preview://wasm/pdfium.wasm");
    return [response.status, response.headers.get("content-type")];
  });
  expect(engine).toEqual([200, "application/wasm"]);
  // The default project has no author yet, so the settings warning is listed
  await expect(page.getByRole("log")).toContainText("Not filled in the project settings");

  // Watching rebuilds after a save, switching it off leaves a manual build button
  await expect(page.getByRole("button", { name: "Build PDF" })).toHaveCount(0);
  await page.getByRole("button", { name: "Auto update" }).click();
  await expect(page.getByRole("button", { name: "Build PDF" })).toBeVisible();
  const before = (await viewerState(page))?.id;
  await page.locator(".ProseMirror").click();
  await page.keyboard.type(" more text");
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.waitForTimeout(1500);
  expect((await viewerState(page))?.id).toBe(before);
  await page.getByRole("button", { name: "Build PDF" }).click();
  await expect.poll(async () => (await viewerState(page))?.id).not.toBe(before);
});


test("a picture that is missing does not fail the build, the list says so and points to its block", async ({ launch }) => {
  const { app } = await launch({ name: "缺圖", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page);
  await seedChapter(page, "# 標題\n\n正常段落。\n\n![缺圖](images/missing.png)\n");
  await closeProject(page);
  await page.getByRole("button", { name: "Open project" }).click();
  await page.getByRole("button", { name: "Preview" }).click();

  // The PDF is there, with a grey box where the picture should be
  await expect.poll(async () => (await viewerState(page))?.total ?? 0, { timeout: 90_000 }).toBeGreaterThan(1);
  const log = page.getByRole("log");
  await expect(log).toContainText("A picture is missing");
  await log.getByRole("button", { name: "Go to the source" }).first().click();
  // The block that holds the picture is the figure, which becomes the selected node
  await expect(page.locator(".ProseMirror figure.is-selected")).toBeAttached();
});


test("a build error points back to the block that caused it", async ({ launch }) => {
  // The template fails on a figure, as a fault of the template would
  const { app } = await launch({ name: "錯誤", projectName: "論文.marktwain", env: (folder) => ({ MARKTWAIN_TEMPLATE_DIR: brokenTemplate(folder) }) });
  const page = await app.firstWindow();
  await createProject(page);
  await seedChapter(page, "# 標題\n\n正常段落。\n\n![圖](images/a.png)\n");
  await closeProject(page);
  await page.getByRole("button", { name: "Open project" }).click();
  await page.getByRole("button", { name: "Preview" }).click();

  // The errors stand where the pages would be, in plain words first and the words of the tool as detail
  const failure = page.getByTestId("preview-pages").getByRole("alert");
  await expect(failure).toContainText("The PDF could not be made.", { timeout: 90_000 });
  await expect(failure).toContainText("Detail:");
  await failure.getByRole("button", { name: "Go to the source" }).first().click();
  // The failing block is the figure, which becomes the selected node
  await expect(page.locator(".ProseMirror figure.is-selected")).toBeAttached();
});


test("a reference to nothing and a name used twice are listed with their blocks, and the PDF is built", async ({ launch }) => {
  const { app } = await launch({ name: "引用", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page);
  await seedChapter(page, "# 標題\n\n![圖一](images/missing.png){#fig:dup}\n\n![圖二](images/missing.png){#fig:dup}\n\n見 @fig:dup 與 @fig:nope。\n");
  await closeProject(page);
  await page.getByRole("button", { name: "Open project" }).click();
  await page.getByRole("button", { name: "Preview" }).click();
  await expect.poll(async () => (await viewerState(page))?.total ?? 0, { timeout: 90_000 }).toBeGreaterThan(1);
  const log = page.getByRole("log");
  await expect(log).toContainText("points to something that is not in the thesis");
  await expect(log).toContainText("is already used by another block");
});


test("the PDF and the whole Typst project can be exported", async ({ launch }) => {
  const first = await launch({ name: "匯出", projectName: "論文.marktwain", env: (folder) => ({ MARKTWAIN_TEST_EXPORT_PATH: join(folder, "輸出.pdf") }) });
  const pdfPath = join(first.dir, "輸出.pdf");
  const zipPath = join(first.dir, "專案.zip");
  const page = await first.app.firstWindow();
  await createProject(page);
  await seedChapter(page, "# 緒論\n\n內容。\n");
  await page.getByRole("button", { name: "Preview" }).click();
  // The PDF is built at export time, no preview is needed first
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("menuitem", { name: "Export draft" }).click();
  // A new project has an empty cover, which is asked about first
  await page.getByTestId("export-check").getByRole("button", { name: "Export anyway" }).click();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Exported to" })).toBeVisible();
  expect(readFileSync(pdfPath).subarray(0, 5).toString()).toBe("%PDF-");
  // The toast goes by itself after three seconds
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, { timeout: 8000 });

  const second = await first.restart({ env: { MARKTWAIN_TEST_EXPORT_PATH: zipPath } });
  const page2 = await second.app.firstWindow();
  // The project of the first session reopens by itself
  await expect(page2.getByRole("complementary", { name: "Documents" })).toBeVisible();
  await page2.getByRole("button", { name: "Preview" }).click();
  await page2.getByRole("button", { name: "Export" }).click();
  await page2.getByRole("menuitem", { name: "Export project zip" }).click();
  await expect(page2.locator("[data-sonner-toast]").filter({ hasText: "Exported to" })).toBeVisible();
  // The zip unpacks into one folder with the whole project in it
  const names = zipEntries(zipPath);
  expect(names).toContain("論文-typst/main.typ");
  expect(names).toContain("論文-typst/contents/chapter01.typ");
  expect(names.some((name) => name.startsWith("論文-typst/lib/"))).toBe(true);
  expect(names.some((name) => name.startsWith("論文-typst/fonts/"))).toBe(true);
  expect(names.every((name) => name.startsWith("論文-typst/"))).toBe(true);
  expect(zipText(zipPath, "論文-typst/contents/chapter01.typ")).toContain("= 緒論");
});


test("exporting while the cover is empty asks first, lists what is empty, and leads to the settings", async ({ launch }) => {
  const { app } = await launch({ name: "封面", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page);
  await page.getByRole("button", { name: "Preview" }).click();
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("menuitem", { name: "Export final" }).click();

  // The copy to hand in is named, and every empty field is listed by its name in the settings
  const check = page.getByTestId("export-check");
  await expect(check).toContainText("the copy to hand in");
  await expect(check).toContainText("Student ID");
  await expect(check).toContainText("Keywords (English)");
  await expect(check).not.toContainText("Title (Chinese)");

  // Filling in goes to the information page of the settings, and nothing is exported
  await check.getByRole("button", { name: "Fill them in" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" }).getByRole("heading", { name: "Information" })).toBeVisible();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Exported to" })).toHaveCount(0);
});


test("the watermark switch says so when there is no watermark image to draw", async ({ launch }) => {
  const { app } = await launch({ name: "無浮水印" });
  const page = await app.firstWindow();
  await createProject(page);
  await page.getByRole("button", { name: "Preview" }).click();
  await page.getByRole("button", { name: "Watermark", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "no watermark image" })).toBeVisible();
});
