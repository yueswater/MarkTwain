import { expect, test } from "../../support/test";
import { resolve } from "node:path";
import { closeProject, createProject, openRecent, savedChapter } from "../../support/project";

test("footnotes, citations and cross-references can be inserted, shown, and saved as Markdown", async ({ launch }) => {
  const { app, file } = await launch({ name: "引用", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  const dialog = page.getByRole("dialog");
  // Continue typing only after the dialog closes and focus is back in the editor
  const settle = async () => {
    await expect(dialog).toBeHidden();
    await expect(editor).toBeFocused();
  };

  await page.keyboard.type("## Motivation");
  await page.keyboard.press("Enter");
  await page.keyboard.type("As shown in ");

  // Cross-reference, pick an unlabeled heading and a label is added automatically
  await page.getByRole("button", { name: "Cross-reference" }).click();
  // The target list stays closed until a type is chosen, and then lists only that type
  await expect(dialog.getByRole("combobox", { name: "Target" })).toBeDisabled();
  await dialog.getByRole("combobox", { name: "Type" }).click();
  await page.getByRole("option", { name: "Heading" }).click();
  await dialog.getByRole("combobox", { name: "Target" }).click();
  await page.getByRole("option", { name: "Section · Motivation" }).click();
  await dialog.getByRole("button", { name: "Insert" }).click();
  await settle();
  await expect(editor.locator("[data-cross-ref]")).toHaveAttribute("data-display", "Motivation");

  // Footnote
  await page.keyboard.type(" and noted");
  await page.getByRole("button", { name: "Footnote" }).click();
  await dialog.getByLabel("Footnote text").fill("A **bold** remark.");
  await dialog.getByRole("button", { name: "Insert" }).click();
  await settle();
  await expect(editor.locator("sup[data-footnote]")).toHaveAttribute("data-n", "1");

  // Citation
  await page.keyboard.type(" see ");
  await page.getByRole("button", { name: "Citation" }).click();
  await dialog.getByLabel("Other keys").fill("wang2020, lee2019");
  await dialog.getByRole("button", { name: "Insert" }).click();
  await settle();
  await expect(editor.locator("[data-citation]")).toHaveAttribute("data-display", "(wang2020; lee2019)");

  // Click a footnote to edit it again
  await editor.locator("sup[data-footnote]").click();
  await dialog.getByLabel("Footnote text").fill("Edited.");
  await dialog.getByRole("button", { name: "Update" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");

  const text = await savedChapter(page);
  expect(text).toMatch(/^## Motivation \{#sec:[0-9a-f]{4}\}\n/);
  expect(text).toMatch(/As shown in @sec:[0-9a-f]{4} and noted\[\^1\] see \[@wang2020; @lee2019\]/);
  expect(text).toContain("[^1]: Edited.");
});


test("hovering a reference or a footnote opens a card with what it points to", async ({ launch }) => {
  const { app } = await launch({ name: "卡片" });
  const page = await app.firstWindow();
  await createProject(page);
  await page.evaluate(async () => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) throw new Error("an IPC call that the test needs failed");
    const chapter = list.data.find((d) => d.kind === "chapter")!;
    const long = "word ".repeat(80);
    await window.marktwain.invoke("document:save", {
      id: chapter.id,
      text: [
        "# Intro {#cha:intro}",
        "",
        "Opening words for the chapter.",
        "",
        "$$",
        "E = mc^2",
        "$$ {#eq:energy}",
        "",
        "| Setting | Share |",
        "|---|---|",
        "| $a_1$ | 0.4 |",
        "| B | 0.6 |",
        "",
        ": Shares of the settings {#tbl:shares}",
        "",
        `See @eq:energy and @tbl:shares and @fig:missing, then a note[^1].`,
        "",
        `[^1]: ${long}`,
      ].join("\n"),
    });
  });
  await closeProject(page);
  await openRecent(page);
  const editor = page.locator(".ProseMirror");
  await expect(editor.locator("[data-cross-ref]")).toHaveCount(3);

  // A formula and a table are drawn in a card next to the reference
  // The page settles after it opens, the numbers and the captions arrive, and a reference that moves from under the pointer closes its card
  let seen = "";
  await expect
    .poll(async () => {
      const now = JSON.stringify(await editor.locator("[data-cross-ref]").nth(0).boundingBox());
      const same = now === seen;
      seen = now;
      return same;
    }, { intervals: [300] })
    .toBe(true);
  await editor.locator("[data-cross-ref]").nth(0).hover();
  const card = page.getByTestId("reference-card");
  await expect(card).toBeVisible();
  await expect(card.locator(".katex")).toBeVisible();
  await expect(card).toContainText("Chapter 1");
  await editor.locator("[data-cross-ref]").nth(1).hover();
  await expect(card.locator("table")).toBeVisible();
  await expect(card).toContainText("Shares of the settings");
  // A formula in a cell is drawn, not shown as its source
  await expect(card.locator("table .katex")).toBeVisible();
  await expect(card).not.toContainText("$");

  // A reference to nothing says so, the card of the one before may lie over it, so the pointer leaves first
  await page.mouse.move(5, 5);
  await expect(card).toBeHidden();
  await editor.locator("[data-cross-ref]").nth(2).hover();
  await expect(card).toContainText("points to nothing");

  // A citation tells which work it points to, with its title
  await page.evaluate(async () => {
    await window.marktwain.invoke("bibliography:set-text", { text: "@article{smith2020,\n  title = {A {Study} of Things},\n  author = {Smith, Ann and Lee, Bo},\n  journal = {Journal of Things},\n  year = {2020}\n}\n" });
  });
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type(" and ");
  await page.getByRole("button", { name: "Citation" }).click();
  await page.getByRole("dialog").getByLabel("Other keys").fill("smith2020");
  await page.getByRole("dialog").getByRole("button", { name: "Insert" }).click();
  await editor.locator("span[data-citation]").first().hover();
  const cite = page.getByTestId("citation-card");
  await expect(cite).toBeVisible();
  await expect(cite).toContainText("A Study of Things");
  await expect(cite).toContainText("Smith, Ann; Lee, Bo · 2020");
  await expect(cite).toContainText("Journal of Things");
  await page.mouse.move(5, 5);
  await expect(cite).toBeHidden();

  // A footnote has a tooltip of a fixed size with the start of its text, cut with three dots
  await page.mouse.move(5, 5);
  await expect(card).toBeHidden();
  await editor.locator("sup[data-footnote]").hover();
  const note = page.getByTestId("footnote-card");
  await expect(note).toBeVisible();
  await expect(note).toContainText("word word");
  await expect(note).toContainText("...");
  const box = await note.boundingBox();
  expect(box && Math.round(box.width) === 280 && Math.round(box.height) === 104).toBe(true);

  // Going to the target from the card closes it
  await editor.locator("[data-cross-ref]").nth(0).hover();
  await card.getByRole("button", { name: "Go to" }).click();
  await expect(card).toBeHidden();
});


test("a heading of another document that has no label can be referenced, and gets its label there", async ({ launch }) => {
  const { app } = await launch({ name: "xref" });
  const page = await app.firstWindow();
  await createProject(page);
  const ids = await page.evaluate(async () => {
    const created = await window.marktwain.invoke("document:create", { kind: "chapter" });
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok || !created.ok) return null;
    const chapters = list.data.filter((d) => d.kind === "chapter");
    await window.marktwain.invoke("document:save", { id: chapters[0]!.id, text: "# Introduction\n\nSee " });
    await window.marktwain.invoke("document:save", { id: chapters[1]!.id, text: "# Method\n\n## Sampling\n" });
    return chapters.map((d) => d.id);
  });
  expect(ids).toHaveLength(2);
  await closeProject(page);
  await openRecent(page);

  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.getByRole("button", { name: "Cross-reference" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Type" }).click();
  await page.getByRole("option", { name: "Heading" }).click();
  await dialog.getByRole("combobox", { name: "Target" }).click();
  // The document has no title of its own, so it is named by its kind and number and not by empty brackets
    await expect(page.getByRole("option", { name: "Section · Sampling ()" })).toHaveCount(0);
    await page.getByRole("option", { name: /Section · Sampling \(Chapter 2\)/ }).click();
  await dialog.getByRole("button", { name: "Insert" }).click();
  await expect(dialog).toBeHidden();
  await expect(editor.locator("[data-cross-ref]")).toHaveAttribute("data-display", "Sampling");

  // The other document was saved with the label, and it is a target of the index now
  const saved = await page.evaluate(async (id) => {
    const doc = await window.marktwain.invoke("document:get", { id });
    return doc.ok ? doc.data.text : "";
  }, ids![1]!);
  expect(saved).toMatch(/## Sampling \{#sec:[0-9a-f]{4}\}/);
  const index = await page.evaluate(async () => {
    const result = await window.marktwain.invoke("label:resolve");
    return result.ok ? result.data.targets.map((t) => t.kind) : [];
  });
  expect(index).toContain("sec");
});
