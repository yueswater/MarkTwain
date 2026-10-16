import { expect, test } from "../../support/test";
import { viewerState } from "../../support/preview-viewer";
import { closeProject, createProject, openRecent, readChapter, seedChapter } from "../../support/project";

test("the search of the PDF viewer takes the typing and the editor keeps its text", async ({ launch }) => {
  const { app } = await launch({ name: "搜尋" });
  const page = await app.firstWindow();
  await createProject(page);
  const text = "# Title\n\nA paragraph with the word ROUGE in it.\n";
  await seedChapter(page, text);
  await closeProject(page);
  await openRecent(page);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect.poll(async () => (await viewerState(page))?.total ?? 0, { timeout: 90_000 }).toBeGreaterThan(1);

  // The caret is in the editor, then the search of the viewer is opened with the mouse
  await page.locator(".ProseMirror").click();
  await page.getByTestId("preview-pages").getByRole("button", { name: "Search", exact: true }).click();
  // The box has the focus as soon as it is there
  await expect(page.getByTestId("preview-pages").getByPlaceholder("Search")).toBeFocused();
  await page.keyboard.type("ROUGE");

  // The letters are in the search box and not in the thesis
  await expect(page.getByTestId("preview-pages").getByPlaceholder("Search")).toHaveValue("ROUGE");
  await page.waitForTimeout(1200);
  expect(await readChapter(page)).toBe(text);
});
