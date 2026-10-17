import type { Page } from "@playwright/test";
import { expect, test } from "../../support/test";
import { statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createProject } from "../../support/project";

test("editor preferences apply at once and survive a restart, thesis format is kept in the project", async ({ launch }) => {
  const first = await launch({ name: "偏好", projectName: "論文.marktwain" });
  const page = await first.app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await expect(editor).toBeVisible();
  await expect(editor).toHaveCSS("font-size", "16px");

  // Ctrl or Cmd plus comma opens the settings window
  await page.keyboard.press("ControlOrMeta+,");
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Appearance", exact: true }).click();
  await dialog.getByLabel("Text size", { exact: true }).fill("20");
  await dialog.getByLabel("Text size", { exact: true }).press("Enter");
  await expect(editor).toHaveCSS("font-size", "20px");
  await dialog.getByRole("button", { name: "Writing", exact: true }).click();
  // Line numbers are on by default, the switch turns them off
  await expect(page.getByTestId("line-gutter")).toHaveCount(1);
  await dialog.getByRole("switch", { name: "Line numbers" }).click();
  await expect(page.getByTestId("line-gutter")).toHaveCount(0);
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
  await expect(dialog.getByRole("button", { name: "Top margin", exact: true })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Search settings" })).toHaveValue("");
  // Closing and opening again returns to the page that was open last
  await page.keyboard.press("Escape");
  await page.keyboard.press("ControlOrMeta+,");
  await expect(page.getByRole("dialog", { name: "Settings" }).getByRole("heading", { name: "Page", exact: true, level: 2 })).toBeVisible();

  // Second start: the editor preferences are still there
  const second = await first.restart();
  const page2 = await second.app.firstWindow();
  await expect(page2.locator(".ProseMirror")).toHaveCSS("font-size", "20px");
  await expect(page2.getByTestId("line-gutter")).toHaveCount(0);
});


test("layout settings are shown as small drawings and examples that follow the values", async ({ launch }) => {
  const { app, file } = await launch({ name: "圖例", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page);
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
  // The margins are shown as text, a field opens when one is clicked
  await expect(dialog.getByRole("textbox", { name: "Left margin", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Left margin", exact: true }).click();
  await dialog.getByRole("textbox", { name: "Left margin", exact: true }).fill("5");
  await dialog.getByRole("textbox", { name: "Left margin", exact: true }).press("Enter");
  await expect(dialog.getByRole("button", { name: "Left margin", exact: true })).toContainText("5");
  await expect.poll(async () => (await values())?.["layout.margin.left"]).toBe(5);
  await expect.poll(() => area.evaluate((el) => (el as HTMLElement).style.left)).not.toBe(before);
  // Pointing at a field shades the margin it sets
  await dialog.getByRole("button", { name: "Top margin", exact: true }).hover();
  await expect(dialog.getByTestId("margin-band-top")).toHaveAttribute("data-active", "true");
  // Margins that leave no room are said so
  await dialog.getByRole("button", { name: "Left margin", exact: true }).click();
  await dialog.getByRole("textbox", { name: "Left margin", exact: true }).fill("10");
  await dialog.getByRole("textbox", { name: "Left margin", exact: true }).press("Enter");
  await dialog.getByRole("button", { name: "Right margin", exact: true }).click();
  await dialog.getByRole("textbox", { name: "Right margin", exact: true }).fill("10");
  await dialog.getByRole("textbox", { name: "Right margin", exact: true }).press("Enter");
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
});


test("the school's watermark is shown, an image of your own can replace it, and the final copy carries it", async ({ launch }) => {
  const { app, dir } = await launch({
    name: "浮水印",
    projectName: "論文.marktwain",
    env: (folder) => ({ MARKTWAIN_TEST_IMAGE_PATH: join(folder, "mine.png"), MARKTWAIN_TEST_EXPORT_PATH: join(folder, "out.pdf") }),
  });
  const pdf = join(dir, "out.pdf");
  // A small PNG, 1x1
  writeFileSync(join(dir, "mine.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
  const page = await app.firstWindow();
  await createProject(page);
  await page.keyboard.press("ControlOrMeta+,");
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByRole("button", { name: "School and format", exact: true }).click();
  const section = dialog.getByTestId("watermark-settings");

  // Without a school there is nothing to follow
  await expect(section).toContainText("This school has no watermark");
  await dialog.getByRole("combobox", { name: "School preset", exact: true }).click();
  await page.getByRole("option", { name: "National Chengchi University" }).click();
  await expect(section).toContainText("The school's watermark: nccu.pdf");
  await expect(dialog.getByTestId("watermark-preview").locator("img")).toBeVisible();

  // An image of your own is stored in the project and named in the settings
  await section.getByRole("radio", { name: /My own image/ }).click();
  await expect(section.getByRole("radio", { name: /My own image/ })).toHaveAttribute("aria-checked", "true");
  await expect(section).toContainText("mine.png");
  const values = () =>
    page.evaluate(async () => {
      const r = await window.marktwain.invoke("config:get-advanced");
      return r.ok ? r.data.values : null;
    });
  expect(await values()).toMatchObject({ "watermark.image": "/assets/watermarks/mine.png" });
  await section.getByLabel("Watermark opacity").fill("40");
  await section.getByLabel("Watermark opacity").press("Enter");
  await expect.poll(async () => (await values())?.["watermark.opacity"]).toBe(40);

  // Back to the school's own, and no watermark at all
  await section.getByRole("radio", { name: /Follow the school/ }).click();
  await expect.poll(async () => (await values())?.["watermark.image"]).toBeUndefined();
  await section.getByRole("radio", { name: /No watermark/ }).click();
  await expect.poll(async () => (await values())?.["watermark.image"]).toBe("none");
  await section.getByRole("radio", { name: /Follow the school/ }).click();
  await page.keyboard.press("Escape");

  // The draft has no watermark, the final copy has, so it is larger
  const size = async (channel: "export:pdf" | "export:final-pdf") => {
    const done = await page.evaluate(async (c) => {
      const r = await window.marktwain.invoke(c as "export:pdf");
      return r.ok;
    }, channel);
    expect(done).toBe(true);
    return statSync(pdf).size;
  };
  const draft = await size("export:pdf");
  const final = await size("export:final-pdf");
  expect(final).toBeGreaterThan(draft);
});


test("delays are chosen with ten step sliders and sizes with named levels", async ({ launch }) => {
  const { app } = await launch({ name: "滑桿" });
  const page = await app.firstWindow();
  await createProject(page);
  await page.keyboard.press("ControlOrMeta+,");
  const dialog = page.getByRole("dialog", { name: "Settings" });
  const prefs = () =>
    page.evaluate(async () => {
      const r = await window.marktwain.invoke("prefs:get");
      return r.ok ? r.data : null;
    });

  await dialog.getByRole("button", { name: "Writing", exact: true }).click();
  const slider = dialog.getByRole("slider", { name: "Save after typing stops" });
  await expect(slider).toHaveAttribute("min", "1");
  await expect(slider).toHaveAttribute("max", "10");
  await expect(dialog.getByTestId("step-description").first()).toContainText("Saves about 0.8 s after you stop typing");
  // The fastest step is the last one
  await slider.fill("10");
  await expect.poll(async () => (await prefs())?.autosaveDelayMs).toBe(200);
  await expect(dialog.getByTestId("step-description").first()).toContainText("Step 10 of 10");
  await slider.fill("1");
  await expect.poll(async () => (await prefs())?.autosaveDelayMs).toBe(5000);

  // Code size is a choice of named levels with a sample
  await dialog.getByRole("radio", { name: "Large", exact: true }).click();
  await expect.poll(async () => (await prefs())?.codeFontSize).toBe(16);

  // The preview has its own slider, and no sharpness since the PDF is drawn from its vectors
  await dialog.getByRole("button", { name: "Preview", exact: true }).click();
  await dialog.getByRole("slider", { name: "Rebuild the preview after a save" }).fill("9");
  await expect.poll(async () => (await prefs())?.previewDelayMs).toBe(250);
  await expect(dialog.getByText("Preview sharpness")).toHaveCount(0);
});


test("the heading menu lists the chapter title, names the other levels, and the names can be changed", async ({ launch }) => {
  const { app } = await launch({ name: "標題名" });
  const page = await app.firstWindow();
  await createProject(page);
  await page.locator(".ProseMirror").click();
  await page.getByRole("combobox", { name: "Text style" }).click();
  await expect(page.getByRole("option")).toHaveText(["Paragraph", "Chapter title", "Section", "Subsection", "Sub-subsection"]);
  await page.keyboard.press("Escape");

  // A name of the author's own replaces the default in the toolbar and in the slash menu
  await page.keyboard.press("ControlOrMeta+,");
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByRole("button", { name: "Writing", exact: true }).click();
  await dialog.getByRole("textbox", { name: /Names of the heading levels Level 2/ }).fill("Part");
  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: "Text style" }).click();
  await expect(page.getByRole("option")).toHaveText(["Paragraph", "Chapter title", "Part", "Subsection", "Sub-subsection"]);
  await page.keyboard.press("Escape");
  await page.locator(".ProseMirror").click();
  await page.keyboard.type("/");
  await expect(page.getByTestId("slash-menu").getByRole("option", { name: /^Part/ })).toBeVisible();
});

test("the name of the list at the front follows the rules of the school, 目次 or 目錄", async ({ launch }) => {
  const { app } = await launch({ name: "目次", lang: "zh-TW" });
  const page = await app.firstWindow();
  await createProject(page, "zh-TW");
  await page.keyboard.press("ControlOrMeta+,");
  const dialog = page.getByRole("dialog", { name: "設定" });
  const nav = dialog.getByRole("navigation");
  // Without a school the template says 目次
  await expect(nav.getByRole("button", { name: "頁碼與目次" })).toBeVisible();

  // The rules of National Yang Ming Chiao Tung University say 目錄
  await dialog.getByRole("button", { name: "學校與格式", exact: true }).click();
  await dialog.getByRole("combobox", { name: "學校格式" }).click();
  await page.getByRole("option", { name: "國立陽明交通大學" }).click();
  await expect(nav.getByRole("button", { name: "頁碼與目錄" })).toBeVisible();

  // The page itself and the search use the same word
  await nav.getByRole("button", { name: "頁碼與目錄" }).click();
  await expect(dialog.getByText("目錄深度")).toBeVisible();

  // The rules of National Chengchi University say 目次
  await dialog.getByRole("button", { name: "學校與格式", exact: true }).click();
  await dialog.getByRole("combobox", { name: "學校格式" }).click();
  await page.getByRole("option", { name: "國立政治大學" }).click();
  await expect(nav.getByRole("button", { name: "頁碼與目次" })).toBeVisible();
});

test("the settings open on the thesis in a project, and a word that is on a page finds the page", async ({ launch }) => {
  const { app } = await launch({ name: "搜尋" });
  const page = await app.firstWindow();
  await createProject(page);
  await page.keyboard.press("ControlOrMeta+,");
  const dialog = page.getByRole("dialog", { name: "Settings" });
  // With a project the thesis is what a person comes for
  await expect(dialog.getByRole("heading", { name: "Information" })).toBeVisible();

  // Words that are not in the name of a page, such as the list of figures, lead to it
  await dialog.getByLabel("Search settings").first().fill("list of figures");
  const result = dialog.getByRole("list", { name: "Search results" }).getByRole("button", { name: /Page numbers and outline/ });
  await expect(result).toBeVisible();
  await result.click();
  await expect(dialog.getByRole("heading", { name: "Page numbers and outline" })).toBeVisible();
});
