import { expect, test } from "../../support/test";
import { createProject } from "../../support/project";

test("selecting text shows a floating menu with the marks", async ({ launch }) => {
  const { app, file } = await launch({ name: "浮動", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.type("hello world");
  await editor.getByText("hello world").dblclick();
  const bubble = page.getByLabel("Selection tools");
  await expect(bubble).toBeVisible();
  await bubble.getByRole("button", { name: "Bold" }).click();
  await expect(editor.locator("strong")).toHaveCount(1);
});


test("a slash opens a list of blocks with a description or a drawing of the chosen one", async ({ launch }) => {
  const { app } = await launch({ name: "斜線" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  const menu = page.getByTestId("slash-menu");
  const preview = page.getByTestId("slash-preview");

  // The list opens at a slash, with groups, shortcuts and a panel for the chosen block
  await page.keyboard.type("/");
  await expect(menu).toBeVisible();
  // The title of a chapter is not in the list, the levels below it are named section and subsection
  await expect(menu.getByRole("option", { name: /Heading 1/ })).toHaveCount(0);
  await expect(menu.getByRole("option", { name: /^Section/ })).toContainText("##");
  await expect(preview).toContainText("Text");
  // The arrows move the choice and the panel follows
  await page.keyboard.press("ArrowDown");
  await expect(preview).toContainText("Section");
  await expect(preview).toContainText("The title of a section in a chapter");

  // Typing narrows the list in either language, Enter inserts the block and takes the slash away
  await page.keyboard.type("tab");
  await expect(menu.getByRole("option")).toHaveCount(1);
  await expect(menu.getByRole("option", { name: /Table/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(editor).toContainText("/tab");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");

  await page.keyboard.type("/h2");
  await page.keyboard.press("Enter");
  await expect(editor.locator("h2")).toHaveCount(1);
  await expect(editor).not.toContainText("/h2");
  await page.keyboard.type("A section");

  // Chinese words find the formula blocks
  await page.keyboard.press("Enter");
  await page.keyboard.type("/公式");
  await expect(menu.getByRole("option")).toHaveCount(2);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Inline formula" }).or(page.getByRole("dialog", { name: "Display formula" }))).toBeVisible();
  await page.keyboard.press("Escape");

  // A slash inside a word or inside code is only text
  await editor.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type(" and/or");
  await expect(menu).toBeHidden();
});
