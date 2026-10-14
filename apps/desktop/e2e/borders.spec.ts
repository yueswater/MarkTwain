import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

test("the borders menu draws, removes and thickens the lines of a table, one step of undo each", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 框線 "));
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
        text: ["# Intro", "", "| A | B | C |", "|---|---|---|", "| 1 | 2 | 3 |", "| 4 | 5 | 6 |", "", ": Payoffs {#tbl:p}"].join("\n"),
      });
    });
    await page.getByRole("button", { name: "Close project" }).click();
    await page.getByRole("region", { name: "Recent projects" }).getByRole("button").first().click();
    const editor = page.locator(".ProseMirror");
    await editor.locator("td").first().click();

    const open = async () => {
      await page.getByRole("toolbar", { name: "Table tools" }).getByRole("button", { name: "Borders", exact: true }).click();
      return page.getByRole("menu", { name: "Borders" });
    };

    // The three-line preset has a line above and below, so those items are marked and the sides are not
    let menu = await open();
    await expect(menu.getByRole("menuitemcheckbox", { name: "Top border" })).toHaveAttribute("aria-checked", "true");
    await expect(menu.getByRole("menuitemcheckbox", { name: "Left border" })).toHaveAttribute("aria-checked", "false");
    await expect(menu.getByRole("menuitemcheckbox", { name: "Inside vertical" })).toHaveAttribute("aria-checked", "false");

    // All borders at the width of the grid is the grid preset, so nothing but the style is written
    await menu.getByRole("menuitemcheckbox", { name: "All borders" }).click();
    await expect.poll(read).toContain("style=grid");
    expect(await read()).not.toContain("borders=");

    // No border takes every line away, then the outside gets a thick line
    await menu.getByRole("menuitemcheckbox", { name: "No border" }).click();
    await expect.poll(read).toContain("borders=");
    await expect(editor.locator("th").first()).toHaveCSS("border-top-style", "none");
    await menu.getByLabel("Line width", { exact: true }).selectOption("2.25");
    await menu.getByRole("menuitemcheckbox", { name: "Outside borders" }).click();
    await expect.poll(read).toContain("h0.*=2.25");
    await expect(editor.locator("th").first()).toHaveCSS("border-top-width", "3px");
    await expect(editor.locator("td").first()).toHaveCSS("border-bottom-style", "none");

    // A dashed inside line and a diagonal
    await menu.getByLabel("Line style", { exact: true }).selectOption("dashed");
    await menu.getByRole("menuitemcheckbox", { name: "Inside vertical" }).click();
    await expect.poll(read).toContain("/dashed");
    await menu.getByRole("menuitemcheckbox", { name: "Diagonal down" }).click();
    await expect.poll(read).toContain("dd0.*=");
    await expect(editor.locator("th").first()).toHaveCSS("background-image", /linear-gradient/);

    // Clicking a marked item turns its lines off again
    await menu.getByRole("menuitemcheckbox", { name: "Diagonal down" }).click();
    await expect.poll(read).not.toContain("dd0.");

    // One click is one step of undo
    await page.keyboard.press("Escape");
    await editor.locator("td").first().click();
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(read).toContain("dd0.*=");
    menu = await open();
    await expect(menu.getByRole("menuitemcheckbox", { name: "Diagonal down" })).toHaveAttribute("aria-checked", "true");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
