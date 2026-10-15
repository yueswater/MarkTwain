import { expect, test } from "../../support/test";
import { createProject } from "../../support/project";

test("code blocks take a language, are highlighted, and keep it in the Markdown", async ({ launch }) => {
  const { app, file } = await launch({ name: "程式碼", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.getByRole("button", { name: "Code block" }).click();
  // The language selector is on the block, hidden until the mouse moves over it
  const selector = page.getByTestId("code-language");
  await page.mouse.move(5, 5);
  await expect(selector).toHaveCSS("opacity", "0");
  await editor.locator(".code-block").hover();
  await expect(selector).toHaveCSS("opacity", "1");
  // The selector has a background of its own, so it stays readable over the code
  await expect(page.getByRole("combobox", { name: "Code language" })).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.getByRole("combobox", { name: "Code language" }).click();
  await page.getByRole("option", { name: "Python" }).click();
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(editor).toBeFocused();
  // The cursor is back in the block, and while typing the selector stays hidden even under the pointer
  await page.keyboard.type('def hello():\n    return "hi"');
  await expect(selector).toHaveCSS("opacity", "0");
  // Moving the mouse shows it again
  await page.mouse.move(60, 400);
  await editor.locator(".code-block").hover();
  await expect(selector).toHaveCSS("opacity", "1");
  await expect(page.getByRole("combobox", { name: "Code language" })).toContainText("Python");
  // The shortcut opens the list for the block that holds the cursor
  await editor.locator("pre code").click();
  await page.keyboard.press("ControlOrMeta+Alt+l");
  await expect(page.getByRole("option", { name: "Plain text" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(editor.locator("pre code .hljs-keyword").first()).toHaveText("def");
  await expect(editor.locator("pre code .hljs-string")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText("Saved");
  const text = await page.evaluate(async () => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) return "";
    const chapter = list.data.find((d) => d.kind === "chapter");
    const doc = chapter && (await window.marktwain.invoke("document:get", { id: chapter.id }));
    return doc && doc.ok ? doc.data.text : "";
  });
  expect(text).toBe('```python\ndef hello():\n    return "hi"\n```\n');
});


test("only ordinary text lines are numbered, a named formula shows its number, and code has its own numbers", async ({ launch }) => {
  const { app } = await launch({ name: "行號" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.type("# A heading\nFirst line.\nSecond line.\n");
  const numbers = page.getByTestId("line-gutter").locator("[data-line]");
  // Every short paragraph has one number, the heading has none
  const paragraphs = await editor.locator(":scope > p").count();
  expect(paragraphs).toBeGreaterThanOrEqual(2);
  await expect.poll(() => numbers.count()).toBe(paragraphs);

  // A table and a figure do not count either, a display formula shows its number once it has a name
  await page.getByRole("button", { name: "Display formula" }).click();
  await expect(page.getByRole("dialog", { name: "Display formula" })).toBeVisible();
  await page.getByRole("dialog").getByLabel("LaTeX").fill("E=mc^2");
  await page.getByRole("dialog").getByRole("button", { name: /Done/ }).click();
  const formula = editor.locator("[data-type='block-math']");
  await expect(formula).toHaveCount(1);
  await formula.hover();
  const box = page.getByTestId("equation-label-box");
  await box.getByLabel("Formula name").fill("energy");
  await box.getByRole("button", { name: "Set name" }).click();
  await expect(formula).toHaveAttribute("data-eq-number", /^\d+(\.\d+)?$/);
  const before = await formula.getAttribute("data-eq-number");
  // Following the chapter is a setting of the thesis and not of this box, and then the numbers carry the chapter number
  await expect(box.getByRole("switch")).toHaveCount(0);
  await page.evaluate(async () => {
    await window.marktwain.invoke("config:set-advanced", { values: { "layout.equation-per-chapter": true } });
    window.dispatchEvent(new Event("marktwain:labels-changed"));
  });
  await expect.poll(() => formula.getAttribute("data-eq-number")).not.toBe(before);
  await expect(formula).toHaveAttribute("data-eq-number", /\./);
  await page.mouse.move(5, 5);

  // Code has its own numbers, from 1 inside the block
  const beforeCode = await numbers.count();
  await editor.locator("p").last().click();
  await page.keyboard.press("End");
  await page.getByRole("button", { name: "Code block" }).click();
  await page.keyboard.type("one\ntwo\nthree");
  await expect(page.getByTestId("code-lines").locator("span")).toHaveText(["1", "2", "3"]);
  // The lines of the code are not in the gutter of the text, the paragraph that became code even left it
  await expect.poll(() => numbers.count()).toBeLessThanOrEqual(beforeCode);
});
