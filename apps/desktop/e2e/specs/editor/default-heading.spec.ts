import { expect, test } from "../../support/test";
import { createProject, savedChapter } from "../../support/project";

// The tests of this file leave the switch out, so a new chapter starts the way a person gets it
const WITH_HEADING = { MARKTWAIN_TEST_NO_DEFAULT_HEADING: "" };

test("a new chapter starts with a heading in the language of the thesis, and the first typing replaces it", async ({ launch }) => {
  const { app } = await launch({ name: "預設標題", projectName: "論文.marktwain", env: WITH_HEADING });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");

  // The first chapter has the title of an introduction, selected, so typing is the title that the person means
  await expect(editor.locator("h1")).toHaveText("緒論");
  await expect(editor).toBeFocused();
  await page.keyboard.type("研究動機");
  await expect(editor.locator("h1")).toHaveText("研究動機");
  await page.keyboard.press("Enter");
  await page.keyboard.type("內文。");
  await expect(page.getByRole("status")).toHaveText("Saved");
  expect(await savedChapter(page)).toBe("# 研究動機\n\n內文。\n");

  // A chapter that is added has its own title
  await page.getByRole("button", { name: "Add document" }).click();
  await page.getByRole("menuitem", { name: "Chapter", exact: true }).click();
  await expect(editor.locator("h1")).toHaveText("新的一章");
});

test("the heading that nobody touched follows the language of the thesis, the one that was written stays", async ({ launch }) => {
  const { app } = await launch({ name: "標題語言", projectName: "論文.marktwain", env: WITH_HEADING });
  const page = await app.firstWindow();
  await createProject(page);
  const sidebar = page.getByRole("complementary", { name: "Documents" });
  const editor = page.locator(".ProseMirror");
  await expect(editor.locator("h1")).toHaveText("緒論");

  // A second chapter that is written in, and then the language is changed in the settings
  await page.getByRole("button", { name: "Add document" }).click();
  await page.getByRole("menuitem", { name: "Chapter", exact: true }).click();
  await expect(editor.locator("h1")).toHaveText("新的一章");
  await page.keyboard.type("研究方法");
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.keyboard.press("ControlOrMeta+,");
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByRole("button", { name: "School and format", exact: true }).click();
  await dialog.getByRole("combobox", { name: "Language of the thesis" }).click();
  await page.getByRole("option", { name: "English" }).click();
  // The list that was chosen from is still closing, and an Escape that comes in the meantime does not reach the window
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await sidebar.getByRole("button", { name: "Chapter 1", exact: true }).click();
  await expect(editor.locator("h1")).toHaveText("Introduction");
  await sidebar.getByRole("button", { name: "Chapter 2", exact: true }).click();
  await expect(editor.locator("h1")).toHaveText("研究方法");
});

test("a chapter that is open follows a new language of the thesis at once, and what is saved is the new heading", async ({ launch }) => {
  const { app } = await launch({ name: "開著換語言", projectName: "論文.marktwain", env: WITH_HEADING });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await expect(editor.locator("h1")).toHaveText("緒論");
  await page.keyboard.press("ControlOrMeta+,");
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByRole("button", { name: "School and format", exact: true }).click();
  await dialog.getByRole("combobox", { name: "Language of the thesis" }).click();
  await page.getByRole("option", { name: "English" }).click();
  // The list that was chosen from is still closing, and an Escape that comes in the meantime does not reach the window
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  // The editor was open on the old heading, it is made again from what the language changed
  await expect(editor.locator("h1")).toHaveText("Introduction");
  await page.waitForTimeout(1500);
  expect(await savedChapter(page)).toBe("# Introduction\n");
});

test("the preview warns about a chapter that nobody has written in, and the warning is gone once there is text", async ({ launch }) => {
  const { app } = await launch({ name: "空章警告", projectName: "論文.marktwain", env: WITH_HEADING });
  const page = await app.firstWindow();
  await createProject(page);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const notes = page.getByRole("log");
  await expect(notes).toContainText("has no text yet and still has its default title", { timeout: 90_000 });

  // The first typing replaces the title, a paragraph below it is the text, and the next build has no such warning
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("內文。");
  await expect(notes).not.toContainText("has no text yet", { timeout: 90_000 });
});
