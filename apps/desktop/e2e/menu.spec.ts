import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

test("the native menu follows the interface language and drives the app", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 選單 "));
  const file = join(dir, "論文.marktwain");
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=zh-TW"];
  if (process.platform === "linux") args.push("--no-sandbox");

  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: file },
  });
  try {
    const page = await app.firstWindow();
    const labels = () =>
      app.evaluate(({ Menu }) => Menu.getApplicationMenu()?.items.map((item) => item.label) ?? []);
    const fileMenuItems = () =>
      app.evaluate(({ Menu }) => {
        const menu = Menu.getApplicationMenu();
        const fileItem = menu?.items.find((item) => item.submenu?.items.some((i) => i.accelerator === "CmdOrCtrl+N"));
        return fileItem?.submenu?.items.map((item) => item.label) ?? [];
      });

    // Start once the page has loaded and the renderer subscribed to menu commands
    await expect(page.getByRole("button", { name: "新增專案" })).toBeVisible();

    // Chinese menu, macOS also has a first menu named after the app
    expect((await labels()).filter(Boolean)).toEqual(expect.arrayContaining(["檔案", "編輯", "檢視", "視窗", "說明"]));
    expect(await fileMenuItems()).toEqual(expect.arrayContaining(["新增專案…", "開啟專案…", "關閉專案"]));

    // File, New Project triggers the new project flow in the renderer
    await app.evaluate(({ Menu }) => {
      const item = Menu.getApplicationMenu()
        ?.items.flatMap((i) => i.submenu?.items ?? [])
        .find((i) => i.accelerator === "CmdOrCtrl+N");
      item?.click();
    });
    await expect(page.getByRole("complementary", { name: "文件" })).toBeVisible();

    // File, Close Project returns to the welcome screen
    await app.evaluate(({ Menu }) => {
      const item = Menu.getApplicationMenu()
        ?.items.flatMap((i) => i.submenu?.items ?? [])
        .find((i) => i.accelerator === "CmdOrCtrl+W");
      item?.click();
    });
    await expect(page.getByRole("button", { name: "新增專案" })).toBeVisible();

    // The menu follows a language switch
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "English" }).click();
    await expect.poll(fileMenuItems).toEqual(expect.arrayContaining(["New Project…", "Open Project…", "Close Project"]));
    expect((await labels()).filter(Boolean)).toEqual(expect.arrayContaining(["File", "Edit", "View", "Window", "Help"]));
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
