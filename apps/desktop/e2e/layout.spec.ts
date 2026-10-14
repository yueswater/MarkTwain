import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

async function launch(dir: string) {
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");
  return electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: join(dir, "p.marktwain") },
  });
}

test("documents reorder by dragging, and the folded sidebar slides the list out on hover", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 排序 "));
  const app = await launch(dir);
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
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
    expect((await names()).map((n) => n.trim())).toEqual(["Abstract", "Chapter 1", "Alpha", "Beta"]);

    // Drag Beta above Chapter 1
    await sidebar.locator("li", { hasText: "Beta" }).dragTo(sidebar.locator("li", { hasText: "Chapter 1" }), { targetPosition: { x: 40, y: 2 } });
    await expect.poll(async () => (await names()).map((n) => n.trim())).toEqual(["Abstract", "Beta", "Chapter 2", "Alpha"]);

    // The abstract cannot be dropped among chapters
    await sidebar.locator("li", { hasText: "Abstract" }).dragTo(sidebar.locator("li", { hasText: "Alpha" }), { targetPosition: { x: 40, y: 20 } });
    expect((await names()).map((n) => n.trim())).toEqual(["Abstract", "Beta", "Chapter 2", "Alpha"]);

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
    await expect.poll(trimmed).toEqual(["Abstract", "Chapter 1", "Alpha", "Beta"]);

    b = await grab("Beta");
    const firstRow = await box("Chapter 1");
    await page.mouse.move(b.x + 40, firstRow.y + 1, { steps: 8 });
    await page.mouse.up();
    await expect.poll(trimmed).toEqual(["Abstract", "Beta", "Chapter 2", "Alpha"]);

    // Over a document of another kind the drop is refused and says why
    b = await grab("Alpha");
    const abstractRow = await box("Abstract");
    await page.mouse.move(b.x + 40, abstractRow.y + 3, { steps: 6 });
    await expect(page.getByText("Documents can only be moved among documents of the same kind.")).toBeVisible();
    await page.mouse.up();
    expect(await trimmed()).toEqual(["Abstract", "Beta", "Chapter 2", "Alpha"]);

    // Alt with an arrow moves the focused document
    await sidebar.getByRole("button", { name: "Alpha", exact: true }).focus();
    await page.keyboard.press("Alt+ArrowUp");
    await expect.poll(trimmed).toEqual(["Abstract", "Beta", "Alpha", "Chapter 3"]);

    // Fold the sidebar, the list becomes one icon, and hovering it shows the list
    await sidebar.getByRole("button", { name: "Collapse the sidebar" }).click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");
    const list = sidebar.getByRole("menu", { name: "Documents" });
    await expect(list).toBeHidden();
    await sidebar.getByRole("button", { name: "Documents" }).hover();
    await expect(list).toBeVisible();
    await list.getByRole("button", { name: "Alpha" }).click();
    await expect(page.locator(".ProseMirror")).toBeVisible();
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the preview can be resized by dragging its edge, and keeps the width", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 寬度 "));
  const app = await launch(dir);
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
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
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
