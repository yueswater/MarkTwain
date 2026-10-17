import { expect, test } from "../../support/test";
import { closeProject, createProject, openRecent } from "../../support/project";

test("find in the document highlights and steps through matches, and the project search opens a hit", async ({ launch }) => {
  const { app } = await launch({ name: "搜尋" });
  const page = await app.firstWindow();
  await createProject(page);
  await page.evaluate(async () => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) throw new Error("an IPC call that the test needs failed");
    const abstract = list.data.find((d) => d.kind === "abstract")!;
    const chapter = list.data.find((d) => d.kind === "chapter")!;
    await window.marktwain.invoke("document:save", { id: abstract.id, text: "Abstract about the gradient method.\n" });
    await window.marktwain.invoke("document:save", { id: chapter.id, text: "# Intro\n\nThe Gradient is used. Another gradient here.\n\nA **gra**dient split by bold.\n" });
  });
  await closeProject(page);
  await openRecent(page);
  const editor = page.locator(".ProseMirror");
  await expect(editor.locator("h1")).toHaveText("Intro");

  // Find in this document
  // The heading comes before every match, so the search starts at the first one wherever the window is sized
  await editor.locator("h1").click();
  await page.keyboard.press("ControlOrMeta+f");
  const bar = page.getByRole("search", { name: "Find in this document" });
  await expect(bar).toBeVisible();
  await bar.getByRole("textbox").fill("gradient");
  await expect(page.getByTestId("find-count")).toHaveText("1 / 3");
  await expect(editor.locator(".find-match")).toHaveCount(4);
  await bar.getByRole("textbox").press("Enter");
  await expect(page.getByTestId("find-count")).toHaveText("2 / 3");
  await bar.getByRole("button", { name: "Match case" }).click();
  await expect(page.getByTestId("find-count")).toHaveText(/1 \/ 2|2 \/ 2/);
  await bar.getByRole("textbox").press("Escape");
  await expect(bar).toBeHidden();
  await expect(editor.locator(".find-match")).toHaveCount(0);

  // Search the whole project and open a hit in the other document
  await page.keyboard.press("ControlOrMeta+Shift+f");
  const dialog = page.getByRole("dialog", { name: "Search the project" });
  await dialog.getByRole("textbox").fill("gradient method");
  await expect(dialog.getByRole("region", { name: "Abstract" })).toBeVisible();
  await dialog.getByRole("region", { name: "Abstract" }).getByRole("button").first().click();
  await expect(page.getByRole("search", { name: "Find in this document" })).toBeVisible();
  await expect(page.getByTestId("find-count")).toHaveText("1 / 1");
  await expect(page.locator(".ProseMirror")).toContainText("Abstract about the gradient method.");
});
