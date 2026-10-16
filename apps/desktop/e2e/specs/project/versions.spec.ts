import { expect, test } from "../../support/test";
import { createProject, readChapter } from "../../support/project";

test("a version is saved, a change is started and opened again, the history restores, and a change is discarded", async ({ launch }) => {
  const { app } = await launch({ name: "versions" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  const bar = page.getByTestId("branch-bar");
  const menu = () => bar.click();

  // The main line is open and nothing is changed
  await expect(bar).toContainText("Main line");
  await expect(bar).toHaveAttribute("data-dirty", "false");

  // Typing makes the bar say that there are changes, a version takes the mark away
  await editor.click();
  await page.keyboard.type("First draft");
  await expect(bar).toHaveAttribute("data-dirty", "true");
  await menu();
  await page.getByRole("menuitem", { name: "Save a version…" }).click();
  await page.getByLabel("What did you change?").fill("The first draft");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(bar).toHaveAttribute("data-dirty", "false");

  // A change needs a name, and a name that is used is refused
  await menu();
  await page.getByRole("menuitem", { name: "Start a new change…" }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Start a new change" })).toBeDisabled();
  await page.getByLabel("Name of the change").fill("main");
  await page.getByRole("dialog").getByRole("button", { name: "Start a new change" }).click();
  await expect(page.getByRole("alert")).toContainText("exists already");
  await page.getByLabel("Name of the change").fill("rewrite");
  await page.getByRole("dialog").getByRole("button", { name: "Start a new change" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(bar).toContainText("rewrite");

  // The change has its own text, the main line keeps the first draft
  await editor.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type(" and a rewrite");
  await menu();
  await page.getByRole("menuitem", { name: "Save a version…" }).click();
  await page.getByLabel("What did you change?").fill("Rewrote it");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(bar).toHaveAttribute("data-dirty", "false");
  await expect(editor).toContainText("First draft and a rewrite");

  await menu();
  await page.getByRole("menuitem", { name: "Main line", exact: true }).click();
  await expect(bar).toContainText("Main line");
  await expect(editor).toContainText("First draft");
  await expect(editor).not.toContainText("a rewrite");
  expect(await readChapter(page)).toContain("First draft");

  await menu();
  await page.getByRole("menuitem", { name: "rewrite" }).click();
  await expect(editor).toContainText("First draft and a rewrite");

  // The history lists the versions, a restore adds a new one
  await menu();
  await page.getByRole("menuitem", { name: "Version history…" }).click();
  const history = page.getByRole("dialog");
  await expect(history.getByRole("listitem")).toHaveCount(3);
  await expect(history.getByRole("listitem").first()).toContainText("Rewrote it");
  const row = history.getByRole("listitem").filter({ hasText: "The first draft" });
  await row.getByRole("button", { name: "Restore" }).click();
  // The row asks first, and then the only button of the row that restores is the one that confirms
  await row.getByRole("button", { name: "Restore" }).click();
  await expect(history).toBeHidden();
  await expect(editor).not.toContainText("a rewrite");
  await expect(bar).toHaveAttribute("data-dirty", "false");

  // Discarding the change that is open goes back to the main line, and the main line cannot be discarded
  await menu();
  await page.getByRole("menuitem", { name: "Discard this change…" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Discard" }).click();
  await expect(bar).toContainText("Main line");
  await menu();
  await expect(page.getByRole("menuitem", { name: "Discard this change…" })).toHaveCount(0);
});
