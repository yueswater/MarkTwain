import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chooseEngine, closeProject } from "../../support/project";
import { expect, test } from "../../support/test";

test("a project is placed and opened with the picker of the app", async ({ launch }) => {
  // No path from the test hook, so the picker of the app is shown, and it opens on a folder that the test made
  const session = await launch({
    name: "選擇器",
    env: (dir) => {
      const start = join(dir, "start");
      mkdirSync(join(start, "舊資料夾"), { recursive: true });
      writeFileSync(join(start, "已有.marktwain"), "");
      writeFileSync(join(start, "notes.txt"), "");
      return { MARKTWAIN_TEST_DIALOG_PATH: "", MARKTWAIN_TEST_PICKER_START: start };
    },
  });
  const page = await session.app.firstWindow();
  const start = join(session.dir, "start");

  await page.getByRole("button", { name: "New project" }).click();
  await chooseEngine(page);
  const picker = page.getByTestId("file-picker");
  await expect(picker).toBeVisible();

  // Only the folders and the project files are listed
  const list = picker.getByRole("list", { name: "Folders and projects" });
  await expect(list).toContainText("舊資料夾");
  await expect(list).toContainText("已有.marktwain");
  await expect(list).not.toContainText("notes.txt");

  // A name that is taken is refused
  await picker.getByLabel("Project name").fill("已有");
  await expect(picker.getByRole("alert")).toContainText("already exists");
  await expect(picker.getByRole("button", { name: "Create", exact: true })).toBeDisabled();

  // A new folder is made on the way, and the picker goes into it
  await picker.getByRole("button", { name: "New folder" }).click();
  await picker.getByLabel("Folder name").fill("論文集");
  await picker.getByLabel("Folder name").press("Enter");
  await expect(picker.getByRole("list", { name: "Current place" })).toContainText("論文集");
  expect(existsSync(join(start, "論文集"))).toBe(true);

  await picker.getByLabel("Project name").fill("我的論文");
  await picker.getByRole("button", { name: "Create", exact: true }).click();
  await expect(picker).toBeHidden();
  await expect(page.getByRole("complementary", { name: "Documents" })).toBeVisible();
  expect(existsSync(join(start, "論文集", "我的論文.marktwain"))).toBe(true);

  // Opening goes through the same picker
  await closeProject(page);
  await page.getByRole("button", { name: "Open project" }).click();
  const opening = page.getByTestId("file-picker");
  await expect(opening).toBeVisible();
  await opening.getByRole("button", { name: "論文集" }).click();
  await expect(opening.getByRole("button", { name: "Open", exact: true })).toBeDisabled();
  await opening.getByRole("button", { name: "我的論文.marktwain" }).click();
  await opening.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Documents" })).toBeVisible();

  // Cancelling creates nothing
  await closeProject(page);
  await page.getByRole("button", { name: "New project" }).click();
  await chooseEngine(page);
  await page.getByTestId("file-picker").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("file-picker")).toBeHidden();
});
