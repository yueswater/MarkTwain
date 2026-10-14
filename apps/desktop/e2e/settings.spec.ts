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
    await dialog.getByRole("switch", { name: "Block numbers" }).click();
    await expect(page.locator("[data-line-numbers='true']")).toHaveCount(1);
    // A value that is out of range is refused and the editor keeps the old size
    await dialog.getByLabel("Text size", { exact: true }).fill("99");
    await dialog.getByLabel("Text size", { exact: true }).press("Enter");
    await expect(dialog.getByLabel("Text size", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(editor).toHaveCSS("font-size", "20px");

    // The advanced thesis format shows the inherited value and an override can be reset
    await dialog.getByRole("button", { name: "Thesis, advanced" }).click();
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
    await dialog.getByRole("button", { name: "Use the default: Text size" }).click();
    await expect(size).toHaveValue("");
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
