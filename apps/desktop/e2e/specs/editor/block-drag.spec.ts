import type { Locator } from "@playwright/test";
import { expect, test } from "../../support/test";
import { closeProject, createProject, openRecent } from "../../support/project";

test("a block is dragged by the grip at its left to another place, into a callout and into a table cell", async ({ launch }) => {
  const { app } = await launch({ name: "拖曳" });
  const page = await app.firstWindow();
  await createProject(page);
  await page.evaluate(async () => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) return;
    const chapter = list.data.find((d) => d.kind === "chapter")!;
    await window.marktwain.invoke("document:save", {
      id: chapter.id,
      text: ["# One", "", "Alpha line.", "", "Beta line.", "", "Gamma line.", "", "::: {.theorem}", "Inside the theorem.", ":::", "", "| a | b |", "|---|---|", "| x | y |", "", ": A table {#tbl:t}"].join("\n"),
    });
  });
  await closeProject(page);
  await openRecent(page);

  const editor = page.locator(".ProseMirror");
  const handle = page.getByTestId("block-handle");
  // The grip is taken with the mouse and brought over the place, as a person does it
  const drag = async (to: import("@playwright/test").Locator, at: { x: number; y: number }) => {
    const grip = await handle.boundingBox();
    const target = await to.boundingBox();
    if (!grip || !target) throw new Error("nothing to drag");
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(grip.x + grip.width / 2, grip.y - 20, { steps: 5 });
    await page.mouse.move(target.x + at.x, target.y + at.y, { steps: 10 });
    await page.mouse.up();
  };
  const texts = () => editor.evaluate((root) => [...root.children].filter((c) => c.tagName === "P").map((c) => c.textContent ?? "").filter((text) => text !== ""));

  await expect(handle).toHaveCount(0);
  await editor.getByText("Gamma line.").hover();
  await expect(handle).toBeVisible();

  // Up between two blocks
  await drag(editor.getByText("Alpha line."), { x: 40, y: 2 });
  await expect.poll(texts).toEqual(["Gamma line.", "Alpha line.", "Beta line."]);

  // Into the callout, the paragraph is then a part of it
  await editor.getByText("Beta line.").hover();
  await drag(editor.getByText("Inside the theorem."), { x: 40, y: 20 });
  await expect(editor.locator('div[data-statement="theorem"]')).toContainText("Beta line.");
  await expect.poll(texts).toEqual(["Gamma line.", "Alpha line."]);

  // Into a cell of the table, it becomes the text of the cell
  await editor.getByText("Alpha line.").hover();
  await drag(editor.locator("td").first(), { x: 20, y: 10 });
  await expect(editor.locator("td").first()).toContainText("Alpha line.");
  await expect.poll(texts).toEqual(["Gamma line."]);
});
