import { expect, test } from "../../support/test";
import { closeProject, createProject, openRecent } from "../../support/project";

test("definitions, lemmas and theorems are inserted, numbered, referenced and colored in the editor only", async ({ launch }) => {
  const { app } = await launch({ name: "定理" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();

  // The slash menu has a block of every kind, Enter wraps the paragraph and the head shows the name and the number
  await page.keyboard.type("/lemma");
  await page.keyboard.press("Enter");
  await expect(editor.locator('div[data-statement="lemma"] > .statement-head')).toHaveText("Lemma 1");
  await page.keyboard.type("A small result.");

  // The toolbar menu does the same for another kind
  await page.getByRole("button", { name: "Theorem blocks" }).click();
  await page.getByRole("menuitem", { name: "Theorem", exact: true }).click();
  await expect(editor.locator('div[data-statement="theorem"] > .statement-head')).toHaveText("Theorem 1");

  // Kinds count on their own, a title is added from the head
  await editor.locator('div[data-statement="lemma"] > .statement-head').click();
  const dialog = page.getByRole("dialog", { name: "Edit block" });
  await dialog.getByLabel("Title (optional)").fill("Sum");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(editor.locator('div[data-statement="lemma"] > .statement-head')).toHaveText("Lemma 1（Sum）");

  // Seed a second block of the same kind and a reference, then the numbers follow the document order.
  // What was typed is saved first, closing the project saves it too and would write it over the seed.
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.evaluate(async () => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) throw new Error("an IPC call that the test needs failed");
    const chapter = list.data.find((d) => d.kind === "chapter")!;
    await window.marktwain.invoke("document:save", {
      id: chapter.id,
      text: [
        "# Intro",
        "",
        "::: {.definition #def:norm title=\"Norm\"}",
        "A norm.",
        ":::",
        "",
        "::: {.lemma #lem:a}",
        "First lemma.",
        ":::",
        "",
        "::: {.lemma}",
        "Second lemma.",
        ":::",
        "",
        "::: {.proof}",
        "By @lem:a and @def:norm.",
        ":::",
      ].join("\n"),
    });
  });
  await closeProject(page);
  await openRecent(page);
  const heads = editor.locator(".statement-head");
  await expect(heads).toHaveText(["Definition 1（Norm）", "Lemma 1", "Lemma 2", "Proof"]);
  await expect(editor.locator("[data-cross-ref]").nth(0)).toHaveAttribute("data-display", "Lemma 1");
  await expect(editor.locator("[data-cross-ref]").nth(1)).toHaveAttribute("data-display", "Definition 1");

  // A card over the reference shows the block it points to
  await editor.locator("[data-cross-ref]").nth(1).hover();
  await expect(page.getByTestId("reference-card")).toContainText("Norm");
  await page.mouse.move(5, 5);

  // A block without a label can be picked too, and it gets its label then
  await editor.locator('div[data-statement="proof"] p').click();
  await page.keyboard.press("End");
  await page.keyboard.type(" and ");
  await page.getByRole("button", { name: "Cross-reference" }).click();
  const picker = page.getByRole("dialog");
  await picker.getByRole("combobox", { name: "Type" }).click();
  await page.getByRole("option", { name: "Theorem blocks" }).click();
  await picker.getByRole("combobox", { name: "Target" }).click();
  await page.getByRole("option", { name: /Lemma · Second lemma/ }).click();
  await picker.getByRole("button", { name: "Insert" }).click();
  await expect(editor.locator("[data-cross-ref]")).toHaveCount(3);
  await expect(editor.locator("[data-cross-ref]").nth(2)).toHaveAttribute("data-display", "Lemma 2");

  // The editor shows a plain callout until the colored style is chosen, and the color is the one set for the kind
  const lemma = editor.locator('div[data-statement="lemma"]').first();
  await expect(lemma).toHaveAttribute("data-statement-style", "callout");
  await expect(lemma).toHaveCSS("border-left-width", "1px");

  await page.keyboard.press("ControlOrMeta+,");
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "Theorem blocks", exact: true }).click();
  await settings.getByLabel("Style", { exact: true }).click();
  await page.getByRole("option", { name: "Colored" }).click();
  await settings.getByLabel("Color Lemma Hex code").fill("#FF0000");
  await expect(lemma).toHaveAttribute("data-statement-style", "colored");
  await expect(lemma).toHaveCSS("border-left-color", "rgb(255, 0, 0)");
  await expect(lemma).toHaveCSS("border-left-width", "4px");
  await page.keyboard.press("Escape");

  // The chosen colors live in the editor, the saved text and the PDF have none
  const text = await page.evaluate(async () => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) throw new Error("an IPC call that the test needs failed");
    const chapter = list.data.find((d) => d.kind === "chapter")!;
    const doc = await window.marktwain.invoke("document:get", { id: chapter.id });
    return doc.ok ? doc.data.text : "";
  });
  expect(text).not.toContain("FF0000");
  expect(text).toContain("{#lem:a .lemma}");
});
