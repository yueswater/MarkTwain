import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";
import { makeFont } from "./test-font";
import { viewerState } from "./preview-viewer";

const dist = resolve(__dirname, "../dist");

test("a font is added to the project, chosen in the settings, used by the build and removed again", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 字體 "));
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");
  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: join(dir, "p.marktwain"), MARKTWAIN_TEST_NO_PROFILE_DIALOG: "1" },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();

    // The entry is above the bibliography and opens a page with the fonts of the template
    const sidebar = page.getByRole("complementary", { name: "Documents" });
    const buttons = await sidebar.getByRole("button").allInnerTexts();
    expect(buttons.indexOf("Fonts")).toBeGreaterThan(-1);
    expect(buttons.indexOf("Fonts")).toBeLessThan(buttons.findIndex((text) => text.startsWith("Bibliography")));
    await sidebar.getByRole("button", { name: "Fonts", exact: true }).click();
    const list = page.getByTestId("fonts-page");
    // The list also asks typst for the fonts of the computer, which takes a while on a slow runner
    await expect(list.locator('[data-font="Tinos"]')).toHaveAttribute("data-source", "template", { timeout: 30_000 });
    await expect(list.getByTestId("font-preview").first()).toBeVisible();

    // A font of the project, a text file with a font name, and a font that is there already
    const tinos = readFileSync(resolve(__dirname, "../../../resources/templates/typ/fonts/english/Tinos/Tinos-Regular.ttf"));
    await page.getByTestId("font-input").setInputFiles([
      { name: "My Test Face.ttf", mimeType: "font/ttf", buffer: makeFont("My Test Face") },
      { name: "notes.ttf", mimeType: "font/ttf", buffer: Buffer.from("this is only text") },
      { name: "Copy of Tinos.ttf", mimeType: "font/ttf", buffer: tinos },
      { name: "Locked.ttf", mimeType: "font/ttf", buffer: makeFont("Locked Face", { fsType: 2 }) },
    ]);
    const outcome = page.getByTestId("font-outcome");
    await expect(outcome).toContainText("Added: My Test Face");
    await expect(outcome).toContainText("notes.ttf is not a font file");
    await expect(outcome).toContainText("Copy of Tinos.ttf is there already");
    await expect(outcome).toContainText("forbids embedding");
    await expect(list.locator('[data-font="My Test Face"]')).toHaveAttribute("data-source", "project");

    // The settings choose it from the list, and the page then says it is in use
    await page.keyboard.press("ControlOrMeta+,");
    const settings = page.getByRole("dialog", { name: "Settings" });
    await settings.getByRole("button", { name: "Text", exact: true }).click();
    await settings.getByRole("combobox", { name: /Latin font/ }).click();
    await page.getByRole("option", { name: "My Test Face" }).click();
    await expect(settings.getByRole("combobox", { name: /Latin font/ })).toContainText("My Test Face");
    await page.keyboard.press("Escape");
    await expect(list.locator('[data-font="My Test Face"]')).toContainText("In use");

    // The build gets the font and succeeds
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect.poll(async () => (await viewerState(page))?.total ?? 0, { timeout: 90_000 }).toBeGreaterThan(1);
    await page.getByRole("button", { name: "Preview", exact: true }).click();

    // A font that is in use is not removed without a question
    await list.getByRole("button", { name: "Remove the font My Test Face" }).click();
    await expect(page.getByRole("alert")).toContainText("My Test Face is used by");
    await page.getByRole("alert").getByRole("button", { name: "Remove anyway" }).click();
    await expect(list.locator('[data-font="My Test Face"][data-source="project"]')).toHaveCount(0);
    // The name stays in the settings and is now missing, and the page says so
    await expect(page.getByTestId("fonts-missing")).toContainText("My Test Face");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
