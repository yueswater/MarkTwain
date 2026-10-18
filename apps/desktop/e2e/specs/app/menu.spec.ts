import { expect, test } from "../../support/test";
import { chooseEngine } from "../../support/project";

test("the native menu follows the interface language and drives the app", async ({ launch }) => {
  const { app, file } = await launch({ name: "選單", lang: "zh-TW", projectName: "論文.marktwain" });
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
  expect(await fileMenuItems()).toEqual(expect.arrayContaining(["新增專案...", "開啟專案...", "關閉專案"]));

  // File, New Project triggers the new project flow in the renderer, which asks for the output first
  await app.evaluate(({ Menu }) => {
    const item = Menu.getApplicationMenu()
      ?.items.flatMap((i) => i.submenu?.items ?? [])
      .find((i) => i.accelerator === "CmdOrCtrl+N");
    item?.click();
  });
  await chooseEngine(page, "typst", "zh-TW");
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
  await page.getByTestId("language-toggle").click();
  await expect.poll(fileMenuItems).toEqual(expect.arrayContaining(["New Project...", "Open Project...", "Close Project"]));
  expect((await labels()).filter(Boolean)).toEqual(expect.arrayContaining(["File", "Edit", "View", "Window", "Help"]));
});
