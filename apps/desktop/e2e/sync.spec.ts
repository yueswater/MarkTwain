import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";
import { viewerState } from "./preview-viewer";

const dist = resolve(__dirname, "../dist");

test("the preview follows the caret of the editor, keeps its page after a rebuild, and a click in the PDF takes the caret to that text", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 同步 "));
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");
  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: join(dir, "p.marktwain"), MARKTWAIN_TEST_NO_PROFILE_DIALOG: "1" },
  });
  try {
    const page = await app.firstWindow();
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.getByRole("button", { name: "New project" }).click();
    await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return;
      const chapter = list.data.find((d) => d.kind === "chapter")!;
      const paragraphs = Array.from({ length: 60 }, (_, i) => `Paragraph number ${i + 1}. ${"filling text ".repeat(40)}`).join("\n\n");
      await window.marktwain.invoke("document:save", { id: chapter.id, text: `# Long\n\n${paragraphs}\n` });
    });
    await page.getByRole("button", { name: "Close project" }).click();
    await page.getByRole("region", { name: "Recent projects" }).getByRole("button").first().click();
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect.poll(async () => (await viewerState(page))?.total ?? 0, { timeout: 90_000 }).toBeGreaterThan(5);

    // Scrolling the editor scrolls the preview with it
    await page.waitForTimeout(1500);
    await page.mouse.move(500, 400);
    await page.mouse.wheel(0, 5000);
    await expect.poll(async () => (await viewerState(page))?.page ?? 0, { timeout: 15_000 }).toBeGreaterThan(3);
    // At the top of the editor the preview is at the first page of the chapter, the pages before it hold the title and the contents
    await page.mouse.wheel(0, -20000);
    await expect.poll(async () => (await viewerState(page))?.page ?? 99, { timeout: 15_000 }).toBeLessThanOrEqual(6);

    // A caret far down the editor brings the preview to the page of that paragraph
    const paragraphs = page.locator(".ProseMirror > p");
    await paragraphs.nth(44).scrollIntoViewIfNeeded();
    await paragraphs.nth(44).click();
    await expect.poll(async () => (await viewerState(page))?.page ?? 0, { timeout: 15_000 }).toBeGreaterThan(5);
    const reached = (await viewerState(page))!.page;

    // The next build opens at the same page and not at the first one
    const built = (await viewerState(page))!.id;
    await page.keyboard.type("x");
    await expect.poll(async () => (await viewerState(page))?.id, { timeout: 60_000 }).not.toBe(built);
    // A paragraph that sits at the foot of a page may land on the page before or after it, since the place is a page and a height in it, so one page of difference is allowed
    await expect.poll(async () => Math.abs(((await viewerState(page))?.page ?? 0) - reached), { timeout: 15_000 }).toBeLessThanOrEqual(1);
    expect((await viewerState(page))!.page).toBeGreaterThan(5);

    // A click on the text of the PDF takes the caret of the editor to the paragraph that holds it
    const number = async () => (await page.evaluate(() => document.getSelection()?.anchorNode?.textContent ?? "")).match(/number (\d+)/)?.[1];
    const before = Number(await number());
    const box = (await page.getByTestId("preview-pages").boundingBox())!;
    // The page that is shown may have the caret paragraph at its middle, so a few places are tried until one is another paragraph
    for (const share of [0.5, 0.25, 0.75, 0.12]) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height * share);
      await page.waitForTimeout(1500);
      if (Number(await number()) !== before) break;
    }
    await expect.poll(async () => Number(await number()), { timeout: 15_000 }).not.toBe(before);
    expect(Math.abs(Number(await number()) - before)).toBeLessThan(10);
    // The paragraph is shown in the middle of the editor
    await expect
      .poll(async () => {
        const place = await page.evaluate(() => {
          const caret = document.getSelection()?.anchorNode;
          const block = (caret instanceof Element ? caret : caret?.parentElement)?.closest(".ProseMirror > p");
          const frame = document.querySelector(".ProseMirror")?.closest(".overflow-y-auto");
          if (!block || !frame) return null;
          const b = block.getBoundingClientRect();
          const f = frame.getBoundingClientRect();
          return (b.top + b.height / 2 - (f.top + f.height / 2)) / f.height;
        });
        return place === null ? 1 : Math.abs(place);
      }, { timeout: 10_000 })
      .toBeLessThan(0.12);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
