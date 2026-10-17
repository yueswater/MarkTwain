import { expect, test } from "../../support/test";
import { join } from "node:path";
import { showViewerPage, viewerState } from "../../support/preview-viewer";
import { closeProject, createProject, openRecent } from "../../support/project";

test("documents reorder by dragging, and the folded sidebar slides the list out on hover", async ({ launch }) => {
  const { app } = await launch({ name: "排序" });
  const page = await app.firstWindow();
  await createProject(page);
  const sidebar = page.getByRole("complementary", { name: "Documents" });
  for (const title of ["Alpha", "Beta"]) {
    await sidebar.getByRole("button", { name: "Add document" }).click();
    await page.getByRole("menuitem", { name: "Chapter", exact: true }).click();
    const last = sidebar.locator("li").last();
    await last.getByRole("button").first().hover();
    await last.getByRole("button", { name: /Actions for/ }).click({ force: true });
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: "Save" }).click();
  }
  const names = () => sidebar.locator("li").allInnerTexts();
  expect((await names()).map((n) => n.trim())).toEqual(["Abstract in Chinese", "Abstract in English", "Chapter 1", "Alpha", "Beta"]);

  // Drag Beta above Chapter 1
  await sidebar.locator("li", { hasText: "Beta" }).dragTo(sidebar.locator("li", { hasText: "Chapter 1" }), { targetPosition: { x: 40, y: 2 } });
  await expect.poll(async () => (await names()).map((n) => n.trim())).toEqual(["Abstract in Chinese", "Abstract in English", "Beta", "Chapter 2", "Alpha"]);

  // The abstract cannot be dropped among chapters
  await sidebar.locator("li", { hasText: "Abstract in Chinese" }).dragTo(sidebar.locator("li", { hasText: "Alpha" }), { targetPosition: { x: 40, y: 20 } });
  expect((await names()).map((n) => n.trim())).toEqual(["Abstract in Chinese", "Abstract in English", "Beta", "Chapter 2", "Alpha"]);

  // A real pointer drag to the empty space below the last row puts the document last, and above the first row puts it first
  const trimmed = async () => (await names()).map((n) => n.trim());
  const box = async (title: string) => (await sidebar.locator("li", { hasText: title }).boundingBox())!;
  const grab = async (title: string) => {
    const b = await box(title);
    await page.mouse.move(b.x + 40, b.y + b.height / 2);
    await page.mouse.down();
    return b;
  };
  let b = await grab("Beta");
  const lastRow = await box("Alpha");
  await page.mouse.move(b.x + 40, lastRow.y + lastRow.height + 4, { steps: 8 });
  await page.mouse.up();
  await expect.poll(trimmed).toEqual(["Abstract in Chinese", "Abstract in English", "Chapter 1", "Alpha", "Beta"]);

  b = await grab("Beta");
  const firstRow = await box("Chapter 1");
  await page.mouse.move(b.x + 40, firstRow.y + 1, { steps: 8 });
  await page.mouse.up();
  await expect.poll(trimmed).toEqual(["Abstract in Chinese", "Abstract in English", "Beta", "Chapter 2", "Alpha"]);

  // Over a document of another kind the drop is refused and says why
  b = await grab("Alpha");
  const abstractRow = await box("Abstract in Chinese");
  await page.mouse.move(b.x + 40, abstractRow.y + 3, { steps: 6 });
  await expect(page.getByText("Documents can only be moved among documents of the same kind.")).toBeVisible();
  await page.mouse.up();
  expect(await trimmed()).toEqual(["Abstract in Chinese", "Abstract in English", "Beta", "Chapter 2", "Alpha"]);

  // Alt with an arrow moves the focused document
  await sidebar.getByRole("button", { name: "Alpha", exact: true }).focus();
  await page.keyboard.press("Alt+ArrowUp");
  await expect.poll(trimmed).toEqual(["Abstract in Chinese", "Abstract in English", "Beta", "Alpha", "Chapter 3"]);

  // Fold the sidebar, the list becomes one icon, and hovering it shows the list
  await sidebar.getByRole("button", { name: "Collapse the sidebar" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  const list = sidebar.getByRole("menu", { name: "Documents" });
  await expect(list).toBeHidden();
  await sidebar.getByRole("button", { name: "Documents" }).hover();
  await expect(list).toBeVisible();
  await list.getByRole("button", { name: "Alpha" }).click();
  await expect(page.locator(".ProseMirror")).toBeVisible();
});


