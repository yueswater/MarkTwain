import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

const longText = (title: string) => [`# ${title}`, "", ...Array.from({ length: 60 }, (_, i) => `Paragraph ${i + 1} of ${title}.\n`)].join("\n");

test("pushing the wheel against the bottom or the top of a chapter opens the next or the previous one", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 換章 "));
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");
  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: join(dir, "p.marktwain"), MARKTWAIN_TEST_NO_PROFILE_DIALOG: "1" },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    await page.evaluate(async (texts) => {
      await window.marktwain.invoke("document:create", { kind: "chapter" });
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return;
      const chapters = list.data.filter((d) => d.kind === "chapter");
      await window.marktwain.invoke("document:save", { id: chapters[0]!.id, text: texts[0]! });
      await window.marktwain.invoke("document:save", { id: chapters[1]!.id, text: texts[1]! });
    }, [longText("Alpha"), longText("Beta")]);
    await page.getByRole("button", { name: "Close project" }).click();
    await page.getByRole("region", { name: "Recent projects" }).getByRole("button").first().click();

    const editor = page.locator(".ProseMirror");
    const scroller = page.locator("div.overflow-y-auto", { has: editor }).first();
    await expect(editor.locator("h1")).toHaveText("Alpha");
    await editor.hover();

    // A wheel in the middle of the page only scrolls it
    await page.mouse.wheel(0, 300);
    await expect(editor.locator("h1")).toHaveText("Alpha");

    // Momentum that brings the page to the bottom does not open the next chapter
    await scroller.evaluate((box) => (box.scrollTop = box.scrollHeight));
    await page.mouse.wheel(0, 40);
    await page.waitForTimeout(100);
    await expect(editor.locator("h1")).toHaveText("Alpha");

    // A new swipe at the bottom does, after a pause, and a hint says where it goes
    await page.waitForTimeout(400);
    await page.mouse.wheel(0, 80);
    await expect(page.getByTestId("edge-hint")).toContainText("Chapter");
    await page.mouse.wheel(0, 80);
    await expect(editor.locator("h1")).toHaveText("Beta");
    await expect.poll(() => scroller.evaluate((box) => box.scrollTop)).toBeLessThan(5);

    // At the top of the second chapter a swipe up goes back and shows the bottom of the first
    await page.waitForTimeout(400);
    await page.mouse.wheel(0, -80);
    await page.mouse.wheel(0, -80);
    await expect(editor.locator("h1")).toHaveText("Alpha");
    await expect.poll(() => scroller.evaluate((box) => box.scrollHeight - box.clientHeight - box.scrollTop)).toBeLessThan(5);

    // The chapter has the abstract before it, which has no heading
    await scroller.evaluate((box) => (box.scrollTop = 0));
    await page.waitForTimeout(400);
    await page.mouse.wheel(0, -200);
    await page.mouse.wheel(0, -200);
    await expect(editor.locator("h1")).toHaveCount(0);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
