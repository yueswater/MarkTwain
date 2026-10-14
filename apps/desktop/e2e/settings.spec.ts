import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

test("editor preferences apply at once and survive a restart, thesis format is kept in the project", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 偏好 "));
  const file = join(dir, "論文.marktwain");
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");
  const launch = () =>
    electron.launch({
      executablePath: findPackagedExecutable(dist),
      args,
      env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: file, MARKTWAIN_TEMPLATE_DIR: resolve(__dirname, "../../../resources/templates/typ") },
    });

  try {
    const first = await launch();
    const page = await first.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await expect(editor).toHaveCSS("font-size", "16px");

    // Ctrl or Cmd plus comma opens the settings window
    await page.keyboard.press("ControlOrMeta+,");
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Text size", { exact: true }).fill("20");
    await dialog.getByLabel("Text size", { exact: true }).press("Enter");
    await expect(editor).toHaveCSS("font-size", "20px");
    await dialog.getByRole("button", { name: "Writing", exact: true }).click();
    await dialog.getByRole("switch", { name: "Block numbers" }).click();
    await expect(page.locator("[data-line-numbers='true']")).toHaveCount(1);
    // A value that is out of range is refused and the editor keeps the old size
    await dialog.getByRole("button", { name: "Appearance", exact: true }).click();
    await dialog.getByLabel("Text size", { exact: true }).fill("99");
    await dialog.getByLabel("Text size", { exact: true }).press("Enter");
    await expect(dialog.getByLabel("Text size", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(editor).toHaveCSS("font-size", "20px");

    // The advanced thesis format shows the inherited value and an override can be reset
    await dialog.getByRole("button", { name: "Text", exact: true }).click();
    const size = dialog.getByLabel("Text size", { exact: true });
    await expect(size).toHaveAttribute("placeholder", "12");
    await size.fill("14");
    await size.press("Enter");
    await expect(dialog.getByRole("button", { name: "Use the default: Text size" })).toBeVisible();
    const advanced = await page.evaluate(async () => {
      const r = await window.marktwain.invoke("config:get-advanced");
      return r.ok ? r.data.values : null;
    });
    expect(advanced).toMatchObject({ "layout.font-size": 14 });
    // The page that holds an override shows a dot in the list
    await expect(dialog.getByRole("button", { name: /^Text /, includeHidden: false })).toContainText("");
    await expect(dialog.getByRole("button", { name: /^Text .*differ from the school format/ })).toBeVisible();
    await dialog.getByRole("button", { name: "Use the default: Text size" }).click();
    await expect(size).toHaveValue("");

    // Search finds a setting on another page and opens that page with the setting in view
    await dialog.getByRole("textbox", { name: "Search settings" }).fill("top margin");
    await dialog.getByRole("list", { name: "Search results" }).getByRole("button", { name: /Top margin/ }).click();
    await expect(dialog.getByRole("heading", { name: "Page", exact: true, level: 2 })).toBeVisible();
    await expect(dialog.getByLabel("Top margin", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Search settings" })).toHaveValue("");
    // Closing and opening again returns to the page that was open last
    await page.keyboard.press("Escape");
    await page.keyboard.press("ControlOrMeta+,");
    await expect(page.getByRole("dialog", { name: "Settings" }).getByRole("heading", { name: "Page", exact: true, level: 2 })).toBeVisible();
    await first.close();

    // Second start: the editor preferences are still there
    const second = await launch();
    const page2 = await second.firstWindow();
    await expect(page2.locator(".ProseMirror")).toHaveCSS("font-size", "20px");
    await expect(page2.locator("[data-line-numbers='true']")).toHaveCount(1);
    await second.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("layout settings are shown as small drawings and examples that follow the values", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 圖例 "));
  const file = join(dir, "論文.marktwain");
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");
  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: file, MARKTWAIN_TEMPLATE_DIR: resolve(__dirname, "../../../resources/templates/typ") },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    await page.keyboard.press("ControlOrMeta+,");
    const dialog = page.getByRole("dialog", { name: "Settings" });
    const values = () =>
      page.evaluate(async () => {
        const r = await window.marktwain.invoke("config:get-advanced");
        return r.ok ? r.data.values : null;
      });

    // Margins sit at the edges of a page drawing, the text area follows them
    await dialog.getByRole("button", { name: "Page", exact: true }).click();
    const area = dialog.getByTestId("page-text-area");
    const before = await area.evaluate((el) => (el as HTMLElement).style.left);
    await dialog.getByLabel("Left margin", { exact: true }).fill("5");
    await dialog.getByLabel("Left margin", { exact: true }).press("Enter");
    await expect.poll(async () => (await values())?.["layout.margin.left"]).toBe(5);
    await expect.poll(() => area.evaluate((el) => (el as HTMLElement).style.left)).not.toBe(before);
    // Pointing at a field shades the margin it sets
    await dialog.getByLabel("Top margin", { exact: true }).hover();
    await expect(dialog.getByTestId("margin-band-top")).toHaveAttribute("data-active", "true");
    // Margins that leave no room are said so
    await dialog.getByLabel("Left margin", { exact: true }).fill("10");
    await dialog.getByLabel("Left margin", { exact: true }).press("Enter");
    await dialog.getByLabel("Right margin", { exact: true }).fill("10");
    await dialog.getByLabel("Right margin", { exact: true }).press("Enter");
    await expect(dialog.getByText("The margins leave no room for text.")).toBeVisible();

    // Headings are drawn with the sizes and alignments that are set
    await dialog.getByRole("button", { name: /^Headings and numbering/ }).click();
    const first = dialog.getByTestId("headings-preview").locator("[data-level='1']");
    const size = await first.evaluate((el) => getComputedStyle(el).fontSize);
    await dialog.getByLabel("Heading sizes Level 1", { exact: true }).fill("30");
    await dialog.getByLabel("Heading sizes Level 1", { exact: true }).press("Enter");
    await expect.poll(() => first.evaluate((el) => getComputedStyle(el).fontSize)).not.toBe(size);
    // Whether numbers restart in every chapter is shown with an example
    await expect(dialog.getByTestId("setting-example").first()).toBeVisible();
    await dialog.getByRole("switch", { name: "Number equations by chapter" }).click();
    await expect(dialog.getByTestId("setting-example").filter({ hasText: "(3.1)" })).toBeVisible();

    // Captions are chosen from two small pictures
    await dialog.getByRole("button", { name: /^Figures, tables and references/ }).click();
    await dialog.getByRole("radio", { name: /Figure captions: Above/ }).click();
    await expect.poll(async () => (await values())?.["layout.caption-position.image"]).toBe("top");
    // A pattern shows a live example and refuses an unknown placeholder
    const chapter = dialog.getByLabel("Chapter reference", { exact: true });
    await chapter.fill("Chapter {C}");
    await expect(dialog.getByTestId("pattern-example").first()).toContainText("Chapter 3");
    await chapter.fill("Chapter {X}");
    await expect(dialog.getByText("{X} is not a placeholder that can be used.")).toBeVisible();
    await dialog.getByRole("button", { name: /Chapter reference: Chapter number/ }).click();
    await chapter.fill("");
    await chapter.blur();

    // The table of contents and the title are drawn as they will look
    await dialog.getByRole("button", { name: /^Page numbers and outline/ }).click();
    await dialog.getByLabel("Depth of the contents", { exact: true }).fill("2");
    await dialog.getByLabel("Depth of the contents", { exact: true }).press("Enter");
    await expect(dialog.getByTestId("outline-preview").locator("[data-shown='true']")).toHaveCount(2);
    await dialog.getByRole("button", { name: /^Bibliography/ }).click();
    await expect(dialog.getByTestId("title-preview")).toBeVisible();
    await dialog.getByRole("switch", { name: "List uncited entries too" }).click();
    await expect.poll(async () => (await values())?.["bibliography.full"]).toBe(true);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