test("the preview can be resized by dragging its edge, and keeps the width", async ({ launch }) => {
  const { app } = await launch({ name: "寬度" });
  const page = await app.firstWindow();
  await createProject(page);
  await page.getByRole("button", { name: "Preview" }).click();
  const preview = page.getByRole("complementary", { name: "Preview" });
  const before = (await preview.boundingBox())!.width;
  const handle = page.getByRole("separator", { name: "Resize the preview" });
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x - 120, box.y + 200, { steps: 5 });
  await page.mouse.up();
  const after = (await preview.boundingBox())!.width;
  expect(after).toBeGreaterThan(before + 80);

  // Arrow keys on the separator also resize it
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  expect((await preview.boundingBox())!.width).toBeLessThan(after);
});


test("the preview returns to its place after a rebuild and after being closed, and the separator thickens on hover", async ({ launch }) => {
  const { app } = await launch({ name: "預覽位置" });
  const page = await app.firstWindow();
  await createProject(page);
  // A thesis of several pages
  await page.evaluate(async () => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) throw new Error("an IPC call that the test needs failed");
    const chapter = list.data.find((d) => d.kind === "chapter")!;
    const paragraphs = Array.from({ length: 60 }, (_, i) => `Paragraph ${i + 1}. ${"text ".repeat(60)}`).join("\n\n");
    await window.marktwain.invoke("document:save", { id: chapter.id, text: `# Long\n\n${paragraphs}\n` });
  });
  await closeProject(page);
  await openRecent(page);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const pages = page.getByTestId("preview-pages");
  await expect.poll(async () => (await viewerState(page))?.total ?? 0, { timeout: 90_000 }).toBeGreaterThan(3);

  // Scroll to the fourth page, once the build has found its place, a scroll before that is the viewer settling
  await page.waitForTimeout(1500);
  await showViewerPage(page, 4);
  await expect.poll(async () => (await viewerState(page))?.page).toBe(4);

  // Closing and opening the preview returns to the same place
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(pages).toBeHidden();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect.poll(async () => (await viewerState(page))?.total ?? 0, { timeout: 90_000 }).toBeGreaterThan(3);
  await expect.poll(async () => (await viewerState(page))?.page, { timeout: 15_000 }).toBe(4);

  // A rebuild after a save keeps the place too, and shows the new build
  const built = (await viewerState(page))?.id;
  await page.evaluate(async () => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) throw new Error("an IPC call that the test needs failed");
    const chapter = list.data.find((d) => d.kind === "chapter")!;
    const doc = await window.marktwain.invoke("document:get", { id: chapter.id });
    if (doc.ok) await window.marktwain.invoke("document:save", { id: chapter.id, text: `${doc.data.text}\nOne more paragraph.\n` });
  });
  await page.getByRole("button", { name: "Build", exact: true }).click().catch(() => undefined);
  await expect.poll(async () => (await viewerState(page))?.id, { timeout: 60_000 }).not.toBe(built);
  await expect.poll(async () => (await viewerState(page))?.page, { timeout: 15_000 }).toBe(4);

  // The edge between the editor and the preview thickens under the pointer
  const handle = page.getByRole("separator", { name: "Resize the preview" });
  const width = () => handle.evaluate((el) => parseFloat(getComputedStyle(el, "::after").width));
  expect(await width()).toBeLessThan(2);
  await handle.hover();
  await expect.poll(width).toBeGreaterThan(3);
});
