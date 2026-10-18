import { expect, test } from "../../support/test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG_1X1 } from "../../support/png";
import { createProject, savedChapter } from "../../support/project";

test("what is inserted after a formula or a figure lands after it and does not take its place", async ({ launch }) => {
  const { app, dir } = await launch({ name: "連續插入", projectName: "論文.marktwain", env: (folder) => ({ MARKTWAIN_TEST_IMAGE_PATH: join(folder, "圖.png") }) });
  writeFileSync(join(dir, "圖.png"), PNG_1X1);
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  const dialog = page.getByRole("dialog");
  await editor.click();
  await page.keyboard.type("開頭。");
  await page.keyboard.press("Enter");

  // A display formula, and then a table, a figure, a footnote and a block of code, one after the other, each without a click in between
  await page.getByRole("button", { name: "Display formula" }).click();
  await dialog.getByLabel("LaTeX").fill("x^2");
  await dialog.getByLabel("LaTeX").press("Enter");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Insert table" }).click();
  await dialog.getByPlaceholder("Table caption, optional").fill("表一");
  await dialog.getByRole("button", { name: "Insert" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Insert image" }).click();
  await dialog.getByPlaceholder("Figure caption, optional").fill("圖一");
  await dialog.getByRole("button", { name: "Insert" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Footnote" }).click();
  await dialog.getByLabel("Footnote text").fill("註腳。");
  await dialog.getByRole("button", { name: /Insert/ }).click();
  await expect(dialog).toBeHidden();
  // The block of code is a block of its own, so it starts on a new line
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Code block" }).click();
  await page.keyboard.type("print(1)");
  await expect(page.getByRole("status")).toHaveText("Saved");

  const text = await savedChapter(page);
  expect(text).toContain("$$\nx^2\n$$");
  expect(text).toContain(": 表一");
  expect(text).toContain("![圖一](images/");
  expect(text).toContain("[^1]");
  expect(text).toContain("print(1)");
});

test("replacing a whole chapter with new text raises no error and the typing still turns into headings", async ({ launch }) => {
  const { app, dir } = await launch({ name: "全選取代", projectName: "論文.marktwain", env: (folder) => ({ MARKTWAIN_TEST_IMAGE_PATH: join(folder, "圖.png") }) });
  writeFileSync(join(dir, "圖.png"), PNG_1X1);
  const page = await app.firstWindow();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  const dialog = page.getByRole("dialog");
  await editor.click();
  await page.keyboard.type("開頭。");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Insert table" }).click();
  await dialog.getByRole("button", { name: "Insert" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Insert image" }).click();
  await dialog.getByRole("button", { name: "Insert" }).click();
  await expect(dialog).toBeHidden();

  // The blocks are far down the document, a short text replaces all of it, and a position that was kept is no longer in it
  await editor.click();
  // The pointer rests on the last block, so the handle at its side keeps the place of that block
  await editor.locator("figure").hover();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("題目");
  await page.keyboard.press("Enter");
  await page.keyboard.type("## 小節");
  await expect(editor.locator("h2")).toHaveText("小節");
  expect(errors).toEqual([]);
});
