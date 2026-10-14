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
