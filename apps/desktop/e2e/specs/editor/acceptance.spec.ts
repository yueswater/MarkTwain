import { expect, test } from "../../support/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../../support/paths";
import { closeProject, createProject } from "../../support/project";

const sample = readFileSync(join(REPO_ROOT, "packages/schema/fixtures/dialect-sample.md"), "utf8");

// Done when: content using every node survives closing and reopening the project

test("a document that uses every node survives closing and reopening", async ({ launch }) => {
  const { app } = await launch({ name: "驗收", projectName: "論文.marktwain", lang: "zh-TW" });
  const page = await app.firstWindow();
  await createProject(page, "zh-TW");
  await expect(page.locator(".ProseMirror")).toBeVisible();

  // Write the sample covering all syntax into the first chapter
  const id = await page.evaluate(async (text) => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) throw new Error("an IPC call that the test needs failed");
    const chapter = list.data.find((d) => d.kind === "chapter");
    if (!chapter) return null;
    await window.marktwain.invoke("document:save", { id: chapter.id, text });
    return chapter.id;
  }, sample);
  expect(id).not.toBeNull();

  // Reopen the project, load it in the editor without changes, then read the text back
  await closeProject(page, "zh-TW");
  await page.getByRole("button", { name: "開啟專案" }).click();
  await expect(page.locator(".ProseMirror")).toBeVisible();
  for (const selector of [
    "h1",
    "table",
    "figure",
    "[data-type='inline-math']",
    "[data-type='block-math']",
    "sup[data-footnote]",
    "[data-citation]",
    "[data-cross-ref]",
    "dl dt",
    "blockquote",
    "pre",
  ]) {
    await expect(page.locator(`.ProseMirror ${selector}`).first(), selector).toBeAttached();
  }

  const after = await page.evaluate(async (docId) => {
    const result = await window.marktwain.invoke("document:get", { id: docId! });
    return result.ok ? result.data.text : null;
  }, id);
  expect(after).toBe(sample);

  // Type in the editor and save, the output differs from the sample only by the typed text
  // Type at the start of the first heading so the last node of the document does not matter
  await page.locator(".ProseMirror h1").first().click();
  await page.keyboard.press("ControlOrMeta+Home");
  await page.keyboard.type("結尾");
  await page.keyboard.press("ControlOrMeta+s");
  await expect(page.getByRole("status")).toHaveText("已儲存");
  const edited = await page.evaluate(async (docId) => {
    const result = await window.marktwain.invoke("document:get", { id: docId! });
    return result.ok ? result.data.text : null;
  }, id);
  expect(edited?.replace("結尾", "")).toBe(sample);
});

// Numbers in cross-references update at once when figures or tables change

test("cross-reference numbers update when a figure is removed", async ({ launch }) => {
  const { app } = await launch({ name: "編號", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page);
  await expect(page.locator(".ProseMirror")).toBeVisible();
  await page.evaluate(async () => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) throw new Error("an IPC call that the test needs failed");
    const chapter = list.data.find((d) => d.kind === "chapter")!;
    await window.marktwain.invoke("document:save", {
      id: chapter.id,
      text: "![A](images/a.png){#fig:a}\n\n![B](images/b.png){#fig:b}\n\nSee @fig:b.\n",
    });
  });
  await closeProject(page);
  await page.getByRole("button", { name: "Open project" }).click();

  const ref = page.locator(".ProseMirror [data-cross-ref]");
  await expect(ref).toHaveAttribute("data-display", "Figure 2");

  // Delete the first figure, the second becomes 1
  await page.locator(".ProseMirror figure").first().click();
  await page.getByRole("button", { name: "Remove the picture" }).click();
  await expect(page.locator(".ProseMirror figure")).toHaveCount(1);
  await expect(ref).toHaveAttribute("data-display", "Figure 1");

  // Delete the referenced figure too, the reference becomes broken
  await page.locator(".ProseMirror figure").first().click();
  await page.getByRole("button", { name: "Remove the picture" }).click();
  await expect(ref).toHaveAttribute("data-broken", "");
});
