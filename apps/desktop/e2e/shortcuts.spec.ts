import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

test("shortcuts of thesis actions work in the editor, the buttons show their keys, and a cheat sheet lists them all", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 快捷鍵 "));
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
    const editor = page.locator(".ProseMirror");
    await editor.click();
    const mac = process.platform === "darwin";

    // The tooltip of a button names its keys for this platform
    await expect(page.getByRole("button", { name: "Bold" })).toHaveAttribute("title", mac ? "Bold (⌘B)" : "Bold (Ctrl+B)");
    await expect(page.getByRole("button", { name: "Insert table" })).toHaveAttribute("title", mac ? "Insert table (⌥⌘T)" : "Insert table (Ctrl+Alt+T)");

    // Keys of the editor, a heading and a list
    await page.keyboard.type("A section");
    await page.keyboard.press("ControlOrMeta+Alt+2");
    await expect(editor.locator("h2")).toHaveText("A section");
    await page.keyboard.press("Enter");
    await page.keyboard.press("ControlOrMeta+Shift+8");
    await expect(editor.locator("ul")).toHaveCount(1);
    await page.keyboard.press("ControlOrMeta+Shift+8");

    // Keys that open a dialog
    await page.keyboard.press("ControlOrMeta+Alt+T");
    await expect(page.getByRole("dialog", { name: /table/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await editor.click();
    await page.keyboard.press("ControlOrMeta+Alt+F");
    await expect(page.getByRole("dialog", { name: /footnote/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await editor.click();
    await page.keyboard.press("ControlOrMeta+Shift+M");
    await expect(page.getByRole("dialog", { name: /formula/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // The preview is shown and hidden with the keys
    await page.keyboard.press("ControlOrMeta+Shift+P");
    await expect(page.getByTestId("preview-pages")).toBeVisible();
    await page.keyboard.press("ControlOrMeta+Shift+P");
    await expect(page.getByTestId("preview-pages")).toBeHidden();

    // The cheat sheet opens from the Help menu, whose item has the key Mod and a slash, and lists every command with its keys
    const accelerator = await app.evaluate(({ Menu }) => {
      const help = Menu.getApplicationMenu()?.items.find((item) => item.label === "Help");
      const item = help?.submenu?.items.find((entry) => entry.label === "Keyboard Shortcuts");
      item?.click();
      return item?.accelerator ?? null;
    });
    expect(accelerator).toBe("CmdOrCtrl+/");
    const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('[data-command="bold"]')).toContainText(mac ? "⌘B" : "Ctrl+B");
    await sheet.getByRole("tab", { name: "Windows" }).click();
    await expect(sheet.locator('[data-command="bold"]')).toContainText("Ctrl+B");
    await sheet.getByRole("tab", { name: "macOS" }).click();
    await expect(sheet.locator('[data-command="bold"]')).toContainText("⌘B");
    await sheet.getByLabel("Search a name or keys").fill("footnote");
    await expect(sheet.locator("li[data-command]")).toHaveCount(1);
    await sheet.getByLabel("Search a name or keys").fill("zzzz");
    await expect(sheet).toContainText("No shortcut matches.");
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
