import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

test("a figure and a table are given a placement with icons, and it is written into the Markdown", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 位置 "));
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
    const read = () =>
      page.evaluate(async () => {
        const list = await window.marktwain.invoke("document:list");
        if (!list.ok) return "";
        const chapter = list.data.find((d) => d.kind === "chapter")!;
        const doc = await window.marktwain.invoke("document:get", { id: chapter.id });
        return doc.ok ? doc.data.text : "";
      });
    await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return;
      const chapter = list.data.find((d) => d.kind === "chapter")!;
      await window.marktwain.invoke("document:save", {
        id: chapter.id,
        text: ["# Intro", "", "![A figure](images/a.png){#fig:a}", "", "| a | b |", "|---|---|", "| 1 | 2 |", "", ": A table {#tbl:t}"].join("\n"),
      });
    });
    await page.getByRole("button", { name: "Close project" }).click();
    await page.getByRole("region", { name: "Recent projects" }).getByRole("button").first().click();
    const editor = page.locator(".ProseMirror");
    await expect(editor.locator("figure")).toHaveCount(1);
    await expect(editor.locator("[data-placement-mark]")).toHaveCount(0);

    // Selecting the figure opens its menu, the icons say what they do and the chosen one is marked
    await editor.locator("figure").click();
    const menu = page.getByLabel("Picture tools");
    await expect(menu.getByRole("button", { name: "Top of the page" })).toHaveAttribute("title", /At the top of a page/);
    await menu.getByRole("button", { name: "Top of the page" }).click();
    await expect(menu.getByRole("button", { name: "Top of the page" })).toHaveAttribute("aria-pressed", "true");
    await expect(editor.locator('figure[data-placement-mark="top"]')).toHaveCount(1);
    await expect.poll(read).toContain("placement=top");

    // A second click on the chosen icon goes back to the default of the thesis
    await menu.getByRole("button", { name: "Top of the page" }).click();
    await expect.poll(read).not.toContain("placement=top");

    // The table has the same icons in its toolbar
    await editor.locator("td").first().click();
    const tools = page.getByRole("toolbar", { name: "Table tools" });
    await tools.getByRole("button", { name: "Bottom of the page" }).click();
    await expect(editor.locator('[data-placement-mark="bottom"]')).toHaveCount(1);
    await expect.poll(read).toContain("placement=bottom");

    // The figure dialog has them too, and the thesis default is a setting
    await editor.locator("figure").click();
    await menu.getByRole("button", { name: "Edit caption" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Own page" }).click();
    await dialog.getByRole("button", { name: "Update" }).click();
    await expect.poll(read).toContain("placement=page");
    await page.keyboard.press("ControlOrMeta+,");
    const settings = page.getByRole("dialog", { name: "Settings" });
    await settings.getByRole("button", { name: "Figures, tables and references", exact: true }).click();
    await expect(settings.getByRole("combobox", { name: "Figure placement" })).toBeVisible();
    await expect(settings.getByRole("combobox", { name: "Table placement" })).toBeVisible();
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
