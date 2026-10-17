import { expect, test } from "../../support/test";
import { createProject, savedChapter } from "../../support/project";

test("math can be inserted from the dialog, typed with $…$, edited, and saved as Markdown", async ({ launch }) => {
  const { app, file } = await launch({ name: "公式", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();

  // Insert from the dialog, preview first, a syntax error blocks submit
  await page.getByRole("button", { name: "Inline formula" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("LaTeX").fill("\\frac{a");
  await expect(dialog.getByRole("alert")).toContainText("This formula has a syntax error. Near:");
  await expect(dialog.getByRole("button", { name: /Done/ })).toBeDisabled();
  await dialog.getByLabel("LaTeX").fill("x^2");
  await expect(dialog.getByTestId("math-preview")).toBeVisible();
  // Enter confirms, as the button does
  await dialog.getByLabel("LaTeX").press("Enter");
  await expect(editor.locator(".katex")).toHaveCount(1);
  // Typing starts only when the dialog is gone and the editor has the focus again, or the first characters go to the dialog
  await expect(dialog).toBeHidden();
  await expect(editor).toBeFocused();

  // Typing $...$ right after Chinese text also becomes a formula
  await page.keyboard.type("，且設$y=1$");
  await expect(editor.locator(".katex")).toHaveCount(2);

  // Click a formula to edit it
  await editor.locator("[data-type='inline-math'] .katex-html").first().click();
  await page.getByRole("dialog").getByLabel("LaTeX").fill("z^3");
  await page.getByRole("dialog").getByRole("button", { name: /Done/ }).click();
  await expect(editor.locator("[data-type='inline-math']").first()).toHaveAttribute("data-latex", "z^3");

  // Block formula
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Display formula" }).click();
  await expect(page.getByRole("dialog", { name: "Display formula" })).toBeVisible();
  await page.getByRole("dialog").getByLabel("LaTeX").fill("E=mc^2");
  await page.getByRole("dialog").getByRole("button", { name: /Done/ }).click();
  await expect(editor.locator("[data-type='block-math']")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText("Saved");

  const text = await savedChapter(page);
  expect(text).toContain("$z^3$，且設$y=1$");
  expect(text).toContain("$$\nE=mc^2\n$$");
});


test("a display formula has no number until it is named from the box next to it", async ({ launch }) => {
  const { app, file } = await launch({ name: "公式名稱", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.type("Intro ");
  await page.getByRole("button", { name: "Display formula" }).click();
  await expect(page.getByRole("dialog", { name: "Display formula" })).toBeVisible();
  await page.getByRole("dialog").getByLabel("LaTeX").fill("E=mc^2");
  await page.getByRole("dialog").getByRole("button", { name: /Done/ }).click();
  const formula = editor.locator("[data-type='block-math']");
  await expect(formula).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText("Saved");

  const markdown = () =>
    page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return "";
      const chapter = list.data.find((d) => d.kind === "chapter");
      const doc = chapter && (await window.marktwain.invoke("document:get", { id: chapter.id }));
      return doc && doc.ok ? doc.data.text : "";
    });
  // A new formula has no label, so it has no number
  expect(await markdown()).not.toContain("{#eq:");

  // Hovering shows the box, a name with other characters is refused
  await formula.hover();
  const box = page.getByTestId("equation-label-box");
  await expect(box).toBeVisible();
  await box.getByLabel("Formula name").fill("pay-off");
  await expect(box.getByRole("alert")).toHaveText("Use letters and digits only.");
  await expect(box.getByRole("button", { name: "Set name" })).toBeDisabled();

  // A good name gives the formula its label, and the box shows the number once it is saved
  await box.getByLabel("Formula name").fill("energy1");
  await box.getByRole("button", { name: "Set name" }).click();
  await expect.poll(markdown).toContain("$$ {#eq:energy1}");
  await expect(box.getByTestId("equation-number")).toContainText("Numbered 1");

  // Moving the pointer away closes the box, the box was made again for the new label, so the pointer enters it first
  await box.hover();
  await page.mouse.move(5, 5);
  await expect(box).toBeHidden();

  // Once something refers to the formula its name is locked
  await editor.locator("p").first().click();
  await page.keyboard.press("End");
  await page.keyboard.type(" see ");
  await page.getByRole("button", { name: "Cross-reference" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Type" }).click();
  await page.getByRole("option", { name: "Formula" }).click();
  await dialog.getByRole("combobox", { name: "Target" }).click();
  await page.getByRole("option", { name: /Eq/ }).first().click();
  await dialog.getByRole("button", { name: "Insert" }).click();
  await expect(editor.locator("[data-cross-ref]")).toHaveCount(1);
  await formula.hover();
  await expect(box.getByLabel("Formula name")).toBeDisabled();
  await expect(box.getByRole("button", { name: "Remove number" })).toBeDisabled();
  await expect(box).toContainText("cannot be changed or removed");
  // The places that refer to it are listed, and one of them can be visited
  const places = box.getByTestId("equation-references");
  await expect(places).toContainText("Referenced in 1 place");
  await expect(places.getByRole("button")).toHaveCount(1);
  await places.getByRole("button").click();
  await expect(box).toBeHidden();
});

test("what is typed right after the formula box closes is not lost", async ({ launch }) => {
  const { app } = await launch({ name: "公式焦點" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.getByRole("button", { name: "Inline formula" }).click();
  await page.getByRole("dialog").getByLabel("LaTeX").fill("x^2");
  // The key and the look at the focus are one step, so no frame passes between them for the focus to come back
  const focused = await page.evaluate(
    `new Promise(function (resolve) {
      var box = document.querySelector('[data-testid="math-box"] .cm-content');
      box.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
      var active = document.activeElement;
      resolve(!!active && active.classList.contains("ProseMirror"));
    })`,
  );
  expect(focused).toBe(true);
  await page.keyboard.type(" 為一連續函數。");
  await expect(editor).toContainText("為一連續函數。");
  await expect(editor.locator(".katex")).toHaveCount(1);
});

test("the formula box is a code editor, brackets close, Shift and Enter adds a line, Enter confirms", async ({ launch }) => {
  const { app } = await launch({ name: "公式編輯器" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.getByRole("button", { name: "Display formula" }).click();
  const input = page.getByRole("dialog").getByLabel("LaTeX");
  await input.click();
  // A bracket that is opened is closed, and typing the closing one goes over it
  await page.keyboard.type("\\frac{a}{b");
  await expect(input).toHaveText("\\frac{a}{b}");
  await page.keyboard.type("}");
  await expect(input).toHaveText("\\frac{a}{b}");
  await page.keyboard.press("Shift+Enter");
  await page.keyboard.type("c=d");
  await expect(input.locator(".cm-line")).toHaveCount(2);
  // The LaTeX has its own colours, and the box shows no frame of the browser on focus
  expect(await input.locator(".cm-line span").count()).toBeGreaterThan(0);
  await expect(page.getByRole("dialog").locator(".cm-editor")).toHaveCSS("outline-style", "none");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(editor.locator("[data-type='block-math']")).toHaveAttribute("data-latex", "\\frac{a}{b}\nc=d");
});
