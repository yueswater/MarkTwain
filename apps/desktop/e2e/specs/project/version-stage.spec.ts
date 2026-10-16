import { expect, test } from "../../support/test";
import { closeProject, createProject, openRecent, readChapter, seedChapter } from "../../support/project";

test("a version takes only the changes that are chosen, and any two versions can be compared", async ({ launch }) => {
  const { app } = await launch({ name: "version-stage" });
  const page = await app.firstWindow();
  await createProject(page);
  const bar = page.getByTestId("branch-bar");
  const editor = page.locator(".ProseMirror");
  await expect(bar).toContainText("Main line");
  await seedChapter(page, "# One\n\nalpha\n\nbeta\n\ngamma\n\ndelta\n");
  await closeProject(page);
  await openRecent(page);
  await expect(editor).toContainText("delta");

  const openSave = async () => {
    await bar.click();
    await page.getByRole("menuitem", { name: "Save a version…" }).click();
  };
  // A first version of the text as it is, then two changes far apart
  await openSave();
  await page.getByLabel("What did you change?").fill("Base");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await seedChapter(page, "# One\n\nALPHA\n\nbeta\n\ngamma\n\nDELTA\n");
  await closeProject(page);
  await openRecent(page);
  await expect(bar).toHaveAttribute("data-dirty", "true");

  // Both changes are chosen to begin with, and a version needs a description and at least one change
  await openSave();
  const dialog = page.getByRole("dialog");
  const save = dialog.getByRole("button", { name: "Save", exact: true });
  await expect(dialog.getByTestId("stage-count")).toHaveText("2 of 2 chosen");
  await expect(save).toBeDisabled();
  await dialog.getByLabel("What did you change?").fill("Only the first");
  await expect(save).toBeEnabled();
  await dialog.getByRole("button", { name: "Choose none" }).click();
  await expect(save).toBeDisabled();
  await dialog.getByRole("button", { name: "Choose all" }).click();

  // The second change is left out
  await dialog.locator("[data-change-item]").nth(1).getByRole("checkbox").uncheck();
  await expect(dialog.getByTestId("stage-count")).toHaveText("1 of 2 chosen");
  await save.click();
  await expect(dialog).toBeHidden();

  // The text of the documents is not touched, and what was left out is still a change that is marked and not saved
  expect(await readChapter(page)).toBe("# One\n\nALPHA\n\nbeta\n\ngamma\n\nDELTA\n");
  await expect(bar).toHaveAttribute("data-dirty", "true");
  await expect(editor.locator('.change-ghost[data-change="modified"]')).toHaveCount(1);
  await expect(editor.locator('.change-ghost[data-change="modified"]')).toContainText("delta");

  // The rest goes into the next version
  await openSave();
  await expect(dialog.getByTestId("stage-count")).toHaveText("1 of 1 chosen");
  await dialog.getByLabel("What did you change?").fill("The rest");
  await save.click();
  await expect(dialog).toBeHidden();
  await expect(bar).toHaveAttribute("data-dirty", "false");

  // Any two versions can be compared: the oldest with the newest holds both changes
  await bar.click();
  await page.getByRole("menuitem", { name: "Version history…" }).click();
  const history = page.getByRole("dialog");
  await expect(history.getByRole("listitem")).toHaveCount(4);
  await history.getByRole("checkbox", { name: "Pick “Base” to compare" }).check();
  await expect(history.getByRole("button", { name: "Compare the two" })).toBeDisabled();
  await history.getByRole("checkbox", { name: "Pick “The rest” to compare" }).check();
  await history.getByRole("button", { name: "Compare the two" }).click();
  const changes = page.getByTestId("compare-changes");
  await expect(changes.locator('[data-change="modified"]')).toHaveCount(2);
  await expect(changes.locator('[data-change="modified"] ins').first()).toContainText("ALPHA");
});
