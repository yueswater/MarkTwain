import { expect, test } from "../../support/test";
import { closeProject, createProject, openRecent, readChapter, seedChapter } from "../../support/project";

const BASE = "# One\n\nalpha\n\nbeta\n\ngamma\n";

test("the changes of a version are shown in green and red, and a merge with a conflict is settled block by block", async ({ launch }) => {
  const { app } = await launch({ name: "version-merge" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  const bar = page.getByTestId("branch-bar");
  const menu = () => bar.click();
  const save = async (message: string) => {
    await menu();
    await page.getByRole("menuitem", { name: "Save a version…" }).click();
    await page.getByLabel("What did you change?").fill(message);
    await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(bar).toHaveAttribute("data-dirty", "false");
  };

  // The versions start when the project opens, so the base is written after the branch bar is there
  await expect(bar).toContainText("Main line");
  await seedChapter(page, BASE);
  await closeProject(page);
  await openRecent(page);
  await expect(editor).toContainText("beta");
  await save("Base");
  await menu();
  await page.getByRole("menuitem", { name: "Start a new change…" }).click();
  await page.getByLabel("Name of the change").fill("work");
  await page.getByRole("dialog").getByRole("button", { name: "Start a new change" }).click();
  await expect(bar).toContainText("work");
  await seedChapter(page, "# One\n\nalpha\n\nbeta from the change\n\ngamma\n\ndelta\n");
  await closeProject(page);
  await openRecent(page);
  await save("Edited in the change");

  // What the version changed: green for what was added, red for what was taken away
  await menu();
  await page.getByRole("menuitem", { name: "Version history…" }).click();
  await page.getByRole("listitem").filter({ hasText: "Edited in the change" }).getByRole("button", { name: "What changed" }).click();
  const changes = page.getByTestId("compare-changes");
  await expect(changes.locator('[data-change="added"]')).toContainText("delta");
  await expect(changes.locator('[data-change="added"]')).toHaveClass(/emerald/);
  await expect(changes.locator('[data-change="modified"] ins')).toContainText("from the change");
  await expect(changes.locator('[data-change="modified"] ins')).toHaveClass(/emerald/);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

  // The main line edits the same block in another way
  await menu();
  await page.getByRole("menuitem", { name: "Main line", exact: true }).click();
  await expect(bar).toContainText("Main line");
  await seedChapter(page, "# One\n\nalpha\n\nbeta from the main line\n\ngamma\n");
  await closeProject(page);
  await openRecent(page);
  await save("Edited on the main line");
  await menu();
  await page.getByRole("menuitem", { name: "work" }).click();
  await expect(bar).toContainText("work");

  // The merge shows the two sides and the base, and waits for a choice
  await menu();
  await page.getByRole("menuitem", { name: "Merge into the main line…" }).click();
  const dialog = page.getByRole("dialog");
  const merge = dialog.getByRole("button", { name: "Merge", exact: true });
  const conflict = dialog.locator("[data-conflict]").first();
  await expect(conflict).toBeVisible();
  await expect(conflict.locator('[data-side="base"]')).toContainText("beta");
  await expect(conflict.locator('[data-side="ours"]')).toContainText("beta from the main line");
  await expect(conflict.locator('[data-side="theirs"]')).toContainText("beta from the change");
  await expect(dialog).toContainText("0 of 1 chosen");
  await expect(merge).toBeDisabled();

  // A text of one's own is a choice only when it is not empty
  await conflict.getByLabel("Write my own").check();
  await conflict.getByLabel("Your text").fill("");
  await expect(merge).toBeDisabled();
  await conflict.getByLabel("Your text").fill("beta, written by hand");
  await expect(dialog).toContainText("1 of 1 chosen");
  await merge.click();
  await expect(dialog).toBeHidden();

  // The main line has both: the text of the person where they disagreed, and the block that only the change added
  await expect(bar).toContainText("Main line");
  await expect(editor).toContainText("beta, written by hand");
  await expect(editor).toContainText("delta");
  expect(await readChapter(page)).toBe("# One\n\nalpha\n\nbeta, written by hand\n\ngamma\n\ndelta\n");
  // The change was discarded after the merge, so the menu has the main line only
  await menu();
  await expect(page.getByRole("menuitem", { name: "work" })).toHaveCount(0);
});
