import { expect, test } from "../../support/test";
import { PNG_1X1 } from "../../support/png";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createProject } from "../../support/project";

test("tables get rows, a caption and notes; definition lists keep term and description", async ({ launch }) => {
  const { app, file } = await launch({ name: "表格", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  const dialog = page.getByRole("dialog");
  const settle = async () => {
    await expect(dialog).toBeHidden();
    await expect(editor).toBeFocused();
  };

  await page.getByRole("button", { name: "Insert table" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Insert" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(editor).toBeFocused();
  await page.keyboard.type("A");
  await page.keyboard.press("Tab");
  await page.keyboard.type("B");
  await page.keyboard.press("Tab");
  await page.keyboard.type("C");
  await page.getByRole("button", { name: "Add row below" }).click();
  await expect(editor.locator("tr")).toHaveCount(4);

  await page.getByRole("button", { name: "Table caption and notes" }).click();
  await dialog.getByLabel("Caption").fill("Results");
  await dialog.getByLabel("Notes").fill("Source: survey");
  await dialog.getByRole("button", { name: "Save" }).click();
  await settle();

  // After the table, move the cursor to the end and add a definition list
  await page.keyboard.press("Control+End");
  await page.getByRole("button", { name: "Definition list" }).click();
  await page.keyboard.type("alpha");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Learning rate");
  await expect(editor.locator("dl dt")).toHaveText("alpha");
  await expect(editor.locator("dl dd")).toHaveText("Learning rate");
  await expect(page.getByRole("status")).toHaveText("Saved");

  const text = await page.evaluate(async () => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) return "";
    const chapter = list.data.find((d) => d.kind === "chapter");
    const doc = chapter && (await window.marktwain.invoke("document:get", { id: chapter.id }));
    return doc && doc.ok ? doc.data.text : "";
  });
  expect(text).toContain("| A");
  expect(text).toContain("Results");
  expect(text).toContain("Source: survey");
  expect(text).toContain("alpha\n: Learning rate");
});


test("tables can be merged, aligned, restyled and given a row height", async ({ launch }) => {
  const { app, file } = await launch({ name: "表格版面", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  const dialog = page.getByRole("dialog");

  await page.getByRole("button", { name: "Insert table" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Insert" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(editor).toBeFocused();
  await page.keyboard.type("A");
  await page.keyboard.press("Tab");
  await page.keyboard.type("B");
  await page.keyboard.press("Tab");
  await page.keyboard.type("C");
  await page.keyboard.press("Tab");
  await page.keyboard.type("1");

  // Merge the first two cells of the second row by dragging across them
  const row2 = editor.locator("tr").nth(1).locator("td");
  await row2.nth(0).click();
  await row2.nth(1).click({ modifiers: ["Shift"] });
  // Selecting two cells suggests merging them right next to the selection
  await page.getByRole("button", { name: "Merge the selected cells" }).click();
  await expect(editor.locator("tr").nth(1).locator("td").first()).toHaveAttribute("colspan", "2");

  // Align the third column to the right, switch to grid lines and set the height of the second row
  await editor.locator("tr").nth(0).locator("th").nth(2).click();
  await page.getByRole("toolbar", { name: "Table tools" }).getByRole("button", { name: "Align column right" }).click();
  await page.getByRole("button", { name: "Switch to grid lines" }).click();
  await expect(editor.locator(".tableWrapper")).toHaveAttribute("data-table-style", "grid");

  await row2.first().click();
  // The tools show where the cursor is and the size of its row and column, and let you type new values
  await expect(page.getByTestId("table-readout")).toContainText("Row 2 of 3, column 1 of 3");
  await page.getByLabel("Row height").fill("2cm");
  await page.getByLabel("Row height").press("Enter");
  await expect(editor.locator("tr").nth(1)).toHaveAttribute("data-height", "2cm");
  await row2.first().click();
  await expect(page.getByLabel("Row height")).toHaveValue("2cm");
  await page.getByLabel("Column width").fill("30");
  await page.getByLabel("Column width").press("Enter");
  await row2.first().click();
  await expect(page.getByLabel("Column width")).toHaveValue("30");
  await expect(page.getByRole("status")).toHaveText("Saved");

  const text = await page.evaluate(async () => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) return "";
    const chapter = list.data.find((d) => d.kind === "chapter");
    const doc = chapter && (await window.marktwain.invoke("document:get", { id: chapter.id }));
    return doc && doc.ok ? doc.data.text : "";
  });
  expect(text).toContain("| A | B | C |");
  expect(text).toContain("---:");
  expect(text).toContain("cells=2.1:colspan=2");
  expect(text).toContain("heights=2:2cm");
  expect(text).toMatch(/widths=30%,/);
  expect(text).toContain("style=grid");
});


test("a table or figure without a caption has no number, and an image never lands inside a table", async ({ launch }) => {
  const { app, dir } = await launch({ name: "無標題", projectName: "論文.marktwain", env: (folder) => ({ MARKTWAIN_TEST_IMAGE_PATH: join(folder, "圖.png") }) });
  const image = join(dir, "圖.png");
  writeFileSync(image, PNG_1X1);
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  const dialog = page.getByRole("dialog");

  // The caption fields offer a placeholder and may stay empty
  await page.getByRole("button", { name: "Insert table" }).click();
  await expect(dialog.getByPlaceholder("Table caption, optional")).toBeVisible();
  await dialog.getByRole("button", { name: "Insert" }).click();
  await expect(dialog).toBeHidden();

  // With the cursor still in the table, an image goes after it
  await page.getByRole("button", { name: "Insert image" }).click();
  await expect(dialog.getByPlaceholder("Figure caption, optional")).toBeVisible();
  await dialog.getByRole("button", { name: "Insert" }).click();
  await expect(dialog).toBeHidden();
  await expect(editor.locator("td figure")).toHaveCount(0);
  await expect(editor.locator("figure")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText("Saved");

  const text = await page.evaluate(async () => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) return "";
    const chapter = list.data.find((d) => d.kind === "chapter");
    const doc = chapter && (await window.marktwain.invoke("document:get", { id: chapter.id }));
    return doc && doc.ok ? doc.data.text : "";
  });
  expect(text).toMatch(/\|\n\n!\[\]\(images\/[0-9a-f]{16}\.png\)\n$/);
  expect(text).not.toContain(": !");
});


test("dragging a row or a column edge shows the value that it takes", async ({ launch }) => {
  const { app, file } = await launch({ name: "拖曳", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.getByRole("button", { name: "Insert table" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Insert" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // Row: grab the bottom edge of the second row and pull it down
  const cell = editor.locator("tr").nth(1).locator("td").first();
  const box = (await cell.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + box.height - 1);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y + box.height + 40, { steps: 6 });
  await expect(page.getByTestId("resize-value")).toContainText(/Row height \d+ pt/);
  await page.mouse.up();
  await expect(page.getByTestId("resize-value")).toBeHidden();
  await expect(editor.locator("tr").nth(1)).toHaveAttribute("data-height", /^\d+pt$/);
  const height = Number(((await editor.locator("tr").nth(1).getAttribute("data-height")) ?? "").replace("pt", ""));
  expect(height).toBeGreaterThan(30);

  // Column: pull the right edge of the first column to the right
  const head = editor.locator("tr").first().locator("th").first();
  const hbox = (await head.boundingBox())!;
  await page.mouse.move(hbox.x + hbox.width - 2, hbox.y + 10);
  await page.mouse.down();
  await page.mouse.move(hbox.x + hbox.width + 60, hbox.y + 10, { steps: 6 });
  await expect(page.getByTestId("resize-value")).toContainText(/Column width [\d.]+%/);
  await page.mouse.up();
  await expect(page.getByTestId("table-readout")).toContainText("Column width");
});
