import { expect, test } from "../../support/test";
import { closeProject, createProject, openRecent } from "../../support/project";

const longText = (title: string) => [`# ${title}`, "", ...Array.from({ length: 60 }, (_, i) => `Paragraph ${i + 1} of ${title}.\n`)].join("\n");

test("pushing the wheel against the bottom or the top of a chapter opens the next or the previous one", async ({ launch }) => {
  const { app } = await launch({ name: "換章" });
  const page = await app.firstWindow();
  await createProject(page);
  await page.evaluate(async (texts) => {
    await window.marktwain.invoke("document:create", { kind: "chapter" });
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) return;
    const chapters = list.data.filter((d) => d.kind === "chapter");
    await window.marktwain.invoke("document:save", { id: chapters[0]!.id, text: texts[0]! });
    await window.marktwain.invoke("document:save", { id: chapters[1]!.id, text: texts[1]! });
  }, [longText("Alpha"), longText("Beta")]);
  await closeProject(page);
  await openRecent(page);

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
});
