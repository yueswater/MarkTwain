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
  // The title of a chapter is in the list, and so are the levels below it
  await expect(menu.getByRole("option", { name: /^Chapter title/ })).toContainText("#");
  await expect(menu.getByRole("option", { name: /^Section/ })).toContainText("##");
  await expect(preview).toContainText("Text");
  // The arrows move the choice and the panel follows
  await page.keyboard.press("ArrowDown");
  await expect(preview).toContainText("Chapter title");
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


test("a chapter title, and the Chinese and the English abstract, are made from the menus without typing any markup", async ({ launch }) => {
  const { app } = await launch({ name: "摘要" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  const sidebar = page.getByRole("complementary", { name: "Documents" });
  const read = () =>
    page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return { abstract: "", chapter: "" };
      const text = async (kind: string) => {
        const entry = list.data.find((d) => d.kind === kind);
        const doc = entry && (await window.marktwain.invoke("document:get", { id: entry.id }));
        return doc && doc.ok ? doc.data.text : "";
      };
      return { abstract: await text("abstract"), chapter: await text("chapter") };
    });

  // The text style menu has the chapter title, a new line is a paragraph and becomes one
  await editor.click();
  await page.keyboard.type("研究動機");
  await page.getByRole("combobox", { name: "Text style" }).click();
  await page.getByRole("option", { name: "Chapter title" }).click();
  await expect(editor.locator("h1")).toHaveText("研究動機");

  // The abstract, a part for each language from the slash menu
  await sidebar.getByRole("button", { name: "Abstract", exact: true }).click();
  await editor.click();
  await page.keyboard.type("/");
  await page.keyboard.type("Chinese");
  await page.keyboard.press("Enter");
  await page.keyboard.type("本研究探討排版。");
  await expect(editor.locator("[data-abstract='abstract-zh']")).toContainText("Chinese abstract, printed under the title");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.keyboard.type("/");
  await page.keyboard.type("English");
  await page.keyboard.press("Enter");
  await page.keyboard.type("This study is about typesetting.");
  await expect(editor.locator("[data-abstract='abstract-en']")).toContainText("English abstract, printed under the title");

  await expect.poll(async () => (await read()).abstract).toMatch(/::: \{\.abstract-zh\}\n本研究探討排版。\n:::/);
  expect((await read()).abstract).toMatch(/::: \{\.abstract-en\}\nThis study is about typesetting\.\n:::/);
  expect((await read()).chapter).toContain("# 研究動機");
});
