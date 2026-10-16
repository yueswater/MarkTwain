import { expect, test } from "../../support/test";
import { createProject, showChangeMarks } from "../../support/project";

test("what was added, changed and taken away since the saved version is marked in the editor, and the mark goes with the next version", async ({ launch }) => {
  const { app } = await launch({ name: "changes" });
  const page = await app.firstWindow();
  await createProject(page);
  await showChangeMarks(page);
  const editor = page.locator(".ProseMirror");
  const bar = page.getByTestId("branch-bar");
  const save = async (message: string) => {
    await bar.click();
    await page.getByRole("menuitem", { name: "Save a version…" }).click();
    await page.getByLabel("What did you change?").fill(message);
    await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(bar).toHaveAttribute("data-dirty", "false");
  };

  // A first version, nothing is marked
  await expect(bar).toContainText("Main line");
  await editor.click();
  await page.keyboard.type("First paragraph");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Second paragraph");
  await save("Two paragraphs");
  await expect(editor.locator(".change-added")).toHaveCount(0);
  await expect(editor.locator(".change-ghost")).toHaveCount(0);

  // A paragraph that is new is green
  await editor.getByText("Second paragraph").click();
  await page.keyboard.press("Enter");
  await page.keyboard.type("A third paragraph");
  const added = editor.locator('.change-added[data-change="added"]');
  await expect(added).toHaveCount(1);
  await expect(added).toContainText("A third paragraph");

  // A paragraph that was changed has its old text in red above it and the new words in green
  // The click is in the middle of a line that is shorter than the column, so the caret is at the end of the text
  await editor.getByText("First paragraph").click();
  await page.keyboard.type(" and more");
  const ghost = editor.locator('.change-ghost[data-change="modified"]');
  await expect(ghost).toHaveCount(1);
  await expect(ghost).toContainText("First paragraph");
  await expect(ghost).not.toContainText("and more");
  await expect(editor.locator(".change-text")).toContainText("and more");

  // The marks go when a version is saved
  await save("Third paragraph and an edit");
  await expect(editor.locator(".change-added")).toHaveCount(0);
  await expect(editor.locator(".change-ghost")).toHaveCount(0);

  // A paragraph that is taken away stays where it was, in red, and cannot be typed in
  // A triple click selects the paragraph, the first Backspace empties it and the second takes it away. Home and End scroll on a Mac, so they are not used.
  await editor.getByText("Second paragraph").click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  const removed = editor.locator('.change-ghost[data-change="removed"]');
  await expect(removed).toHaveCount(1);
  await expect(removed).toContainText("Second paragraph");
  await expect(removed).toHaveAttribute("contenteditable", "false");

  // One change is put back from its own button: the paragraph that was taken away comes back in its place
  await removed.getByRole("button", { name: "Put back" }).dispatchEvent("mousedown");
  await expect(editor.locator(".change-ghost")).toHaveCount(0);
  await expect(editor.locator(".change-added")).toHaveCount(0);
  await expect(editor.locator("> p")).toHaveText(["First paragraph and more", "Second paragraph", "A third paragraph"]);

  // Typed again, an added paragraph shows the button when the pointer is over it, and a changed one has it in its ghost
  await editor.getByText("A third paragraph").click();
  await page.keyboard.press("Enter");
  await page.keyboard.type("A paragraph that goes");
  const fresh = editor.locator('.change-added[data-change="added"]');
  await fresh.hover();
  // The button is in a line of no height before the block, and shows when the pointer is over the block
  const revert = editor.locator(".change-revert-anchor").getByRole("button", { name: "Put back" });
  await expect(revert).toBeVisible();
  await revert.dispatchEvent("mousedown");
  await expect(fresh).toHaveCount(0);
  await editor.getByText("First paragraph and more").click();
  await page.keyboard.type(" again");
  await editor.locator('.change-ghost[data-change="modified"]').getByRole("button", { name: "Put back" }).dispatchEvent("mousedown");
  await expect(editor.locator("> p").first()).toHaveText("First paragraph and more");
  await expect(editor.locator(".change-ghost")).toHaveCount(0);

  // The paragraph is taken away again for the next part
  await editor.getByText("Second paragraph").click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await expect(editor.locator('.change-ghost[data-change="removed"]')).toHaveCount(1);

  // The setting turns the marks off and on
  await page.keyboard.press("ControlOrMeta+,");
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByRole("button", { name: "Writing", exact: true }).click();
  await dialog.getByRole("switch", { name: "Mark changes since the last version" }).click();
  await page.keyboard.press("Escape");
  await expect(editor.locator(".change-ghost")).toHaveCount(0);
  await expect(editor.locator(".change-added")).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+,");
  await dialog.getByRole("switch", { name: "Mark changes since the last version" }).click();
  await page.keyboard.press("Escape");
  await expect(editor.locator(".change-ghost")).toHaveCount(1);

  await expect(bar).toHaveAttribute("data-dirty", "true");

  // A version needs a description, as a commit needs a message
  await bar.click();
  await page.getByRole("menuitem", { name: "Save a version…" }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Save" })).toBeDisabled();
  await page.keyboard.press("Escape");

  // What was typed can be thrown away, and the editor is as the version has it, with no marks
  await bar.click();
  await page.getByRole("menuitem", { name: "Go back to the last saved version…" }).click();
  // The dialog says how much is lost
  await expect(page.getByRole("dialog")).toContainText(/\d+ changes that you made since are lost/);
  await page.getByRole("dialog").getByRole("button", { name: "Discard" }).click();
  await expect(bar).toHaveAttribute("data-dirty", "false");
  await expect(editor).toContainText("Second paragraph");
  await expect(editor.locator(".change-ghost")).toHaveCount(0);
  await bar.click();
  await expect(page.getByRole("menuitem", { name: "Go back to the last saved version…" })).toHaveCount(0);
});
