import { chmodSync } from "node:fs";
import { expect, test } from "../../support/test";
import { closeProject, createProject, openRecent, readChapter } from "../../support/project";

// A file cannot be made read only in the same way on Windows, where the mode of a file is not what keeps it from being written
test.skip(process.platform === "win32", "needs a file that can be made read only");

test("when the project cannot be written the text stays, the project stays open, and a second try to close it closes it", async ({ launch }) => {
  const session = await launch({ name: "唯讀", projectName: "論文.marktwain" });
  const page = await session.app.firstWindow();
  await createProject(page);
  await closeProject(page);
  chmodSync(session.file, 0o444);
  try {
    await openRecent(page);
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type("這段文字存不進檔案");

    // The status says so in words, and the text is still in the editor
    await expect(page.getByRole("alert").filter({ hasText: "Could not save" })).toBeVisible({ timeout: 15_000 });
    await expect(editor).toContainText("這段文字存不進檔案");

    // Closing would lose the text, so the project stays open and the reason is given
    await page.getByRole("button", { name: "Close project" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "stays open" })).toBeVisible();
    await expect(editor).toContainText("這段文字存不進檔案");

    // The connection to a file that was read only when it was opened stays read only, so a second try to close closes it, the person was told what is lost
    await page.getByRole("button", { name: "Close project" }).click();
    await expect(page.getByRole("button", { name: "Open project" })).toBeVisible();
  } finally {
    chmodSync(session.file, 0o644);
  }
});
