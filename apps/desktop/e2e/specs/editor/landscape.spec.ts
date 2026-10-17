import { expect, test } from "../../support/test";
import { createProject } from "../../support/project";

test("a landscape block is inserted from the slash menu and the shortcut, framed, saved and taken away again", async ({ launch }) => {
  const { app } = await launch({ name: "橫向" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();

  await page.keyboard.type("/landscape");
  await page.keyboard.press("Enter");
  await page.keyboard.type("A wide table goes here");
  const block = editor.locator("div[data-landscape]");
  await expect(block).toHaveCount(1);
  await expect(block.locator(".landscape-head")).toContainText("Landscape");

  // The document keeps it as a fenced block of the class
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const list = await window.marktwain.invoke("document:list");
        if (!list.ok) throw new Error("an IPC call that the test needs failed");
        const chapter = list.data.find((d) => d.kind === "chapter")!;
        const doc = await window.marktwain.invoke("document:get", { id: chapter.id });
        return doc.ok ? doc.data.text : "";
      }),
    )
    .toContain("::: {.landscape}");

  // The button of the head takes the frame away and keeps the text
  await block.locator(".landscape-head button").dispatchEvent("mousedown");
  await expect(editor.locator("div[data-landscape]")).toHaveCount(0);
  await expect(editor).toContainText("A wide table goes here");

  // The shortcut wraps the paragraph again
  await page.keyboard.press("ControlOrMeta+Alt+w");
  await expect(editor.locator("div[data-landscape]")).toHaveCount(1);
});
